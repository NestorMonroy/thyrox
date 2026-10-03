# versioned-store-turn-loop

## El encargo

> «siempre se guarda algo después de commit, podemos analizar el hook y poner
> una regla que si se hace un PR ya no se tiene que ejecutar el hook?» y, ante
> la primera respuesta, «¿solo esos arreglos? porque no analizas bien» — el
> ejecutor, 2026-10-03.

## La premisa, si se corrigio al primer comando

No lo escribe un git hook ni el merge de un PR. Lo escribe un hook **del
cliente** al terminar cada turno. Los git hooks son locales al clon: un merge
hecho en GitHub no ejecuta ninguno, así que «no correr el hook si hay PR» no
cambia nada.

## Los resultados

*Métrica:* mtime y contenido de `agent-results/agent_store.sqlite3` antes y
después de cada paso; diferencia por tabla entre HEAD y disco (SQLite en
modo solo lectura); historial de git del archivo.
*Ciega a:* qué subagente interno corre el cliente: no deja transcripción
(`subagents/agent-<id>.jsonl` no existe), sólo su fila.

### 1. El bucle, medido paso a paso

| Paso | ¿Escribe el store? |
|---|---|
| `git commit` del store (y 50 s después) | no |
| `git push` (dos ramas) | no |
| una llamada a herramienta (`PreToolUse`, `tool_use_preflight`) | no |
| `Stop` de la plataforma (`stop-hook-git-check.sh`) | no: sólo `git diff --quiet` y `git ls-files` |
| fin de turno | **sí**: a las 06:43:32, 06:47:40 y 06:49:08, una fila nueva por turno |

La fila: `agent_sessions`, `source=hook`, `hook_event_name=SubagentStop`,
`subagent_type=desconocido`, `type_source=vacio_en_origen`, mensaje final de
45–57 caracteres. El escritor es `bin/register_session --stop`
(`~/.claude/settings.local.json`, evento `SubagentStop`). Al cerrar cada turno
el cliente corre un subagente interno sin tipo y sin transcripción; su
`SubagentStop` llega **sin `SubagentStart` previo**.

Secuencia: turno termina → `SubagentStop` interno → fila nueva en el store
versionado → el `Stop` de la plataforma ve el árbol sucio y pide commit → se
commitea → el siguiente turno vuelve a ensuciarlo. Por eso la rama de trabajo
nunca queda limpia.

### 2. Todos los escritores de rutas versionadas

| Evento | Escritor | Escribe en | ¿Versionado? |
|---|---|---|---|
| `SubagentStop` | `register_session --stop` | store (`agent_sessions`) | sí |
| `SubagentStart` | `register_session --start` | store | sí |
| `SubagentStart`/`Stop` | `measure_delta`, `save_result.mjs` | `/home/user/kaupamex-docs/.claude/agent-results` | ese clon no existe aquí: sin efecto medible (INFERRED) |
| `TaskCreated`/`TaskCompleted` | `task_lifecycle` | store (`tasks`) | sí |
| `pre-commit` (si el store va en el commit) | `board_sync reconciliar-todo --aplicar` + `git add` | store | sí |
| `post-commit` | sincroniza el índice | nada | — |
| `thyrox-bg start` | `bg.sh` | `.claude/jobs/<nombre>-<ts>/` | sí (sin rastrear hasta commitearlo) |
| uso manual | `agent_store agregar-hallazgo`, `task_ids` | store | sí |

### 3. Lo que cuesta

| Medida | Valor |
|---|---|
| filas de `agent_sessions` de subagentes internos | 1 523 de 2 048 (74 %), 615 491 de 693 708 bytes de metadata (89 %); desde 2026-08-18 |
| filas internas en esta sesión | 187 |
| versiones del store en el historial | 427 blobs, 5,3 GB lógicos, **727,5 MB en disco** |
| peso de `.git/objects` | 1 653 MB: el store es el **44 %** del repositorio |
| commits que tocan el store | 354 en total, 89 en las últimas 24 h |
| commits que sólo tocan el store, 24 h | 40 |
| tablas más pesadas | `agent_sessions` 3,38 MB, `tasks` 2,84 MB, `findings_history` 1,60 MB, `documents` 1,57 MB, `cleared_tool_results` 0,96 MB |

