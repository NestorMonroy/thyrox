/**
 * `task_session_highwater`: la marca de agua POR SESIÓN, en tabla propia, y
 * la asignación atómica de `TaskCreate` (DEC-TASK 2026-09-29, opción a).
 *
 * `task_highwater` —la forma legada, global— NO es sujeto de este archivo
 * salvo para probar que el código nuevo la deja intacta: no la crea, no la
 * lee y no la escribe.
 */
import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TABLERO_DDL, TASK_HIGHWATER_DDL, TASK_SESSION_HIGHWATER_DDL } from '@thyrox/task/schema.ts'
import { taskTools } from '../src/tasks.ts'
import type { ToolContext } from '@thyrox/agent/loop/types'

const dir = () => mkdtempSync(join(tmpdir(), 'task-session-highwater-'))
const newBase = () => join(dir(), 'tablero.sqlite3')
const ctx = (sessionId: string): ToolContext => ({ cwd: dir(), sessionId, abort: new AbortController().signal, messages: [] })

/** El `TaskCreate` de una sesión, listo para `.run(...)`. */
function createFrom(dbPath: string, sessionId: string) {
  return taskTools({ dbPath, sessionId }).find((t) => t.name === 'TaskCreate')!
}

async function create(dbPath: string, sessionId: string, subject = 'una tarea') {
  const r = await createFrom(dbPath, sessionId).run({ subject }, ctx(sessionId))
  return JSON.parse(r.content) as { task_id: string }
}

/** Inserta `n` filas 1..n en `sessionId`, sin pasar por la herramienta. */
function seed(db: Database, sessionId: string, n: number): void {
  const now = new Date().toISOString()
  for (let i = 1; i <= n; i++) {
    db.run(
      `INSERT INTO tasks (task_id, subject, status, session_id, created_at, updated_at)
       VALUES (?, 'sembrada', 'pending', ?, ?, ?)`,
      [String(i), sessionId, now, now],
    )
  }
}

const barrier = () => join(mkdtempSync(join(tmpdir(), 'barrier-')), 'go')
const WORKER = join(import.meta.dir, 'taskCreateWorker.ts')

type WorkerResult = { ok: boolean; worker: string; task_id?: string; status?: string; error?: string }

/**
 * Lanza un lote de procesos `TaskCreate` (uno por `spec`), todos detrás de la
 * MISMA barrera, y devuelve sus resultados por línea JSON. Es el arnés de
 * reproducción/control de TASK-THYROX-0311: sin la barrera, el arranque de
 * cada proceso no se solapa con el de los demás.
 */
async function concurrentBatch(
  dbPath: string,
  specs: { sessionId: string; count: number }[],
): Promise<{ sessionId: string; outputs: WorkerResult[] }[]> {
  const go = barrier()
  const processes = specs.map((s, i) => ({
    sessionId: s.sessionId,
    proc: Bun.spawn(['bun', 'run', WORKER, dbPath, s.sessionId, go, String(s.count), `w${i}`], {
      stdout: 'pipe',
      stderr: 'pipe',
    }),
  }))
  // Los procesos ya arrancaron y están sondeando la barrera: dar tiempo a que
  // todos lleguen a la espera antes de soltarlos juntos.
  await new Promise((r) => setTimeout(r, 200))
  await Bun.write(go, '')
  return Promise.all(
    processes.map(async ({ sessionId, proc }) => {
      const text = await new Response(proc.stdout).text()
      await proc.exited
      const outputs = text
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as WorkerResult)
      return { sessionId, outputs }
    }),
  )
}

describe('reproducción de la colisión concurrente (TASK-THYROX-0311)', () => {
  test('con el arreglo en su sitio, 8 procesos x 10 creaciones de la misma sesión no colisionan', async () => {
    const p = newBase()
    const results = await concurrentBatch(p, Array.from({ length: 8 }, () => ({ sessionId: 'sesion-conc', count: 10 })))
    const outputs = results.flatMap((r) => r.outputs)
    expect(outputs).toHaveLength(80)
    expect(outputs.every((s) => s.ok)).toBe(true)
    const ids = outputs.map((s) => Number(s.task_id)).sort((a, b) => a - b)
    expect(ids).toEqual(Array.from({ length: 80 }, (_, i) => i + 1))
    // Nota de reproducción (medida en esta sesión, fuera de este archivo):
    // retirando `BEGIN IMMEDIATE` (dejando lectura e inserción sueltas), el
    // mismo arnés con 8 procesos x 10 creaciones dio 42 `ok:true` y 38
    // `UNIQUE constraint failed: tasks.session_id, tasks.task_id` — la
    // colisión SÍ se reprodujo, no es riesgo sólo inferido. Ver el control
    // de anulación de este ítem.
  })
})

