/**
 * El núcleo OAuth de las cuentas de proveedor: el par PKCE, el servidor local
 * que recibe la redirección, el despachador que cada flujo de proveedor
 * rellena (URL de autorización, intercambio, device code) y la persistencia
 * del resultado como cuenta del store.
 *
 * Porte de `omniroute: src/lib/oauth/providers.ts`, `utils/pkce.ts`,
 * `utils/server.ts` y `connectionPersistence.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { afterEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'

import { createConnectionStore } from '../../../src/accounts/connectionStore.ts'
import { createFieldCipher } from '../../../src/accounts/fieldCipher.ts'
import { startCallbackServer, type CallbackServer } from '../../../src/accounts/oauth/callbackServer.ts'
import { createOAuthFlows, type OAuthProviderFlow } from '../../../src/accounts/oauth/oauthFlows.ts'
import { findExistingOAuthConnection, persistOAuthConnection, safeEqual } from '../../../src/accounts/oauth/oauthPersistence.ts'
import { generatePkce } from '../../../src/accounts/oauth/pkce.ts'

describe('pkce', () => {
  test('the challenge is the S256 of the verifier, and the verifier length follows its bytes', () => {
    const pair = generatePkce()
    expect(pair.codeChallenge).toBe(createHash('sha256').update(pair.codeVerifier).digest('base64url'))
    expect(pair.codeVerifier).toHaveLength(43)
    expect(generatePkce(64).codeVerifier).toHaveLength(86)
    expect(pair.state).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(generatePkce().state).not.toBe(pair.state)
  })
})

describe('callback server', () => {
  let server: CallbackServer | undefined
  afterEach(() => server?.close())

  test('resolves with the query of either callback path, on loopback only', async () => {
    server = await startCallbackServer({ timeoutMs: 5000 })
    expect(server.host).toBe('127.0.0.1')
    const response = await fetch(`http://127.0.0.1:${server.port}/auth/callback?code=c-1&state=s-1`)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Authentication Successful')
    expect(await server.callback).toEqual({ code: 'c-1', state: 's-1' })
  })

  test('another path is a 404 and does not resolve', async () => {
    server = await startCallbackServer({ timeoutMs: 5000 })
    expect((await fetch(`http://127.0.0.1:${server.port}/other?code=x`)).status).toBe(404)
    const second = await fetch(`http://127.0.0.1:${server.port}/callback?code=c-2`)
    expect(second.status).toBe(200)
    expect(await server.callback).toEqual({ code: 'c-2' })
  })

  test('a timeout rejects', async () => {
    server = await startCallbackServer({ timeoutMs: 20 })
    await expect(server.callback).rejects.toThrow('Authentication timeout')
  })

  test('a fixed port already in use names the port', async () => {
    const first = await startCallbackServer({ timeoutMs: 5000 })
    server = first
    first.callback.catch(() => {})
    await expect(startCallbackServer({ fixedPort: first.port, timeoutMs: 5000 })).rejects.toThrow(
      `Port ${first.port} is already in use`,
    )
  })
})

const config = { authorizeUrl: 'https://auth.example/authorize' }

function pkceFlow(overrides: Partial<OAuthProviderFlow> = {}): OAuthProviderFlow {
  return {
    config,
    flowType: 'authorization_code_pkce',
    buildAuthUrl: (_c, redirectUri, state, challenge) => `${config.authorizeUrl}?r=${redirectUri}&s=${state}&c=${challenge}`,
    exchangeToken: async (_c, code, redirectUri, verifier, state) => ({ access_token: `at:${code}`, redirectUri, verifier, state }),
    mapTokens: (tokens, extra) => ({ accessToken: tokens.access_token, extra }),
    ...overrides,
  }
}

describe('oauth flows', () => {
  test('an unknown provider is refused by name', () => {
    expect(() => createOAuthFlows({}).getFlow('nope')).toThrow('Unknown provider: nope')
  })

  test('a PKCE flow builds its URL with the challenge and carries the callback defaults', () => {
    const data = createOAuthFlows({ p: pkceFlow() }).generateAuthData('p', 'http://localhost:9/callback')
    expect(data.authUrl).toBe(`https://auth.example/authorize?r=http://localhost:9/callback&s=${data.state}&c=${data.codeChallenge}`)
    expect(data.callbackPath).toBe('/callback')
    expect(data.callbackHost).toBe('localhost')
    expect(data.supported).toBe(true)
  })

  test('a device-code flow has no URL; a plain flow may replace the verifier and redirect', () => {
    const flows = createOAuthFlows({
      device: pkceFlow({ flowType: 'device_code' }),
      plain: pkceFlow({
        flowType: 'authorization_code',
        buildAuthUrl: () => ({ authUrl: 'https://x/a', codeVerifier: 'rsa-verifier', redirectUri: 'http://own/cb' }),
      }),
      hybrid: pkceFlow({ flowType: 'device_code', supportsBrowserPkce: true }),
    })
    expect(flows.generateAuthData('device', 'r').authUrl).toBeNull()
    const plain = flows.generateAuthData('plain', 'r')
    expect([plain.authUrl, plain.codeVerifier, plain.redirectUri]).toEqual(['https://x/a', 'rsa-verifier', 'http://own/cb'])
    expect(flows.generateAuthData('hybrid', 'r').authUrl).toStartWith('https://auth.example/authorize')
  })

  test('an import-token flow is not supported and says what to do instead', () => {
    const data = createOAuthFlows({
      zed: pkceFlow({ flowType: 'import_token', importTokenHint: 'Import it from the keychain.' }),
      other: pkceFlow({ flowType: 'import_token' }),
    }).generateAuthData('zed', 'r')
    expect(data.supported).toBe(false)
    expect(data.authUrl).toBeUndefined()
    expect(data.error).toBe('Import it from the keychain.')
    expect(createOAuthFlows({ other: pkceFlow({ flowType: 'import_token' }) }).generateAuthData('other', 'r').error).toBe(
      'Browser login is disabled for other. Use the import-token flow instead.',
    )
  })

  test('exchanging runs the post-exchange step and maps the tokens', async () => {
    const flows = createOAuthFlows({ p: pkceFlow({ postExchange: async tokens => ({ seen: tokens.access_token }) }) })
    expect(await flows.exchangeTokens('p', 'code-1', 'r', 'v', 's')).toEqual({ accessToken: 'at:code-1', extra: { seen: 'at:code-1' } })
    expect(await flows.finalizeTokens('p', { access_token: 'out-of-band' })).toEqual({
      accessToken: 'out-of-band',
      extra: { seen: 'out-of-band' },
    })
  })

  test('device code: only a device flow requests it, and polling tells pending from failure', async () => {
    const answers = [
      { ok: true, data: { error: 'authorization_pending' } },
      { ok: true, data: { error: 'slow_down', message: 'wait' } },
      { ok: true, data: { error: 'expired_token', error_description: 'gone' } },
      { ok: false, data: { error: 'invalid_grant', error_description: 'bad' } },
      { ok: true, data: { access_token: 'at-9' } },
    ]
    const flows = createOAuthFlows({
      device: pkceFlow({
        flowType: 'device_code',
        requestDeviceCode: async () => ({ device_code: 'd-1' }),
        pollToken: async () => answers.shift()!,
      }),
      p: pkceFlow(),
    })
    await expect(flows.requestDeviceCode('p', 'c')).rejects.toThrow('does not support device code flow')
    expect(await flows.requestDeviceCode('device', 'c')).toEqual({ device_code: 'd-1' })
    expect(await flows.pollForToken('device', 'd-1')).toEqual({
      success: false,
      error: 'authorization_pending',
      errorDescription: undefined,
      pending: true,
    })
    expect(await flows.pollForToken('device', 'd-1')).toEqual({ success: false, error: 'slow_down', errorDescription: 'wait', pending: false })
    expect(await flows.pollForToken('device', 'd-1')).toEqual({ success: false, error: 'expired_token', errorDescription: 'gone' })
    expect(await flows.pollForToken('device', 'd-1')).toEqual({ success: false, error: 'invalid_grant', errorDescription: 'bad' })
    expect(await flows.pollForToken('device', 'd-1')).toEqual({ success: true, tokens: { accessToken: 'at-9', extra: null } })
  })
})

describe('persisting an OAuth result', () => {
  function storeAt(time: number) {
    let ids = 0
    return createConnectionStore({
      db: new Database(':memory:'),
      cipher: createFieldCipher('oauth-test-secret', () => {}),
      now: () => new Date(time).toISOString(),
      newId: () => `conn-${++ids}`,
    })
  }

  test('safeEqual compares in constant time and treats two absents as equal', () => {
    expect(safeEqual('a', 'a')).toBe(true)
    expect(safeEqual('a', 'ab')).toBe(false)
    expect(safeEqual(undefined, undefined)).toBe(true)
    expect(safeEqual('a', null)).toBe(false)
  })

  test('a new login is created with its expiry mirrored and its email as name', () => {
    const now = Date.parse('2026-09-28T10:00:00.000Z')
    const store = storeAt(now)
    const connection = persistOAuthConnection(store, 'claude', { email: 'a@x.io', accessToken: 'at', expiresIn: 3600 }, { now: () => now })
    expect(connection!.name).toBe('a@x.io')
    expect(connection!.expiresAt).toBe('2026-09-28T11:00:00.000Z')
    expect(connection!.tokenExpiresAt).toBe('2026-09-28T11:00:00.000Z')
    expect(connection!.authType).toBe('oauth')
  })

  test('a re-login updates the same account and reactivates it', () => {
    const store = storeAt(0)
    persistOAuthConnection(store, 'claude', { email: 'a@x.io', accessToken: 'at-1' })
    store.update('conn-1', { isActive: false })
    const again = persistOAuthConnection(store, 'claude', { email: 'a@x.io', accessToken: 'at-2' })
    expect(again!.id).toBe('conn-1')
    expect(again!.isActive).toBe(true)
    expect(store.getById('conn-1')!.accessToken).toBe('at-2')
  })

  test('an explicit connection id wins even without an email', () => {
    const store = storeAt(0)
    persistOAuthConnection(store, 'github', { accessToken: 'at-1', providerSpecificData: { login: 'ann' } })
    persistOAuthConnection(store, 'github', { accessToken: 'at-2' }, { connectionId: 'conn-1' })
    expect(store.count()).toBe(1)
    expect(store.getById('conn-1')!.accessToken).toBe('at-2')
  })

  test('matching: an email-less payload never matches, codex needs its workspace or user, claude its organization', () => {
    const rows = [
      { id: 'a', authType: 'oauth' },
      { id: 'b', email: 'a@x.io', authType: 'apikey' },
      { id: 'c', email: 'a@x.io', authType: 'oauth', providerSpecificData: { workspaceId: 'w-1' } },
      { id: 'd', email: 'a@x.io', authType: 'oauth', providerSpecificData: { chatgptUserId: 'u-1' } },
      { id: 'e', email: 'a@x.io', authType: 'oauth', providerSpecificData: { organizationUUID: 'o-1' } },
    ]
    expect(findExistingOAuthConnection(rows, 'claude', {})).toBeUndefined()
    expect(findExistingOAuthConnection(rows, 'codex', { email: 'a@x.io', providerSpecificData: { workspaceId: 'w-1' } })?.id).toBe('c')
    expect(findExistingOAuthConnection(rows, 'codex', { email: 'a@x.io', providerSpecificData: { chatgptUserId: 'u-1' } })?.id).toBe('d')
    expect(findExistingOAuthConnection(rows, 'codex', { email: 'a@x.io' })).toBeUndefined()
    expect(findExistingOAuthConnection(rows, 'claude', { email: 'a@x.io', providerSpecificData: { organizationUUID: 'o-2' } })?.id).toBe('c')
    expect(findExistingOAuthConnection(rows.slice(4), 'claude', { email: 'a@x.io', providerSpecificData: { organizationUUID: 'o-2' } })).toBeUndefined()
    expect(findExistingOAuthConnection(rows, 'github', { email: 'a@x.io' })?.id).toBe('c')
  })
})
