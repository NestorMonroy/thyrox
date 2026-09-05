/**
 * El puente de una sola dirección: los `- [ ]` de un `tareas-<slug>.rst` leídos
 * como entradas de tablero (T-062).
 *
 * Fuente: diseño nativo, respuesta medida a una pregunta literal —importar, no
 * espejar—. El control que discrimina es que el RST y el tablero NO guarden lo
 * mismo: el puente lee el RST, no lo reescribe.
 */

import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseRstTasks } from '../src/tasks/rst.ts'
import { taskTools } from '../src/tools/tasks.ts'
import { main } from '../bin/harness.ts'

/** El archivo de tareas de esta misma iniciativa: control positivo real. */
const REAL = join(
  import.meta.dir, '..', '..', '..', '..',
  'source/gestion/pm/docs/iniciativas/construir-harness-propio/tareas-construir-harness-propio.rst',
)

describe('puente RST → tablero (T-062)', () => {
  test('la casilla se lee con y sin negrita, que son las dos formas del corpus', () => {
    const t = parseRstTasks([
      '- [x] T-001 — con la forma desnuda',
      '- [ ] **T-002** — con negrita',
    ].join('\n'))
    expect(t.map((x) => [x.id, x.done])).toEqual([['T-001', true], ['T-002', false]])
  })

  test('el id no se asume de tres dígitos: el corpus trae T-N.N, T-N-N y D-N', () => {
    const t = parseRstTasks([
      '- [ ] **T-3.1 [DECISIÓN]** — decidir algo',
      '- [x] **T-05-02** — un tramo',
      '- [ ] D-7 — una decisión',
    ].join('\n'))
    expect(t.map((x) => x.id)).toEqual(['T-3.1', 'T-05-02', 'D-7'])
  })

  test('el asunto continúa en las líneas indentadas y se recompone en una', () => {
    const t = parseRstTasks([
      '- [ ] **T-021** — Las 47 restantes: se traen por necesidad demostrada, no por',
      '  paridad. La necesidad, medida por primera vez.',
      '',
      '- [x] T-022 — otra',
    ].join('\n'))
    expect(t[0].subject).toBe('Las 47 restantes: se traen por necesidad demostrada, no por paridad. La necesidad, medida por primera vez.')
    expect(t).toHaveLength(2)
  })

  test('la asociación se deriva sólo cuando el cuerpo NOMBRA otro id', () => {
    const t = parseRstTasks([
      '- [ ] **T-010** — depende de **T-079** para arrancar',
      '- [ ] **T-011** — depende de ``html_editor``, que no es una tarea',
    ].join('\n'))
    expect(t[0].blockedBy).toEqual(['T-079'])
    expect(t[1].blockedBy).toEqual([])
  })

  test('una tarea no se declara bloqueada por sí misma', () => {
    const t = parseRstTasks('- [ ] **T-010** — T-010 se cierra cuando depende de T-011')
    expect(t[0].blockedBy).toEqual(['T-011'])
  })

  test('sobre el archivo real de esta iniciativa el conteo coincide con el grep', () => {
    const texto = readFileSync(REAL, 'utf8')
    const t = parseRstTasks(texto)
    const porGrep = (re: RegExp) => (texto.match(re) ?? []).length
    expect(t.filter((x) => !x.done)).toHaveLength(porGrep(/^- \[ \]/gm))
    expect(t.filter((x) => x.done)).toHaveLength(porGrep(/^- \[x\]/gm))
    expect(t.every((x) => x.subject.length > 0)).toBe(true)
  })

  test('la línea se conserva: sin ella el puente no puede citar de dónde salió', () => {
    const t = parseRstTasks('\n\n- [ ] T-001 — algo')
    expect(t[0].line).toBe(3)
  })
})

describe('--import-tasks: el puente como comando (T-062)', () => {
  const tablero = () => join(mkdtempSync(join(tmpdir(), 'import-')), 'tablero.sqlite3')

  async function correr(argv: string[]) {
    const out: string[] = []
    const err: string[] = []
    const so = process.stdout.write.bind(process.stdout)
    const se = process.stderr.write.bind(process.stderr)
    process.stdout.write = (s: string) => { out.push(String(s)); return true }
    process.stderr.write = (s: string) => { err.push(String(s)); return true }
    try {
      return { code: await main(argv), out: out.join(''), err: err.join('') }
    } finally {
      process.stdout.write = so
      process.stderr.write = se
    }
  }

  test('sin --rst rehúsa con exit 2 y NO emite conteo', async () => {
    const r = await correr(['--import-tasks'])
    expect(r.code).toBe(2)
    expect(r.out).toBe('')
    expect(r.err).toContain('--rst')
  })

  test('importa sólo las pendientes y declara su denominador', async () => {
    const db = tablero()
    const r = await correr(['--import-tasks', '--rst', REAL, '--db', db])
    expect(r.code).toBe(0)
    const pendientes = parseRstTasks(readFileSync(REAL, 'utf8')).filter((t) => !t.done).length
    expect(r.out).toContain(`· importadas: ${pendientes} de`)
    const listar = taskTools({ dbPath: db, sessionId: 'import' }).find((t) => t.name === 'TaskList')!
    const filas = JSON.parse((await listar.run({}, { cwd: '.', sessionId: 'x', abort: new AbortController().signal, messages: [] })).content)
    expect(filas).toHaveLength(pendientes)
  })

  test('--dry-run no escribe: el tablero queda como estaba', async () => {
    const db = tablero()
    const r = await correr(['--import-tasks', '--rst', REAL, '--db', db, '--dry-run'])
    expect(r.code).toBe(0)
    const listar = taskTools({ dbPath: db, sessionId: 'import' }).find((t) => t.name === 'TaskList')!
    const filas = JSON.parse((await listar.run({}, { cwd: '.', sessionId: 'x', abort: new AbortController().signal, messages: [] })).content)
    expect(filas).toHaveLength(0)
  })

  test('reimportar no duplica: el asunto ya presente se salta', async () => {
    const db = tablero()
    await correr(['--import-tasks', '--rst', REAL, '--db', db])
    const r = await correr(['--import-tasks', '--rst', REAL, '--db', db])
    expect(r.out).toContain('· importadas: 0 de')
  })
})
