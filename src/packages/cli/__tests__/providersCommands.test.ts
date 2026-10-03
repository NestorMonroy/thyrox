/**
 * `thyrox providers list|remove` sobre el store de conexiones. Un selector
 * resuelve por id exacto, prefijo de id, nombre y proveedor, en ese orden, y
 * nombra la ambigüedad en vez de elegir. Ninguna salida lleva un secreto.
 * `remove` pide confirmación, que en stdin no interactiva sólo da `--yes`.
 *
 * Porte de `findConnectionFromResponse` y `runProviderRemoveCommand` en
 * `omniroute: bin/cli/commands/provider-crud.mjs` y de `runListCommand` en
 * `bin/cli/commands/providers.mjs` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { detectMode } from '../src/entry/detect-mode.ts'
import { providersCommand, type ProvidersCommandDeps } from '../src/commands/providers-commands.ts'
import { resolveConnection } from '../src/commands/providers/connectionSelector.ts'

type Row = Record<string, unknown>

const rows = (): Row[] => [
  { id: 'aaaa1111-x', provider: 'openai', name: 'main', authType: 'apikey', isActive: true, testStatus: 'active', apiKey: 'sk-secret', accessToken: 'tok-secret', refreshToken: 'ref-secret', lastTested: null, lastError: null, defaultModel: 'gpt-x' },
  { id: 'aaab2222-y', provider: 'anthropic', name: 'work', authType: 'oauth', isActive: false, testStatus: null, apiKey: null, accessToken: 'tok-2', refreshToken: 'ref-2', lastTested: null, lastError: 'expired token', defaultModel: null },
]

function deps(overrides: Partial<ProvidersCommandDeps> = {}) {
  const data = rows()
  const out: string[] = []
  const deleted: string[] = []
  let closed = 0
  const questions: string[] = []
  const d: ProvidersCommandDeps = {
    openStore: () => ({
      store: { list: () => data, delete: (id: string) => (deleted.push(id), true), update: () => null, create: () => null },
      close: () => void closed++,
    }),
    write: text => void out.push(text),
    interactive: true,
    confirm: async question => (questions.push(question), true),
    testDeps: { probe: async () => ({ valid: true, error: null }) },
    now: () => 'NOW',
    env: {},
    readStdin: async () => '',
    promptSecret: async () => '',
    readFile: () => '',
    login: async () => ({ ok: false, error: 'not under test' }),
    ...overrides,
  }
  return { d, out, deleted, questions, closed: () => closed }
}

describe('resolving a connection selector', () => {
  test('exact id, then id prefix, then name, then provider — case-insensitive and trimmed', () => {
    expect(resolveConnection(rows(), 'AAAA1111-X')?.name).toBe('main')
    expect(resolveConnection(rows(), 'aaab')?.name).toBe('work')
    expect(resolveConnection(rows(), ' Work ')?.id).toBe('aaab2222-y')
    expect(resolveConnection(rows(), 'openai')?.id).toBe('aaaa1111-x')
    expect(resolveConnection(rows(), 'nothing')).toBeNull()
    expect(resolveConnection(rows(), '  ')).toBeNull()
  })

  test('an exact id wins over a name that equals it', () => {
    const data = [...rows(), { id: 'zz', provider: 'x', name: 'aaaa1111-x' }]
    expect(resolveConnection(data, 'aaaa1111-x')?.name).toBe('main')
  })

  test('an exact id wins even when it is also the prefix of another id', () => {
    const data = [{ id: 'abc', provider: 'x', name: 'one' }, { id: 'abcd', provider: 'x', name: 'two' }]
    expect(resolveConnection(data, 'abc')?.name).toBe('one')
  })

  test('stored values are compared without case too', () => {
    expect(resolveConnection([{ id: 'ID-1', provider: 'OpenAI', name: 'Main' }], 'main')?.id).toBe('ID-1')
  })

  test('anthropic and claude select the same provider, whichever spelling the row carries', () => {
    expect(resolveConnection(rows(), 'claude')?.id).toBe('aaab2222-y')
    expect(resolveConnection([{ id: 'c-1', provider: 'claude', name: 'own' }], 'Anthropic')?.id).toBe('c-1')
  })

  test('an ambiguous selector names every candidate instead of picking one', () => {
    expect(() => resolveConnection(rows(), 'aaa')).toThrow("Provider connection selector 'aaa' is ambiguous: aaaa1111-x, aaab2222-y")
  })
})

describe('thyrox providers list', () => {
  test('is a mode of its own', () => {
    expect(detectMode(['providers', 'list']).kind).toBe('providers')
  })

  test('--json prints the public view of every connection, without secrets, and closes the store', async () => {
    const { d, out, closed } = deps()
    expect(await providersCommand(['providers', 'list', '--json'], d)).toBe(0)
    const printed = out.join('')
    expect(JSON.parse(printed)).toEqual({ providers: [
      { id: 'aaaa1111-x', provider: 'openai', name: 'main', authType: 'apikey', isActive: true, testStatus: 'active', lastTested: null, lastError: null, defaultModel: 'gpt-x' },
      { id: 'aaab2222-y', provider: 'anthropic', name: 'work', authType: 'oauth', isActive: false, testStatus: null, lastTested: null, lastError: 'expired token', defaultModel: null },
    ] })
    expect(printed).not.toContain('secret')
    expect(closed()).toBe(1)
  })

  test('the table has the reference columns — short id, provider, name, status — with unknown when untested', async () => {
    const { d, out } = deps()
    expect(await providersCommand(['providers', 'list'], d)).toBe(0)
    const lines = out.join('').trimEnd().split('\n')
    expect(lines).toEqual([
      'aaaa1111   openai         main                     active',
      'aaab2222   anthropic      work                     unknown',
    ])
  })

  test('with no connections says so', async () => {
    const { d, out } = deps({ openStore: () => ({ store: { list: () => [], delete: () => false, update: () => null, create: () => null }, close: () => {} }) })
    expect(await providersCommand(['providers', 'list'], d)).toBe(0)
    expect(out.join('')).toBe('No providers configured.\n')
  })
})

describe('thyrox providers remove', () => {
  test('without a selector is a usage error', async () => {
    const { d, out, deleted } = deps()
    expect(await providersCommand(['providers', 'remove'], d)).toBe(2)
    expect(out.join('')).toContain('Provider connection id, name, or provider is required.')
    expect(deleted).toEqual([])
  })

  test('an unknown selector fails without deleting', async () => {
    const { d, out, deleted } = deps()
    expect(await providersCommand(['providers', 'remove', 'nothing', '--yes'], d)).toBe(1)
    expect(out.join('')).toContain("No provider connection matches 'nothing'.")
    expect(deleted).toEqual([])
  })

  test('an ambiguous selector fails naming the candidates', async () => {
    const { d, out, deleted } = deps()
    expect(await providersCommand(['providers', 'remove', 'aaa', '--yes'], d)).toBe(1)
    expect(out.join('')).toContain('is ambiguous: aaaa1111-x, aaab2222-y')
    expect(deleted).toEqual([])
  })

  test('--dry-run says what would go and deletes nothing', async () => {
    const { d, out, deleted } = deps()
    expect(await providersCommand(['providers', 'remove', 'main', '--dry-run'], d)).toBe(0)
    expect(out.join('')).toBe('dry-run: would remove main\n')
    expect(deleted).toEqual([])
  })

  test('--yes removes without asking; --json prints the removed public view', async () => {
    const { d, out, deleted, questions } = deps()
    expect(await providersCommand(['providers', 'remove', 'work', '--yes', '--json'], d)).toBe(0)
    expect(deleted).toEqual(['aaab2222-y'])
    expect(questions).toEqual([])
    expect(JSON.parse(out.join('')).removed.id).toBe('aaab2222-y')
    expect(out.join('')).not.toContain('ref-2')
  })

  test('interactively it asks, and a no removes nothing', async () => {
    const { d, out, deleted, questions } = deps({ confirm: async question => (void question, false) })
    expect(await providersCommand(['providers', 'remove', 'main'], d)).toBe(0)
    expect(deleted).toEqual([])
    expect(out.join('')).toBe('')
    const asked = deps()
    expect(await providersCommand(['providers', 'remove', 'main'], asked.d)).toBe(0)
    expect(asked.questions).toEqual(["Remove provider connection 'main'? [y/N] "])
    expect(asked.deleted).toEqual(['aaaa1111-x'])
    expect(asked.out.join('')).toBe("Removed provider connection 'main'.\n")
    void questions
  })

  test('on non-interactive stdin, without --yes, it declines and says how to confirm', async () => {
    const { d, out, deleted, questions } = deps({ interactive: false })
    expect(await providersCommand(['providers', 'remove', 'main'], d)).toBe(0)
    expect(deleted).toEqual([])
    expect(questions).toEqual([])
    expect(out.join('')).toBe("Removal of 'main' declined on non-interactive stdin; pass --yes to confirm.\n")
  })

  test('an unknown verb is a usage error naming the verbs', async () => {
    const { d, out } = deps()
    expect(await providersCommand(['providers', 'frobnicate'], d)).toBe(2)
    expect(out.join('')).toContain("thyrox providers: unknown verb 'frobnicate'; expected one of: list, add, edit, import, remove, test, test-all, validate, login")
  })
})

describe('providers login', () => {
  test('runs the login dependency against the opened store and closes it', async () => {
    const seen: { options: unknown; listed: number }[] = []
    const { d, out, closed } = deps({
      login: async (store, options) => (seen.push({ options, listed: store.list().length }), { ok: true, connection: { id: 'new-1', provider: 'codex', name: 'codex' } }),
    })
    expect(await providersCommand(['providers', 'login', 'codex', '--no-browser', '--json'], d)).toBe(0)
    expect(seen).toEqual([{ options: { provider: 'codex', browser: false }, listed: 2 }])
    expect(JSON.parse(out.join('')).connection.id).toBe('new-1')
    expect(closed()).toBe(1)
  })

  test('refuses a provider that has no login flow', async () => {
    const { d, out } = deps()
    expect(await providersCommand(['providers', 'login', 'openai'], d)).toBe(2)
    expect(out.join('')).toContain("Unknown login provider 'openai'")
  })
})
