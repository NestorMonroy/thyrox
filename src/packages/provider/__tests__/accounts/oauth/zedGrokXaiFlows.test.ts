/**
 * Zed Hosted inicia sesión con un par RSA propio en vez de un cliente OAuth;
 * xAI y Grok Build comparten cliente y servidor de autorización, y Grok Build
 * además sondea un código de dispositivo y acepta tokens pegados.
 *
 * Porte de `omniroute: src/lib/oauth/providers/zed-hosted.ts`,
 * `xai-oauth.ts`, `grok-cli.ts`, `grok-cli-oauth.ts`, de
 * `open-sse/shared/zedAuth.ts`, `open-sse/config/grokBuild.ts` y de sus
 * configuraciones en `constants/oauth.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'
import { constants, publicEncrypt } from 'node:crypto'

import { grokBuildOAuthHeaders } from '../../../src/accounts/grok/grokBuild.ts'
import { mapImportedGrokToken } from '../../../src/accounts/grok/grokTokens.ts'
import { createGrokCliFlow, grokOAuthConfig } from '../../../src/accounts/oauth/flows/grokCliFlow.ts'
import { createXaiOAuthFlow, decodeXaiIdTokenIdentity } from '../../../src/accounts/oauth/flows/xaiOAuthFlow.ts'
import { createZedHostedFlow } from '../../../src/accounts/oauth/flows/zedHostedFlow.ts'
import { createOAuthFlows } from '../../../src/accounts/oauth/oauthFlows.ts'
import { createZedNativeAuthData, decodeZedPrivateKeyVerifier, parseZedCallbackPayload, resolveZedOrganizationId } from '../../../src/accounts/zed/zedNativeAuth.ts'

function scriptedFetch(answer: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

const headersOf = (init: RequestInit) => init.headers as Record<string, string>
const jwt = (payload: Record<string, unknown>) => `eyJh.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`
const NOW = Date.parse('2026-09-28T10:00:00Z')
const NOW_SECONDS = NOW / 1000

function publicKeyOf(authUrl: string): string {
  const der = Buffer.from(new URL(authUrl).searchParams.get('native_app_public_key')!, 'base64url')
  return `-----BEGIN RSA PUBLIC KEY-----\n${der.toString('base64').match(/.{1,64}/g)!.join('\n')}\n-----END RSA PUBLIC KEY-----\n`
}

describe('zed native auth', () => {
  test('the sign-in URL carries the port, the public key and the system id; the verifier carries the private key', () => {
    const data = createZedNativeAuthData({}, { nativeAppPort: 4000, systemId: 'sys' })
    const url = new URL(data.authUrl)
    expect(url.origin + url.pathname).toBe('https://zed.dev/native_app_signin')
    expect([url.searchParams.get('native_app_port'), url.searchParams.get('system_id')]).toEqual(['4000', 'sys'])
    expect(data.privateKeyVerifier.startsWith('zed-rsa-pkcs1:')).toBe(true)
    expect(decodeZedPrivateKeyVerifier(data.privateKeyVerifier)).toContain('BEGIN RSA PRIVATE KEY')
    expect(() => decodeZedPrivateKeyVerifier('pkce-verifier')).toThrow('restart the login flow')
  })

  test('the callback is read as a URL, a bare query or JSON', () => {
    expect(parseZedCallbackPayload('http://127.0.0.1:58443/?user_id=7&access_token=enc')).toEqual({ userId: '7', encryptedAccessToken: 'enc' })
    expect(parseZedCallbackPayload('?user_id=7&access_token=enc')).toEqual({ userId: '7', encryptedAccessToken: 'enc' })
    expect(parseZedCallbackPayload('{"userId":8,"token":"t"}')).toEqual({ userId: '8', encryptedAccessToken: 't' })
    expect(() => parseZedCallbackPayload('user_id=7')).toThrow('must include user_id and access_token')
    expect(() => parseZedCallbackPayload('  ')).toThrow('Missing Zed callback URL')
  })

  test('the organization is the declared one, then the default, then the personal one, then the first', () => {
    expect(resolveZedOrganizationId({ providerSpecificData: { organizationId: 'o1' } }, { default_organization_id: 'o2' })).toBe('o1')
    expect(resolveZedOrganizationId({}, { default_organization_id: { id: 'o2' } })).toBe('o2')
    expect(resolveZedOrganizationId({}, { organizations: [{ id: 'a' }, { id: 'p', is_personal: true }] })).toBe('p')
    expect(resolveZedOrganizationId({}, { organizations: [{ id: 'a' }] })).toBe('a')
    expect(resolveZedOrganizationId({}, null)).toBe('')
  })
})

describe('zed-hosted', () => {
  test('a loopback redirect reuses the local port; any other keeps the default native port', () => {
    const flows = createOAuthFlows({ zed: createZedHostedFlow({ loopbackPort: () => 20128 }) })
    expect(new URL(flows.generateAuthData('zed', 'http://localhost:9/callback').authUrl!).searchParams.get('native_app_port')).toBe('20128')
    const remote = flows.generateAuthData('zed', 'https://example.org/callback')
    expect(new URL(remote.authUrl!).searchParams.get('native_app_port')).toBe('58443')
    expect(remote.redirectUri).toBe('http://127.0.0.1:58443/')
    expect(remote.codeVerifier!.startsWith('zed-rsa-pkcs1:')).toBe(true)
  })

  test('the pasted callback is decrypted with the private key and the account is named by the user info', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ email: 'o@z', github_login: 'octo', organizations: [{ id: 'org', is_personal: true }] }))
    const flows = createOAuthFlows({ zed: createZedHostedFlow({ fetch }) })
    const auth = flows.generateAuthData('zed', 'https://example.org/callback')
    const encrypted = publicEncrypt({ key: publicKeyOf(auth.authUrl!), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from('secret-token')).toString('base64url')
    const tokens = await flows.exchangeTokens('zed', `http://127.0.0.1:58443/?user_id=42&access_token=${encrypted}`, auth.redirectUri, auth.codeVerifier!, auth.state!)
    expect(headersOf(calls[0]!.init).Authorization).toBe('42 secret-token')
    expect(calls[0]!.url).toBe('https://cloud.zed.dev/client/users/me')
    expect(tokens).toEqual({ accessToken: 'secret-token', name: 'octo', email: 'o@z', providerSpecificData: { userId: '42', organizationId: 'org' } })
  })

  test('a failed user lookup keeps the account; a token for another key is refused', async () => {
    const { fetch } = scriptedFetch(() => new Response('nope', { status: 500 }))
    const flows = createOAuthFlows({ zed: createZedHostedFlow({ fetch }) })
    const auth = flows.generateAuthData('zed', 'https://example.org/callback')
    const encrypted = publicEncrypt({ key: publicKeyOf(auth.authUrl!), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from('plain')).toString('base64url')
    const tokens = await flows.exchangeTokens('zed', `user_id=1&access_token=${encrypted}`, auth.redirectUri, auth.codeVerifier!, auth.state!)
    expect(tokens).toEqual({ accessToken: 'plain', name: null, email: undefined, providerSpecificData: { userId: '1', organizationId: undefined } })
    const other = flows.generateAuthData('zed', 'https://example.org/callback')
    await expect(flows.exchangeTokens('zed', `user_id=1&access_token=${encrypted}`, other.redirectUri, other.codeVerifier!, other.state!)).rejects.toThrow('Failed to decrypt Zed access token')
  })
})

describe('xai-oauth', () => {
  test('without its variable the auth URL is refused naming it', () => {
    const flows = createOAuthFlows({ xai: createXaiOAuthFlow({ config: grokOAuthConfig({}) }) })
    expect(() => flows.generateAuthData('xai', 'http://127.0.0.1:56121/callback')).toThrow('THYROX_GROK_OAUTH_CLIENT_ID is not set')
  })

  test('a 96-byte verifier, a fresh nonce, the CLI plan and percent-encoded spaces', () => {
    const flows = createOAuthFlows({ xai: createXaiOAuthFlow({ config: grokOAuthConfig({ THYROX_GROK_OAUTH_CLIENT_ID: 'cid' }) }) })
    const data = flows.generateAuthData('xai', 'http://127.0.0.1:56121/callback')
    expect(data.codeVerifier!.length).toBe(128)
    expect([data.fixedPort, data.callbackHost]).toEqual([56121, '127.0.0.1'])
    expect(data.authUrl).toContain('scope=openid%20profile%20email%20offline_access%20grok-cli%3Aaccess%20api%3Aaccess')
    const url = new URL(data.authUrl!)
    expect(url.searchParams.get('nonce')).toMatch(/^[0-9a-f]{32}$/)
    expect([url.searchParams.get('plan'), url.searchParams.get('referrer')]).toEqual(['generic', 'cli-proxy-api'])
    expect(new URL(flows.generateAuthData('xai', 'r').authUrl!).searchParams.get('nonce')).not.toBe(url.searchParams.get('nonce'))
  })

  test('the id token names the account and the name falls back to the email', async () => {
    expect(decodeXaiIdTokenIdentity(jwt({ preferred_username: 'u@x' }))).toEqual({ email: 'u@x', name: null })
    const { fetch } = scriptedFetch(() => Response.json({ access_token: 'at', id_token: jwt({ email: 'e@x' }), expires_in: 9 }))
    const flows = createOAuthFlows({ xai: createXaiOAuthFlow({ config: grokOAuthConfig({ THYROX_GROK_OAUTH_CLIENT_ID: 'cid' }), fetch }) })
    const tokens = await flows.exchangeTokens('xai', 'code', 'r', 'v', 's')
    expect([tokens.email, tokens.name, (tokens.providerSpecificData as any).scope]).toEqual(['e@x', 'e@x', 'openid profile email offline_access grok-cli:access api:access'])
  })
})

describe('grok build', () => {
  const config = grokOAuthConfig({ THYROX_GROK_OAUTH_CLIENT_ID: 'cid' })

  test('the OAuth headers name the client version and surface', () => {
    expect(grokBuildOAuthHeaders('cli')).toEqual({ Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'x-grok-client-version': '1.0.41', 'x-grok-client-surface': 'cli' })
  })

  test('the device code asks for the wide scope and validates what comes back', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ device_code: 'd', user_code: 'AB-12', verification_uri: 'https://accounts.x.ai/device' }))
    const flow = createGrokCliFlow({ config, fetch })
    expect(await flow.requestDeviceCode!(config, 'c')).toEqual({ device_code: 'd', user_code: 'AB-12', verification_uri: 'https://accounts.x.ai/device', verification_uri_complete: 'https://accounts.x.ai/device', expires_in: 1800, interval: 5 })
    expect(calls[0]!.url).toBe('https://auth.x.ai/oauth2/device/code')
    const body = new URLSearchParams(String(calls[0]!.init.body))
    expect([body.get('client_id'), body.get('referrer')]).toEqual(['cid', 'grok-build'])
    expect(body.get('scope')!.split(' ')).toContain('workspaces:write')
    for (const [answer, message] of [
      [{ device_code: 'd', user_code: 'A B', verification_uri: 'https://x' }, 'invalid device code'],
      [{ device_code: 'd', user_code: 'A', verification_uri: 'http://evil.example/' }, 'unsupported verification URL'],
      [{ device_code: 'd', user_code: 'A', verification_uri: 'https://x/\u0007' }, 'invalid verification URL'],
      [{ device_code: 'd', user_code: 'A' }, 'response is incomplete'],
    ] as const) {
      const { fetch: bad } = scriptedFetch(() => Response.json(answer))
      await expect(createGrokCliFlow({ config, fetch: bad }).requestDeviceCode!(config, 'c')).rejects.toThrow(message)
    }
    const { fetch: local } = scriptedFetch(() => Response.json({ device_code: 'd', user_code: 'A', verification_uri: 'http://127.0.0.1:9/d', verification_uri_complete: 'http://127.0.0.1:9/d?c=A' }))
    const localCode = (await createGrokCliFlow({ config, fetch: local }).requestDeviceCode!(config, 'c')) as any
    expect([localCode.verification_uri, localCode.verification_uri_complete]).toEqual(['http://127.0.0.1:9/d', 'http://127.0.0.1:9/d?c=A'])
  })

  test('a failed device request carries the upstream description; a non-JSON poll is an invalid response', async () => {
    const { fetch } = scriptedFetch(() => Response.json({ error_description: 'client blocked' }, { status: 400 }))
    await expect(createGrokCliFlow({ config, fetch }).requestDeviceCode!(config, 'c')).rejects.toThrow('client blocked')
    const { fetch: html } = scriptedFetch(() => new Response('<html>', { status: 502 }))
    expect(await createGrokCliFlow({ config, fetch: html }).pollToken!(config, 'd')).toEqual({ ok: false, data: { error: 'invalid_response', error_description: 'xAI returned a non-JSON OAuth response' } })
  })

  test('the browser login is PKCE on its own port with the Grok Build scope', () => {
    const flows = createOAuthFlows({ grok: createGrokCliFlow({ config }) })
    const data = flows.generateAuthData('grok', 'http://127.0.0.1:56122/callback')
    const url = new URL(data.authUrl!)
    expect([data.fixedPort, data.codeVerifier!.length, url.searchParams.get('scope')]).toEqual([56122, 128, 'openid profile email offline_access grok-cli:access'])
    expect(url.searchParams.get('nonce')).toBeNull()
  })

  test('browser tokens keep their identity and a non-positive expiry becomes one second', () => {
    const flow = createGrokCliFlow({ config, now: () => NOW })
    expect(flow.mapTokens({ access_token: 'a', refresh_token: 'r', id_token: jwt({ email: 'e@x', name: 'E' }), expires_in: 0 }, null)).toEqual({
      accessToken: 'a', refreshToken: 'r', expiresIn: 1, email: 'e@x', name: 'E',
      providerSpecificData: { scope: 'openid profile email offline_access grok-cli:access', tokenType: 'Bearer', autoSync: true },
    })
    expect(flow.mapTokens({ access_token: 'a' }, null).expiresIn).toBe(21600)
  })

  test('a pasted JWT takes its expiry from exp, and a team principal is the user and the team', () => {
    const flow = createGrokCliFlow({ config, now: () => NOW })
    const token = jwt({ sub: 'u', email: 'e@x', principal_type: 'Team', principal_id: 't1', tier: 3, exp: NOW_SECONDS + 600 })
    expect(flow.mapTokens({ accessToken: token }, null)).toEqual({
      accessToken: token, refreshToken: null, idToken: null, expiresIn: 600, tokenType: null, scope: null, email: 'e@x',
      providerSpecificData: { userId: 't1', email: 'e@x', teamId: 't1', tier: 3, principalType: 'Team', principalId: 't1', organizationId: null, rawAuthJson: undefined, autoSync: true },
    })
    const expired = mapImportedGrokToken(jwt({ exp: NOW_SECONDS - 60 }), { clientId: null, now: NOW })
    expect([expired.expiresIn, (expired.providerSpecificData as any).tier]).toEqual([1, 1])
  })

  test('an auth.json paste prefers the active issuer and client, and reads its expires_at', () => {
    const flow = createGrokCliFlow({ config, now: () => NOW })
    const pasted = {
      accessToken: {
        'https://auth.x.ai::other': { key: jwt({ sub: 'other' }), refresh_token: 'r0' },
        'https://auth.x.ai::cid': { key: jwt({ sub: 'mine', organization_id: 'org' }), refresh_token: 'r1', expires_at: '2026-09-28T11:00:00Z' },
      },
    }
    const tokens = flow.mapTokens(pasted, null)
    expect([tokens.refreshToken, tokens.expiresIn, (tokens.providerSpecificData as any).userId, (tokens.providerSpecificData as any).organizationId]).toEqual(['r1', 3600, 'mine', 'org'])
    expect((tokens.providerSpecificData as any).rawAuthJson).toBe(pasted.accessToken)
    expect(flow.mapTokens({ accessToken: '' }, null).accessToken).toBe('')
  })
})

describe('grok build pasted object', () => {
  test('an organization principal is the user and the organization; the object refresh token is kept', () => {
    const flow = createGrokCliFlow({ config: grokOAuthConfig({}), now: () => NOW })
    const tokens = flow.mapTokens({ accessToken: jwt({ sub: 's', principal_type: 'organization', principal_id: 'o' }), refreshToken: 'r' }, null)
    const data = tokens.providerSpecificData as Record<string, unknown>
    expect([tokens.refreshToken, data.userId, data.organizationId, data.teamId, tokens.expiresIn]).toEqual(['r', 'o', 'o', null, 21600])
  })
})
