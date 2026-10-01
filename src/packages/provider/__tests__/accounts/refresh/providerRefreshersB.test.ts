/**
 * El refresco de cada proveedor del lote B: codex y openference (tokens que
 * rotan), Cursor (reintentos propios), Kimi (identidad de dispositivo), Muse
 * (reacuñar la clave con el token del dispositivo) y Kiro (IdP de empresa,
 * OIDC de AWS con re-registro, o servicio social).
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/{codex,
 * openference, cursor, kimiCoding, museCode, kiro}.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'
import { pbkdf2Sync } from 'node:crypto'

import { normalizeKimiDeviceId } from '../../../src/accounts/kimi/kimiIdentity.ts'
import { codexOAuthConfig } from '../../../src/accounts/oauth/flows/codexFlow.ts'
import { kimiCodingOAuthConfig } from '../../../src/accounts/oauth/flows/kimiCodingFlow.ts'
import { kiroOAuthConfig } from '../../../src/accounts/oauth/flows/kiroFlow.ts'
import { openferenceOAuthConfig } from '../../../src/accounts/oauth/flows/openferenceFlow.ts'
import { refreshCodexToken } from '../../../src/accounts/refresh/providers/codexRefresh.ts'
import { refreshCursorToken } from '../../../src/accounts/refresh/providers/cursorRefresh.ts'
import { refreshKimiCodingToken } from '../../../src/accounts/refresh/providers/kimiCodingRefresh.ts'
import { refreshKiroToken } from '../../../src/accounts/refresh/providers/kiroRefresh.ts'
import { refreshMuseCodeToken } from '../../../src/accounts/refresh/providers/museCodeRefresh.ts'
import { refreshOpenferenceToken } from '../../../src/accounts/refresh/providers/openferenceRefresh.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const text = (body: string, status: number) => new Response(body, { status })
const dead = (code: string) => ({ error: 'unrecoverable_refresh_error' as const, code })

function scriptedFetch(answers: ((url: string, init: RequestInit) => Response)[] | ((url: string, init: RequestInit) => Response)) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    const answer = Array.isArray(answers) ? answers[calls.length - 1] : answers
    if (!answer) throw new Error(`unexpected call ${calls.length}: ${String(input)}`)
    return answer(String(input), init)
  }
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls }
}

const offline = (async () => {
  throw new Error('offline')
}) as unknown as typeof globalThis.fetch

const form = (init: RequestInit) => Object.fromEntries(new URLSearchParams(String(init.body)))
const headersOf = (init: RequestInit) => init.headers as Record<string, string>
const bodyOf = (init: RequestInit) => JSON.parse(String(init.body))
const jwtWithExp = (exp: number) => `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`

describe('codex', () => {
  const config = codexOAuthConfig({ THYROX_CODEX_OAUTH_CLIENT_ID: 'codex-client' })

  test('the refresh omits the scope so sibling token families survive', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'at', refresh_token: 'rt2', expires_in: 864000 }))
    expect(await refreshCodexToken('rt', { config, fetch })).toEqual({ accessToken: 'at', refreshToken: 'rt2', expiresIn: 864000 })
    expect(calls[0].url).toBe('https://auth.openai.com/oauth/token')
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'rt', client_id: 'codex-client' })
    expect(headersOf(calls[0].init)).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' })
    const own = scriptedFetch(() => json({ access_token: 'at' }))
    await refreshCodexToken('rt', { config: { ...config, tokenUrl: 'https://auth.example/token' }, fetch: own.fetch })
    expect(own.calls[0].url).toBe('https://auth.example/token')
  })

  test('a reused, invalid or expired token is dead, nested or flat', async () => {
    for (const code of ['refresh_token_reused', 'invalid_grant', 'token_expired', 'invalid_token']) {
      expect(await refreshCodexToken('rt', { config, fetch: scriptedFetch(() => text(JSON.stringify({ error: { code } }), 400)).fetch })).toEqual(dead(code))
      expect(await refreshCodexToken('rt', { config, fetch: scriptedFetch(() => text(JSON.stringify({ error: code }), 400)).fetch })).toEqual(dead(code))
    }
  })

  test('any 401 is dead; other failures and the network are transient', async () => {
    expect(await refreshCodexToken('rt', { config, fetch: scriptedFetch(() => text('Could not validate your token', 401)).fetch })).toEqual(dead('unauthorized'))
    expect(await refreshCodexToken('rt', { config, fetch: scriptedFetch(() => text('{"error":"weird_code"}', 401)).fetch })).toEqual(dead('weird_code'))
    expect(await refreshCodexToken('rt', { config, fetch: scriptedFetch(() => text('{"error":"rate"}', 429)).fetch })).toBeNull()
    expect(await refreshCodexToken('rt', { config, fetch: offline })).toBeNull()
    expect(await refreshCodexToken('rt', { config, fetch: scriptedFetch(() => json({ access_token: 'at' })).fetch })).toMatchObject({ refreshToken: 'rt' })
  })

  test('without a client id the refresh refuses naming the variable', async () => {
    await expect(refreshCodexToken('rt', { config: codexOAuthConfig({}), fetch: offline })).rejects.toThrow('THYROX_CODEX_OAUTH_CLIENT_ID')
  })
})

describe('openference', () => {
  const config = openferenceOAuthConfig({ THYROX_OPENFERENCE_OAUTH_CLIENT_ID: 'of-client' })

  test('the refresh rotates the oar token', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'oa', refresh_token: 'oar_2', expires_in: 3600 }))
    expect(await refreshOpenferenceToken('oar_1', { config, fetch })).toEqual({ accessToken: 'oa', refreshToken: 'oar_2', expiresIn: 3600 })
    expect(calls[0].url).toBe('https://openference.com/oauth/token')
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'oar_1', client_id: 'of-client' })
  })

  test('invalid, expired or unknown-401 tokens are dead; a reused one is not special here', async () => {
    for (const code of ['invalid_grant', 'token_expired', 'invalid_token']) {
      expect(await refreshOpenferenceToken('r', { config, fetch: scriptedFetch(() => text(JSON.stringify({ error: { code } }), 400)).fetch })).toEqual(dead(code))
    }
    expect(await refreshOpenferenceToken('r', { config, fetch: scriptedFetch(() => text('{"error":"refresh_token_reused"}', 400)).fetch })).toBeNull()
    expect(await refreshOpenferenceToken('r', { config, fetch: scriptedFetch(() => text('nope', 401)).fetch })).toEqual(dead('unauthorized'))
    expect(await refreshOpenferenceToken('r', { config, fetch: offline })).toBeNull()
    expect(await refreshOpenferenceToken('r', { config, fetch: scriptedFetch(() => json({ access_token: 'oa' })).fetch })).toMatchObject({ refreshToken: 'r' })
  })
})

describe('Cursor', () => {
  const NOW = Date.parse('2026-09-28T10:00:00.000Z')
  const deps = (fetch: typeof globalThis.fetch, sleeps: number[] = []) => ({ fetch, now: () => NOW, random: () => 0.5, sleep: async (ms: number) => void sleeps.push(ms) })

  test('the refresh token is the bearer and the expiry comes from the new token, minus a margin', async () => {
    const exp = Math.floor(NOW / 1000) + 7200
    const { fetch, calls } = scriptedFetch(() => json({ accessToken: jwtWithExp(exp), refreshToken: 'cr2' }))
    const result = await refreshCursorToken('cr', deps(fetch))
    expect(result).toEqual({ accessToken: jwtWithExp(exp), refreshToken: 'cr2', expiresAt: new Date(exp * 1000 - 5 * 60 * 1000).toISOString() })
    expect(calls[0].url).toBe('https://api2.cursor.sh/auth/exchange_user_api_key')
    expect(calls[0].init).toMatchObject({ method: 'POST', body: '{}' })
    expect(headersOf(calls[0].init)).toEqual({ Authorization: 'Bearer cr', 'Content-Type': 'application/json' })
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal)
  })

  test('an opaque token lasts an hour from now; the old refresh token is kept', async () => {
    const { fetch } = scriptedFetch(() => json({ accessToken: 'opaque' }))
    expect(await refreshCursorToken('cr', deps(fetch))).toEqual({ accessToken: 'opaque', refreshToken: 'cr', expiresAt: new Date(NOW + 3600_000).toISOString() })
    const noExp = scriptedFetch(() => json({ accessToken: `h.${Buffer.from('{}').toString('base64url')}.s` }))
    expect(((await refreshCursorToken('cr', deps(noExp.fetch))) as { expiresAt: string }).expiresAt).toBe(new Date(NOW + 3600_000).toISOString())
  })

  test('no refresh token, a rejection or a missing access token end without retrying', async () => {
    expect(await refreshCursorToken('', deps(offline))).toEqual(dead('no_refresh_token'))
    for (const status of [401, 403]) expect(await refreshCursorToken('cr', deps(scriptedFetch(() => text('no', status)).fetch))).toEqual(dead('unauthorized'))
    const empty = scriptedFetch(() => json({}))
    expect(await refreshCursorToken('cr', deps(empty.fetch))).toBeNull()
    expect(empty.calls).toHaveLength(1)
    const badRequest = scriptedFetch(() => text('bad', 400))
    expect(await refreshCursorToken('cr', deps(badRequest.fetch))).toBeNull()
    expect(badRequest.calls).toHaveLength(1)
  })

  test('throttling and server errors are retried with jittered exponential backoff', async () => {
    const sleeps: number[] = []
    const { fetch, calls } = scriptedFetch([() => text('busy', 429), () => text('down', 503), () => json({ accessToken: 'late' })])
    expect(await refreshCursorToken('cr', deps(fetch, sleeps))).toMatchObject({ accessToken: 'late' })
    expect(calls).toHaveLength(3)
    expect(sleeps).toEqual([300, 600])
    for (const status of [500, 502, 504]) {
      const again = scriptedFetch([() => text('x', status), () => json({ accessToken: 'ok' })])
      expect(await refreshCursorToken('cr', deps(again.fetch))).toMatchObject({ accessToken: 'ok' })
    }
  })

  test('the jitter spreads the delay between 80% and 120%', async () => {
    const low: number[] = []
    const high: number[] = []
    await refreshCursorToken('cr', { ...deps(scriptedFetch([() => text('x', 503), () => json({ accessToken: 'a' })]).fetch, low), random: () => 0 })
    await refreshCursorToken('cr', { ...deps(scriptedFetch([() => text('x', 503), () => json({ accessToken: 'a' })]).fetch, high), random: () => 0.999999 })
    expect(low).toEqual([240])
    expect(high).toEqual([359])
  })

  test('network failures are retried; the last attempt gives up', async () => {
    const sleeps: number[] = []
    let calls = 0
    const failing = (async () => {
      calls++
      throw new Error('reset')
    }) as unknown as typeof globalThis.fetch
    expect(await refreshCursorToken('cr', deps(failing, sleeps))).toBeNull()
    expect(calls).toBe(3)
    expect(sleeps).toEqual([300, 600])
    const exhausted = scriptedFetch(() => text('busy', 429))
    const waits: number[] = []
    expect(await refreshCursorToken('cr', { ...deps(exhausted.fetch, waits), attempts: 2, retryBaseMs: 10 })).toBeNull()
    expect(exhausted.calls).toHaveLength(2)
    expect(waits).toHaveLength(1)
  })
})

describe('Kimi Coding', () => {
  const config = kimiCodingOAuthConfig({ THYROX_KIMI_CODING_OAUTH_CLIENT_ID: 'kimi-client' })
  const system = { hostname: 'box', release: '6.1.0', type: 'Linux', arch: 'x64' }

  test('the stored device identity is sent with the refresh', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'ka', refresh_token: 'kr2', expires_in: 900, token_type: 'Bearer', scope: 'kimi' }))
    const data = { deviceId: '0123456789abcdef0123456789abcdef', deviceName: 'laptop', deviceModel: ' ThinkPad ', osVersion: '14.2' }
    expect(await refreshKimiCodingToken('kr', data, { config, fetch, system, env: { THYROX_KIMI_CLI_VERSION: '9.9.9' } })).toEqual({ accessToken: 'ka', refreshToken: 'kr2', expiresIn: 900, tokenType: 'Bearer', scope: 'kimi' })
    expect(calls[0].url).toBe('https://auth.kimi.com/api/oauth/token')
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'kr', client_id: 'kimi-client' })
    expect(headersOf(calls[0].init)).toMatchObject({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-Msh-Device-Id': '01234567-89ab-cdef-0123-456789abcdef', 'X-Msh-Device-Name': 'laptop', 'X-Msh-Device-Model': 'ThinkPad', 'X-Msh-Os-Version': '14.2', 'X-Msh-Version': '9.9.9' })
  })

  test('without a stored identity the device id derives from the token and the host describes itself', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'ka' }))
    expect(await refreshKimiCodingToken('kr', null, { config, fetch, system, env: {} })).toMatchObject({ refreshToken: 'kr' })
    const derived = normalizeKimiDeviceId(pbkdf2Sync('kr', 'kimi-device-id', 1000, 16, 'sha256').toString('hex'))
    expect(headersOf(calls[0].init)).toMatchObject({ 'X-Msh-Device-Id': derived, 'X-Msh-Device-Name': 'box', 'X-Msh-Device-Model': 'Linux 6.1.0 x64', 'X-Msh-Os-Version': '6.1.0' })
  })

  test('a JSON invalid grant or request is dead; the rest is transient', async () => {
    const deps = (fetch: typeof globalThis.fetch) => ({ config, fetch, system, env: {} })
    expect(await refreshKimiCodingToken('kr', null, deps(scriptedFetch(() => text('{"error":"invalid_grant"}', 400)).fetch))).toEqual(dead('invalid_grant'))
    expect(await refreshKimiCodingToken('kr', null, deps(scriptedFetch(() => text('{"error":"invalid_request"}', 400)).fetch))).toEqual(dead('invalid_request'))
    expect(await refreshKimiCodingToken('kr', null, deps(scriptedFetch(() => text('invalid_grant', 400)).fetch))).toBeNull()
    expect(await refreshKimiCodingToken('kr', null, deps(offline))).toBeNull()
  })
})

describe('Muse Code', () => {
  const NOW = Date.parse('2026-09-28T10:00:00.000Z')
  const minted = { api_key: 'sk-new', base_url: 'https://api.meta.ai/v1/', user_email: 'm@x', user_full_name: 'M', subs_tier_name: 'Pro', subs_tier_id: 't1', is_subs_active: true, has_payment_method: true, require_payment: false, can_subscribe: false }

  test('the key is reminted with the device token and the account data refreshed', async () => {
    const { fetch, calls } = scriptedFetch(() => json(minted))
    const result = await refreshMuseCodeToken('ignored', { dcaToken: ' dca:abc ', keep: 1 }, { fetch, now: () => NOW })
    expect(result).toEqual({
      accessToken: 'sk-new',
      refreshToken: 'dca:abc',
      expiresIn: undefined,
      providerSpecificData: { keep: 1, dcaToken: 'dca:abc', baseUrl: 'https://api.meta.ai/v1', email: 'm@x', name: 'M', subsTierName: 'Pro', subsTierId: 't1', isSubsActive: true, hasPaymentMethod: true, requirePayment: false, canSubscribe: false, lastRefresh: new Date(NOW).toISOString() },
    })
    expect(headersOf(calls[0].init).Authorization).toBe('Bearer dca:abc')
  })

  test('the refresh token serves as device token when the data has none', async () => {
    const { fetch, calls } = scriptedFetch(() => json(minted))
    expect(await refreshMuseCodeToken(' dca:fromRefresh ', { dcaToken: 'not-dca' }, { fetch, now: () => NOW })).toMatchObject({ refreshToken: 'dca:fromRefresh' })
    expect(headersOf(calls[0].init).Authorization).toBe('Bearer dca:fromRefresh')
    expect(await refreshMuseCodeToken('dca:x', null, { fetch: scriptedFetch(() => json(minted)).fetch, now: () => NOW })).toMatchObject({ providerSpecificData: { dcaToken: 'dca:x' } })
  })

  test('without a device token or when the mint fails there is nothing to use', async () => {
    const { fetch, calls } = scriptedFetch(() => json(minted))
    expect(await refreshMuseCodeToken('plain', {}, { fetch })).toBeNull()
    expect(calls).toHaveLength(0)
    expect(await refreshMuseCodeToken('dca:x', {}, { fetch: scriptedFetch(() => text('no', 401)).fetch })).toBeNull()
  })
})

describe('Kiro', () => {
  const config = kiroOAuthConfig()
  const IDP = { authMethod: 'external_idp', clientId: 'app', tokenEndpoint: 'https://login.microsoftonline.com/t/oauth2/v2.0/token', scope: 'openid' }

  test('an external IdP token refreshes against its own endpoint', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'ia', refresh_token: 'ir2', expires_in: 600 }))
    expect(await refreshKiroToken('ir', IDP, { config, fetch })).toEqual({ accessToken: 'ia', refreshToken: 'ir2', expiresIn: 600 })
    expect(calls[0].url).toBe(IDP.tokenEndpoint)
    expect(headersOf(calls[0].init)).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' })
    expect(await refreshKiroToken('ir', IDP, { config, fetch: scriptedFetch(() => json({ access_token: 'ia' })).fetch })).toEqual({ accessToken: 'ia', refreshToken: 'ir', expiresIn: 3600 })
  })

  test('an external IdP with a bad endpoint is not attempted; invalid grant or client is dead', async () => {
    const { fetch, calls } = scriptedFetch(() => json({}))
    const errors: string[] = []
    const log = { error: (_tag: string, message: string) => void errors.push(message) }
    expect(await refreshKiroToken('ir', { ...IDP, tokenEndpoint: 'https://evil.example/token' }, { config, fetch, log })).toBeNull()
    expect(calls).toHaveLength(0)
    expect(errors).toEqual([expect.stringContaining('Invalid Kiro external_idp refresh config')])
    for (const code of ['invalid_grant', 'invalid_client']) expect(await refreshKiroToken('ir', IDP, { config, fetch: scriptedFetch(() => text(JSON.stringify({ error: code }), 400)).fetch })).toEqual(dead(code))
    expect(await refreshKiroToken('ir', IDP, { config, fetch: scriptedFetch(() => text('{"error":"server_error"}', 500)).fetch })).toBeNull()
  })

  test('a Builder ID token refreshes against AWS OIDC in its region', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ accessToken: 'aa', refreshToken: 'ar2', expiresIn: 900 }))
    expect(await refreshKiroToken('ar', { clientId: 'c', clientSecret: 's', region: 'eu-central-1' }, { config, fetch })).toEqual({ accessToken: 'aa', refreshToken: 'ar2', expiresIn: 900 })
    expect(calls[0].url).toBe('https://oidc.eu-central-1.amazonaws.com/token')
    expect(headersOf(calls[0].init)).toEqual({ 'Content-Type': 'application/json', Accept: 'application/json' })
    expect(bodyOf(calls[0].init)).toEqual({ clientId: 'c', clientSecret: 's', refreshToken: 'ar', grantType: 'refresh_token' })
    const defaulted = scriptedFetch(() => json({ accessToken: 'aa' }))
    expect(await refreshKiroToken('ar', { clientId: 'c', clientSecret: 's' }, { config, fetch: defaulted.fetch })).toEqual({ accessToken: 'aa', refreshToken: 'ar', expiresIn: undefined })
    expect(defaulted.calls[0].url).toBe('https://oidc.us-east-1.amazonaws.com/token')
  })

  test('an AWS dead-token error is final: no re-registration is attempted', async () => {
    for (const body of ['{"__type":"InvalidGrantException"}', '{"__type":"ExpiredTokenException"}', '{"error":"invalid_grant"}']) {
      const { fetch, calls } = scriptedFetch(() => text(body, 400))
      const code = JSON.parse(body).__type ?? JSON.parse(body).error
      expect(await refreshKiroToken('ar', { clientId: 'c', clientSecret: 's' }, { config, fetch })).toEqual(dead(code))
      expect(calls).toHaveLength(1)
    }
  })

  test('another OIDC failure re-registers a client and retries once', async () => {
    const { fetch, calls } = scriptedFetch([() => text('{"__type":"InvalidClientException"}', 400), () => json({ clientId: 'c2', clientSecret: 's2', clientSecretExpiresAt: 9 }), () => json({ accessToken: 'aa3', expiresIn: 60 })])
    expect(await refreshKiroToken('ar', { clientId: 'c', clientSecret: 's', region: 'us-west-2' }, { config, fetch })).toEqual({ accessToken: 'aa3', refreshToken: 'ar', expiresIn: 60, newClient: { clientId: 'c2', clientSecret: 's2', clientSecretExpiresAt: 9 } })
    expect(calls[1].url).toBe('https://oidc.us-west-2.amazonaws.com/client/register')
    expect(bodyOf(calls[2].init)).toMatchObject({ clientId: 'c2', clientSecret: 's2', refreshToken: 'ar' })
  })

  test('when the registration or the retry fails, the refresh is transient', async () => {
    expect(await refreshKiroToken('ar', { clientId: 'c', clientSecret: 's' }, { config, fetch: scriptedFetch([() => text('x', 400), () => text('no', 500)]).fetch })).toBeNull()
    expect(await refreshKiroToken('ar', { clientId: 'c', clientSecret: 's' }, { config, fetch: scriptedFetch([() => text('x', 400), () => json({ clientId: 'c2', clientSecret: 's2' }), () => text('still', 400)]).fetch })).toBeNull()
  })

  test('a region that is not an AWS region is never put in a URL', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ accessToken: 'aa' }))
    expect(await refreshKiroToken('ar', { clientId: 'c', clientSecret: 's', region: 'evil.example/x' }, { config, fetch })).toBeNull()
    expect(calls).toHaveLength(0)
  })

  test('a social or imported token refreshes at the Kiro auth service', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ accessToken: 'sa', refreshToken: 'sr2', expiresIn: 3600 }))
    expect(await refreshKiroToken('sr', { clientId: 'c', clientSecret: 's', authMethod: 'imported' }, { config, fetch })).toEqual({ accessToken: 'sa', refreshToken: 'sr2', expiresIn: 3600 })
    expect(calls[0].url).toBe('https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken')
    expect(bodyOf(calls[0].init)).toEqual({ refreshToken: 'sr' })
    expect(await refreshKiroToken('sr', null, { config, fetch: scriptedFetch(() => json({ accessToken: 'sa' })).fetch })).toMatchObject({ refreshToken: 'sr' })
  })

  test('a relayed AWS dead-token error on the social path is dead; the rest is transient', async () => {
    expect(await refreshKiroToken('sr', null, { config, fetch: scriptedFetch(() => text('{"__type":"ExpiredTokenException"}', 400)).fetch })).toEqual(dead('ExpiredTokenException'))
    expect(await refreshKiroToken('sr', null, { config, fetch: scriptedFetch(() => text('nope', 500)).fetch })).toBeNull()
    expect(await refreshKiroToken('sr', null, { config, fetch: offline })).toBeNull()
  })
})
