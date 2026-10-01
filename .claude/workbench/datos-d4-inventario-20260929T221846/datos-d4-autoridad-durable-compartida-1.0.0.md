# Datos D4 — stores Python y autoridad durable compartida - 1.0.0

## Contexto

Fase D4 del plan `fases-bases-de-datos-20260928T175719/plan-por-fases.md`.

El objetivo de D4 no es escoger directamente entre SQLite y PostgreSQL.

La pregunta arquitectónica correcta es:

```text
¿existe una autoridad durable única,
alcanzable por todas las sesiones que escriben?
```

Hoy la respuesta es:

```text
NO
```

Lo que existe es:

```text
session A
   │
   └── agent_store.sqlite3 A

session B
   │
   └── agent_store.sqlite3 B

session C
   │
   └── agent_store.sqlite3 C

             ↓

         Git merge
             ↓

   merge_sqlite_union.py
```

Por tanto, el sistema actual no es una base compartida por red.

Es una base SQLite replicada entre sesiones mediante Git, con consistencia eventual.

El defecto medido no está en SQLite como motor local.

Está en la reconciliación de copias divergentes.

---

# 1. Inventario real de stores Python

Las aperturas SQLite de `src/**/*.py` usan, salvo una excepción sin consumidor real, la misma base:

```text
agent_store.sqlite3
```

La ruta se resuelve mediante:

```text
reach.agent_store_path
```

y usa:

```text
THYROX_AGENT_STORE
```

si está configurado; en otro caso cae bajo:

```text
<thyrox>/agent-results/
```

Módulos como:

```text
task_ids
hallazgo_ids
board_sync
reconcile_store
model_catalog
agent_store
```

no representan stores físicos independientes.

Son módulos de dominio sobre la misma base.

La excepción es:

```text
src/store/agent_sessions.py
→ agent_sessions.sqlite3
```

pero actualmente sólo lo consume su propia prueba.

No forma parte del flujo operativo principal.

---

# 2. Un store, varios dominios y dos lenguajes

El store actual contiene datos escritos tanto por Python como por TypeScript.

Matriz medida:

| Tabla | Semántica | Writers principales |
|---|---|---|
| `agent_sessions` | registro durable y mutable de subagentes | Python + TypeScript |
| `tasks` | tareas y citas durables `TASK-*` | Python + TypeScript |
| `findings_history` | índice/historial de findings | Python |
| `documents` | eje temporal derivado de Git | Python |
| `cleared_tool_results` | observabilidad por sesión | TypeScript |
| `task_session_highwater` | contador/session-local | TypeScript |
| `schema_migrations` | ledger del schema | Python owner, Bun valida |

SQLite usa:

```text
WAL
+
busy_timeout
```

y la concurrencia entre procesos de la misma máquina ya está resuelta de forma suficiente para hooks, CLI y harness.

El problema aparece entre sesiones divergentes.

---

# 3. Qué significa «shared» hoy

Hoy:

```text
shared
≠
multi-client network database
```

Significa:

```text
varias sesiones
→ cada una escribe su copia local
→ Git transporta/copia el store
→ merge_sqlite_union.py intenta unirlo
```

El store está versionado y se reconcilia por Git.

El modelo actual es:

```text
distributed replicated SQLite
+
eventual consistency
+
custom merge driver
```

No existe hoy una autoridad durable única común a todas las sesiones.

---

# 4. Fallos medidos del merge actual

El merge actual usa una estrategia equivalente a:

```text
INSERT OR IGNORE
```

por clave primaria.

Eso no es suficiente para datos mutables ni para identidades locales.

## 4.1 Lost update

Ejemplo:

```text
BASE
agent.status = running

OURS
agent.status = running

THEIRS
agent.status = completed
```

Después del merge actual puede sobrevivir:

```text
running
```

y perderse:

```text
completed
```

sin conflicto explícito.

---

## 4.2 Colisión de identidad local

`findings_history` usa hoy un entero local `AUTOINCREMENT`.

Dos sesiones pueden producir:

```text
session A
→ id 123
→ H-OURS

session B
→ id 123
→ H-THEIRS
```

Al reconciliar:

```text
PK 123
PK 123
```

una de las dos filas puede desaparecer.

