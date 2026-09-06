/**
 * Herramientas de tablero `Task*` (T-019, corregidas en T-061).
 *
 * El tablero no se reinventa: su esquema es el que `.claude/agent-results/`
 * ya tiene, declarado aquí una sola vez para que el harness sea autónomo —
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
import { openStore } from '../../../../store/db.ts'
import type { Tool, ToolContext, ToolResult } from '../types.ts'

export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

/** Los estados que TaskUpdate acepta: los del tablero más la acción `deleted`. */
export const UPDATE_STATUSES = [...TASK_STATUSES, 'deleted'] as const

export type TaskToolOptions = { dbPath: string; sessionId?: string }

/**
 * El esquema del tablero, con la forma del store real.
 *
 * `IF NOT EXISTS` para no pisar el del proyecto, que tiene las mismas columnas
 * más las que sus propios hooks añadieron (`submodule`, `opened_at`). La clave
 * compuesta es la parte que no se puede simplificar: sin ella el ordinal de una
 * sesión sobreescribe el de otra.
 */
export const TABLERO_DDL = `CREATE TABLE IF NOT EXISTS tasks (
  task_id         TEXT NOT NULL,
  subject         TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL,
  active_form     TEXT,
  owner           TEXT,
  blocks_json     TEXT,
  blocked_by_json TEXT,
  session_id      TEXT NOT NULL DEFAULT 'desconocida',
  source          TEXT,
  metadata_json   TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (session_id, task_id)
)`

/**
 * La marca de agua contra reúso de id (DEC-TASK-02).
 *
 * `siguienteOrdinal` numera con `MAX(task_id)` sobre las filas presentes; si la
 * de id máximo se borrara, el siguiente `TaskCreate` reusaría ese id, con la
 * ambigüedad de referencia cruzada que el `.highwatermark` de la referencia
 * previene (`hccw: 11-task-system.md:154-186`). La tabla recuerda el máximo
 * histórico aunque se borre la fila. Es global —una sola clave— porque el
 * ordinal también lo es: dos sesiones no deben producir dos «#996».
 */
export const TASK_HIGHWATER_DDL = `CREATE TABLE IF NOT EXISTS task_highwater (
  clave  TEXT NOT NULL PRIMARY KEY DEFAULT '__global__',
  max_id INTEGER NOT NULL DEFAULT 0
)`

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

/** Abre, opera y cierra: el tablero es de todos, no se retiene el descriptor. */
function conBase<T>(dbPath: string, fn: (db: Database) => T): T {
  const db = openStore(dbPath)
  try {
    db.run(TABLERO_DDL)
    db.run(TASK_HIGHWATER_DDL)
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
 * El ordinal siguiente, sobre TODO el tablero y no sobre la sesión.
 *
 * La cita `#996` es del proyecto, no de la sesión: dos sesiones que numeraran
 * por separado producirían dos «#996» distintos en los hallazgos, que es el
 * defecto que la clave compuesta tolera pero la prosa no.
 */
function siguienteOrdinal(db: Database): string {
  const fila = db.query('SELECT MAX(CAST(task_id AS INTEGER)) AS n FROM tasks').get() as { n: number | null }
  const marca = db.query(`SELECT max_id AS n FROM task_highwater WHERE clave = '__global__'`).get() as { n: number | null } | undefined
  // El siguiente id supera tanto al máximo presente como al histórico: un id
  // borrado no vuelve a asignarse (DEC-TASK-02).
  return String(Math.max(fila?.n ?? 0, marca?.n ?? 0) + 1)
}

/** Sube la marca de agua al id borrado, si es mayor que el histórico. */
function subirMarca(db: Database, id: string): void {
  const n = Number.parseInt(id, 10)
  if (!Number.isFinite(n)) return
  db.run(
    `INSERT INTO task_highwater (clave, max_id) VALUES ('__global__', ?)
     ON CONFLICT(clave) DO UPDATE SET max_id = MAX(max_id, excluded.max_id)`,
    [n],
  )
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
 * Borra una tarea: sube la marca de agua, limpia las aristas que la nombran en
 * las demás filas y elimina la fila. La referencia lo hace igual — «removes the
 * file and cleans up references to it from other tasks» (`hccw:` estado
 * `deleted`, `:65`).
 */
function borrarTarea(db: Database, sesion: string, id: string): void {
  subirMarca(db, id)
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
/**
 * ``, citation_id`` si la base la tiene, y cadena vacía si no.
 *
 * La columna la acuña ``task_ids`` sobre el store de docs; ``TABLERO_DDL`` no
 * la declara, así que una base creada por este harness no la tiene y
 * seleccionarla a ciegas la rompería con ``no such column``. El mismo criterio
 * que ``resumenTablero``, en un solo sitio para que las tres superficies no
 * puedan divergir.
 */
export function selectCitationId(db: Database): string {
  const columnas = (db.query('PRAGMA table_info(tasks)').all() as { name: string }[]).map((c) => c.name)
  return columnas.includes('citation_id') ? ', citation_id' : ''
}

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

  const crear: Tool = {
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
      const ahora = new Date().toISOString()
      const taskId = conBase(opts.dbPath, (db) => {
        const id = siguienteOrdinal(db)
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
            ahora,
            ahora,
          ],
        )
        // La arista se escribe en los dos extremos: una lista que sólo apunta
        // hacia atrás no responde «¿a quién desbloquea cerrar ésta?».
        for (const b of bloqueantes) anadirArista(db, sesion, b, 'blocks_json', id)
        for (const b of bloqueadas) anadirArista(db, sesion, b, 'blocked_by_json', id)
        return id
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
      const filas = conBase(opts.dbPath, (db) => {
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
      return ok(JSON.stringify(filas.map(({ description: _d, ...resto }) => resto)))
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

  const actualizar: Tool = {
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
      const ahora = new Date().toISOString()
      conBase(opts.dbPath, (db) => {
        // El borrado va acotado por sesión Y por fuente: es la frontera que
        // impide que una lista de tres entradas barra el tablero del proyecto.
        db.run(`DELETE FROM tasks WHERE session_id = ? AND source = ?`, [sesion, FUENTE_TODO])
        entradas.forEach((t, i) => {
          db.run(
            `INSERT INTO tasks (task_id, subject, status, active_form, session_id, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [`todo-${i + 1}`, String(t.content), String(t.status), String(t.activeForm), sesion, FUENTE_TODO, ahora, ahora],
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
      const filas = conBase(opts.dbPath, (db) =>
        db
          .query(
            `SELECT subject AS content, status, active_form AS activeForm FROM tasks
             WHERE session_id = ? AND source = ? ORDER BY CAST(SUBSTR(task_id, 6) AS INTEGER)`,
          )
          .all(sesion, FUENTE_TODO),
      )
      return ok(JSON.stringify(filas))
    },
  }

  return [crear, listar, obtener, actualizar, escribirTodos, leerTodos]
}