### 4. Un segundo defecto encontrado de paso

13 sesiones `general-purpose` del 2026-09-30 siguen en `running` sin ninguna
fila `completed` del mismo `agent_id`: su cierre nunca se registró. El
registro de sesiones no distingue hoy «terminó» de «se perdió el cierre».

### 5. Lo que ya está decidido o abierto

- **ADR-006 1.3.0** (`.claude/rules/persistencia-y-procesos.md`): «SQLite es
  local; lo compartido no viaja por git»; no se hace base compartida con
  archivos fusionados por `merge=sqlite-union`; `agent_sessions` y `tasks` van
  a PostgreSQL (D4-B). Hoy el repo hace exactamente lo que esa revisión
  descarta.
- **#350** «Datos D4-B — topología de la autoridad durable compartida»:
  pendiente.
- **#1219** «Decidir la forma durable del store: partición por
  reconstruibilidad y volcado de texto»: pendiente. Es la decisión que este
  análisis alimenta.
- **#64** «Decidir si el tablero de texto es la FUENTE o un render del
  sqlite»: pendiente.
- **H-DOCS-481** (`register_session.py:type_source`): el tipo vacío se
  registra a propósito como `vacio_en_origen`. Filtrar «sin tipo» tiraría
  también subagentes reales cuyo `SubagentStop` llega sin tipo.

## Opciones, de menor a mayor alcance

