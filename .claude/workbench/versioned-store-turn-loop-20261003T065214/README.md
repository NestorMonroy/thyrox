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
