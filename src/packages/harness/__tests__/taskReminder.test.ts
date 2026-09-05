/**
 * El recordatorio periódico de tareas — la etapa 4, camino 2 (DEC-TASK-01).
 *
 * Fuente del porte: el subsistema de tareas del ejecutable 2.1.259, analizado
 * en ``docs: …/construir-harness-propio/`` (flujo del binario, referencia,
 * nuestro, rediseño-DEC). El defecto que cierra: el harness escribía la tarea
 * al store —«en el archivo»— pero NO la devolvía a la vista del modelo, así
 * que nunca quedaba «en el plan». La inyección reusa el sustrato del
 * attachment (T-085): un ``task_reminder`` que ``renderAttachment`` convierte
 * en el mismo ``<system-reminder>`` que el ejecutable emite, y el bucle lo
 * empuja al arreglo de mensajes tras un gate de turnos (10/10).
 *
 * El control que discrimina el gate (metrica-decide-la-conclusion.md, D): una
 * escritura de tarea reinicia el contador, así que el recordatorio con una
 * escritura previa cae EXACTAMENTE un turno más tarde que sin ella. Si el
 * reset no funcionara, los dos caerían en el mismo índice.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  isValidAttachment, renderAttachment, TASK_REMINDER_TEXT,
  TURNS_SINCE_WRITE, TURNS_BETWEEN_REMINDERS,
} from '../src/context/attachments.ts'
import { resumenTablero, taskTools } from '../src/tools/tasks.ts'
import { runLoop } from '../src/loop.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'
import type { AssistantTurn, ProviderRequest } from '../src/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'taskrem-'))
const tablero = () => join(dir(), 'tablero.sqlite3')
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const texto = (t: string): AssistantTurn => ({ id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'end_turn', content: [{ type: 'text', text: t }], usage: uso })
const usa = (name: string, input: Record<string, unknown> = {}): AssistantTurn => ({
  id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: `tu${Math.random()}`, name, input }], usage: uso,
})
const ctx = () => ({ cwd: dir(), sessionId: 'x', abort: new AbortController().signal, messages: [] })

// El texto del `<system-reminder>` inyectado en una petición, si lo hay.
const reminderEn = (req: ProviderRequest): string | null => {
  for (const m of req.messages) {
    const bloques = Array.isArray(m.content) ? m.content : []
    for (const b of bloques as { type?: string; text?: string }[]) {
      if (b.type === 'text' && typeof b.text === 'string' && b.text.includes('<system-reminder>') && b.text.includes(TASK_REMINDER_TEXT)) {
        return b.text
      }
    }
  }
  return null
}
// El índice de la primera petición que trae el recordatorio, o -1.
const primerRecordatorio = (reqs: ProviderRequest[]): number => reqs.findIndex((r) => reminderEn(r) !== null)

describe('renderAttachment(task_reminder) — el mismo <system-reminder> del ejecutable', () => {
  test('sin tareas: sólo el texto fijo, sin el bloque "Here are the existing tasks"', () => {
    const [m] = renderAttachment({ type: 'task_reminder', tasks: [] })
    expect(m.isMeta).toBe(true)
    const t = (m.content[0] as { text: string }).text
    expect(t.startsWith('<system-reminder>\n')).toBe(true)
    expect(t.endsWith('\n</system-reminder>')).toBe(true)
    expect(t).toContain(TASK_REMINDER_TEXT)
    expect(t).not.toContain('Here are the existing tasks')
  })

  test('con tareas: añade una línea "#id. [status] subject" por tarea', () => {
    const [m] = renderAttachment({
      type: 'task_reminder',
      tasks: [{ id: '75', status: 'pending', subject: 'Completar el porte de TaskUpdate' },
              { id: '76', status: 'in_progress', subject: 'Rediseñar el subsistema de TASK' }],
    })
    const t = (m.content[0] as { text: string }).text
    expect(t).toContain('Here are the existing tasks:')
    expect(t).toContain('#75. [pending] Completar el porte de TaskUpdate')
    expect(t).toContain('#76. [in_progress] Rediseñar el subsistema de TASK')
  })

  test('undefined tasks es válido y rinde el texto fijo; un no-arreglo NO es válido', () => {
    expect(isValidAttachment({ type: 'task_reminder' })).toBe(true)
    expect(isValidAttachment({ type: 'task_reminder', tasks: [] })).toBe(true)
    expect(isValidAttachment({ type: 'task_reminder', tasks: 'x' })).toBe(false)
    const [m] = renderAttachment({ type: 'task_reminder' })
    expect((m.content[0] as { text: string }).text).toContain(TASK_REMINDER_TEXT)
  })
})

describe('TaskUpdate — el contrato de 8 campos (DEC-TASK-02, tarea #75)', () => {
  const util = (db: string, nombre: string, s = 'S') => taskTools({ dbPath: db, sessionId: s }).find((t) => t.name === nombre)!

  test('edita subject, description, activeForm y owner con COALESCE (null no pisa)', async () => {
    const db = tablero()
    const c = JSON.parse((await util(db, 'TaskCreate').run({ subject: 'viejo asunto', description: 'vieja' }, ctx())).content)
    await util(db, 'TaskUpdate').run(
      { task_id: c.task_id, subject: 'nuevo asunto', description: 'nueva', activeForm: 'haciendo', owner: 'nestor' },
      ctx(),
    )
    const v = JSON.parse((await util(db, 'TaskGet').run({ task_id: c.task_id }, ctx())).content)
    expect(v.subject).toBe('nuevo asunto')
    expect(v.description).toBe('nueva')
    expect(v.owner).toBe('nestor')
    // owner ausente en una segunda edición NO borra el existente
    await util(db, 'TaskUpdate').run({ task_id: c.task_id, status: 'in_progress' }, ctx())
    const v2 = JSON.parse((await util(db, 'TaskGet').run({ task_id: c.task_id }, ctx())).content)
    expect(v2.owner).toBe('nestor')
    expect(v2.status).toBe('in_progress')
  })

  test('metadata se fusiona; una clave a null la borra', async () => {
    const db = tablero()
    const c = JSON.parse((await util(db, 'TaskCreate').run({ subject: 'x' }, ctx())).content)
    await util(db, 'TaskUpdate').run({ task_id: c.task_id, metadata: { a: 1, b: 2 } }, ctx())
    await util(db, 'TaskUpdate').run({ task_id: c.task_id, metadata: { b: null, c: 3 } }, ctx())
    const raw = resumenTablero(db, 'S') // sólo confirma que la tarea sigue en el tablero
    expect(raw.map((t) => t.id)).toContain(c.task_id)
    // el estado del metadata se lee del store directo (TaskGet no lo proyecta)
    const { Database } = await import('bun:sqlite')
    const d = new Database(db)
    const fila = d.query('SELECT metadata_json FROM tasks WHERE task_id = ?').get(c.task_id) as { metadata_json: string }
    d.close()
    expect(JSON.parse(fila.metadata_json)).toEqual({ a: 1, c: 3 })
  })

  test('addBlocks y addBlockedBy AÑADEN los dos extremos de la arista', async () => {
    const db = tablero()
    const a = JSON.parse((await util(db, 'TaskCreate').run({ subject: 'A' }, ctx())).content)
    const b = JSON.parse((await util(db, 'TaskCreate').run({ subject: 'B' }, ctx())).content)
    // A bloquea a B: se declara en A con addBlocks
    await util(db, 'TaskUpdate').run({ task_id: a.task_id, addBlocks: [b.task_id] }, ctx())
    const va = JSON.parse((await util(db, 'TaskGet').run({ task_id: a.task_id }, ctx())).content)
    const vb = JSON.parse((await util(db, 'TaskGet').run({ task_id: b.task_id }, ctx())).content)
    expect(va.blocks.map((x: { task_id: string }) => x.task_id)).toContain(b.task_id)
    // el otro extremo: B queda bloqueada por A
    expect(vb.blocked_by.map((x: { task_id: string }) => x.task_id)).toContain(a.task_id)
    expect(vb.blocked).toBe(true)
  })

  test('deleted borra la fila Y sube la marca de agua: el id no se reusa', async () => {
    const db = tablero()
    const c = JSON.parse((await util(db, 'TaskCreate').run({ subject: 'efímera' }, ctx())).content)
    expect(c.task_id).toBe('1')
    const del = JSON.parse((await util(db, 'TaskUpdate').run({ task_id: c.task_id, status: 'deleted' }, ctx())).content)
    expect(del).toEqual({ task_id: '1', deleted: true })
    // el tablero quedó vacío...
    expect(resumenTablero(db, 'S')).toEqual([])
    // ...pero el siguiente id NO reusa el 1 borrado (DEC-TASK-02)
    const otra = JSON.parse((await util(db, 'TaskCreate').run({ subject: 'nueva' }, ctx())).content)
    expect(otra.task_id).toBe('2')
  })

  test('deleted limpia las aristas que la nombran en otras filas', async () => {
    const db = tablero()
    const a = JSON.parse((await util(db, 'TaskCreate').run({ subject: 'A' }, ctx())).content)
    const b = JSON.parse((await util(db, 'TaskCreate').run({ subject: 'B' }, ctx())).content)
    await util(db, 'TaskUpdate').run({ task_id: a.task_id, addBlocks: [b.task_id] }, ctx())
    // borrar A debe dejar a B sin bloqueante fantasma
    await util(db, 'TaskUpdate').run({ task_id: a.task_id, status: 'deleted' }, ctx())
    const vb = JSON.parse((await util(db, 'TaskGet').run({ task_id: b.task_id }, ctx())).content)
    expect(vb.blocked_by).toEqual([])
    expect(vb.blocked).toBe(false)
  })

  test('un estado fuera de los cuatro admitidos se rechaza nombrando los válidos', async () => {
    const db = tablero()
    const c = JSON.parse((await util(db, 'TaskCreate').run({ subject: 'x' }, ctx())).content)
    const r = await util(db, 'TaskUpdate').run({ task_id: c.task_id, status: 'archivado' }, ctx())
    expect(r.isError).toBe(true)
    expect(r.content).toContain('deleted')
  })
})

describe('resumenTablero — el tablero durable, sin la lista efímera', () => {
  test('excluye las filas de TodoWrite y ordena por ordinal', async () => {
    const db = tablero()
    const tc = taskTools({ dbPath: db, sessionId: 'S' }).find((t) => t.name === 'TaskCreate')!
    const tw = taskTools({ dbPath: db, sessionId: 'S' }).find((t) => t.name === 'TodoWrite')!
    await tc.run({ subject: 'durable 1' }, ctx())
    await tc.run({ subject: 'durable 2' }, ctx())
    await tw.run({ todos: [{ content: 'efímera', status: 'pending', activeForm: 'haciendo' }] }, ctx())
    const board = resumenTablero(db, 'S')
    expect(board.map((t) => t.subject)).toEqual(['durable 1', 'durable 2'])
    expect(board.every((t) => t.id === '1' || t.id === '2')).toBe(true)
  })
})

describe('bucle — la inyección periódica del tablero (DEC-TASK-01)', () => {
  test('a los 10 turnos sin escritura de tarea, el 10º request trae el recordatorio con el tablero', async () => {
    const d = dir()
    const db = join(d, 'store.sqlite3')
    const tc = taskTools({ dbPath: db, sessionId: 'S' }).find((t) => t.name === 'TaskCreate')!
    await tc.run({ subject: 'seguir el porte de TaskUpdate' }, ctx())
    // 9 turnos con herramienta + 1 texto: el bucle llega a la iteración 10
    const p = new RecordedProvider([...Array.from({ length: 9 }, () => usa('Bash', { command: 'true' })), texto('fin')])
    await runLoop({
      cwd: d, model: 'claude-opus-5', system: 'h', tools: CORE_TOOLS, transcriptDir: d,
      prompt: 'trabaja', provider: p, taskReminder: { dbPath: db, sessionId: 'S' },
    })
    // el gate es 10/10: antes del 10º request no hay recordatorio
    expect(TURNS_SINCE_WRITE).toBe(10)
    expect(TURNS_BETWEEN_REMINDERS).toBe(10)
    expect(reminderEn(p.requests[8])).toBeNull()
    const t = reminderEn(p.requests[9])
    expect(t).not.toBeNull()
    expect(t!).toContain('#1. [pending] seguir el porte de TaskUpdate')
  })

  test('una escritura de tarea reinicia el contador: el recordatorio cae un turno más tarde', async () => {
    const d = dir()
    const db = join(d, 'store.sqlite3')
    // sin escritura: dónde cae el primer recordatorio
    const sinEscritura = new RecordedProvider([...Array.from({ length: 11 }, () => usa('Bash', { command: 'true' })), texto('fin')])
    await runLoop({
      cwd: d, model: 'claude-opus-5', system: 'h', tools: CORE_TOOLS, transcriptDir: d,
      prompt: 'x', provider: sinEscritura, taskReminder: { dbPath: db, sessionId: 'S' },
    })
    const idxSin = primerRecordatorio(sinEscritura.requests)
    expect(idxSin).toBe(9)

    // con una TaskUpdate en el turno 1: el reset empuja el recordatorio un turno
    const d2 = dir()
    const db2 = join(d2, 'store.sqlite3')
    const conEscritura = new RecordedProvider([
      usa('TaskUpdate', { task_id: '999', status: 'in_progress' }),
      ...Array.from({ length: 11 }, () => usa('Bash', { command: 'true' })), texto('fin'),
    ])
    await runLoop({
      cwd: d2, model: 'claude-opus-5', system: 'h', tools: CORE_TOOLS, transcriptDir: d2,
      prompt: 'x', provider: conEscritura, taskReminder: { dbPath: db2, sessionId: 'S' },
    })
    const idxCon = primerRecordatorio(conEscritura.requests)
    // el control que discrimina: si el reset no funcionara, idxCon === idxSin
    expect(idxCon).toBe(idxSin + 1)
  })
})
