/**
 * `thyrox providers add|edit|import`. La credencial llega por variable de
 * entorno, por stdin o por un prompt oculto, nunca como argumento: un
 * argumento queda en el historial del shell y a la vista de `ps`. Ninguna
 * salida lleva el secreto; el ensayo (`--dry-run`) sólo dice si hay uno y su
 * longitud. `import` salta lo que ya existe por proveedor y nombre, y un
 * archivo no puede aportar más que datos de proveedor.
 *
 * Porte de `buildProviderPayload`, `resolveProviderCredential`,
 * `runProviderAddCommand`, `runProviderEditCommand` y
 * `runProviderImportCommand` en `omniroute: bin/cli/commands/provider-crud.mjs` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { providersCommand, type ProvidersCommandDeps } from '../src/commands/providers-commands.ts'
import { buildConnectionPayload } from '../src/commands/providers/connectionPayload.ts'

type Row = Record<string, unknown>

function deps(overrides: Partial<ProvidersCommandDeps> = {}, rows: Row[] = []) {
  const out: string[] = []
  const created: Row[] = []
  const updates: Array<[string, Row]> = []
  const prompts: string[] = []
  let serial = 0
  const d: ProvidersCommandDeps = {
    openStore: () => ({
      store: {
        list: () => rows,
        delete: () => true,
        update: (id: string, fields: Row) => (updates.push([id, fields]), { ...rows.find(row => row.id === id), ...fields }),
        create: (data: Row) => {
          const row = { id: `new-${++serial}`, isActive: true, testStatus: null, lastTested: null, lastError: null, defaultModel: null, ...data }
          created.push(row)
          rows.push(row)
          return row
        },
      },
      close: () => {},
    }),
    write: text => void out.push(text),
    interactive: true,
    confirm: async () => true,
    testDeps: { probe: async () => ({ valid: true, error: null }) },
    now: () => 'NOW',
    env: { SECRET_VAR: '  sk-from-env  ', EMPTY_VAR: ' ' },
    readStdin: async () => '  sk-from-stdin\n',
    promptSecret: async question => (prompts.push(question), 'sk-typed'),
    readFile: () => { throw new Error('no such file') },
    ...overrides,
  }
  return { d, out, created, updates, prompts }
}

describe('building a connection payload', () => {
  test('the name defaults to the provider; model, priority and provider data are optional', () => {
    expect(buildConnectionPayload('openai', {}, 'sk')).toEqual({ provider: 'openai', name: 'openai', authType: 'apikey', apiKey: 'sk' })
    expect(buildConnectionPayload(' openai ', { name: ' main ', defaultModel: ' gpt ', priority: '2', providerSpecificData: '{"baseUrl":"https://x.test"}' }, undefined)).toEqual({ provider: 'openai', name: 'main', authType: 'apikey', defaultModel: 'gpt', priority: 2, providerSpecificData: { baseUrl: 'https://x.test' } })
  })

  test('a priority must be a positive integer and provider data a JSON object', () => {
    for (const priority of ['0', '-1', '1.5', 'x']) expect(() => buildConnectionPayload('p', { priority }, 'k')).toThrow('--priority must be a positive integer.')
    for (const data of ['[]', '1', 'null', '{bad']) expect(() => buildConnectionPayload('p', { providerSpecificData: data }, 'k')).toThrow('--provider-specific-data must be a JSON object')
  })
})

describe('thyrox providers add', () => {
  test('reads the credential from a named environment variable, trimmed, and stores it without echoing it', async () => {
    const { d, out, created } = deps()
    expect(await providersCommand(['providers', 'add', 'openai', '--name', 'main', '--credential-env', 'SECRET_VAR'], d)).toBe(0)
    expect(created[0]).toMatchObject({ provider: 'openai', name: 'main', authType: 'apikey', apiKey: 'sk-from-env' })
    expect(out.join('')).toBe("Added provider connection 'main'.\n")
  })

  test('reads the credential from stdin, and --json prints the public connection', async () => {
    const { d, out, created } = deps()
    expect(await providersCommand(['providers', 'add', 'openai', '--credential-stdin', '--json'], d)).toBe(0)
    expect(created[0]!.apiKey).toBe('sk-from-stdin')
    const printed = out.join('')
    expect(JSON.parse(printed).connection).toMatchObject({ id: 'new-1', provider: 'openai', name: 'openai' })
    expect(printed).not.toContain('sk-from-stdin')
  })

  test('with no source it asks for the credential hidden, and only interactively', async () => {
    const asked = deps()
    expect(await providersCommand(['providers', 'add', 'openai'], asked.d)).toBe(0)
    expect(asked.prompts).toEqual(['Provider credential (hidden): '])
    expect(asked.created[0]!.apiKey).toBe('sk-typed')
    const scripted = deps({ interactive: false })
    expect(await providersCommand(['providers', 'add', 'openai'], scripted.d)).toBe(1)
    expect(scripted.out.join('')).toBe('Provider credential is required (use --credential-stdin or --credential-env).\n')
    expect(scripted.created).toEqual([])
  })

  test('a credential passed as an argument is refused, and nothing is stored', async () => {
    const { d, out, created } = deps()
    expect(await providersCommand(['providers', 'add', 'openai', '--credential', 'sk-visible'], d)).toBe(2)
    expect(out.join('')).toBe('--credential is not accepted: a secret on the command line stays in shell history and in ps. Use --credential-stdin or --credential-env.\n')
    expect(created).toEqual([])
  })

  test('a bad environment variable name, an unset variable or an empty stdin fail without storing', async () => {
    for (const [args, message] of [
      [['--credential-env', '1BAD'], '--credential-env must be a valid env name.'],
      [['--credential-env', 'EMPTY_VAR'], 'Environment variable EMPTY_VAR is empty or unset.'],
      [['--credential-env', 'MISSING'], 'Environment variable MISSING is empty or unset.'],
    ] as const) {
      const { d, out, created } = deps()
      expect(await providersCommand(['providers', 'add', 'openai', ...args], d)).toBe(1)
      expect(out.join('')).toBe(`${message}\n`)
      expect(created).toEqual([])
    }
    const empty = deps({ readStdin: async () => ' \n' })
    expect(await providersCommand(['providers', 'add', 'openai', '--credential-stdin'], empty.d)).toBe(1)
    expect(empty.out.join('')).toBe('Credential stdin was empty.\n')
  })

  test('--no-credential adds a keyless connection without asking', async () => {
    const { d, created, prompts } = deps()
    expect(await providersCommand(['providers', 'add', 'ollama', '--no-credential'], d)).toBe(0)
    expect(created[0]!.apiKey).toBeUndefined()
    expect(prompts).toEqual([])
  })

  test('--dry-run previews the shape of the credential, never its value, and writes nothing', async () => {
    const { d, out, created } = deps()
    expect(await providersCommand(['providers', 'add', 'openai', '--credential-env', 'SECRET_VAR', '--provider-specific-data', '{"baseUrl":"u","clientSecret":"s"}', '--dry-run', '--json'], d)).toBe(0)
    expect(JSON.parse(out.join(''))).toEqual({ action: 'providers.add', provider: 'openai', name: 'openai', defaultModel: null, credential: { present: true, length: 11 }, providerSpecificData: { baseUrl: 'u', clientSecret: { present: true, length: 1 } } })
    expect(created).toEqual([])
    const text = deps()
    await providersCommand(['providers', 'add', 'openai', '--credential-env', 'SECRET_VAR', '--dry-run'], text.d)
    expect(text.out.join('')).toBe('dry-run: would add openai/openai\n')
  })

  test('without a provider it is a usage error; a flag value is never taken for the provider', async () => {
    const { d, out } = deps()
    expect(await providersCommand(['providers', 'add', '--name', 'main'], d)).toBe(2)
    expect(out.join('')).toBe('Provider id is required.\n')
  })
})

describe('thyrox providers edit', () => {
  const existing = (): Row[] => [{ id: 'c1', provider: 'openai', name: 'main', authType: 'apikey', isActive: true, apiKey: 'sk-old' }]

  test('changes only the declared fields, and --inactive deactivates', async () => {
    const { d, out, updates } = deps({}, existing())
    expect(await providersCommand(['providers', 'edit', 'main', '--name', 'renamed', '--default-model', 'gpt', '--priority', '3', '--inactive'], d)).toBe(0)
    expect(updates).toEqual([['c1', { name: 'renamed', defaultModel: 'gpt', priority: 3, isActive: false }]])
    expect(out.join('')).toBe("Updated provider connection 'main'.\n")
  })

  test('replaces the credential only from a non-argument source, without prompting', async () => {
    const { d, updates, prompts } = deps({}, existing())
    expect(await providersCommand(['providers', 'edit', 'main', '--credential-stdin'], d)).toBe(0)
    expect(updates).toEqual([['c1', { apiKey: 'sk-from-stdin' }]])
    expect(prompts).toEqual([])
  })

  test('with nothing to change, both --active and --inactive, or a bad priority, it is a usage error', async () => {
    for (const [extra, message] of [
      [[], 'At least one edit field is required (--name, --default-model, --priority, --active/--inactive, or credential).'],
      [['--active', '--inactive'], '--active and --inactive cannot be used together.'],
      [['--priority', '0'], '--priority must be a positive integer.'],
    ] as const) {
      const { d, out, updates } = deps({}, existing())
      expect(await providersCommand(['providers', 'edit', 'main', ...extra], d)).toBe(2)
      expect(out.join('')).toBe(`${message}\n`)
      expect(updates).toEqual([])
    }
  })

  test('--dry-run shows the change with the credential as its shape, and writes nothing', async () => {
    const { d, out, updates } = deps({}, existing())
    expect(await providersCommand(['providers', 'edit', 'main', '--active', '--credential-env', 'SECRET_VAR', '--dry-run', '--json'], d)).toBe(0)
    expect(JSON.parse(out.join('')).changes).toEqual({ isActive: true, apiKey: { present: true, length: 11 } })
    expect(out.join('')).not.toContain('sk-old')
    expect(updates).toEqual([])
  })

  test('an unknown selector fails', async () => {
    const { d, out } = deps({}, existing())
    expect(await providersCommand(['providers', 'edit', 'nothing', '--active'], d)).toBe(1)
    expect(out.join('')).toBe("No provider connection matches 'nothing'.\n")
  })
})

describe('thyrox providers import', () => {
  const file = (content: unknown) => ({ readFile: () => JSON.stringify(content) })

  test('creates every entry, skipping one that exists by provider and name, case-insensitively', async () => {
    const rows: Row[] = [{ id: 'c1', provider: 'OpenAI', name: 'Main', authType: 'apikey' }]
    const { d, out, created } = deps(file({ providers: [{ provider: 'openai', name: 'main', apiKey: 'k1' }, { provider: 'groq', apiKey: 'k2' }] }), rows)
    expect(await providersCommand(['providers', 'import', 'conns.json', '--json'], d)).toBe(0)
    expect(created.map(row => [row.provider, row.name, row.apiKey])).toEqual([['groq', 'groq', 'k2']])
    expect(JSON.parse(out.join(''))).toEqual({ file: 'conns.json', results: [
      { provider: 'openai', name: 'main', ok: true, status: 'skipped_existing', connectionId: 'c1' },
      { provider: 'groq', name: 'groq', ok: true, status: 'created', connectionId: 'new-1' },
    ] })
  })

  test('an entry cannot bring anything but provider data', async () => {
    const { d, created } = deps(file([{ provider: 'groq', credential: 'k', isActive: false, id: 'forced', authType: 'oauth' }]))
    expect(await providersCommand(['providers', 'import', 'f.json'], d)).toBe(0)
    expect(created[0]).toMatchObject({ id: 'new-1', authType: 'apikey', isActive: true, apiKey: 'k' })
  })

  test('stops at the first bad entry unless --continue-on-error', async () => {
    const content = [{ name: 'no-provider' }, { provider: 'groq', apiKey: 'k' }]
    const stop = deps(file(content))
    expect(await providersCommand(['providers', 'import', 'f.json', '--json'], stop.d)).toBe(1)
    expect(JSON.parse(stop.out.join('')).results).toEqual([{ ok: false, error: 'entry.provider is required' }])
    const go = deps(file(content))
    expect(await providersCommand(['providers', 'import', 'f.json', '--continue-on-error'], go.d)).toBe(1)
    expect(go.created.map(row => row.provider)).toEqual(['groq'])
  })

  test('an entry without a credential fails unless it allows none', async () => {
    const { d, created } = deps(file([{ provider: 'openai' }, { provider: 'ollama', allowNoCredential: true }]))
    expect(await providersCommand(['providers', 'import', 'f.json', '--continue-on-error'], d)).toBe(1)
    expect(created.map(row => row.provider)).toEqual(['ollama'])
  })

  test('--dry-run creates nothing; an unreadable or empty file fails', async () => {
    const dry = deps(file([{ provider: 'groq', apiKey: 'k' }]))
    expect(await providersCommand(['providers', 'import', 'f.json', '--dry-run'], dry.d)).toBe(0)
    expect(dry.created).toEqual([])
    const missing = deps()
    expect(await providersCommand(['providers', 'import', 'f.json'], missing.d)).toBe(1)
    expect(missing.out.join('')).toBe('Cannot read provider import file: no such file\n')
    const empty = deps(file([]))
    expect(await providersCommand(['providers', 'import', 'f.json'], empty.d)).toBe(2)
    expect(empty.out.join('')).toBe('Provider import file contains no entries.\n')
  })
})
