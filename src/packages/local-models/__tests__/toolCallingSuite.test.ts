import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { InvalidSuiteError, TOOL_CALLING_SUITE_PATH, loadSuite, scoreReply, type CaseExpectation } from '../toolCallingSuite.js'

const WORKDIR = mkdtempSync(join(tmpdir(), 'tool-calling-suite-'))
afterAll(() => rmSync(WORKDIR, { recursive: true, force: true }))

const BENCHMARK_CASE_IDS = ['single_tool', 'integer_arguments', 'choose_between_tools', 'enum_argument', 'no_tool_needed', 'continuation_after_tool']

describe('loadSuite — el archivo de datos del paquete', () => {
  test('tool-calling@1 trae los seis casos del benchmark, en su orden, con sus herramientas resueltas', async () => {
    const suite = await loadSuite(TOOL_CALLING_SUITE_PATH)
    expect(suite.id).toBe('tool-calling@1')
    expect(suite.cases.map(c => c.id)).toEqual(BENCHMARK_CASE_IDS)
    const choose = suite.cases[2]
    expect(choose?.tools.map(tool => (tool as { function: { name: string } }).function.name)).toEqual(['list_dir', 'read_file'])
  })

  test('un caso que nombra una herramienta no declarada se rehúsa nombrando el caso', async () => {
    const path = join(WORKDIR, 'unknown-tool.json')
    writeFileSync(path, JSON.stringify({ id: 'x@1', tools: {}, cases: [{ id: 'c1', tools: ['ghost'], messages: [], expectation: { kind: 'no-tool-call' } }] }))
    await expect(loadSuite(path)).rejects.toThrow(/cases\[0\]\.tools.*ghost/)
  })

  test('una expectativa de clase desconocida se rehúsa', async () => {
    const path = join(WORKDIR, 'unknown-kind.json')
    writeFileSync(path, JSON.stringify({ id: 'x@1', tools: {}, cases: [{ id: 'c1', tools: [], messages: [], expectation: { kind: 'vibes' } }] }))
    await expect(loadSuite(path)).rejects.toThrow(InvalidSuiteError)
  })

  test('una suite sin casos no es una suite', async () => {
    const path = join(WORKDIR, 'empty.json')
    writeFileSync(path, JSON.stringify({ id: 'x@1', tools: {}, cases: [] }))
    await expect(loadSuite(path)).rejects.toThrow(/cases/)
  })
})

describe('scoreReply — la recompensa de cada caso', () => {
  const call: CaseExpectation = { kind: 'tool-call', name: 'add', arguments: { a: 17, b: 25 } }

  test('tool-call: nombre y argumentos exactos, sin importar el orden de claves', () => {
    expect(scoreReply(call, { content: '', toolCalls: [{ name: 'add', arguments: { b: 25, a: 17 } }] })).toBe(true)
  })

  test('tool-call: un argumento de otro tipo no acierta («17» no es 17)', () => {
    expect(scoreReply(call, { content: '', toolCalls: [{ name: 'add', arguments: { a: '17', b: 25 } }] })).toBe(false)
  })

  test('tool-call: un argumento de más no acierta', () => {
    expect(scoreReply(call, { content: '', toolCalls: [{ name: 'add', arguments: { a: 17, b: 25, c: 0 } }] })).toBe(false)
  })

  test('tool-call: se juzga la primera llamada, y sin llamada no acierta', () => {
    expect(scoreReply(call, { content: '', toolCalls: [{ name: 'sub', arguments: {} }, { name: 'add', arguments: { a: 17, b: 25 } }] })).toBe(false)
    expect(scoreReply(call, { content: '42', toolCalls: [] })).toBe(false)
  })

  test('no-tool-call: acierta sin llamadas y falla con una', () => {
    expect(scoreReply({ kind: 'no-tool-call' }, { content: 'hello', toolCalls: [] })).toBe(true)
    expect(scoreReply({ kind: 'no-tool-call' }, { content: '', toolCalls: [{ name: 'get_weather', arguments: {} }] })).toBe(false)
  })

  test('content-includes: el texto tiene que aparecer en el contenido', () => {
    expect(scoreReply({ kind: 'content-includes', text: '42' }, { content: 'The result is 42.', toolCalls: [] })).toBe(true)
    expect(scoreReply({ kind: 'content-includes', text: '42' }, { content: 'forty-two', toolCalls: [] })).toBe(false)
  })
})
