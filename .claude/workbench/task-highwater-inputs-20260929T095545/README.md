# Entradas medidas de #301 — qué garantiza `task_highwater` (sin decisión)

Sondas de sólo lectura con `bin/parallel_map` (`probe.sh`, salida en `results*.tsv`). La base se lee
con el módulo `sqlite3` de Python en modo `ro`: el contenedor no trae el cliente `sqlite3`.

## Lo medido

- **La tabla no existe en el store real.** `agent-results/agent_store.sqlite3` no tiene
  `task_highwater`: la crea `TASK_HIGHWATER_DDL` sólo cuando el harness TypeScript abre la base
  (`src/packages/tools/src/tasks.ts:65`). El store tiene 1917 filas en `tasks`, de 6 sesiones, con
  `task_id` numérico máximo 1440.
- **La premisa «el ordinal es global» es falsa en el store.** 333 `task_id` se repiten entre sesiones
  distintas, sobre 1439 ids distintos. El comentario de `schema.ts:70-77` dice que la marca es global
  «porque el ordinal también lo es: dos sesiones no deben producir dos #996»; el store y #297
  (board_ordinal por sesión) dicen lo contrario.
- **La referencia no es global: es por lista de tareas.** En 2.1.283 (`chunk-zgfcmyzt.js`),
  `Oe(e)=X(VM(e),".highwatermark")` une el directorio de UNA lista con el archivo, y el almacén la
  lee con `Re.taskListHighWaterMark(UT(e))`, clave por lista. El comentario cita la referencia
  (`hccw: 11-task-system.md:154-186`) para justificar una forma que la referencia no tiene.
- **No hay historia de esquema todavía.** El store no tiene tabla de migraciones (`schema_migrations`,
  `migrations`, `schema_version`: ninguna). La «historia» a la que entraría es la de D3-A2 (#289), en la
  que Python es dueño del esquema; `agent_store.py` no menciona `task_highwater` (0).
- **Lectura y escritura no son atómicas.** `TaskCreate` lee `siguienteOrdinal(db)` y luego inserta
  (`tasks.ts:270-272`) sin `BEGIN IMMEDIATE` ni transacción (0 en el archivo). La referencia rodea su
  marca con un lock con 30 reintentos. Que dos creaciones concurrentes den el mismo id es inferido, no
  medido.
- **Cobertura:** la nombran `src/packages/task/__tests__/schema.test.ts` y
  `src/packages/agent/__tests__/resetTaskList.test.ts`.

## Opciones para la decisión (del ejecutor)

1. **Marca por sesión** (la forma de la referencia, por lista): dentro de una sesión un id borrado no
   se reusa. Coherente con #297 (el ordinal del board es por sesión).
2. **Marca global** (la forma actual): contradice los 333 ids repetidos y #297; sólo tendría sentido
   renumerando, que `assign-ids` prohíbe («never renumbers»).
3. **Sin marca**: la identidad durable ya la da `TASK-<LAYER>-NNNN` (`assign-ids`, que nunca
   renumera); el ordinal del board queda efímero por sesión y la tabla no entra a la historia.

En las tres, si la tabla se queda: su DDL entra por la historia que posee Python (#289) y la
asignación del id pasa a una transacción `BEGIN IMMEDIATE`.

## Decisión (2026-09-29)

El ejecutor respondió sin preferencia; se aplica la opción recomendada, **marca por sesión**:
`task_highwater` garantiza que dentro de una sesión un id borrado no se reusa. No garantiza unicidad
entre sesiones; la identidad durable es `TASK-<LAYER>-NNNN`. Implementación en #311: clave por
`session_id`, asignación en `BEGIN IMMEDIATE`, comentario corregido y DDL por la historia de Python
(depende de #289).
