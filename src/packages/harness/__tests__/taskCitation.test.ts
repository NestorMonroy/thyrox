/**
 * El identificador de cita segmentado en el recordatorio de tareas.
 *
 * Decisión del ejecutor (2026-09-05): **el ID segmentado debe verse en el
 * Plan**. Cuál es «el Plan» lo mide
 * ``docs: …/construir-harness-propio/analisis-las-tres-superficies-que-el-binario-llama-plan.rst``
 * sobre el ejecutable 2.1.261 — son tres superficies distintas:
 *
 * - el **archivo de plan** de plan mode (``Tys``, ``.claude/plans/``): su
 *   contenido es prosa que el agente escribe, así que el ID ahí es convención
 *   de redacción, no mecanismo;
 * - el **tablero**, que llega como attachment ``task_reminder`` y renderiza
 *   tres campos — ``#id``, ``[status]``, ``subject``;
 * - **TodoWrite**, que llega como ``todo_reminder`` y es mutuamente
 *   excluyente con el anterior (``if(Vy()||!w0())return[]``).
 *
 * La única que este harness renderiza —y por tanto la única donde el ID puede
 * *verse* por construcción y no por disciplina— es la segunda. Aquí se prueba.
 *
 * **El control que discrimina** (`metrica-decide-la-conclusion.md`, D): una
 * tarea SIN cita tiene que seguir rindiendo la forma desnuda del ejecutable,
 * verbatim. Un test que sólo comprobara la forma con cita pasaría igual si el
 * renderizador escribiera siempre un paréntesis vacío.
 */
import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderAttachment } from '../src/context/attachments.ts'
import { resumenTablero, TABLERO_DDL, taskTools } from '../src/tools/tasks.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'taskcit-'))

/** Una base con el esquema del harness, y opcionalmente la columna del store. */
function baseCon(conCita: boolean): string {
  const ruta = join(dir(), 'tablero.sqlite3')
  const db = new Database(ruta)
  db.run(TABLERO_DDL)
  if (conCita) db.run('ALTER TABLE tasks ADD COLUMN citation_id TEXT')
  db.close()
  return ruta
}

