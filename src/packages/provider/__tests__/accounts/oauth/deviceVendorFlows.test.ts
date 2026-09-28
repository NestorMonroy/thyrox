/**
 * Los códigos de dispositivo de proveedores con contrato propio: CodeBuddy CN
 * sondea por GET con el estado en la consulta; Kimi Coding firma cada
 * petición con la identidad del dispositivo; Muse Code acuña una clave de
 * inferencia tras el grant; Openference es un código con PKCE y puerto fijo.
 *
 * Porte de `omniroute: src/lib/oauth/providers/codebuddy-cn.ts`,
 * `kimi-coding.ts`, `muse-code.ts`, `openference.ts`, de
 * `open-sse/config/museCode.ts`, `open-sse/services/museCodeAuth.ts`,
 * `open-sse/config/providers/registry/kimi/coding/runtime.ts`,
 * `open-sse/utils/kimiDevice.ts` y de sus configuraciones (MIT).
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildKimiCodeIdentityHeaders, kimiCliVersion, kimiDeviceModel, normalizeKimiDeviceId, resolveKimiDeviceId, sanitizeKimiHeaderValue } from '../../../src/accounts/kimi/kimiIdentity.ts'
import { isMuseDcaToken, mintMuseApiKey, normalizeMuseBaseUrl } from '../../../src/accounts/muse/museCode.ts'
import { createCodebuddyCnFlow } from '../../../src/accounts/oauth/flows/codebuddyCnFlow.ts'
import { createKimiCodingFlow, kimiCodingOAuthConfig } from '../../../src/accounts/oauth/flows/kimiCodingFlow.ts'
import { createMuseCodeFlow, museCodeOAuthConfig } from '../../../src/accounts/oauth/flows/museCodeFlow.ts'
import { createOpenferenceFlow, decodeOpenferenceIdTokenIdentity, openferenceOAuthConfig } from '../../../src/accounts/oauth/flows/openferenceFlow.ts'
import { createOAuthFlows } from '../../../src/accounts/oauth/oauthFlows.ts'

function scriptedFetch(answer: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

const headersOf = (init: RequestInit) => init.headers as Record<string, string>

describe('codebuddy-cn', () => {
  test('the state request carries the platform in the query and the state doubles as the device code', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ code: 0, data: { state: 's1', url: 'https://copilot.tencent.com/login?s=s1' } }))
    const code = await createOAuthFlows({ 'codebuddy-cn': createCodebuddyCnFlow({ fetch }) }).requestDeviceCode('codebuddy-cn', 'c')
    expect(calls[0]!.url).toBe('https://copilot.tencent.com/v2/plugin/auth/state?platform=CLI')
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ platform: 'CLI' })
    expect(headersOf(calls[0]!.init)['X-No-Authorization']).toBe('true')
    expect(code).toEqual({ device_code: 's1', user_code: 's1', verification_uri: 'https://copilot.tencent.com/login?s=s1', verification_uri_complete: 'https://copilot.tencent.com/login?s=s1', expires_in: 600, interval: 5 })
  })

  test('a state response without state is an error that carries the message', async () => {
    const { fetch } = scriptedFetch(() => Response.json({ code: 7, msg: 'nope' }))
    await expect(createCodebuddyCnFlow({ fetch }).requestDeviceCode!(null, 'c')).rejects.toThrow('CodeBuddy state error: nope')
    const { fetch: refused } = scriptedFetch(() => Response.json({ code: 7, msg: 'blocked', data: { state: 's' } }))
    await expect(createCodebuddyCnFlow({ fetch: refused }).requestDeviceCode!(null, 'c')).rejects.toThrow('CodeBuddy state error: blocked')
  })

  test('the poll is a GET with the state in the query; code 0 with a token is the grant', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ code: 0, data: { accessToken: 'at', refreshToken: 'rt', expiresIn: 60 } }))
    const flows = createOAuthFlows({ 'codebuddy-cn': createCodebuddyCnFlow({ fetch }) })
    const outcome = await flows.pollForToken('codebuddy-cn', 'a b')
    expect(calls[0]!.url).toBe('https://copilot.tencent.com/v2/plugin/auth/token?state=a%20b')
    expect(calls[0]!.init.method).toBe('GET')
    expect(outcome).toEqual({ success: true, tokens: { accessToken: 'at', refreshToken: 'rt', expiresIn: 60, providerSpecificData: {} } })
  })

  test('pending keeps its code and a missing expiry becomes one day', async () => {
    const { fetch } = scriptedFetch(() => Response.json({ code: 11217, msg: 'wait' }))
    const flow = createCodebuddyCnFlow({ fetch })
    expect(await flow.pollToken!(null, 's')).toEqual({ ok: false, data: { code: 11217, msg: 'wait' } })
    expect(flow.mapTokens({ access_token: 'a', refresh_token: '' }, null).expiresIn).toBe(86400)
  })
})

describe('kimi identity', () => {
  test('header values keep printable ASCII only, with a fallback', () => {
    expect(sanitizeKimiHeaderValue('mañana\tpc ')).toBe('maanapc')
    expect(sanitizeKimiHeaderValue('   ')).toBe('unknown')
    expect(sanitizeKimiHeaderValue('ñ', 'x')).toBe('x')
  })

  test('a 32-hex device id is dashed like a UUID; anything else is kept', () => {
    expect(normalizeKimiDeviceId('0123456789abcdef0123456789ABCDEF')).toBe('01234567-89ab-cdef-0123-456789ABCDEF')
    expect(normalizeKimiDeviceId('dev-1')).toBe('dev-1')
    expect(normalizeKimiDeviceId('')).toBe('')
  })

  test('the identity headers name the platform, the version and the device', () => {
    expect(buildKimiCodeIdentityHeaders({ deviceId: '0123456789abcdef0123456789abcdef', deviceName: 'host', deviceModel: 'Linux 6 x64', osVersion: '6' }, '9.9')).toEqual({
      'X-Msh-Platform': 'kimi_code_cli', 'X-Msh-Version': '9.9', 'X-Msh-Device-Name': 'host', 'X-Msh-Device-Model': 'Linux 6 x64',
      'X-Msh-Os-Version': '6', 'X-Msh-Device-Id': '01234567-89ab-cdef-0123-456789abcdef',
    })
  })

  test('the CLI version comes from its variable or the pinned default', () => {
    expect(kimiCliVersion({})).toBe('0.26.0')
    expect(kimiCliVersion({ THYROX_KIMI_CLI_VERSION: '1.2.3' })).toBe('1.2.3')
  })

  test('the device model names the system, with the product version on macOS', () => {
    expect(kimiDeviceModel({ type: 'Linux', release: '6.1', arch: 'x64' })).toBe('Linux 6.1 x64')
    expect(kimiDeviceModel({ type: 'Windows_NT', release: '10', arch: 'x64' })).toBe('Windows 10 x64')
    expect(kimiDeviceModel({ type: 'Darwin', release: '23', arch: 'arm64', macProductVersion: () => '14.5' })).toBe('macOS 14.5 arm64')
    expect(kimiDeviceModel({ type: 'Darwin', release: '23', arch: 'arm64', macProductVersion: () => { throw new Error('no') } })).toBe('macOS 23 arm64')
  })

  test('the device id is declared, persisted once with owner-only mode, or reused', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kimi-'))
    const path = join(dir, 'oauth', 'kimi-coding-device-id')
    expect(resolveKimiDeviceId({ env: { THYROX_KIMI_CODING_DEVICE_ID: 'declared' }, path, newId: () => 'fresh' })).toBe('declared')
    expect(resolveKimiDeviceId({ env: {}, path, newId: () => 'fresh' })).toBe('fresh')
    expect(readFileSync(path, 'utf8')).toBe('fresh')
    expect(statSync(path).mode & 0o777).toBe(0o600)
    expect(resolveKimiDeviceId({ env: {}, path, newId: () => 'other' })).toBe('fresh')
    writeFileSync(path, '0123456789abcdef0123456789abcdef')
    expect(resolveKimiDeviceId({ env: {}, path, newId: () => 'other' })).toBe('01234567-89ab-cdef-0123-456789abcdef')
  })
})

describe('kimi-coding', () => {
  const identity = () => ({ deviceId: 'dev', deviceName: 'host', deviceModel: 'Linux 6 x64', osVersion: '6' })

  test('without its variable the flow refuses naming it', async () => {
    const flow = createKimiCodingFlow({ config: kimiCodingOAuthConfig({}), identity })
    await expect(flow.requestDeviceCode!(flow.config, 'c')).rejects.toThrow('THYROX_KIMI_CODING_OAUTH_CLIENT_ID is not set')
  })

  test('the device request is signed with the identity and demands the complete URI', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ device_code: 'd', user_code: 'u', verification_uri_complete: 'https://k/u', expires_in: 600 }))
    const flow = createKimiCodingFlow({ config: kimiCodingOAuthConfig({ THYROX_KIMI_CODING_OAUTH_CLIENT_ID: 'cid' }), identity, fetch })
    expect(await flow.requestDeviceCode!(flow.config, 'c')).toEqual({ device_code: 'd', user_code: 'u', verification_uri: '', verification_uri_complete: 'https://k/u', expires_in: 600, interval: 5 })
    expect(calls[0]!.url).toBe('https://auth.kimi.com/api/oauth/device_authorization')
    expect(String(calls[0]!.init.body)).toBe('client_id=cid')
    expect(headersOf(calls[0]!.init)['X-Msh-Device-Id']).toBe('dev')
    const { fetch: bare } = scriptedFetch(() => Response.json({ device_code: 'd', user_code: 'u' }))
    await expect(createKimiCodingFlow({ config: flow.config, identity, fetch: bare }).requestDeviceCode!(flow.config, 'c')).rejects.toThrow('missing verification_uri_complete')
  })

  test('an error page from the poll surfaces as its text; the grant keeps the device identity', async () => {
    const { fetch } = scriptedFetch(() => new Response('<html>busy</html>', { status: 502 }))
    const flow = createKimiCodingFlow({ config: kimiCodingOAuthConfig({ THYROX_KIMI_CODING_OAUTH_CLIENT_ID: 'cid' }), identity, fetch })
    expect(await flow.pollToken!(flow.config, 'd')).toEqual({ ok: false, data: { error: 'invalid_response', error_description: '<html>busy</html>' } })
    expect(flow.mapTokens({ access_token: 'a', refresh_token: 'r', expires_in: 10, token_type: 'Bearer', scope: 's' }, null)).toEqual({
      accessToken: 'a', refreshToken: 'r', expiresIn: 10, tokenType: 'Bearer', scope: 's',
      providerSpecificData: { deviceId: 'dev', deviceName: 'host', deviceModel: 'Linux 6 x64', osVersion: '6' },
    })
  })
})

describe('muse-code', () => {
  test('a dca token is recognised and the base URL loses its trailing slashes', () => {
    expect([isMuseDcaToken(' dca:x'), isMuseDcaToken('k'), isMuseDcaToken(null)]).toEqual([true, false, false])
    expect([normalizeMuseBaseUrl('https://x/v1//'), normalizeMuseBaseUrl('')]).toEqual(['https://x/v1', 'https://api.meta.ai/v1'])
  })

  test('the mint exchanges the dca token for the inference key and its subscription', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ apiKey: 'key', base_url: 'https://m/v1/', user_email: 'a@m', is_subs_active: true, subs_tier_name: 'pro' }))
    expect(await mintMuseApiKey(fetch, ' dca:t ')).toEqual({
      apiKey: 'key', baseUrl: 'https://m/v1', email: 'a@m', name: undefined, subsTierName: 'pro', subsTierId: undefined,
      isSubsActive: true, hasPaymentMethod: undefined, requirePayment: undefined, canSubscribe: undefined,
    })
    expect(headersOf(calls[0]!.init).Authorization).toBe('Bearer dca:t')
    expect(headersOf(calls[0]!.init)['User-Agent']).toBe('muse-code/1.0.2')
    const { fetch: empty } = scriptedFetch(() => Response.json({}))
    await expect(mintMuseApiKey(empty, 'dca:t')).rejects.toThrow('missing api_key')
  })

  test('an invalid expiry is refused; a missing interval takes the default', async () => {
    const config = museCodeOAuthConfig({ THYROX_MUSE_CODE_OAUTH_CLIENT_ID: 'cid' })
    const { fetch: bad } = scriptedFetch(() => Response.json({ device_code: 'd', user_code: 'u', expires_in: 0 }))
    await expect(createMuseCodeFlow({ config, fetch: bad }).requestDeviceCode!(config, 'c')).rejects.toThrow('invalid device code expiry')
    const { fetch } = scriptedFetch(() => Response.json({ device_code: ' d ', user_code: 'u', expires_in: 900 }))
    expect(await createMuseCodeFlow({ config, fetch }).requestDeviceCode!(config, 'c')).toEqual({ device_code: 'd', user_code: 'u', verification_uri: '', verification_uri_complete: '', expires_in: 900, interval: 5 })
  })

  test('with a minted key the inference key is the access token and the dca token refreshes', async () => {
    const { fetch } = scriptedFetch(url => url.endsWith('/muse-code/key')
      ? Response.json({ api_key: 'key', name: 'Ada' })
      : Response.json({ access_token: 'dca:t', expires_in: 60, token_type: 'Bearer' }))
    const config = museCodeOAuthConfig({ THYROX_MUSE_CODE_OAUTH_CLIENT_ID: 'cid' })
    const flows = createOAuthFlows({ muse: createMuseCodeFlow({ config, fetch, now: () => Date.parse('2026-09-28T10:00:00Z') }) })
    const outcome = await flows.pollForToken('muse', 'd')
    expect(outcome.success).toBe(true)
    const tokens = (outcome as { tokens: Record<string, any> }).tokens
    expect([tokens.accessToken, tokens.refreshToken, tokens.expiresIn, tokens.displayName]).toEqual(['key', 'dca:t', undefined, 'Ada'])
    expect(tokens.providerSpecificData.dcaExpiresAt).toBe('2026-09-28T10:01:00.000Z')
  })

  test('a failed mint still saves the dca token as the credential and its refresh', async () => {
    const { fetch } = scriptedFetch(url => url.endsWith('/muse-code/key') ? new Response('x', { status: 500 }) : Response.json({ access_token: 'dca:t', expires_in: 60 }))
    const config = museCodeOAuthConfig({ THYROX_MUSE_CODE_OAUTH_CLIENT_ID: 'cid' })
    const outcome = await createOAuthFlows({ muse: createMuseCodeFlow({ config, fetch }) }).pollForToken('muse', 'd')
    const tokens = (outcome as { tokens: Record<string, any> }).tokens
    expect([tokens.accessToken, tokens.refreshToken, tokens.expiresIn]).toEqual(['dca:t', 'dca:t', 60])
  })
})

describe('openference', () => {
  const idToken = (payload: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`

  test('without its variable the auth URL is refused naming it; with it, PKCE on the fixed loopback', () => {
    expect(() => createOAuthFlows({ o: createOpenferenceFlow({ config: openferenceOAuthConfig({}) }) }).generateAuthData('o', 'http://127.0.0.1:56123/callback')).toThrow('THYROX_OPENFERENCE_OAUTH_CLIENT_ID is not set')
    const flows = createOAuthFlows({ o: createOpenferenceFlow({ config: openferenceOAuthConfig({ THYROX_OPENFERENCE_OAUTH_CLIENT_ID: 'cid' }) }) })
    const data = flows.generateAuthData('o', 'http://127.0.0.1:56123/callback')
    const url = new URL(data.authUrl!)
    expect([data.fixedPort, data.callbackHost, url.searchParams.get('code_challenge_method'), url.searchParams.get('client_id')]).toEqual([56123, '127.0.0.1', 'S256', 'cid'])
  })

  test('the id token names the account; otherwise the userinfo, and the name falls back to the email', async () => {
    expect(decodeOpenferenceIdTokenIdentity(idToken({ preferred_username: 'u@o', name: 'U' }))).toEqual({ email: 'u@o', name: 'U' })
    expect(decodeOpenferenceIdTokenIdentity('a.b')).toEqual({ email: null, name: null })
    expect(decodeOpenferenceIdTokenIdentity(`${idToken({ email: 'x@o' })}.extra`)).toEqual({ email: null, name: null })
    const { calls, fetch } = scriptedFetch(url => url.endsWith('/userinfo') ? Response.json({ email: ' e@o ' }) : Response.json({ access_token: 'at', refresh_token: 'rt', expires_in: 5 }))
    const flows = createOAuthFlows({ o: createOpenferenceFlow({ config: openferenceOAuthConfig({ THYROX_OPENFERENCE_OAUTH_CLIENT_ID: 'cid' }), fetch }) })
    const tokens = await flows.exchangeTokens('o', 'code', 'http://127.0.0.1:56123/callback', 'ver', 's')
    expect(new URLSearchParams(String(calls[0]!.init.body)).get('code_verifier')).toBe('ver')
    expect(headersOf(calls[1]!.init).Authorization).toBe('Bearer at')
    expect([tokens.email, tokens.name, (tokens.providerSpecificData as any).tokenType]).toEqual(['e@o', 'e@o', 'Bearer'])
  })
})

describe('openference identity precedence', () => {
  test('the id token wins over the userinfo, and a failed userinfo is empty', async () => {
    const idToken = `h.${Buffer.from(JSON.stringify({ email: 'id@o' })).toString('base64url')}.s`
    const { fetch } = scriptedFetch(url => url.endsWith('/userinfo') ? new Response('down', { status: 500 }) : Response.json({ access_token: 'at', id_token: idToken }))
    const flows = createOAuthFlows({ o: createOpenferenceFlow({ config: openferenceOAuthConfig({ THYROX_OPENFERENCE_OAUTH_CLIENT_ID: 'cid' }), fetch }) })
    const tokens = await flows.exchangeTokens('o', 'code', 'r', 'v', 's')
    expect([tokens.email, tokens.name]).toEqual(['id@o', 'id@o'])
  })
})