| # | Qué | Efecto | Coste / riesgo |
|---|---|---|---|
| 1 | `register_session --stop` no crea fila para un `agent_id` **sin `SubagentStart` previo** (el interno del cliente) | corta el ensuciado por turno y el 74 % de las filas | pequeño; no toca H-DOCS-481 porque el criterio es la ausencia de inicio, no el tipo vacío |
| 2 | registrar el cierre perdido: una sesión `running` cuyo dueño ya no vive pasa a un estado declarado | cierra las 13 colgadas | pequeño; mismo módulo |
| 3 | partición del store por reconstruibilidad (#1219): telemetría de sesión (`agent_sessions`, `cleared_tool_results`) a un SQLite **local no versionado** | el store versionado sólo cambia cuando cambia algo que se comparte | medio; consumidores de esas tablas |
| 4 | versionar un **volcado de texto** determinista (hallazgos, tareas) en lugar del binario | diffs legibles, merge sin driver, sin blobs de 13 MB por commit | medio; decide #64 |
| 5 | D4-B: autoridad compartida en PostgreSQL (#350) | lo que ADR-006 1.3.0 ya prescribe | grande |

El historial ya escrito (727,5 MB) no se recupera sin reescribir la historia,
y eso no es nuestro de hacer; las opciones 3–5 detienen su crecimiento.

Recomendación: 1 y 2 ya, como primera tarea de worker (son pequeñas, locales
y verificables); 3 y 4 como decisión de #1219; 5 sigue su curso en #350.

## Decisión del ejecutor (2026-10-03) y lo que exige antes de aplicarla

> «`agent_store.sqlite3` debe dejar de ser un artefacto versionado y
> compartido por Git […] SQLite local para runtime + PostgreSQL como autoridad
> durable + Git sólo para representaciones textuales/versionables».
> Secuencia del ejecutor: clasificar → dejar de versionar → telemetría a
> SQLite local → lifecycle con `orphaned`/`abandoned` → identidad explícita de
> ejecución Thyrox → `register_session` separa lifecycle de telemetría → D4-B →
> proyecciones de texto → retirar `sqlite-union` → decidir sobre la historia.

### Paso 1 — clasificación de las tablas (`outputs/store-tables.tsv`)

| Tabla | Filas | MB | Clase | Por qué |
|---|---|---|---|---|
| `tasks` | 2 421 | 2,84 | DURABLE | sujeto, estado y cita `TASK-<CAPA>-NNNN`; ADR-006 1.3.0 la manda a D4-B |
| `findings_history` | 1 737 | 1,60 | DURABLE | los hallazgos y sus versiones; índice de búsqueda entre sesiones (CLAUDE.md paso 5) |
| `findings_fts*` | 1 737 | ~0,6 | DERIVED | índice FTS5 de `findings_history`; se reconstruye |
| `agent_sessions` | 2 049 | 3,39 | TELEMETRY (parcialmente DURABLE) | 74 % son subagentes internos del cliente; el resto, sesiones de agentes reales |
| `cleared_tool_results` | 3 379 | 0,96 | TELEMETRY | resultados de herramienta vaciados por compactación: hash y tamaño |
| `documents` | 6 515 | 1,57 | DERIVED | fechas y retención por ruta de documento; se recalcula desde git |
| `schema_migrations`, `sqlite_sequence` | 14, 1 | 0 | CACHE (del motor) | estado del esquema |
| `merge_conflicts`, `task_session_highwater` | 0, 0 | 0 | TELEMETRY | vacías |

### Lo que depende de que el store viaje por git (Search Existing)

| Dependiente | Qué asume |
|---|---|
| `.gitattributes:1` + `src/agents/merge_sqlite_union.py`, `merge_stores.py`, `install-hooks.sh`, `tests/agents/test-merge-sqlite-union.sh`, `tests/verify/test-gitattributes.sh` | el store se fusiona entre ramas y clones |
| `.githooks/pre-commit:336-348` (`board_sync reconciliar-todo` + `git add`) | el store va en el commit; con el archivo ignorado ese `git add` falla |
| `.githooks/post-commit` | sincroniza el índice del store tras un commit por pathspec |
| `src/repo/pending_work.py` (eje `telemetry`) | el gate de Stop **propio** ya separa telemetría de trabajo; el de la plataforma (`stop-hook-git-check.sh`) no, y no es nuestro |
| `bin/hallazgo_ids propose-id`, `check_finding_id_unique.py` | leen las filas de hallazgos del store como segunda fuente frente a los `.rst` |
| 11 suites de `tests/agents`, `tests/verify`, `tests/repo` | el store versionado en `agent-results/` |

### Conflicto de autoridad — sin resolver

`.gitignore:70-75`, **directiva del ejecutor 2026-09-06**: «TODO es
evidencia, así que NADA de esto se ignora […] el store sqlite […] Ignorarlos
deja el trabajo tan durable como el contenedor, que es el nivel 4 de
niveles-de-retencion.md: completitud percibida sin persistencia».

Hoy git es la **única** vía por la que el store sobrevive al contenedor: el
PostgreSQL local vive en un volumen de esta VM, que muere con ella (ADR-008
1.5.0, «Durable respecto a qué»; D4-B #350 sigue pendiente). Dejar de
versionarlo **antes** de que exista otro hogar durable fuera del contenedor
pierde `tasks` y `findings_history` cuando la sesión se recicle.

Condición para el paso 2 sin perder nada: que lo DURABLE (`tasks`,
`findings_history`) tenga antes una salida que sobreviva al contenedor — la
proyección de texto determinista versionada en git (paso 8 del ejecutor,
adelantado sólo para esas dos tablas) o D4-B. La telemetría sí puede quedar
local desde ya, si se acepta que muere con el contenedor.

## Search Existing — matriz y punto de ruptura (2026-10-03)

Matriz completa: `outputs/search-existing-matrix.tsv` (autoridad, archivo/símbolo,
consumidores, pruebas, decisión).

### Dónde deja de respetarse «la telemetría viaja, no dispara»

La semántica **existe, está probada y no se ejecuta**:

1. `src/repo/pending_work.py` separa el eje `telemetry` (`_split`) y
   `tests/repo/test_pending_work_telemetry.py` lo prueba con anulación (5/8).
2. `src/hooks/stop_pending_work.py` lo expone como gate de `Stop` con
   `--telemetry <ruta>`.
3. **Ruptura:** ese gate tiene **cero cableado de producción**.
   `declared_wiring()` (`src/session/user_wiring.py`) declara SessionStart,
   PreModelSwitch, PreToolUse, SubagentStop, TaskCreated, TaskCompleted —
   **ninguna clave `Stop`** (`git grep` del literal: 0; nunca estuvo, el
   pickaxe acotado al archivo no da ningún commit). El `settings.local.json`
   vivo tiene las mismas siete claves. Nadie en el árbol pasa
   `--telemetry agent-results/agent_store.sqlite3`.
4. El único `Stop` efectivo en este entorno es el de la plataforma,
   `/root/.claude/stop-hook-git-check.sh` (`git diff --quiet` + untracked),
   que no conoce el eje: cuenta el blob del store como trabajo y sale 2.

Así que **no decide el mecanismo de thyrox y decide uno que no es suyo**.
Cablear el `Stop` de thyrox arregla el veredicto de thyrox, pero **no apaga**
el de la plataforma: los dos hooks corren y basta uno con exit 2. El hook del
lanzador es propiedad del anfitrión (fuera de autoridad).

### Clasificación del cambio

| Problema | Decisión | Qué |
|---|---|---|
| 1 — veredicto del Stop | EXTEND `user_wiring.declared_wiring` | entrada `Stop` → `bin/stop_pending_work --root … --telemetry agent-results/agent_store.sqlite3 --label …`; caso nuevo en `test_user_wiring.py` |
| 1b — el gate de plataforma | fuera de autoridad | no se puede editar; consecuencia: mientras el store se escriba entre commit y Stop, ese gate dispara. Lo que sí controla thyrox es **cuándo** se escribe (problema 2) |
| 2 — churn (blob por evento) | MISSING (batching) | el registro de la parada interna se acumula fuera del archivo versionado (el carrete de `hook_error_log._spool` es el sitio existente: REUSE como cola, EXTEND con modo «diferido») y se vuelca al store en el pre-commit que ya reconcilia (`.githooks/pre-commit:336-348`). Sin pérdida: la fila llega al store en el siguiente commit |
| 3 — 13 `running` y `SubagentStop` sin `Start` | EXTEND `reconcile_store` + `agent_store` CHECK | estados `orphaned`/`abandoned`/`unmatched_stop` en el lifecycle existente, asignados por evidencia del transcript; no se descarta el evento |

Invariantes respetados: el store sigue versionado, `sqlite-union` sigue siendo
el merge, no hay segundo store, ni segundo lifecycle, ni segundo pending-work,
ni se descarta telemetría. La implementación va al worker; el controlador no
muta producto.

### Corrección — búsqueda sobre todo `thyrox/**` (el ejecutor señaló que el primer pase sólo cubría `src bin tests .githooks`)

`git grep -lE` sobre todo lo versionado, agrupado por área con gawk: 1398
`.claude/workbench`, 547 `_references`, 214 `.claude/jobs`, 100 `src`, 56
`_archived`, 23 `tests`, 22 `.claude/cache`, 9 `build-logs`, 2 `bin`, 1 skill.
Thyrox no tiene aún `bin/search_existing_mechanisms` (TASK-THYROX-0769), así
que el instrumento fue `git grep` + gawk.

Lo que el primer pase **no vio** y cambia una fila:

- **`src/session/reconcile_user_hooks.py`** ya es la autoridad que **parchea
  el hook de Stop de la plataforma** (`~/.claude/stop-hook-git-check.sh`)
  de forma declarativa e idempotente: forma correcta, forma defectuosa
  conocida, y rehúsa con 2 ante una forma desconocida. Tiene un parche
  (`stop-hook-signature-only`). Así que el gate de la plataforma **no** está
  fuera de autoridad: es EXTEND de este módulo con un segundo `Patch` que
  haga que la comprobación de suciedad ignore las rutas de telemetría
  declaradas.
- **Segunda ruptura medida:** `bin/reconcile_user_hooks --check` da aquí
  `1 PENDIENTE` (el parche 1 tampoco está aplicado). Su único invocador es
  `src/session/session-start.sh:63`, y `declared_wiring()` no lo cablea
  (`settings.local.json`: 0 apariciones de `session-start`). El mecanismo
  existe y no corre, igual que `stop_pending_work`.
- `src/session/stop-hook-git-check.sh` es el porte de la era archivada:
  avisa y sale 0, sin cablear. Sólo referencia.

Clasificación revisada del problema 1: EXTEND `reconcile_user_hooks`
(parche 2, de telemetría) + EXTEND `declared_wiring` (cablear el
reconciliador en `SessionStart` `startup`). Cablear `stop_pending_work` sigue
siendo útil para el veredicto propio, pero por sí solo no corta el bucle.