function sembrar(ruta: string, filas: { id: string; subject: string; cita?: string }[]) {
  const db = new Database(ruta)
  for (const f of filas) {
    const cols = ['task_id', 'subject', 'status', 'session_id', 'created_at', 'updated_at']
    const vals: string[] = [f.id, f.subject, 'pending', 'S', 'T', 'T']
    if (f.cita !== undefined) { cols.push('citation_id'); vals.push(f.cita) }
    db.query(`INSERT INTO tasks (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...vals)
  }
  db.close()
}

const textoDe = (tasks: unknown[]) =>
  (renderAttachment({ type: 'task_reminder', tasks })[0].content[0] as { text: string }).text

/**
 * Sólo las líneas de tarea, no el texto fijo. El recordatorio fijo YA lleva
 * paréntesis —``(set to in_progress when starting, completed when done)``—, así
 * que un control de «sin paréntesis» sobre el texto completo mediría el
 * fenómeno equivocado y fallaría siempre.
 */
const lineasDe = (tasks: unknown[]): string[] => {
  const t = textoDe(tasks)
  const i = t.indexOf('Here are the existing tasks:')
  if (i < 0) return []
  return t.slice(i).split('\n').filter((l) => l.startsWith('#'))
}

describe('task_reminder — el ID segmentado se ve en el tablero que el modelo lee', () => {
  test('con cita: la línea nombra el identificador segmentado junto al ordinal', () => {
    const t = textoDe([{ id: '114', status: 'pending', subject: 'Decide el corte del tablero', citationId: 'TASK-API-0057' }])
    expect(t).toContain('#114 (TASK-API-0057). [pending] Decide el corte del tablero')
  })

  test('CONTROL — sin cita: la forma desnuda del ejecutable, sin paréntesis', () => {
    const l = lineasDe([{ id: '75', status: 'completed', subject: 'Completar el porte de TaskUpdate' }])
    expect(l).toEqual(['#75. [completed] Completar el porte de TaskUpdate'])
  })

  test('mezcladas: cada línea toma su forma, no la de la primera', () => {
    const t = textoDe([
      { id: '75', status: 'completed', subject: 'Sin cita' },
      { id: '114', status: 'pending', subject: 'Con cita', citationId: 'TASK-API-0057' },
    ])
    expect(t).toContain('#75. [completed] Sin cita')
    expect(t).toContain('#114 (TASK-API-0057). [pending] Con cita')
  })

  test('una cita vacía o en blanco NO produce un paréntesis vacío', () => {
    expect(lineasDe([{ id: '9', status: 'pending', subject: 'X', citationId: '' }])).toEqual(['#9. [pending] X'])
    expect(lineasDe([{ id: '9', status: 'pending', subject: 'X', citationId: '   ' }])).toEqual(['#9. [pending] X'])
  })
})

describe('resumenTablero — lee la cita del store cuando la columna existe', () => {
  test('con la columna: devuelve citationId por fila', () => {
    const ruta = baseCon(true)
    sembrar(ruta, [{ id: '1', subject: 'A', cita: 'TASK-API-0001' }, { id: '2', subject: 'B' }])
    const board = resumenTablero(ruta, 'S')
    expect(board).toEqual([
      { id: '1', status: 'pending', subject: 'A', citationId: 'TASK-API-0001' },
      { id: '2', status: 'pending', subject: 'B', citationId: null },
    ])
  })

  test('CONTROL — sin la columna: no lanza y omite el campo', () => {
    const ruta = baseCon(false)
    sembrar(ruta, [{ id: '1', subject: 'A' }])
    expect(resumenTablero(ruta, 'S')).toEqual([{ id: '1', status: 'pending', subject: 'A' }])
  })
})

describe('el enlace completo — del store a la línea que el modelo lee', () => {
  test('lo que resumenTablero devuelve entra en renderAttachment sin traducción', () => {
    const ruta = baseCon(true)
    sembrar(ruta, [{ id: '114', subject: 'Decide el corte del tablero', cita: 'TASK-API-0057' },
                   { id: '115', subject: 'Sin acuñar' }])
    const linea = lineasDe(resumenTablero(ruta, 'S'))
    expect(linea).toEqual([
      '#114 (TASK-API-0057). [pending] Decide el corte del tablero',
      '#115. [pending] Sin acuñar',
    ])
  })
})

/**
 * Las DOS superficies donde el modelo PIDE el tablero, en vez de recibirlo.
 *
 * El recordatorio cubre la vía en que el tablero llega solo; ``TaskList`` y
 * ``TaskGet`` son la vía en que el modelo lo consulta. Si la cita sólo se ve
 * en la primera, el modelo que consulta lee ``task_id: "114"`` y cita el
 * ordinal — que es exactamente el defecto que ERR-024 registra.
 */
describe('TaskList y TaskGet — la cita también donde el modelo consulta', () => {
  const util = (db: string, nombre: string) => taskTools({ dbPath: db, sessionId: 'S' }).find((x) => x.name === nombre)!
  const ctx = { cwd: '.', sessionId: 'S', abort: new AbortController().signal, messages: [] }

  test('TaskList devuelve citation_id por fila cuando la columna existe', async () => {
    const ruta = baseCon(true)
    sembrar(ruta, [{ id: '114', subject: 'Con cita', cita: 'TASK-API-0057' }, { id: '115', subject: 'Sin acuñar' }])
    const r = await util(ruta, 'TaskList').run({}, ctx)
    const filas = JSON.parse(r.content as string) as { task_id: string; citation_id?: string | null }[]
    expect(filas.map((f) => [f.task_id, f.citation_id])).toEqual([['114', 'TASK-API-0057'], ['115', null]])
  })

  test('TaskGet devuelve la cita de la tarea pedida', async () => {
    const ruta = baseCon(true)
    sembrar(ruta, [{ id: '114', subject: 'Con cita', cita: 'TASK-API-0057' }])
    const r = await util(ruta, 'TaskGet').run({ task_id: '114' }, ctx)
    expect((JSON.parse(r.content as string) as { citation_id?: string }).citation_id).toBe('TASK-API-0057')
  })

  test('CONTROL — sin la columna las dos siguen respondiendo, sin el campo', async () => {
    const ruta = baseCon(false)
    sembrar(ruta, [{ id: '1', subject: 'A' }])
    const lista = JSON.parse((await util(ruta, 'TaskList').run({}, ctx)).content as string) as Record<string, unknown>[]
    expect(lista[0].task_id).toBe('1')
    expect('citation_id' in lista[0]).toBe(false)
    const uno = JSON.parse((await util(ruta, 'TaskGet').run({ task_id: '1' }, ctx)).content as string) as Record<string, unknown>
    expect('citation_id' in uno).toBe(false)
  })
})
