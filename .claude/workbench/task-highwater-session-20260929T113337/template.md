Llevas la marca de agua del tablero (`task_highwater`) de una clave global a una por
sesión, y haces atómica la asignación del id en `TaskCreate`. El `Item:` de abajo nombra
los archivos que te pertenecen; no toques ningún otro. Edita con `sed`, `gawk` o
`bash bin/replace_literal`. Identificadores en inglés, comentarios en español.

Lo medido (banco `.claude/workbench/task-highwater-inputs-20260929T095545/README.md`,
léelo entero antes de empezar):
- `siguienteOrdinal` (`src/packages/tools/src/tasks.ts`) numera con
  `MAX(task_id)` sobre TODO el tablero más la marca `clave='__global__'`; `subirMarca`
  sube esa marca global al borrar. `TaskCreate` lee el ordinal y luego inserta, sin
  transacción.
- El store real repite 333 `task_id` entre sesiones: el ordinal NO es global. La
  referencia (2.1.283) guarda `.highwatermark` por lista de tareas, no global. El
  comentario de `TASK_HIGHWATER_DDL` en `src/packages/task/schema.ts` dice lo contrario
  y cita la referencia para una forma que no tiene.
- La clave primaria de `tasks` es `(session_id, task_id)`: si dos creaciones
  concurrentes leen el mismo ordinal, la segunda no duplica el id, FALLA con
  `UNIQUE constraint failed`. Ésa es la forma observable de la colisión.

Contrato fijado por el ejecutor:
1. `task_highwater` pertenece a una sesión: `session_id TEXT PRIMARY KEY`,
   `next_task_id INTEGER NOT NULL` = el PRÓXIMO id a asignar (no el mayor asignado).
2. Adopción sin fila de marca: `next_task_id = MAX(task_id numérico DE ESA SESIÓN) + 1`
   (1 si la sesión no tiene filas). Ciego a ids borrados antes de adoptar: se acepta.
   Filas de otras sesiones no influyen.
3. Asignación en `BEGIN IMMEDIATE`: leer (o adoptar) → asignar → incrementar la marca →
   insertar la fila → `COMMIT`; `ROLLBACK` si algo falla. Sin reintentos inventados:
   `openLocal` ya fija `busy_timeout`.
4. Borrar una tarea no baja `next_task_id` (la sesión nunca reusa un id borrado).
5. Base con la forma vieja (`clave`, `max_id`): la marca global no es atribuible a
   ninguna sesión, así que se descarta y cada sesión adopta desde sus filas. Detecta la
   forma con `PRAGMA table_info(task_highwater)`, retira la tabla vieja y crea la nueva,
   en una transacción. No mezcles las dos semánticas (`max_id` vs `next_task_id`).
6. No toca `citation_id` ni `board_ordinal`. No toques el lado Python: la entrada del DDL
   en la historia de esquema que posee Python depende de otra tarea y queda fuera.
7. Reescribe el comentario de `TASK_HIGHWATER_DDL` con lo medido (por sesión, como la
   referencia por lista; la identidad durable es `TASK-<LAYER>-NNNN`), y el de
   `siguienteOrdinal`, que hoy afirma que el ordinal es del proyecto.

TDD, en este orden, en `src/packages/tools/__tests__/taskHighwater.test.ts`:
- PRIMERO intenta reproducir la colisión con el código ACTUAL: N procesos `bun`
  (`Bun.spawn`, con un script auxiliar si hace falta) que crean tareas en la MISMA
  sesión y el mismo archivo SQLite a la vez, arrancados tras una barrera (p. ej. un
  archivo que todos esperan). Cuenta ids asignados y fallos `UNIQUE`. Informa en tu
  mensaje final si se reprodujo y con qué N y cuántas repeticiones; si no se reproduce,
  dilo: el riesgo sigue inferido. No la declares reproducida sin salida que lo muestre.
- La prueba de concurrencia, tras el arreglo: todos los procesos terminan sin error y
  los ids son distintos y consecutivos.
- Adopción: sesión A con filas 1..5 y sesión B con 1..40 → el próximo id de A es 6.
- Marca por sesión: borrar la tarea 5 de A y crear otra → 6, no 5; B no se ve afectada.
- Migración: base con la tabla vieja (`clave='__global__'`, `max_id=999`) → la primera
  creación de una sesión con filas 1..3 da 4, y la tabla vieja ya no existe.
- `src/packages/task/__tests__/schema.test.ts` tiene hoy 3 rojos previos (la base Python
  declara `board_ordinal` y el piso TS no): no son de este ítem, no los arregles; el
  verify los admite por nombre exacto y rechaza cualquier otro.
- Actualiza `src/packages/task/__tests__/schema.test.ts` y
  `src/packages/agent/__tests__/resetTaskList.test.ts` sólo si nombran la forma vieja.

Control de anulación: retira el `BEGIN IMMEDIATE` (deja lectura e inserción sueltas) y
corre la prueba de concurrencia: debe caer esa prueba y sólo ésa. Publica los conteos y
restaura. Si con la transacción retirada NO cae, la prueba no discrimina: auméntale la
presión (más procesos, más creaciones por proceso) hasta que discrimine, y dilo.

Cierre del ítem (obligatorio):
- Todo en primer plano. No lances trabajos en segundo plano, no uses `git stash` ni
  termines esperando una notificación.
- Corre `bun test src/packages/tools/__tests__ src/packages/task/__tests__/schema.test.ts
  src/packages/agent/__tests__/resetTaskList.test.ts` y pega el resumen.
- No ejecutes `bash bin/typescript-build-javascript` ni construyas `dist/`: si se
  reescriben los `package.json`, ese cambio entra en tu parche y se rechaza.
- Tu mensaje final incluye la reproducción (o su ausencia), el verde final y el control
  de anulación con sus conteos.
