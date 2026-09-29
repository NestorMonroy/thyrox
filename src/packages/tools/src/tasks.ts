/**
 * Herramientas de tablero `Task*` (T-019, corregidas en T-061).
 *
 * El tablero no se reinventa: su esquema es el que `.claude/agent-results/`
 * ya tiene, y desde la partición del sujeto vive en `src/packages/task/schema.ts` —
 * aquí queda la SUPERFICIE de herramienta, que es lo único propio del
 * harness. La forma de la tabla la comparten dos lenguas, así que
 * declararla dentro de su consumidor la ataba al sitio equivocado —
 * las tres herramientas morían con `no such table: tasks` en cualquier base
 * que no fuera la del proyecto, y un harness que sólo funciona dentro de un
 * repo concreto no es propio. Que el DDL de aquí y el del store coincidan lo
 * verifica un test contra el esquema real, no la buena voluntad de quien edite.
 *
 * Tres cosas que la primera versión no tenía, y sin las cuales el tablero no
 * responde a la pregunta que motiva su existencia — «¿qué puedo continuar
 * ahora?»:
 *
 * 1. **La asociación.** `blocked_by_json`/`blocks_json` son las columnas que
 *    distinguen una lista de una agenda. Medido sobre el tablero real: 56 de
 *    995 filas declaran una arista. Sin leerlas, «continuar en automático las
 *    tareas asociadas» es una pregunta sin instrumento.
 * 2. **El alcance por sesión.** La clave primaria real es
 *    `(session_id, task_id)` porque el ordinal reinicia por sesión: medido,
 *    **seis** ids conviven en dos sesiones distintas, y una de las filas en
 *    colisión es literalmente «Fijar cómo se cita una tarea, ahora que los ids
 *    reinician por sesión». Un `UPDATE ... WHERE task_id = ?` sin sesión toca
 *    las dos.
 * 3. **El ordinal.** El tablero cita `#996`, no un UUID. Un identificador que
 *    no se puede citar en un hallazgo no sirve de referencia cruzada.
 *
 * El vocabulario de `status` también sale del tablero real, medido:
 * `pending`, `in_progress`, `completed`. Un estado fuera de ésos se rechaza
 * nombrando los válidos — la columna no lleva CHECK, así que el guard es lo
 * único que impide que el tablero acumule estados que nadie sabe leer.
 */
import { Database } from 'bun:sqlite'
import { openLocal } from '@thyrox/store/db.ts'
import { validateMigrationLedgerSync } from '@thyrox/store/migrationLedger.ts'
import {
  pythonMigrations, selectCitationId, TASK_STATUSES, UPDATE_STATUSES,
} from '@thyrox/task/schema.ts'
import type { Tool, ToolContext, ToolResult } from '@thyrox/agent/loop/types'

export type TaskToolOptions = { dbPath: string; sessionId?: string }

/**
 * El `source` que separa la lista efímera del tablero durable (T-063).
 *
 * Comparten tabla porque comparten esquema —`active_form` es literalmente la
 * columna de `TodoWrite`— pero **no** comparten ciclo de vida: `TodoWrite`
 * reemplaza su lista entera en cada llamada, y el tablero real tiene 995 filas
 * que ninguna escritura en bloque debe poder barrer. La frontera es una
 * columna, no una convención: `TaskList` filtra por ella y `TodoWrite` sólo
 * borra dentro de ella.
 */
const FUENTE_TODO = 'todo'

const ok = (content: string): ToolResult => ({ content, isError: false })
const err = (content: string): ToolResult => ({ content, isError: true })

/**
 * El ledger compartido con el lado Python (`agent_store.py::MIGRATIONS_TABLE`).
 * Bun no ejecuta DDL sobre esta base — DEC-TASK 2026-09-29 (opción 1) hace a
 * Python el dueño del schema; aquí sólo se VALIDA que ya migró.
 */
const MIGRATIONS_TABLE = 'schema_migrations'

/**
 * Las migraciones declaradas por Python, leídas una sola vez: `pythonMigrations()`
 * relee y parsea `agent_store.py` en cada llamada, y `conBase` corre por cada
 * invocación de herramienta — memoizar evita esa lectura de disco repetida
 * en el camino caliente. `statements` vacío: `validateMigrationLedgerSync`
 * sólo compara version/name contra el ledger, nunca ejecuta DDL.
 */
