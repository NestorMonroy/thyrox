# Datos D4 — inventario de los stores Python y del store compartido de agentes

Fase D4 del plan `fases-bases-de-datos-20260928T175719/plan-por-fases.md`.
Es discovery: mapea qué se persiste, quién lo escribe y qué significa
«compartido» antes de decidir SQLite o PostgreSQL. Medido el 2026-09-29 sobre
`feature/thyrox-l6`.

## 1. «Los stores Python» son un solo archivo

Las 37 aperturas `sqlite3.connect` de `src/**/*.py` (sin pruebas) abren
`agent_store.sqlite3` (salvo la de `src/store/agent_sessions.py`, abajo), cuya ruta resuelve `reach.agent_store_path`
(`THYROX_AGENT_STORE`, si no `<thyrox>/agent-results/`). `task_ids`,
`hallazgo_ids`, `board_sync`, `reconcile_store`, `model_catalog` y el resto
son módulos de dominio sobre la misma base, no stores distintos.

Única excepción: `src/store/agent_sessions.py` abre `agent_sessions.sqlite3`,
pero sólo lo importa su propia prueba (`tests/store/test_agent_sessions.py`).
Es un porte paralelo sin consumidor.

## 2. La base tiene escritores en dos lenguas

Tablas, filas y escritores (`bin/writer_census`, `writer-census.txt`):

| Tabla | Filas | Escritores Python | Escritores TS | Semántica |
|---|---|---|---|---|
| `agent_sessions` | 1837 | `agent_store.py`, `reconcile_store.py` (9 sentencias) | `tools/agent.ts` (2) | registro de subagentes; se inserta y luego cambia de estado |
| `tasks` | 2237 | `task_ids.py`, `board_sync.py`, `agent_store.py` (18) | `tools/tasks.ts` (7) | tareas con cita durable `TASK-<CAPA>-NNNN`; cambian de estado |
| `findings_history` (+ `findings_fts`) | 1658 | `agent_store.py`, `backfill_findings_history.py` | — | índice de búsqueda de hallazgos; el `.rst` gobierna |
| `documents` | 6515 | `agent_store.py` | — | eje temporal de documentos, fechado desde git |
| `cleared_tool_results` | 2305 | — | `observability/clearedResults.ts` | telemetría por sesión |
| `task_session_highwater` | 0 | — | `tools/tasks.ts` | contador de asignación por sesión |
| `schema_migrations` | 14 | `agent_store.py` (dueño del esquema, D3-A2) | valida | ledger de migraciones |

WAL y `busy_timeout`: la concurrencia entre procesos de la misma máquina
(hooks, CLI, harness) ya está resuelta por SQLite.

## 3. «Compartido» hoy significa entre sesiones, por git

El archivo está versionado (`agent-results/agent_store.sqlite3
merge=sqlite-union` en `.gitattributes`). Lo tocan **368 commits**, 66 de
ellos el 2026-09-29. Cada sesión (contenedor efímero) escribe su copia y el
merge de git la une con `merge_sqlite_union.py`, que hace
`INSERT OR IGNORE` por clave primaria.

El store compartido de agentes es, por tanto, una base **replicada por git
con consistencia eventual**. No es una base con varios clientes concurrentes
por red.

## 4. Lo que la unión pierde — medido

`probes/union-lost-writes.py` diverge dos copias desde la misma base y ejecuta
el driver real:

| Caso | Escrito | Tras el merge | Salida del driver |
|---|---|---|---|
| actualización de fila existente (`agent_sessions.status` → `completed` en el otro lado) | `completed` | `running` | exit 0 |
| dos hallazgos nuevos que reciben el mismo `id AUTOINCREMENT` | H-OURS-1, H-THEIRS-1 | sólo H-OURS-1 | exit 0 |
| control: el otro hallazgo con `id` distinto | H-OURS-1, H-THEIRS-1 | los dos | 1 fila unida |

El driver avisa «N filas omitidas por clave ya presente», pero N incluye las
miles de filas iguales en los dos lados (11 073 aquí). La pérdida no se
distingue en esa cifra.

Forma de las claves (`pk-por-tabla.txt`): sólo `findings_history` usa un
entero local `AUTOINCREMENT`; las demás usan claves de texto naturales.
Las tablas mutables (`agent_sessions`, `tasks`, `findings_history`,
`documents`) ya tienen `updated_at`. Hay un trigger que lo sella en
`agent_sessions`.

*Métrica:* estado de las filas tras ejecutar el driver real sobre dos copias
del esquema real.
*Ciega a:* cuántas escrituras se perdieron ya en los 368 merges reales, y a
la colisión de citas `TASK-*` acuñadas por dos sesiones a la vez (la clave
de `tasks` incluye `session_id`, así que las dos filas sobreviven; si la cita
se duplica, eso se mide aparte).

## 5. Matriz D4

| Dato | Dueño | Frontera de uso compartido | Vida | Candidato |
|---|---|---|---|---|
| `agent_sessions`, `tasks` | `agent_store.py` (esquema); dominios task/agent | entre sesiones, por git | durable, mutable | durable compartido: hoy SQLite+git con pérdida de actualizaciones |
| `findings_history` | `agent_store.py` | entre sesiones, por git | durable; índice del `.rst` | igual, más colisión de `id` |
| `documents` | `agent_store.py` | se deriva de git | reconstruible | cache local; no necesita viajar |
| `cleared_tool_results`, `task_session_highwater` | observability / tools | una sesión | local | SQLite local |
| estado de pool y ejecución (`.thyrox/runtime`, ledgers, historial de pool) | `pool_lifecycle`, `wait-jobs`, `pool_history` | ejecución | recuperable | nivel A / SnapshotStore; no es persistencia de dominio |
| leases, cuotas, enfriamientos | proxy | entre proxies | efímero | Redis (R1–R5) |

