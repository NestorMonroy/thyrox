/**
 * El corredor de un inicio de sesión OAuth en la propia máquina: el flujo de
 * código abre un callback local, verifica el `state`, intercambia el código y
 * guarda la cuenta; el de dispositivo pide el código, lo muestra y sondea con
 * su intervalo —más lento ante `slow_down`— hasta el token o la caducidad; el
 * de importación lee el token, lo valida con el flujo y lo guarda.
 *
 * Porte de `runCallbackFlow`, `runDeviceFlow` y `runImportFlow`
 * (`omniroute: bin/cli/commands/oauth.mjs`) y de las acciones `exchange`,
 * `device-code`, `poll` e `import-token` de
 * `src/app/api/oauth/[provider]/[action]/route.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'

import { createConnectionStore } from '../../../src/accounts/connectionStore.ts'
import { createFieldCipher } from '../../../src/accounts/fieldCipher.ts'
import { createOAuthFlows, type OAuthProviderFlow, type PollResult } from '../../../src/accounts/oauth/oauthFlows.ts'
import { runOAuthLogin, type LoginRunnerDeps } from '../../../src/accounts/oauth/loginRunner.ts'

type Row = Record<string, unknown>

function store() {
  let ids = 0
  return createConnectionStore({ db: new Database(':memory:'), cipher: createFieldCipher('k', () => {}), newId: () => `c${++ids}` })
}

function callbackServer(params: Record<string, string> | Error) {
  const seen: { options?: unknown; closed: number } = { closed: 0 }
  const start = async (options: unknown) => {
    seen.options = options
    return { host: '127.0.0.1', port: 5151, callback: params instanceof Error ? Promise.reject(params) : Promise.resolve(params), close: () => void seen.closed++ }
  }
  return { seen, start }
}

function deps(flows: Record<string, OAuthProviderFlow<any>>, overrides: Partial<LoginRunnerDeps> = {}) {
  const out: string[] = []
  const opened: string[] = []
  const sleeps: number[] = []
  let clock = 0
  const s = store()
  const d: LoginRunnerDeps = {
    flows: createOAuthFlows(flows),
    store: s,
    write: text => void out.push(text),
    openBrowser: async url => void opened.push(url),
    readToken: async () => '',
    startCallbackServer: callbackServer({ code: 'the-code', state: 'unused' }).start,
    // Un sondeo sin fin se corta aquí, en vez de colgar la prueba en un bucle de microtareas.
    sleep: async ms => {
      sleeps.push(ms)
      clock += ms
      if (sleeps.length > 50) throw new Error('runaway polling')
    },
    now: () => clock,
    ...overrides,
  }
  return { d, out, opened, sleeps, store: s }
}

const codeFlow = (exchanged: unknown[] = []): OAuthProviderFlow<null> => ({
  config: null,
  flowType: 'authorization_code_pkce',
  fixedPort: 1455,
  callbackPath: '/auth/callback',
  buildAuthUrl: (_config, redirectUri, state, challenge) => `https://auth.test/authorize?redirect_uri=${redirectUri}&state=${state}&challenge=${challenge}`,
  exchangeToken: async (_config, code, redirectUri, verifier, state) => (exchanged.push({ code, redirectUri, verifier: verifier.length > 0, state: state.length > 0 }), { access_token: 'at', refresh_token: 'rt', email: 'me@test' }),
  mapTokens: tokens => ({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token, email: tokens.email, expiresIn: 3600 }),
})

const stateFrom = (url: string) => new URL(url).searchParams.get('state')!

describe('the authorization code login', () => {
  test('opens the callback on the flow port, shows and opens the url, exchanges the code and stores the account', async () => {
    const exchanged: unknown[] = []
    let url = ''
    let redirect!: (params: Record<string, string>) => void
    const server = callbackServer({ code: 'x', state: 'x' })
    const { d, out, opened, store: s } = deps({ codex: codeFlow(exchanged) }, {
      startCallbackServer: async options => {
        const started = await server.start(options)
        return { ...started, callback: new Promise<Record<string, string>>(resolve => (redirect = resolve)) }
      },
      openBrowser: async target => {
        url = target
        redirect({ code: 'the-code', state: stateFrom(target) })
      },
    })
    const outcome = await runOAuthLogin({ provider: 'codex' }, d)
    expect(outcome).toMatchObject({ ok: true, connection: { provider: 'codex', email: 'me@test', authType: 'oauth' } })
    expect(server.seen.options).toMatchObject({ fixedPort: 1455 })
    expect(new URL(url).searchParams.get('redirect_uri')).toBe('http://localhost:5151/auth/callback')
    expect(exchanged).toEqual([{ code: 'the-code', redirectUri: 'http://localhost:5151/auth/callback', verifier: true, state: true }])
    expect(out.join('')).toContain(`Open this URL to authorize:\n  ${url}\n`)
    expect(out.join('')).toContain('Authorized: me@test\n')
    expect(server.seen.closed).toBe(1)
    expect(s.list({ provider: 'codex' })).toHaveLength(1)
    void opened
  })

  test('without a browser it only prints the url', async () => {
    const opened: string[] = []
    const { d } = deps({ codex: codeFlow() }, { openBrowser: async url => void opened.push(url), startCallbackServer: callbackServer(new Error('Authentication timeout')).start })
    await runOAuthLogin({ provider: 'codex', browser: false }, d)
    expect(opened).toEqual([])
  })

  test('a state that does not match is refused without exchanging', async () => {
    const exchanged: unknown[] = []
    const { d, store: s } = deps({ codex: codeFlow(exchanged) }, { startCallbackServer: callbackServer({ code: 'c', state: 'forged' }).start })
    expect(await runOAuthLogin({ provider: 'codex' }, d)).toEqual({ ok: false, error: 'OAuth state mismatch' })
    expect(exchanged).toEqual([])
    expect(s.list()).toEqual([])
  })

  test('a provider error, a missing code or a callback timeout fail and still close the server', async () => {
    for (const [params, error] of [
      [{ error: 'access_denied', error_description: 'User said no' }, 'User said no'],
      [{ error: 'access_denied' }, 'access_denied'],
      [{ state: 's' }, 'Authorization callback did not include a code'],
    ] as const) {
      const server = callbackServer(params as Record<string, string>)
      const { d } = deps({ codex: codeFlow() }, { startCallbackServer: server.start })
      expect(await runOAuthLogin({ provider: 'codex' }, d)).toEqual({ ok: false, error })
      expect(server.seen.closed).toBe(1)
    }
    const late = callbackServer(new Error('Authentication timeout'))
    const { d } = deps({ codex: codeFlow() }, { startCallbackServer: late.start })
    expect(await runOAuthLogin({ provider: 'codex', timeoutMs: 1234 }, d)).toEqual({ ok: false, error: 'Authentication timeout', timedOut: true })
    expect(late.seen.options).toMatchObject({ timeoutMs: 1234 })
    expect(late.seen.closed).toBe(1)
  })
})

const deviceFlow = (polls: PollResult[], requested: unknown[] = [], polled: unknown[] = [], device: Row = { device_code: 'dc', user_code: 'ABCD-1234', verification_uri: 'https://device.test/activate', interval: 2 }): OAuthProviderFlow<null> => ({
  config: null,
  flowType: 'device_code',
  requestDeviceCode: async (_config, challenge) => (requested.push(challenge), device),
  pollToken: async (_config, deviceCode, verifier, extra) => (polled.push({ deviceCode, verifier: verifier === undefined ? 'none' : 'sent', extra }), polls.shift() ?? { ok: true, data: { error: 'authorization_pending' } }),
  mapTokens: tokens => ({ accessToken: tokens.access_token, email: tokens.email }),
})

describe('the device code login', () => {
  test('shows the code and the page, polls at the interval and stores the account', async () => {
    const polled: unknown[] = []
    const { d, out, opened, sleeps, store: s } = deps({ github: deviceFlow([{ ok: true, data: { error: 'authorization_pending' } }, { ok: true, data: { access_token: 'gh', email: 'dev@test' } }], [], polled) })
    const outcome = await runOAuthLogin({ provider: 'github' }, d)
    expect(outcome).toMatchObject({ ok: true, connection: { provider: 'github', email: 'dev@test' } })
    expect(out.join('')).toContain('Device code: ABCD-1234\nVisit: https://device.test/activate\n')
    expect(opened).toEqual(['https://device.test/activate'])
    expect(sleeps).toEqual([2000, 2000])
    expect(polled).toEqual([{ deviceCode: 'dc', verifier: 'none', extra: undefined }, { deviceCode: 'dc', verifier: 'none', extra: undefined }])
    expect(s.list({ provider: 'github' })).toHaveLength(1)
  })

  test('a PKCE device provider sends its challenge and polls with the verifier', async () => {
    const requested: unknown[] = []
    const polled: Array<{ verifier: string }> = []
    const { d } = deps({ qwen: deviceFlow([{ ok: true, data: { access_token: 't' } }], requested, polled) })
    await runOAuthLogin({ provider: 'qwen' }, d)
    expect(typeof requested[0]).toBe('string')
    expect((requested[0] as string).length).toBeGreaterThan(20)
    expect(polled[0]!.verifier).toBe('sent')
  })

  test('kiro polls with the device answer as extra data', async () => {
    const polled: Array<{ extra: unknown }> = []
    const device = { device_code: 'dc', user_code: 'U', verification_uri_complete: 'https://kiro.test/x', clientId: 'id', clientSecret: 'sec' }
    const { d, opened, out } = deps({ kiro: deviceFlow([{ ok: true, data: { access_token: 't' } }], [], polled, device) })
    await runOAuthLogin({ provider: 'kiro' }, d)
    expect(polled[0]!.extra).toEqual(device)
    expect(opened).toEqual(['https://kiro.test/x'])
    expect(out.join('')).toContain('Device code: U\nVisit: https://kiro.test/x\n')
  })

  test('slow_down lengthens the interval by five seconds; a terminal error stops', async () => {
    const { d, sleeps } = deps({ github: deviceFlow([{ ok: true, data: { error: 'slow_down' } }, { ok: false, data: { error: 'expired_token', error_description: 'The code expired' } }]) })
    expect(await runOAuthLogin({ provider: 'github' }, d)).toEqual({ ok: false, error: 'The code expired' })
    expect(sleeps).toEqual([2000, 7000])
  })

  test('without a token before the deadline it times out; without an interval it waits five seconds', async () => {
    const { d, sleeps } = deps({ github: deviceFlow([], [], [], { device_code: 'dc', user_code: 'U', verification_uri: 'https://d.test' }) })
    expect(await runOAuthLogin({ provider: 'github', timeoutMs: 12_000 }, d)).toEqual({ ok: false, error: 'Timeout', timedOut: true })
    expect(sleeps).toEqual([5000, 5000, 5000])
  })

  test('a device answer without a device code fails before polling', async () => {
    const polled: unknown[] = []
    const { d } = deps({ github: deviceFlow([], [], polled, { user_code: 'U' }) })
    expect(await runOAuthLogin({ provider: 'github' }, d)).toEqual({ ok: false, error: 'The provider did not return a device code' })
    expect(polled).toEqual([])
  })
})

const importFlow: OAuthProviderFlow<null> = {
  config: null,
  flowType: 'import_token',
  validateImportToken: token => (token.length >= 8 ? { valid: true } : { valid: false, reason: 'Token too short' }),
  mapTokens: tokens => ({ accessToken: tokens.accessToken, email: 'imp@test' }),
}

describe('the import token login', () => {
  test('reads the token, validates it with the flow and stores the account without echoing it', async () => {
    const { d, out, store: s } = deps({ trae: importFlow }, { readToken: async () => '  long-token-value\n' })
    const outcome = await runOAuthLogin({ provider: 'trae' }, d)
    expect(outcome).toMatchObject({ ok: true, connection: { provider: 'trae', email: 'imp@test' } })
    expect(s.list({ provider: 'trae' })[0]!.accessToken).toBe('long-token-value')
    expect(out.join('')).not.toContain('long-token-value')
  })

  test('an empty or invalid token is refused', async () => {
    expect(await runOAuthLogin({ provider: 'trae' }, deps({ trae: importFlow }, { readToken: async () => ' ' }).d)).toEqual({ ok: false, error: 'A token is required' })
    expect(await runOAuthLogin({ provider: 'trae' }, deps({ trae: importFlow }, { readToken: async () => 'short' }).d)).toEqual({ ok: false, error: 'Token too short' })
  })
})

test('an unknown provider fails without side effects', async () => {
  expect(await runOAuthLogin({ provider: 'nope' }, deps({}).d)).toEqual({ ok: false, error: 'Unknown provider: nope' })
})
