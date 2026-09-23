# Los alimentadores del store (H-THYROX-159)

`bin/agent_store censo-tablas` mostró 0 filas de hoy en `agent_sessions`,
`documents` y `tasks`. Por tabla:

| Tabla | Fuente | Veredicto |
|---|---|---|
| `agent_sessions` | transcripts de subagentes (`reconcile_store`) | al día: 0 transcripts en `/root/.claude/projects/**/subagents/`, ruta verificada |
| `documents` | `fechar-documentos` y `clasificar-documentos` sobre docs | faltaban 11 documentos; llenada: 5547 filas fechadas y 95 clasificadas |
| `tasks` | board → `snapshot-tareas` → `ingerir-board` | no había board; 4 tareas reales registradas y volcadas |
| `cleared_tool_results` | bucle de agente del producto | no aplica a esta sesión |
| `findings_history` | `agregar-hallazgo` | al día |

Defecto corregido: `ingerir-board` saltaba un sujeto ya presente aunque su
fila no tuviera cita (la deja así `snapshot-tareas`). Ahora acuña en esa fila;
una cita existente nunca se reasigna. Anulación `ingest-uncited`: caen
exactamente 10f, 10g y 10h de `tests/task/test_task_ids.py`.

Sin fix: el disparo automático sin hooks (sucesor TASK-THYROX-0243).
