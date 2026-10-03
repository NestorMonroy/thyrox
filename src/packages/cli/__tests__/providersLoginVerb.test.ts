/**
 * `thyrox providers login <provider>`: traduce la invocación a las opciones
 * del corredor —navegador, plazo y cuenta a re-autenticar— y su desenlace a
 * un código de salida: 0 al guardar la cuenta, 124 si venció el plazo, 1 en
 * cualquier otro fallo. Un proveedor sin flujo de inicio de sesión se rehúsa
 * nombrando los que sí lo tienen.
 *
 * Porte de `runOAuthStart` en `omniroute: bin/cli/commands/oauth.mjs` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import type { LoginOptions, LoginOutcome } from '@thyrox/provider/accounts/oauth/loginRunner'

import { runLoginVerb } from '../src/commands/providers/loginVerb.ts'

type Row = Record<string, unknown>

function deps(outcome: LoginOutcome = { ok: true, connection: { id: 'n1', provider: 'codex', name: 'me@test', authType: 'oauth', accessToken: 'secret' } }, rows: Row[] = []) {
  const out: string[] = []
  const calls: LoginOptions[] = []
  return {
    out,
    calls,
    d: {
      store: { list: () => rows },
      write: (text: string) => void out.push(text),
      login: async (options: LoginOptions) => (calls.push(options), outcome),
      providers: ['claude', 'codex', 'github'],
    },
  }
}

describe('thyrox providers login', () => {
  test('logs in with the browser and the default deadline, and exits 0', async () => {
    const { d, calls, out } = deps()
    expect(await runLoginVerb(['codex'], d)).toBe(0)
    expect(calls).toEqual([{ provider: 'codex', browser: true }])
    expect(out.join('')).toBe('')
  })

  test('anthropic is the spelling of the claude flow', async () => {
    const { d, calls } = deps()
    expect(await runLoginVerb(['anthropic'], d)).toBe(0)
    expect(calls).toEqual([{ provider: 'claude', browser: true }])
  })

  test('--no-browser and --timeout reach the runner', async () => {
    const { d, calls } = deps()
    await runLoginVerb(['--timeout', '60000', 'codex', '--no-browser'], d)
    expect(calls).toEqual([{ provider: 'codex', browser: false, timeoutMs: 60000 }])
  })

  test('--json prints the stored account without its secrets', async () => {
    const { d, out } = deps()
    expect(await runLoginVerb(['codex', '--json'], d)).toBe(0)
    expect(JSON.parse(out.join('')).connection).toMatchObject({ id: 'n1', provider: 'codex', name: 'me@test' })
    expect(out.join('')).not.toContain('secret')
  })

  test('--connection re-authenticates that account, which must be of the same provider', async () => {
    const rows = [{ id: 'aaa1', provider: 'codex', name: 'work' }, { id: 'bbb2', provider: 'github', name: 'gh' }]
    const same = deps(undefined, rows)
    await runLoginVerb(['codex', '--connection', 'work'], same.d)
    expect(same.calls).toEqual([{ provider: 'codex', browser: true, connectionId: 'aaa1' }])
    const other = deps(undefined, rows)
    expect(await runLoginVerb(['codex', '--connection', 'gh'], other.d)).toBe(1)
    expect(other.out.join('')).toBe("Connection 'gh' belongs to provider 'github', not 'codex'.\n")
    expect(other.calls).toEqual([])
    const missing = deps(undefined, rows)
    expect(await runLoginVerb(['codex', '--connection', 'nope'], missing.d)).toBe(1)
    expect(missing.out.join('')).toBe("No provider connection matches 'nope'.\n")
  })

  test('a failed login exits 1 with its reason; a timed-out one exits 124', async () => {
    const failed = deps({ ok: false, error: 'OAuth state mismatch' })
    expect(await runLoginVerb(['codex'], failed.d)).toBe(1)
    expect(failed.out.join('')).toBe('Login failed: OAuth state mismatch\n')
    const late = deps({ ok: false, error: 'Timeout', timedOut: true })
    expect(await runLoginVerb(['codex'], late.d)).toBe(124)
  })

  test('without a provider, with an unknown one, or with a bad timeout it is a usage error that calls nothing', async () => {
    for (const [args, message] of [
      [[], 'Provider id is required. Available: claude, codex, github\n'],
      [['nope'], "Unknown login provider 'nope'. Available: claude, codex, github\n"],
      [['codex', '--timeout', '0'], '--timeout must be a positive integer (milliseconds).\n'],
      [['codex', '--timeout', 'soon'], '--timeout must be a positive integer (milliseconds).\n'],
    ] as const) {
      const { d, out, calls } = deps()
      expect(await runLoginVerb([...args], d)).toBe(2)
      expect(out.join('')).toBe(message)
      expect(calls).toEqual([])
    }
  })
})