Conclusión:

```text
local AUTOINCREMENT
≠
distributed identity
```

Para datos que viajan entre sesiones, la identidad debe ser global.

En `findings_history`:

```text
finding_id
```

es la identidad correcta.

---

# 5. La pregunta de D4 cambia

D4 deja de ser:

```text
SQLite
vs
PostgreSQL
```

y pasa a ser:

```text
¿qué datos necesitan una autoridad durable compartida?

¿dónde vive esa autoridad?

¿quién puede alcanzarla?

¿qué ocurre cuando no está disponible?

¿quién posee el contrato?

¿cómo se reconcilia el estado mientras esa autoridad no existe?
```

---

# 6. Clasificación arquitectónica de los datos

La arquitectura queda dividida en cuatro planos.

```text
                         PERSISTENCE
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
     LOCAL DURABLE      SHARED DURABLE     SHARED EPHEMERAL
          │                   │                   │
       SQLite            PostgreSQL             Redis

                              +

                  EXECUTION / RECOVERY STATE
                              │
                              ▼
                  RuntimeWorkspace / SnapshotStore
```

---

## 6.1 Local durable

Candidatos:

```text
documents
cleared_tool_results
task_session_highwater
```

Características:

```text
session-local
o
derivable from Git
```

No necesitan viajar entre sesiones.

> Nota de medición (2026-09-29): que `cleared_tool_results` sea session-local es una inferencia, no una medición. Y hoy el store es un único archivo versionado: ninguna tabla deja de viajar sin separar el archivo. Esa separación es una propuesta sin tarea registrada.

Destino esperado:

```text
SQLite local
```

---

## 6.2 Shared durable

Candidatos actuales:

```text
agent_sessions
tasks
```

y temporalmente:

```text
findings_history
```

mientras existan findings que sólo viven en la base.

Destino futuro posible:

```text
PostgreSQL
```

pero únicamente si existe una autoridad común real.

---

## 6.3 Shared ephemeral

Ejemplos:

```text
leases
quotas
cooldowns
request windows
temporary coordination
```

Destino:

```text
Redis
```

---

## 6.4 Execution / recovery state

Ejemplos:

```text
.thyrox/runtime
pool ledgers
SnapshotStore
pool lifecycle
recovery state
```

No pertenecen a D4 como persistencia de dominio.

Permanecen en:

```text
repository/job lifecycle
```

---

# 7. `findings_history` no es reconstruible hoy

Por diseño:

```text
RST
→ authoritative representation

findings_history
→ rebuildable index
```

Pero el estado real todavía no cumple esa intención.

Medición actual:

```text
findings_history rows
→ 1659

rows with own .rst
→ 1580

rows without any .rst representation
→ 79
```

Medido el 2026-09-29 sobre `feature/thyrox-l6` (banco `thyrox: .claude/workbench/datos-d4-inventario-20260929T221846/`, `findings-rebuildable.txt`). Son cifras fechadas de ese día, no propiedades vivas: el comando del banco las reproduce.

Un instrumento independiente, `check_finding_id_unique.py`, detecta 78 porque sólo considera el patrón `H-`; la diferencia corresponde a `L-032`. Esos 78 quedaron congelados como deuda heredada en el baseline del consumidor (`kaupamex-docs@eb39a749f`), para que el gate bloquee sólo huecos nuevos; el relleno histórico retira cada línea al publicar su `.rst`.

Por tanto:

```text
rebuild findings_history from RST
→ loses 79 findings
```

Conclusión:

```text
findings_history
```

todavía contiene verdad durable no reconstruible.

No puede tratarse todavía como una simple caché local.

---

# 8. Condición para reclasificar `findings_history`

No basta con llegar una vez a:

```text
historical gap = 0
```

Deben cumplirse dos condiciones:

```text
1. historical gap = 0

2. future DB-only durable findings cannot persist
```

La transición correcta es:

```text
79 DB-only findings
        ↓
TASK-THYROX-0628
historical backfill
        ↓
0 DB-only historical findings
        ↓
session-close invariant
        ↓
new durable finding cannot remain DB-only
        ↓
findings_history becomes rebuildable index
```

Sólo entonces puede dejar de viajar entre sesiones.