let migrationsCache: ReturnType<typeof buildTaskMigrations> | null = null
function buildTaskMigrations() {
  return pythonMigrations().map((m) => ({ ...m, statements: { sqlite: [] as string[], postgres: [] as string[] } }))
}
function taskMigrations() {
  if (!migrationsCache) migrationsCache = buildTaskMigrations()
  return migrationsCache
}

/**
 * Abre, VALIDA que el schema ya migró y cierra: el tablero es de todos, no
 * se retiene el descriptor. Sin ledger completo, rehúsa con el mensaje
 * explícito que `validateMigrationLedgerSync` ya compone — la base la crea y
 * migra `agent_store.py` (un hook de sesión, o `bin/agent_store migrate-file`
 * en pruebas), nunca esta herramienta.
 */
function conBase<T>(dbPath: string, fn: (db: Database) => T): T {
  const db = openLocal(dbPath)
  try {
    validateMigrationLedgerSync(db, { table: MIGRATIONS_TABLE, migrations: taskMigrations() })
    return fn(db)
  } finally {
    db.close()
  }
}

type Fila = {
  task_id: string
  subject: string
  description: string | null
  status: string
  owner: string | null
  blocks_json: string | null
  blocked_by_json: string | null
}

/** Un arreglo de ids, tolerante con la columna vacía o con JSON corrupto. */
function ids(crudo: string | null | undefined): string[] {
  if (!crudo) return []
  try {
    const v = JSON.parse(crudo)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

/** Los ids que el input declara, aceptando tanto `["1"]` como `[1]`. */
function idsDeclarados(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  return valor.map((v) => String(v)).filter((v) => v.length > 0)
}

/**
 * Adopción sin fila de marca: el mayor `task_id` numérico DE ESTA SESIÓN,
 * más uno (1 si la sesión no tiene filas). Otras sesiones no influyen.
 */
function adopt(db: Database, sesion: string): number {
  const fila = db.query('SELECT MAX(CAST(task_id AS INTEGER)) AS n FROM tasks WHERE session_id = ?').get(sesion) as
    | { n: number | null }
    | undefined
  return (fila?.n ?? 0) + 1
}

/**
 * El próximo id de `sesion`, y deja la marca en `id + 1`.
 *
 * Se invoca DENTRO de la transacción `BEGIN IMMEDIATE` de `TaskCreate`: leer
 * la marca y recién después insertar la fila, sin que las dos operaciones
 * compartan un mismo lock exclusivo, es la ventana en la que dos creaciones
 * concurrentes de la misma sesión leen el mismo id (TASK-THYROX-0311).
 */
function assignId(db: Database, sesion: string): string {
  const mark = db.query('SELECT next_task_id AS n FROM task_session_highwater WHERE session_id = ?').get(sesion) as
    | { n: number }
    | undefined
  const id = mark?.n ?? adopt(db, sesion)
  db.run(
    `INSERT INTO task_session_highwater (session_id, next_task_id) VALUES (?, ?)
     ON CONFLICT(session_id) DO UPDATE SET next_task_id = excluded.next_task_id`,
    [sesion, id + 1],
  )
  return String(id)
}

/** Quita `id` de las dos columnas de aristas de una fila. */
function quitarArista(db: Database, sesion: string, fila_id: string, columna: 'blocks_json' | 'blocked_by_json', id: string): void {
  const fila = db.query(`SELECT ${columna} AS v FROM tasks WHERE session_id = ? AND task_id = ?`).get(sesion, fila_id) as
    | { v: string | null }
    | undefined
  if (!fila) return
  const restantes = ids(fila.v).filter((x) => x !== id)
  db.run(`UPDATE tasks SET ${columna} = ?, updated_at = ? WHERE session_id = ? AND task_id = ?`, [
    JSON.stringify(restantes),
    new Date().toISOString(),
    sesion,
    fila_id,
  ])
}

/**
 * Borra una tarea: limpia las aristas que la nombran en las demás filas y
 * elimina la fila. La referencia lo hace igual — «removes the file and
 * cleans up references to it from other tasks» (`hccw:` estado `deleted`,
 * `:65`). NO toca `task_session_highwater`: un id borrado nunca se reasigna,
 * porque la marca sólo avanza en `asignarId` (DEC-TASK 2026-09-29, opción a).
 */
function borrarTarea(db: Database, sesion: string, id: string): void {
  const otras = db.query('SELECT task_id, blocks_json, blocked_by_json FROM tasks WHERE session_id = ? AND task_id != ?').all(sesion, id) as {
    task_id: string
    blocks_json: string | null
    blocked_by_json: string | null
  }[]
  for (const o of otras) {
    if (ids(o.blocks_json).includes(id)) quitarArista(db, sesion, o.task_id, 'blocks_json', id)
    if (ids(o.blocked_by_json).includes(id)) quitarArista(db, sesion, o.task_id, 'blocked_by_json', id)
  }
  db.run('DELETE FROM tasks WHERE session_id = ? AND task_id = ?', [sesion, id])
}

/** Merge de metadata: las claves de `entrante` pisan; una clave a `null` la borra. */
function mezclarMetadata(existente: string | null, entrante: Record<string, unknown>): string {
  let base: Record<string, unknown> = {}
  if (existente) {
    try {
      const v = JSON.parse(existente)
      if (v && typeof v === 'object' && !Array.isArray(v)) base = v as Record<string, unknown>
    } catch {
      // metadata corrupta se descarta: el merge parte de cero, no aborta.
    }
  }
  for (const [k, val] of Object.entries(entrante)) {
    if (val === null) delete base[k]
    else base[k] = val
  }
  return JSON.stringify(base)
}

/** Añade `id` a la columna de aristas de `destino`, sin duplicar. */
function anadirArista(db: Database, sesion: string, destino: string, columna: 'blocks_json' | 'blocked_by_json', id: string): void {
  const fila = db.query(`SELECT ${columna} AS v FROM tasks WHERE session_id = ? AND task_id = ?`).get(sesion, destino) as
    | { v: string | null }
    | undefined
  if (!fila) return
  const actuales = ids(fila.v)
  if (actuales.includes(id)) return
  db.run(`UPDATE tasks SET ${columna} = ?, updated_at = ? WHERE session_id = ? AND task_id = ?`, [
    JSON.stringify([...actuales, id]),
    new Date().toISOString(),
    sesion,
    destino,
  ])
}

/** La vista de una tarea: sus campos más sus dos listas de aristas resueltas. */
function resolver(db: Database, sesion: string, fila: Fila) {
  const vecina = (id: string) => {
    const v = db.query('SELECT task_id, subject, status FROM tasks WHERE session_id = ? AND task_id = ?').get(sesion, id) as
      | { task_id: string; subject: string; status: string }
      | undefined
    return v ?? { task_id: id, subject: '(ausente del tablero)', status: 'desconocido' }
  }
  const bloqueantes = ids(fila.blocked_by_json).map(vecina)
  const cita = (fila as { citation_id?: string | null }).citation_id
  return {
    task_id: fila.task_id,
    // El identificador de cita segmentado, sólo si la base lo guarda: es lo
    // único estable entre sesiones, porque el ordinal reinicia (ERR-024).
    ...(cita !== undefined ? { citation_id: cita } : {}),
    subject: fila.subject,
    description: fila.description,
    status: fila.status,
    owner: fila.owner,
    blocked_by: bloqueantes,
    blocks: ids(fila.blocks_json).map(vecina),
    /** Bloqueada mientras algún bloqueante no esté `completed`. */
    blocked: bloqueantes.some((b) => b.status !== 'completed'),
  }
}

/**
 * El tablero durable de una sesión, en la forma que el recordatorio necesita
 * (etapa 4 del flujo, DEC-TASK-01). Excluye la lista efímera de `TodoWrite`
 * (`source = 'todo'`), ordena por ordinal y devuelve `{id, status, subject}`.
 * Lo consume el gate del bucle para inyectar el `task_reminder`.
 */
export function resumenTablero(
  dbPath: string,
  sessionId: string,
): { id: string; status: string; subject: string; citationId?: string | null }[] {
  return conBase(dbPath, (db) => {
    // `citation_id` la acuña `task_ids` sobre el store de docs; `TABLERO_DDL`
    // NO la declara, así que una base creada por este harness no la tiene.
    // Seleccionarla a ciegas rompería toda base propia con `no such column`,
    // que es el caso que el control del test mide.
    const cita = selectCitationId(db) ? ', citation_id AS citationId' : ''
    return db
      .query(
        `SELECT task_id AS id, status, subject${cita} FROM tasks
         WHERE session_id = ? AND COALESCE(source, '') != '${FUENTE_TODO}'
         ORDER BY CAST(task_id AS INTEGER)`,
      )
      .all(sessionId) as { id: string; status: string; subject: string; citationId?: string | null }[]
  })
}

export function taskTools(opts: TaskToolOptions): Tool[] {
  const sesion = opts.sessionId ?? 'harness'

  const create: Tool = {
    name: 'TaskCreate',
    description: 'Declara una tarea en el tablero del proyecto, con su condición de cierre en la descripción.',
    permission: 'write',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Qué hay que hacer, en una línea.' },
        description: { type: 'string', description: 'La condición de cierre: qué tiene que ser cierto para darla por hecha.' },
        owner: { type: 'string', description: 'Quién la lleva.' },
        blocked_by: { type: 'array', description: 'Ids de las tareas que tienen que cerrar antes que ésta.' },
        blocks: { type: 'array', description: 'Ids de las tareas que esperan a ésta.' },
      },
      required: ['subject'],
    },
    async run(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
      const subject = String(input.subject ?? '').trim()
      if (!subject) return err('una tarea sin asunto no es una tarea: falta `subject`')
      const bloqueantes = idsDeclarados(input.blocked_by)
      const bloqueadas = idsDeclarados(input.blocks)
      const now = new Date().toISOString()
      const taskId = conBase(opts.dbPath, (db) => {
        // BEGIN IMMEDIATE toma el lock de escritura antes de leer la marca:
        // dos creaciones concurrentes de la misma sesión ya no pueden leer el
        // mismo `next_task_id` (TASK-THYROX-0311). `.transaction(...)` hace
        // el COMMIT al volver y el ROLLBACK si algo lanza; sin reintentos
        // propios, porque `openLocal` ya fija `busy_timeout`.
        const create = db.transaction((): string => {
          const id = assignId(db, sesion)
          db.run(
            `INSERT INTO tasks (task_id, subject, description, status, owner, blocks_json, blocked_by_json,
                                session_id, source, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, 'harness', ?, ?)`,
            [
              id,
              subject,
              (input.description as string) ?? null,
              (input.owner as string) ?? null,
              JSON.stringify(bloqueadas),
              JSON.stringify(bloqueantes),
              sesion,
              now,
              now,
            ],
          )
          // La arista se escribe en los dos extremos: una lista que sólo apunta
          // hacia atrás no responde «¿a quién desbloquea cerrar ésta?».
          for (const b of bloqueantes) anadirArista(db, sesion, b, 'blocks_json', id)
          for (const b of bloqueadas) anadirArista(db, sesion, b, 'blocked_by_json', id)
          return id
        })
        return create.immediate()
      })
      return ok(JSON.stringify({ task_id: taskId, status: 'pending' }))
    },
  }

  const listar: Tool = {
    name: 'TaskList',
    description: 'Las tareas del tablero, opcionalmente filtradas por estado o por estar desbloqueadas.',
    permission: 'read',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: `Uno de: ${TASK_STATUSES.join(', ')}.` },
        unblocked: { type: 'boolean', description: 'Sólo las que no esperan a ninguna otra: lo que se puede continuar ahora.' },
        limit: { type: 'number', description: 'Cuántas devolver como máximo.' },
      },
    },
    async run(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
      const estado = typeof input.status === 'string' ? input.status : null
      if (estado && !(TASK_STATUSES as readonly string[]).includes(estado)) {
        return err(`estado desconocido: ${estado}. Los del tablero son: ${TASK_STATUSES.join(', ')}`)
      }
      const limite = typeof input.limit === 'number' ? input.limit : 50
      const rows = conBase(opts.dbPath, (db) => {
        // El tablero durable NO incluye la lista efímera: son dos ciclos de
        // vida distintos y mezclarlos haría que un `TodoWrite` borrara trabajo.
        const base = `SELECT task_id, subject, description, status, owner, blocks_json, blocked_by_json${selectCitationId(db)}
                      FROM tasks WHERE session_id = ? AND COALESCE(source, '') != '${FUENTE_TODO}'`
        const crudas = (
          estado
            ? db.query(`${base} AND status = ? ORDER BY CAST(task_id AS INTEGER)`).all(sesion, estado)
            : db.query(`${base} ORDER BY CAST(task_id AS INTEGER)`).all(sesion)
        ) as Fila[]
        const vistas = crudas.map((f) => resolver(db, sesion, f))
        return (input.unblocked === true ? vistas.filter((v) => !v.blocked) : vistas).slice(0, limite)
      })
      return ok(JSON.stringify(rows.map(({ description: _d, ...resto }) => resto)))
    },
  }

  const obtener: Tool = {
    name: 'TaskGet',
    description: 'Una tarea del tablero con su descripción y sus dos listas de aristas resueltas.',
    permission: 'read',
    input_schema: {
      type: 'object',
      properties: { task_id: { type: 'string', description: 'El identificador que devolvió TaskCreate.' } },
      required: ['task_id'],
    },
    async run(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
      const id = String(input.task_id ?? '')
      const vista = conBase(opts.dbPath, (db) => {
        const fila = db
          .query(
            `SELECT task_id, subject, description, status, owner, blocks_json, blocked_by_json${selectCitationId(db)}
             FROM tasks WHERE session_id = ? AND task_id = ? AND COALESCE(source, '') != '${FUENTE_TODO}'`,
          )
          .get(sesion, id) as Fila | undefined
        return fila ? resolver(db, sesion, fila) : null
      })
      if (!vista) return err(`no hay ninguna tarea con id ${id} en el tablero de esta sesión`)
      return ok(JSON.stringify(vista))
    },
  }

  const update: Tool = {
    name: 'TaskUpdate',
    description:
      'Cambia una tarea del tablero: estado (incluido deleted), asunto, descripción, gerundio, dueño, metadata o asociaciones.',
    permission: 'write',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'El identificador que devolvió TaskCreate.' },
        status: { type: 'string', description: `Uno de: ${UPDATE_STATUSES.join(', ')}. deleted borra la tarea.` },
        subject: { type: 'string', description: 'Nuevo asunto.' },
        description: { type: 'string', description: 'Nueva descripción / condición de cierre.' },
        activeForm: { type: 'string', description: 'El gerundio que se muestra mientras la tarea está en curso.' },
        owner: { type: 'string', description: 'Quién la lleva ahora.' },
        metadata: { type: 'object', description: 'Claves a fusionar; una clave a null la borra.' },
        addBlocks: { type: 'array', description: 'Ids que esta tarea bloquea; se AÑADEN, no reemplazan.' },
        addBlockedBy: { type: 'array', description: 'Ids que bloquean a ésta; se AÑADEN, no reemplazan.' },
        blocked_by: { type: 'array', description: 'REEMPLAZA la lista de bloqueantes (retrocompat; preferir addBlockedBy).' },
      },
      required: ['task_id'],
    },
    async run(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
      const id = String(input.task_id ?? '')
      const estado = typeof input.status === 'string' ? input.status : null
      if (estado && !(UPDATE_STATUSES as readonly string[]).includes(estado)) {
        return err(`estado desconocido: ${estado}. Los de update son: ${UPDATE_STATUSES.join(', ')}`)
      }
      const reemplazoBloqueantes = Array.isArray(input.blocked_by) ? idsDeclarados(input.blocked_by) : null
      const anadeBloquea = idsDeclarados(input.addBlocks)
      const anadeBloqueada = idsDeclarados(input.addBlockedBy)
      const resultado = conBase(opts.dbPath, (db) => {
        const previa = db.query('SELECT task_id, blocks_json, blocked_by_json, metadata_json FROM tasks WHERE session_id = ? AND task_id = ?').get(sesion, id) as
          | { task_id: string; blocks_json: string | null; blocked_by_json: string | null; metadata_json: string | null }
          | undefined
        if (!previa) return 'ausente'
        // deleted no es un estado almacenado: borra la fila y limpia sus aristas.
        if (estado === 'deleted') {
          borrarTarea(db, sesion, id)
          return 'borrada'
        }
        // Los campos directos se actualizan con COALESCE: null deja el valor.
        db.run(
          `UPDATE tasks SET status = COALESCE(?, status), subject = COALESCE(?, subject),
                            description = COALESCE(?, description), active_form = COALESCE(?, active_form),
                            owner = COALESCE(?, owner), blocked_by_json = COALESCE(?, blocked_by_json),
                            metadata_json = ?, updated_at = ?
           WHERE session_id = ? AND task_id = ?`,
          [
            estado,
            typeof input.subject === 'string' ? input.subject : null,
            typeof input.description === 'string' ? input.description : null,
            typeof input.activeForm === 'string' ? input.activeForm : null,
            (input.owner as string) ?? null,
            reemplazoBloqueantes ? JSON.stringify(reemplazoBloqueantes) : null,
            input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
              ? mezclarMetadata(previa.metadata_json, input.metadata as Record<string, unknown>)
              : previa.metadata_json,
            new Date().toISOString(),
            sesion,
            id,
          ],
        )
        // reemplazo → el otro extremo de la arista nueva; add → los dos extremos.
        for (const b of reemplazoBloqueantes ?? []) anadirArista(db, sesion, b, 'blocks_json', id)
        for (const b of anadeBloqueada) {
          anadirArista(db, sesion, id, 'blocked_by_json', b)
          anadirArista(db, sesion, b, 'blocks_json', id)
        }
        for (const b of anadeBloquea) {
          anadirArista(db, sesion, id, 'blocks_json', b)
          anadirArista(db, sesion, b, 'blocked_by_json', id)
        }
        return 'ok'
      })
      if (resultado === 'ausente') return err(`no hay ninguna tarea con id ${id} en el tablero de esta sesión`)
      if (resultado === 'borrada') return ok(JSON.stringify({ task_id: id, deleted: true }))
      return ok(JSON.stringify({ task_id: id, updated: true }))
    },
  }

  const escribirTodos: Tool = {
    name: 'TodoWrite',
    description:
      'Reemplaza la lista de trabajo del turno. Se escribe entera en cada llamada; no acumula.',
    permission: 'write',
    input_schema: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          description: 'La lista completa: {content, status, activeForm} por entrada.',
        },
      },
      required: ['todos'],
    },
    async run(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
      if (!Array.isArray(input.todos)) return err('`todos` es la lista entera: se esperaba un arreglo')
      const entradas = input.todos as Record<string, unknown>[]
      for (const t of entradas) {
        const content = String(t.content ?? '').trim()
        if (!content) return err('un todo sin `content` no dice nada: la entrada se rechaza entera')
        const estado = String(t.status ?? '')
        if (!(TASK_STATUSES as readonly string[]).includes(estado)) {
          return err(`estado desconocido: ${estado || '(vacío)'}. Los válidos son: ${TASK_STATUSES.join(', ')}`)
        }
        // El gerundio no es adorno: es lo que la lista muestra mientras corre.
        if (!String(t.activeForm ?? '').trim()) return err(`falta \`activeForm\` en «${content}»: es el gerundio que se muestra en curso`)
      }
      const now = new Date().toISOString()
      conBase(opts.dbPath, (db) => {
        // El borrado va acotado por sesión Y por fuente: es la frontera que
        // impide que una lista de tres entradas barra el tablero del proyecto.
        db.run(`DELETE FROM tasks WHERE session_id = ? AND source = ?`, [sesion, FUENTE_TODO])
        entradas.forEach((t, i) => {
          db.run(
            `INSERT INTO tasks (task_id, subject, status, active_form, session_id, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [`todo-${i + 1}`, String(t.content), String(t.status), String(t.activeForm), sesion, FUENTE_TODO, now, now],
          )
        })
      })
      return ok(JSON.stringify({ todos: entradas.length }))
    },
  }

  const leerTodos: Tool = {
    name: 'TodoRead',
    description: 'La lista de trabajo del turno, en el orden en que se escribió.',
    permission: 'read',
    input_schema: { type: 'object', properties: {} },
    async run(_input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
      const rows = conBase(opts.dbPath, (db) =>
        db
          .query(
            `SELECT subject AS content, status, active_form AS activeForm FROM tasks
             WHERE session_id = ? AND source = ? ORDER BY CAST(SUBSTR(task_id, 6) AS INTEGER)`,
          )
          .all(sesion, FUENTE_TODO),
      )
      return ok(JSON.stringify(rows))
    },
  }

  return [create, listar, obtener, update, escribirTodos, leerTodos]
}
