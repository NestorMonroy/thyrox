Implementas en thyrox (Python), en TDD, la identidad de una tarjeta del board en el store de tareas
(`agent-results/agent_store.sqlite3`, tabla `tasks`). El `Item:` de abajo nombra los archivos que te
pertenecen; no toques ningún otro.

El defecto (hallazgo H-THYROX-252, análisis en
`.claude/workbench/task-id-analysis-20260929T073702/README.md`): `ingest_board`
(`src/task/task_ids.py`) deduplica por `subject` y guarda `task_id = MAX(task_id)+1`; el ordinal del
board no se guarda. Una tarjeta renombrada en el board se ve como sujeto nuevo y recibe una SEGUNDA
cita. Además hay dos escritores con semántica distinta de `task_id`: `snapshot-tareas`
(`src/agents/agent_store.py`, el `INSERT INTO tasks … ON CONFLICT(session_id, task_id)`) usa el id de
la tarjeta; `ingest_board` usa un contador.

Decisión del ejecutor:
1. La identidad de una tarjeta es `(session_id, board_ordinal)`. Columna nueva
   `board_ordinal INTEGER` (nullable) en `tasks`, e índice único PARCIAL
   `CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_board_ordinal ON tasks(session_id, board_ordinal)
   WHERE board_ordinal IS NOT NULL`. Se añade con el mismo mecanismo de detección que ya usan
   `_migrate_tasks_citation_columns` y sus hermanas (y en el `CORE_SCHEMA` para una base nueva), en el
   orden correcto respecto a la recreación de la tabla. Las filas históricas quedan con `NULL`.
2. `subject` NUNCA deduplica. `citation_id` es la referencia durable. `task_id` queda como contador
   interno, sin significado de identidad.
3. `ingest_board(store, board, session, ordinals, layer)`: por cada ordinal busca la fila
   `(session, board_ordinal)`. Si existe: no crea otra; si su cita es nula la asigna; si el sujeto,
   la descripción o el estado de la tarjeta cambiaron, actualiza esos campos y conserva la cita. Si
   no existe: inserta una fila con `board_ordinal` y cita nueva. Es aditiva: nunca reasigna una cita.
4. Una sesión con filas `board_ordinal IS NULL` no está reconciliada: `ingest_board` REHÚSA
   (`MappingError`, nada escrito) nombrando cuántas filas sin ordinal tiene la sesión. Sin esto, una
   tarjeta cuya fila histórica no tiene ordinal recibiría una segunda cita, que es el defecto.
5. Función nueva `link_board_ordinal(store, session, citation_id, board_ordinal)` (y su subcomando,
   nombre en inglés: `link-board-ordinal`): fija el ordinal de UNA fila existente de esa sesión cuya
   columna es `NULL`. Rehúsa si la cita no existe en la sesión, si la fila ya tiene otro ordinal, o si
   el ordinal ya pertenece a otra fila. Es la herramienta de la reconciliación posterior; aquí no se
   reconcilia ningún dato real.
6. `snapshot-tareas` escribe `board_ordinal` con el id de la tarjeta en cada fila que inserta o
   actualiza (su `task_id` sigue igual).
7. `agent_store.connect` sobre un store existente es idempotente: correrlo dos veces no cambia nada;
   las filas existentes quedan byte a byte iguales salvo la columna nueva en `NULL`.

Controles de anulación (dilos con el conteo exacto de lo que cae): retirar el índice parcial; hacer
que `ingest_board` vuelva a deduplicar por sujeto (la prueba de la tarjeta renombrada tiene que caer:
con el sujeto como clave, la tarjeta renombrada recibe una segunda cita); retirar el rechazo de la
sesión no reconciliada; retirar la escritura de `board_ordinal` en `snapshot-tareas`.

Reglas:
- Identificadores, funciones, firmas, subcomandos y archivos nuevos en inglés; comentarios y
  docstrings en español técnico, sin coloquialismos, términos técnicos en inglés. El verbo para dar
  un id es «assign», nunca «mint». NO renombres los subcomandos ni los identificadores españoles que
  ya existen (`ingerir-board`, `acunar`, `vistos`, `capa`…): ese renombre es otra tarea y va después.
- Trabaja siempre sobre stores temporales creados por la prueba (`tempfile`), nunca sobre
  `agent-results/agent_store.sqlite3` real, ni lo abras en escritura. Nada de `/tmp` fijo; restaura
  `os.environ`. No leas stdin. Sin dependencias ni variables nuevas.
- Los escritores de Bun (`src/packages/tools/src/tasks.ts`, `src/packages/task/`) NO se tocan: no
  añaden la columna ni la escriben. Enuméralos en tu respuesta con lo que harían falta.
- Sin trabajos en segundo plano ni `tests/run.sh`. No commitees.
- Al terminar, en verde: `python3 tests/task/test_task_ids.py`, `python3 tests/task/test_board_sync.py`,
  `python3 tests/task/test_layer_axis.py`, `bash tests/agents/test-agent-store-tareas.sh` y
  `bash tests/agents/test-agent-store-reassignment-guard.sh`. Responde con archivos cambiados, cada
  garantía y su prueba, los controles de anulación con su conteo, los escritores de Bun pendientes y
  un resumen de dos líneas.

Estado de partida medido (antes de tu cambio): `python3 tests/task/test_task_ids.py` sale 1 con 14
`FALLA` y `python3 tests/task/test_board_sync.py` sale 1 con 9 `FALLA`. Son TODOS los casos que
invocan `src/task/task_ids.py` como programa: al correr por ruta muere con
`ModuleNotFoundError: No module named 'paths'`, porque el archivo importa `paths` sin el bootstrap
de `sys.path` que otros programas de `src/` llevan (sólo funciona a través de `bin/task_ids`, que
fija `PYTHONPATH`). El archivo es tuyo en este ítem: dale ese bootstrap con la misma forma que usan
sus hermanos de `src/` (busca cómo lo hacen, no inventes una nueva), y deja las dos suites en verde.
Dilo en tu respuesta como arreglo aparte de la identidad.