---

# 9. Session close como gate primario

La invariante pertenece al lifecycle de sesión, no al transporte Git.

Flujo:

```text
SESSION RUNNING
      │
      ▼
finding registered
      │
      ▼
temporary grace period
      │
      ▼
RST publication/reconciliation
      │
      ▼
SESSION CLOSE
      │
      ▼
are durable findings still missing RST?
      │
      ├── yes
      │     ↓
      │   reconcile / publish
      │     ↓
      │   unresolved?
      │     ├── yes → REJECT CLEAN CLOSE
      │     └── no  → continue
      │
      └── no
            ↓
          CLOSED
```

Regla:

```text
CLEAN SESSION CLOSED
⇒ no durable finding produced by that session
   remains only in findings_history
```

El grace period sólo aplica mientras el productor/session sigue vivo.

No sobrevive a un clean close.

---

## Crash

Un crash:

```text
≠ clean close
```

Por tanto:

```text
crash
→ recoverable/reconcilable state
```

No debe fingirse que la invariante de cierre ya se cumplió.

---

## Pre-push

### Estado de la implementación

- El motor del gate por sesión (las filas de una sesión que siguen sin `.rst`) y el `pre-push` como segunda defensa son **TASK-THYROX-0629**. Si el corpus del consumidor no es alcanzable, `pre-push` lo declara, no afirma que midió y no bloquea: es la defensa secundaria.
- El **cierre limpio de sesión todavía no existe como evento que pueda rechazarse**. Medido: el hook `Stop` corre al final de cada turno, no al cerrar, y `validate-session-close.sh` sólo avisa. Qué evento es el cierre limpio, y cómo se muestra un rechazo, es **TASK-THYROX-0630** y lo decide el ejecutor. Hasta entonces F-I1 es un invariante declarado, no aplicado.

## Pre-push

`pre-push` ejecuta el mismo gate como segunda defensa.

```text
PRIMARY
session close

SECONDARY
pre-push
```

El lifecycle mantiene la propiedad.

Git evita que un estado incorrecto se propague si alguien salió del flujo normal.

---

# 10. TASK-THYROX-0628 — historical findings backfill

`DocumentationPublisher` no corrige los findings históricos.

Su responsabilidad es publicar documentación derivada de nuevos items cuando éstos ya están cerrados.

El backfill histórico es una tarea separada:

```text
TASK-THYROX-0628
```

Objetivo:

```text
79 historical DB-only findings
        ↓
bin/finding rst
        ↓
RST materialized
        ↓
gap = 0
```

Después de cerrar el gap, el session-close gate debe impedir que vuelva a crecer.

---

# 11. D4-A — corregir la replicación actual

Mientras no exista una autoridad durable única, THYROX necesita reconciliar correctamente las copias SQLite.

Tarea:

```text
TASK-THYROX-0626
```

La corrección no debe ser un merge de dos ramas escogiendo ganador por contador.

Debe ser un:

```text
three-way merge
with explicit conflicts
```

---

# 12. Por qué `revision` no basta

Un contador lógico por fila es útil, pero no expresa causalidad entre ramas divergentes.

Ejemplo:

```text
BASE
revision 11

session A
11 → 12 → 13
(two edits)

session B
11 → 12
(one different edit)
```

Si el merge hace:

```text
13 > 12
→ A wins
```

pierde el cambio de B.

El número más alto no demuestra que A haya observado B.

Conclusión:

```text
revision
→ useful metadata

revision
≠ cross-branch causal authority
```

---

# 13. Git ya entrega BASE / OURS / THEIRS

El merge driver recibe:

```text
BASE
OURS
THEIRS
```

El ancestro común debe usarse.

No debe ignorarse.

Flujo:

```text
                 BASE
                  │
              common row
              /        \
             /          \
            ▼            ▼
          OURS         THEIRS
```

Para cada identidad global:

```text
compare base(row)
compare ours(row)
compare theirs(row)
```

---

# 14. Regla de three-way merge por fila

Tabla conceptual:

