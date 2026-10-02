/**
 * Suite de cualificación de TAREA (TASK-THYROX-0780): la escribe el consumidor
 * con su trabajo real y la puntúa thyrox con comprobaciones deterministas sobre
 * la respuesta del modelo.
 *
 * Qué haría fallar a esta suite: una clase de tarea que no es de thyrox, una
 * comprobación desconocida o un patrón roto que pasen la lectura, un caso sin
 * comprobaciones (aprobaría cualquier respuesta), o un veredicto que no nombre
 * lo que falló.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { InvalidTaskSuiteError, loadTaskSuite, scoreTaskReply } from '../taskSuite.js'

let directory: string
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'task-suite-')) })
afterEach(() => { rmSync(directory, { recursive: true, force: true }) })

function suiteFile(document: unknown): string {
  const path = join(directory, 'suite.json')
  writeFileSync(path, JSON.stringify(document))
  return path
}

const CASE = {
  id: 'parrafo-1',
  messages: [{ role: 'user', content: '翻译：\\textbf{模型}' }],
  checks: [
    { kind: 'includes', text: '\\textbf{' },
    { kind: 'excludes', text: 'modelo de lenguaje grande' },
    { kind: 'excludes-pattern', pattern: '\\p{Script=Han}' },
  ],
}
const suiteWith = (fields: Record<string, unknown>) => suiteFile({ id: 'es-mx-translation@1', taskClass: 'analisis', cases: [CASE], ...fields })

describe('loadTaskSuite', () => {
  test('lee el id, la clase y los casos con sus comprobaciones', async () => {
    const suite = await loadTaskSuite(suiteWith({}))
    expect(suite.id).toBe('es-mx-translation@1')
    expect(suite.taskClass).toBe('analisis')
    expect(suite.cases.map(c => [c.id, c.checks.length])).toEqual([['parrafo-1', 3]])
  })

  test('una clase que no es de thyrox se rehúsa', async () => {
    await expect(loadTaskSuite(suiteWith({ taskClass: 'traduccion' }))).rejects.toThrow(InvalidTaskSuiteError)
  })

  test('una comprobación desconocida se rehúsa nombrando su campo', async () => {
    const cases = [{ ...CASE, checks: [{ kind: 'parece-bien' }] }]
    await expect(loadTaskSuite(suiteWith({ cases }))).rejects.toThrow(/cases\[0\]\.checks\[0\]/)
  })

  test('un patrón que no compila se rehúsa al leer, no al puntuar', async () => {
    const cases = [{ ...CASE, checks: [{ kind: 'excludes-pattern', pattern: '(' }] }]
    await expect(loadTaskSuite(suiteWith({ cases }))).rejects.toThrow(InvalidTaskSuiteError)
  })

  test('un caso sin comprobaciones se rehúsa: aprobaría cualquier respuesta', async () => {
    const cases = [{ ...CASE, checks: [] }]
    await expect(loadTaskSuite(suiteWith({ cases }))).rejects.toThrow(InvalidTaskSuiteError)
  })
})

describe('scoreTaskReply', () => {
  test('aprueba sólo si se cumplen todas las comprobaciones', async () => {
    const [suiteCase] = (await loadTaskSuite(suiteWith({}))).cases
    expect(scoreTaskReply(suiteCase!.checks, 'Traduce: \\textbf{modelo}')).toEqual({ passed: true, failed: [] })
  })

  test('nombra cada comprobación que falla', async () => {
    const [suiteCase] = (await loadTaskSuite(suiteWith({}))).cases
    const score = scoreTaskReply(suiteCase!.checks, 'un modelo de lenguaje grande 模型')
    expect(score.passed).toBe(false)
    expect(score.failed).toEqual(['includes «\\textbf{»', 'excludes «modelo de lenguaje grande»', 'excludes-pattern «\\p{Script=Han}»'])
  })
})