describe('task_session_highwater — casos 1 a 7 del contrato', () => {
  test('1. base nueva: la primera creación da 1 y task_highwater sigue sin existir', async () => {
    const p = newBase()
    const { task_id } = await create(p, 's1')
    expect(task_id).toBe('1')
    const db = new Database(p, { readonly: true })
    const tables = (db.query("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name)
    db.close()
    expect(tables).not.toContain('task_highwater')
    expect(tables).toContain('task_session_highwater')
  })

  test('2. base antigua con task_highwater: la marca legada se ignora, la sesión adopta desde sus filas', async () => {
    const p = newBase()
    const db = new Database(p)
    db.run(TABLERO_DDL)
    db.run(TASK_HIGHWATER_DDL)
    db.run(`INSERT INTO task_highwater (clave, max_id) VALUES ('__global__', 999)`)
    seed(db, 's2', 3)
    const beforeInfo = db.query('PRAGMA table_info(task_highwater)').all()
    const beforeSql = (db.query("SELECT sql FROM sqlite_master WHERE name = 'task_highwater'").get() as { sql: string }).sql
    const beforeRows = db.query('SELECT * FROM task_highwater').all()
    db.close()

    const { task_id } = await create(p, 's2')
    expect(task_id).toBe('4')

    const db2 = new Database(p, { readonly: true })
    const afterInfo = db2.query('PRAGMA table_info(task_highwater)').all()
    const afterSql = (db2.query("SELECT sql FROM sqlite_master WHERE name = 'task_highwater'").get() as { sql: string }).sql
    const afterRows = db2.query('SELECT * FROM task_highwater').all()
    db2.close()
    // Caso 7: la tabla legada es idéntica antes y después — el código nuevo
    // no la crea, no la lee y no la escribe.
    expect(afterInfo).toEqual(beforeInfo)
    expect(afterSql).toEqual(beforeSql)
    expect(afterRows).toEqual(beforeRows)
  })

  test('3. dos sesiones mantienen marcas independientes: A con 1..5 da 6, B con 1..40 da 41; crear en A no mueve B', async () => {
    const p = newBase()
    const db = new Database(p)
    db.run(TABLERO_DDL)
    db.run(TASK_SESSION_HIGHWATER_DDL)
    seed(db, 'a', 5)
    seed(db, 'b', 40)
    db.close()

    const givenA = await create(p, 'a')
    expect(givenA.task_id).toBe('6')

    const markB = new Database(p, { readonly: true })
      .query('SELECT next_task_id AS n FROM task_session_highwater WHERE session_id = ?')
      .get('b') as { n: number } | undefined
    expect(markB).toBeNull() // B nunca creó por la herramienta: no adoptó marca todavía.

    const givenB = await create(p, 'b')
    expect(givenB.task_id).toBe('41')

    const markAAfter = new Database(p, { readonly: true })
      .query('SELECT next_task_id AS n FROM task_session_highwater WHERE session_id = ?')
      .get('a') as { n: number }
    expect(markAAfter.n).toBe(7) // sin moverse por la creación de B.
  })

  test('4. reinicio: cerrar y reabrir la base conserva la marca, y un id borrado no se reasigna', async () => {
    const p = newBase()
    for (let i = 0; i < 5; i++) await create(p, 'a', `tarea-${i + 1}`)
    // Las cinco creaciones dejan next_task_id en 6.
    const update = taskTools({ dbPath: p, sessionId: 'a' }).find((t) => t.name === 'TaskUpdate')!
    await update.run({ task_id: '5', status: 'deleted' }, ctx('a'))
    // Reabrir: un `Database` nuevo sobre el mismo archivo, como tras un reinicio.
    const mark = new Database(p, { readonly: true })
      .query('SELECT next_task_id AS n FROM task_session_highwater WHERE session_id = ?')
      .get('a') as { n: number }
    expect(mark.n).toBe(6) // borrar no bajó la marca.
    const { task_id } = await create(p, 'a', 'otra')
    expect(task_id).toBe('6')
    expect(task_id).not.toBe('5')
  })

  test('5. concurrencia: dos sesiones a la vez no colisionan, y dentro de una da ids distintos y consecutivos', async () => {
    const p = newBase()
    const results = await concurrentBatch(p, [
      ...Array.from({ length: 4 }, () => ({ sessionId: 'p', count: 5 })),
      ...Array.from({ length: 4 }, () => ({ sessionId: 'q', count: 5 })),
    ])
    for (const sessionId of ['p', 'q']) {
      const outputs = results.filter((r) => r.sessionId === sessionId).flatMap((r) => r.outputs)
      expect(outputs).toHaveLength(20)
      expect(outputs.every((s) => s.ok)).toBe(true)
      const ids = outputs.map((s) => Number(s.task_id)).sort((a, b) => a - b)
      expect(ids).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
    }
  })

  test('6. idempotencia: crear el DDL dos y tres veces no cambia filas ni esquema', async () => {
    const p = newBase()
    await create(p, 's6')
    const snapshot = () => {
      const db = new Database(p, { readonly: true })
      const info = db.query('PRAGMA table_info(task_session_highwater)').all()
      const rows = db.query('SELECT * FROM task_session_highwater ORDER BY session_id').all()
      db.close()
      return { info, rows }
    }
    const before = snapshot()
    const db = new Database(p)
    db.run(TASK_SESSION_HIGHWATER_DDL)
    db.run(TASK_SESSION_HIGHWATER_DDL)
    db.close()
    expect(snapshot()).toEqual(before)
  })
})