| Cambio OURS | Cambio THEIRS | Resultado |
|---|---|---|
| no | no | unchanged |
| sí | no | take OURS |
| no | sí | take THEIRS |
| sí | sí, contenido de dominio idéntico | merged cleanly |
| sí | sí, contenido distinto | CONFLICT |
| insert sólo OURS | — | insert OURS |
| — | insert sólo THEIRS | insert THEIRS |
| ambos insertan mismo contenido bajo misma identidad | — | one logical row |
| ambos insertan contenido distinto bajo misma identidad | — | CONFLICT |
| un lado borra | el otro no cambió la fila | delete |
| un lado borra | el otro cambió la fila | CONFLICT |

«Cambió» significa `domain_hash` distinto del de BASE, no `revision` distinta.

Ejemplo:

```text
BASE
status = running

OURS
status = completed

THEIRS
status = cancelled
```

Resultado:

```text
OURS != BASE
THEIRS != BASE
OURS != THEIRS

→ CONFLICT
```

No importa que:

```text
ours revision = 13
theirs revision = 12
```

---

# 15. Conflicto no significa elegir ganador

D4-A no busca un merge que siempre produzca una sola fila.

Busca:

```text
lossless reconciliation
```

Contrato:

```text
if merge can prove one side is the only change
→ apply it

if both changed to the same domain state
→ merge cleanly

if both changed incompatibly
→ declare conflict
→ preserve both versions
```

Nunca:

```text
conflict
→ silently choose one
```

---

# 16. `revision` después de la corrección

`revision` se mantiene como:

```text
ordering metadata
debugging
observability
local optimistic concurrency
```

pero no decide por sí sola el ganador en un merge entre ramas.

Una fila puede tener:

```text
same revision
same content
→ identical
```

o:

```text
same revision
different content
→ conflict
```

También puede ocurrir:

```text
different revision
same domain content
→ same logical row
```

---

# 17. Domain hash

El hash debe representar únicamente el contenido de dominio.

No debe incluir bookkeeping.

Correcto:

```text
domain_hash(
  canonicalize(domain_fields)
)
```

Excluir:

```text
revision
updated_at
merge metadata
migration bookkeeping
other non-domain fields
```

Caso:

```text
OURS
status = completed
revision = 12
updated_at = T1

THEIRS
status = completed
revision = 15
updated_at = T2
```

Debe resultar:

```text
same domain hash
→ no conflict
```

---

# 18. Identidad distribuida

Ninguna tabla que viaje entre sesiones debe depender de `AUTOINCREMENT` local como identidad distribuida.

Para `findings_history`:

```text
distributed identity
→ finding_id
```

No:

```text
id INTEGER AUTOINCREMENT
```

Un mismo `finding_id` con contenido incompatible debe producir:

```text
CONFLICT
```

Nunca:

```text
keep one
```

---

# 19. Reporting del merge

El merge debe informar por tabla al menos:

```text
identical
inserted
updated
conflict
```

y, donde corresponda:

```text
deleted / reconciled
```

No basta con:

```text
N rows ignored
```

porque ese número mezcla:

```text
identical rows
+
real collisions
+
potential data loss
```

El informe debe permitir distinguir cada caso.

---

# 20. Backups y recuperación

Hay dos caminos diferentes.

## Merge ejecutado por Git

Git ya conserva:

```text
BASE
OURS
THEIRS
```

en su objeto/revisión correspondiente.

No es necesario duplicar esos inputs sólo para preservar las tres versiones. Sí hace falta que el driver no reemplace su salida hasta tener un resultado válido: `OURS` es a la vez entrada y destino del driver.

---

## Operaciones fuera de Git

Ejemplos:

```text
merge_stores.py
migrations
manual imports
maintenance operations
```

Ahí sí:

```text
current DB
   ↓
backup
   ↓
operation
   ↓
integrity check
   ↓
replace/publish
```

Esto se coordina con la tarea de backup/migrations correspondiente.

---

# 21. Comparación con OmniRoute

OmniRoute tiene una topología distinta.

```text
             authoritative source
                     │
                     ▼
                full bundle
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       copy A      copy B      copy C
```

Propiedades útiles observadas:

```text
single source of truth
full snapshot sync
version by content hash
declared conflicts
text/global identities for traveling data
whole-database replacement only after validation
```

Pero OmniRoute no implementa el problema actual de THYROX:

