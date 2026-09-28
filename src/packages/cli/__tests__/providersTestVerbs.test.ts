/**
 * `thyrox providers test|test-all|validate`. Un veredicto real se guarda en
 * la fila; uno saltado no. `test-all` salta las conexiones inactivas y falla
 * sólo si alguna prueba real falló. `validate` no usa red.
 *
 * Porte de `runTestCommand`, `runTestAllCommand` y `runValidateCommand` en
 * `omniroute: bin/cli/commands/providers.mjs` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { providersCommand, type ProvidersCommandDeps } from '../src/commands/providers-commands.ts'

type Row = Record<string, unknown>

const data = (): Row[] => [
  { id: 'k1', provider: 'openai', name: 'good', authType: 'apikey', isActive: true, apiKey: 'sk-good', testStatus: null, lastTested: null, lastError: null, defaultModel: null },
  { id: 'k2', provider: 'openai', name: 'bad', authType: 'apikey', isActive: true, apiKey: 'sk-bad', testStatus: null, lastTested: null, lastError: null, defaultModel: null },
  { id: 'o1', provider: 'anthropic', name: 'oauth', authType: 'oauth', isActive: true, accessToken: 't', testStatus: 'active', lastTested: null, lastError: null, defaultModel: null },
  { id: 'i1', provider: 'openai', name: 'off', authType: 'apikey', isActive: false, apiKey: 'sk-off', testStatus: null, lastTested: null, lastError: null, defaultModel: null },
]

function deps(rows: Row[] = data()) {
  const out: string[] = []
  const updates: Array<[string, Row]> = []
  const d: ProvidersCommandDeps = {
    openStore: () => ({
      store: { list: () => rows, delete: () => true, update: (id: string, fields: Row) => (updates.push([id, fields]), fields), create: () => null },
      close: () => {},
    }),
    write: text => void out.push(text),
    interactive: false,
    confirm: async () => false,
    testDeps: { probe: async input => (input.apiKey === 'sk-good' ? { valid: true, error: null, statusCode: 200 } : { valid: false, error: 'Invalid API key', statusCode: 401 }) },
    now: () => 'NOW',
    env: {},
    readStdin: async () => '',
    promptSecret: async () => '',
    readFile: () => '',
  }
  return { d, out, updates }
}

describe('thyrox providers test', () => {
  test('a passing connection prints OK, persists active and exits 0', async () => {
    const { d, out, updates } = deps()
    expect(await providersCommand(['providers', 'test', 'good'], d)).toBe(0)
    expect(out.join('')).toBe('OK good: provider test passed\n')
    expect(updates).toEqual([['k1', { testStatus: 'active', lastError: null, lastErrorAt: null, lastErrorType: null, lastErrorSource: null, errorCode: null, lastTested: 'NOW' }]])
  })

  test('a failing connection prints FAIL with the reason, persists the error and exits 1', async () => {
    const { d, out, updates } = deps()
    expect(await providersCommand(['providers', 'test', 'bad'], d)).toBe(1)
    expect(out.join('')).toBe('FAIL bad: Invalid API key\n')
    expect(updates[0]![1]).toMatchObject({ testStatus: 'error', errorCode: 401 })
  })

  test('--json prints the public connection and the verdict, without the persistence flag or secrets', async () => {
    const { d, out } = deps()
    await providersCommand(['providers', 'test', 'good', '--json'], d)
    const printed = JSON.parse(out.join(''))
    expect(printed).toEqual({ connection: expect.objectContaining({ id: 'k1', name: 'good' }), valid: true, error: null, statusCode: 200, skipped: false })
    expect(out.join('')).not.toContain('sk-good')
  })

  test('a skipped connection is not persisted', async () => {
    const { d, updates } = deps()
    expect(await providersCommand(['providers', 'test', 'oauth'], d)).toBe(1)
    expect(updates).toEqual([])
  })

  test('without a selector, or with one that matches nothing, it fails without testing', async () => {
    const { d, out, updates } = deps()
    expect(await providersCommand(['providers', 'test'], d)).toBe(1)
    expect(await providersCommand(['providers', 'test', 'nothing'], d)).toBe(1)
    expect(out.join('')).toBe('Provider id or name is required.\nProvider connection not found: nothing\n')
    expect(updates).toEqual([])
  })
})

describe('thyrox providers test-all', () => {
  test('tests every active connection, skips inactive ones, and fails when a real test failed', async () => {
    const { d, out, updates } = deps()
    expect(await providersCommand(['providers', 'test-all'], d)).toBe(1)
    expect(out.join('')).toBe(['OK good: provider test passed', 'FAIL bad: Invalid API key', 'SKIP oauth: No API-key probe for oauth connections', 'SKIP off: Connection is inactive', ''].join('\n'))
    expect(updates.map(([id]) => id)).toEqual(['k1', 'k2'])
  })

  test('only skips and passes exit 0; --json lists the results', async () => {
    const rows = data().filter(row => row.name !== 'bad')
    const { d, out } = deps(rows)
    expect(await providersCommand(['providers', 'test-all', '--json'], d)).toBe(0)
    expect(JSON.parse(out.join('')).results.map((r: Row) => [r.valid, r.skipped])).toEqual([[true, false], [false, true], [false, true]])
  })
})

describe('thyrox providers validate', () => {
  test('lists each connection with its issues and warnings and fails when one is unusable', async () => {
    const rows: Row[] = [...data(), { id: 'x', provider: 'openai', name: 'nokey', authType: 'apikey', apiKey: '' }]
    const { d, out, updates } = deps(rows)
    expect(await providersCommand(['providers', 'validate'], d)).toBe(1)
    expect(out.join('')).toBe(['OK good', 'OK bad', 'OK oauth', 'OK off', 'FAIL nokey: Connection nokey has no API key configured.', ''].join('\n'))
    expect(updates).toEqual([])
  })

  test('with all valid exits 0; --json lists the results; none configured says so', async () => {
    const { d, out } = deps()
    expect(await providersCommand(['providers', 'validate', '--json'], d)).toBe(0)
    expect(JSON.parse(out.join('')).results[0]).toEqual({ connection: expect.objectContaining({ id: 'k1' }), valid: true, issues: [], warnings: [] })
    const empty = deps([])
    expect(await providersCommand(['providers', 'validate'], empty.d)).toBe(0)
    expect(empty.out.join('')).toBe('No providers configured.\n')
  })
})
