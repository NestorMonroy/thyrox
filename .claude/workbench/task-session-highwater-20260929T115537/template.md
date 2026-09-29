Separas la marca de agua del tablero en dos tablas con dos contratos distintos, y haces
atómica la asignación del id en `TaskCreate`. El `Item:` de abajo nombra los archivos
que te pertenecen; no toques ningún otro, y nada bajo `.claude/`. Edita con `sed`,
`gawk` o `bash bin/replace_literal`. Identificadores en inglés, comentarios en español.

Decisión del ejecutor (2026-09-29), opción (a):
- `task_highwater` = semántica global/legada. Se CONSERVA INTACTA: nada la borra, la
  renombra, la altera, la migra ni la reutiliza. El código nuevo no la crea, no la lee y
  no la escribe. Si una base la trae, sobrevive al upgrade sin cambio de contenido ni de
  significado. (Hoy ninguna base real la tiene; el diseño tiene que seguir siendo
  compatible con una que sí.)
- `task_session_highwater` = semántica por sesión, en tabla propia:
  `session_id TEXT NOT NULL PRIMARY KEY`, `next_task_id INTEGER NOT NULL CHECK
  (next_task_id >= 1)` = el PRÓXIMO id a asignar en esa sesión. Declárala en
  `src/packages/task/schema.ts` como `TASK_SESSION_HIGHWATER_DDL` (`CREATE TABLE IF
  NOT EXISTS`, idempotente), con un comentario que diga lo medido: el store real repite
  333 `task_id` entre sesiones, la referencia (2.1.283) guarda `.highwatermark` por
  lista de tareas, y la identidad durable es `TASK-<LAYER>-NNNN`. Corrige también el
  comentario de `TASK_HIGHWATER_DDL` (hoy afirma que el ordinal es global y lo atribuye
  a la referencia): déjalo como la forma legada que el código ya no usa, sin retirar la
  constante si algo la importa.
- Adopción sin fila: `next_task_id = MAX(task_id numérico DE ESA SESIÓN) + 1` (1 si la
  sesión no tiene filas). Otras sesiones no influyen.
- `TaskCreate`: `BEGIN IMMEDIATE` → leer (o adoptar) → asignar → incrementar → insertar
  la fila → `COMMIT`; `ROLLBACK` si falla. Sin reintentos inventados (`openLocal` ya
  fija `busy_timeout`).
- Borrar una tarea no baja `next_task_id`: `subirMarca` deja de tocar la tabla legada.
- No toca `citation_id`, `board_ordinal` ni el lado Python. La entrada del DDL en la
  historia de esquema que posee Python queda fuera (depende de otra tarea).

Lo medido antes (léelo): `.claude/workbench/task-highwater-session-20260929T113337/template.md` y `.claude/workbench/task-highwater-inputs-20260929T095545/README.md`.
La clave de `tasks` es `(session_id, task_id)`: una colisión no duplica el id, hace
fallar la segunda creación con `UNIQUE constraint failed`.

TDD en `src/packages/tools/__tests__/taskSessionHighwater.test.ts`. PRIMERO intenta
reproducir la colisión concurrente en la MISMA sesión con el código actual (N procesos
`bun` con `Bun.spawn` tras una barrera de archivo, mismo SQLite); informa si se
reprodujo, con N y repeticiones, o que no, y el riesgo sigue inferido. Después, como
mínimo estos casos:
1. base nueva sin `task_highwater`: la primera creación da 1 y `task_highwater` sigue
   sin existir;
2. base antigua con `task_highwater` (`clave='__global__'`, `max_id=999`): la
   creación en una sesión con filas 1..3 da 4;
3. dos sesiones mantienen marcas independientes (A con filas 1..5, B con 1..40: A da 6,
   B da 41; crear en A no mueve B);
4. reinicio: cerrar y reabrir la base conserva la marca (borrar la tarea 5 de A y crear
   otra, tras reabrir, da 7 si la marca ya estaba en 6, nunca 5);
5. concurrencia: procesos en DOS sesiones a la vez no colisionan, y en UNA sesión dan
   ids distintos y consecutivos;
6. idempotencia: abrir la base y crear el DDL dos o tres veces no cambia filas ni esquema;
7. la tabla legada queda intacta: en el caso 2 compara antes y después su `PRAGMA
   table_info`, su `sqlite_master.sql` y sus filas; tienen que ser idénticos.
`src/packages/agent/__tests__/resetTaskList.test.ts` sólo si nombra la forma vieja.
Control de anulación: retira el `BEGIN IMMEDIATE` y corre la prueba de concurrencia de
una sesión: debe caer esa y sólo ésa (si no cae, sube la presión hasta que discrimine y
dilo); publica los conteos y restaura.

Cierre del ítem (obligatorio):
- Todo en primer plano; sin trabajos en segundo plano ni `git stash`.
- No ejecutes `bash bin/typescript-build-javascript` ni construyas `dist/`.
- `src/packages/task/__tests__/schema.test.ts` tiene 3 rojos previos (la base Python
  declara `board_ordinal` y el piso TS no, H-THYROX-267): no son de este ítem, no los
  arregles; el verify los admite por nombre exacto y ninguno más.
- Tu mensaje final incluye la reproducción (o su ausencia), el verde de
  `bun test src/packages/tools/__tests__` y el control de anulación con conteos.