```text
multi-writer divergent replicas
```

Por tanto:

```text
copy OmniRoute properties
NOT its current sync algorithm
```

---

# 22. Qué toma D4-A de OmniRoute

D4-A adopta:

```text
global identities
content-based comparison
declared conflicts
backup before non-Git destructive operations
```

y mantiene una diferencia:

```text
OmniRoute
→ one authoritative source

THYROX today
→ several writers / several replicas
```

Por eso THYROX necesita three-way merge mientras D4-B no cambie la topología.

---

# 23. D4-B — autoridad durable compartida

D4-B no implementa todavía una migración de motor. Tarea: TASK-THYROX-0627.

Es discovery arquitectónico.

Pregunta:

```text
¿dónde vive la autoridad durable compartida?
```

Debe resolver:

```text
where does shared PostgreSQL live?
who operates it?
how sessions discover it?
what happens offline?
what happens on network partition?
who owns the domain contract?
who owns migrations?
Python direct DB access?
shared service/port?
authentication?
backup?
schema lifecycle?
availability?
latency?
```

---

# 24. PostgreSQL sólo sirve si es realmente compartido

Esto:

```text
session A → postgres A
session B → postgres B
session C → postgres C
```

no resuelve D4.

Sigue siendo:

```text
multiple divergent authorities
```

La topología buscada por D4-B es:

```text
session A ─┐
session B ─┼──► authoritative PostgreSQL
session C ─┘
```

---

# 25. InfrastructureBootstrap no se modifica todavía

El PostgreSQL gestionado actualmente por:

```text
InfrastructureBootstrap
```

es local a la sesión/VM correspondiente.

No debe reinterpretarse automáticamente como:

```text
global shared authority
```

D4-B decide si aparece una autoridad compartida nueva y dónde vive.

Ninguna migración de motor debe empezar antes de responder esa topología.

---

# 26. Owner del schema vs owner del contrato

Hoy D3-A2 fijó:

```text
agent_store.py
→ SQLite schema owner

Bun
→ schema validator
```

Eso es una decisión válida para el motor SQLite actual.

Pero si aparece:

```text
AgentStore contract
        │
        ├── SQLite adapter
        └── PostgreSQL adapter
```

queda abierta otra pregunta:

```text
who owns the persistence contract?
```

Eso no se deduce automáticamente del ownership histórico del schema SQLite.

Después se decide:

```text
who runs PostgreSQL migrations?
```

---

# 27. Arquitectura objetivo posible

Si D4-B decide que debe existir una autoridad durable común:

```text
                     Agent domains
                          │
                          ▼
                    Store contracts
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
        SQLite adapter         PostgreSQL adapter
              │                       │
       local / fallback        shared authority
```

El dominio no debe depender directamente de:

```text
sqlite3.connect(...)
```

como contrato arquitectónico.

---

# 28. Matriz D4 refinada

| Dato | Naturaleza | Autoridad hoy | Destino |
|---|---|---|---|
| `agent_sessions` | durable, mutable, entre sesiones | base replicada por Git | PostgreSQL si existe autoridad común; mientras tanto SQLite + three-way merge |
| `tasks` | durable, mutable, entre sesiones | base replicada por Git | igual |
| `findings_history` | índice por diseño; durable truth parcial mientras haya gap | base mientras gap > 0 | tras backfill + close gate: cache local reconstruible |
| `documents` | derivado de Git | Git | SQLite local |
| `cleared_tool_results` | de una sesión | sesión | SQLite local |
| `task_session_highwater` | de una sesión | sesión | SQLite local |
| leases / cuotas / cooldowns | efímero compartido | Redis | Redis |
| pool / runtime | execution state | lifecycle / SnapshotStore | fuera de domain persistence |

---

# 29. Invariantes D4-A

## D4-I1

```text
traveling table
⇒ globally stable identity
```

---

## D4-I2

```text
only one side changed relative to BASE
⇒ take that side
```

---

## D4-I3

```text
both sides changed
+
same domain content
⇒ merge cleanly
```

---

## D4-I4

```text
both sides changed
+
different domain content
⇒ declared conflict
```

---

## D4-I5

```text
conflict
⇒ no silent data loss
```

---

## D4-I6