## 6. Qué decide esto, y qué no

PostgreSQL resuelve la pérdida sólo si **todas** las sesiones alcanzan el
mismo servidor. Hoy cada contenedor es efímero y el PostgreSQL de la
infraestructura Podman es local a cada uno: no hay servidor común. Un
PostgreSQL por contenedor reproduciría la misma divergencia, ahora sin driver
de merge. Tampoco hay `psycopg` en `.venv`.

Por eso la decisión del ejecutor tiene dos preguntas, no una:

1. **¿Existirá un servidor PostgreSQL común a todas las sesiones?** Si sí,
   `agent_sessions`, `tasks` y `findings_history` son sus candidatos, y el
   camino es un puerto de dominio con adaptadores SQLite y PostgreSQL (Python
   dueño del esquema, psycopg). Si no, el motor no cambia nada.
2. **Mientras tanto, ¿se corrige la unión?** Sin cambiar de motor:
   última escritura gana por `updated_at` para las filas mutables, y clave
   natural (`finding_id`) en lugar del `id` local para `findings_history`.

`documents` y las tablas por sesión no necesitan viajar en ningún caso.

## 7. Revisión tras la lectura del ejecutor (2026-09-29)

La pregunta de D4 deja de ser «SQLite o PostgreSQL». Pasa a ser: **¿existe
una autoridad durable única, alcanzable por todas las sesiones que escriben?**
Hoy no existe. Lo que existe es una base replicada por git, y su unión es la
que pierde datos, no SQLite.

### `findings_history` NO es reconstruible hoy — medido

DEC-07 de `agent_store.py` la declara índice reconstruible y
`backfill_findings_history.py` la rehace desde los `.rst`. Contrastado contra
todo `kaupamex-docs/source/` (`findings-rebuildable.txt`):

| | Cuenta |
|---|---|
| filas | 1659 |
| filas con `.rst` propio | 1580 |
| filas sin `.rst` en ninguna parte (ni monolito) | **79** — 76 `H-THYROX`, 3 `H-API`/`H-SERVER`, `L-032` |
| `.rst` sin fila | 10 |

Una reconstrucción desde los `.rst` borraría 79 hallazgos. La declaración
«el RST siempre gana» es cierta en el diseño, pero no en el estado: la
ventana entre fila y archivo que `CLAUDE.md` admite como legítima se congeló
en 79 casos. Hasta que esos 79 tengan su `.rst` (se generan desde su fila con
`bin/finding rst`; TASK-THYROX-0628), `findings_history` es verdad
durable compartida y su unión tiene que preservar filas. Cuando la brecha sea
cero, pasa a ser caché local y deja de necesitar viajar.

*Métrica:* `finding_id` de la tabla contra los nombres `hallazgo-<ID>-*.rst`
de todo `source/`, más una búsqueda del id en los monolitos `audits/hallazgos-*`.
*Ciega a:* un hallazgo cuyo `.rst` tiene otro nombre de archivo, y a que el
cuerpo del `.rst` contenga lo mismo que la fila.

### El dueño del esquema

D3-A2 (TASK #289) fijó a `agent_store.py` como dueño del esquema y a Bun como
validador: fue una decisión del ejecutor para el motor SQLite, no sólo un
hecho histórico. Lo que queda abierto, y va a D4-B, es quién es dueño del
**contrato** si aparece un segundo motor. Qué lenguaje ejecuta las
migraciones se decide después.

### Matriz refinada

| Dato | Naturaleza | Autoridad hoy | Destino |
|---|---|---|---|
| `agent_sessions` | durable, mutable, entre sesiones | la base (replicada por git) | PostgreSQL si hay autoridad común; mientras tanto SQLite + unión corregida |
| `tasks` | durable, mutable, entre sesiones; citas `TASK-*` | la base | igual |
| `findings_history` | índice por diseño; verdad durable en 79 filas | la base mientras la brecha no sea 0 | tras cerrar la brecha: caché local reconstruible |
| `documents` | derivado de git | git | SQLite local |
| `cleared_tool_results`, `task_session_highwater` | de una sesión | la sesión | SQLite local |
| leases, cuotas, enfriamientos | efímero entre proxies | Redis | Redis |
| pool y runtime | estado de ejecución | lifecycle / SnapshotStore | fuera de la persistencia de dominio |

### Dos tareas, no una

- **D4-A — corrección de la replicación SQLite+git** (TASK-THYROX-0626,
  implementable ya): última escritura gana por `updated_at` en filas mutables,
  `findings_history` unida por `finding_id`, y un informe por tabla que separe
  fila idéntica, insertada, actualizada y conflicto real. En TDD, con la sonda
  de este banco como caso rojo y su control.
- **D4-B — topología de la autoridad durable compartida** (TASK-THYROX-0627,
  discovery): dónde
  vive un PostgreSQL común, quién lo opera, cómo lo encuentran las sesiones,
  qué pasa sin red, quién es dueño del contrato y de las migraciones, si
  Python abre la base directamente o pasa por un puerto o servicio. No se
  toca `InfrastructureBootstrap`: su PostgreSQL es local a cada sesión.
  Ninguna migración de motor antes de que D4-B tenga respuesta.