```text
revision
⇒ metadata

NOT
⇒ sole cross-branch winner selector
```

---

## D4-I7

```text
domain hash
⇒ excludes bookkeeping fields
```

---

## D4-I8

```text
findings_history traveling identity
⇒ finding_id
```

---

## D4-I9

```text
non-Git destructive store operation
⇒ backup exists first
```

---

# 30. Invariantes de findings

## F-I1

```text
clean SESSION_CLOSED
⇒ no durable finding from that session
   remains DB-only
```

---

## F-I2

```text
grace period
⇒ producer session still running
```

---

## F-I3

```text
crash
⇒ recoverable state

NOT
⇒ clean close
```

---

## F-I4

```text
findings_history rebuildable
⇒ historical gap = 0
   AND
   future persistent DB-only gap is prevented
```

---

# 31. TDD obligatorio para D4-A

Como mínimo:

```text
1. only OURS changes
   → OURS wins cleanly

2. only THEIRS changes
   → THEIRS wins cleanly

3. both unchanged
   → unchanged

4. both change to identical domain content
   → clean merge

5. both change differently
   → conflict

6. base rev 11
   ours rev 13
   theirs rev 12
   with incompatible changes
   → conflict, NOT ours-wins

7. same domain content
   different revision/updated_at
   → no conflict

8. same finding_id
   different incompatible content
   → conflict

9. two newly inserted different findings
   → both survive

10. AUTOINCREMENT collision cannot lose a finding

11. conflict preserves both recoverable versions

12. reporting separates:
    identical / inserted / updated / deleted / conflict

13. remove BASE-awareness
    → control test goes red

14. include bookkeeping in hash
    → control test goes red

15. one side deletes, the other changes the domain
    → conflict, never a silent delete
```

---

# 32. D4-A y D4-B son tareas distintas

```text
D4-A
current topology
multiple SQLite replicas
multiple writers
        ↓
correct three-way merge
        ↓
no silent data loss
```

```text
D4-B
future topology
single durable authority
        ↓
shared PostgreSQL / service decision
        ↓
cross-session DB merge may disappear
```

D4-A corrige el sistema actual.

D4-B decide si THYROX deja de necesitar esa complejidad.

---

# 33. Relación con la arquitectura THYROX

La clasificación completa queda:

```text
                         THYROX DATA
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
      LOCAL DATA        SHARED DATA       EXECUTION DATA
          │                  │                  │
      SQLite local     ┌─────┴─────┐      RuntimeWorkspace
                       │           │      SnapshotStore
                       ▼           ▼      pool lifecycle
                  durable       ephemeral
                     │              │
              PostgreSQL?         Redis
                D4-B
```

No se deben mezclar:

```text
SnapshotStore
```

con:

```text
AgentStore / PostgreSQL / SQLite
```

Son dominios de persistencia diferentes.

---

# 34. Resultado esperado de D4

D4 debe terminar con:

```text
1. current SQLite+Git replication is correct

2. no silent lost update

3. no local-autoincrement identity for traveling findings

4. conflicts are explicit and recoverable

5. findings_history becomes rebuildable only after:
   historical backfill
   +
   lifecycle gate

6. local/session-only tables stop traveling where unnecessary
   (proposal without a task: today the store is one versioned file)

7. D4-B decides whether shared PostgreSQL exists

8. no engine migration before topology is defined
```

---

# 35. Resumen

La decisión arquitectónica no es:

```text
SQLite or PostgreSQL?
```

Es:

```text
what is the authority of each datum?
```

Hoy:

```text
SQLite
→ works as local durable storage

Git replication
→ is the source of cross-session merge complexity

Redis
→ owns shared ephemeral coordination

SnapshotStore/runtime
→ own execution/recovery state
```

Mientras no exista una autoridad durable común:

```text
D4-A
→ fixes SQLite+Git with a true three-way merge
```

Si D4-B introduce una autoridad común:

```text
D4-B
→ shared PostgreSQL becomes the durable source of truth
   for the domains that actually need cross-session sharing
```

La frontera final es:

```text
current problem
→ reconciliation correctness

future decision
→ shared authority topology
```

No se debe cambiar de motor antes de resolver esa diferencia.
