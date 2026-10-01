/**
 * Los flujos pequeños: Trae, Devin y Zed se importan (token pegado); Qoder es
 * un código experimental que sólo existe si el operador declara su cliente;
 * Kilo Code es un código de dispositivo propio; Cline trae los tokens dentro
 * del propio código.
 *
 * Porte de `omniroute: src/lib/oauth/providers/trae.ts`, `qoder.ts`,
 * `kilocode.ts`, `cline.ts`, `devin-desktop.ts`, `zed.ts` y de sus
 * configuraciones en `constants/oauth.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createClineFlow } from '../../../src/accounts/oauth/flows/clineFlow.ts'
import { createDevinFlow, createTraeFlow, createZedFlow } from '../../../src/accounts/oauth/flows/importedTokenFlows.ts'
import { createKilocodeFlow } from '../../../src/accounts/oauth/flows/kilocodeFlow.ts'
import { createQoderFlow, qoderOAuthConfig } from '../../../src/accounts/oauth/flows/qoderFlow.ts'
import { createOAuthFlows } from '../../../src/accounts/oauth/oauthFlows.ts'

function scriptedFetch(answer: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { calls, fetch: fetch as typeof globalThis.fetch }
}

describe('imported tokens', () => {
  test('trae fills the SOLO identity with its defaults and fourteen days of validity', async () => {
    const flows = createOAuthFlows({ trae: createTraeFlow() })
    expect(flows.generateAuthData('trae', 'r').supported).toBe(false)
    expect(await flows.finalizeTokens('trae', { access_token: 'jwt', web_id: 'w', region: 'EU' })).toEqual({
      accessToken: 'jwt',
      refreshToken: null,
      expiresIn: 14 * 24 * 60 * 60,
      providerSpecificData: {
        webId: 'w', bizUserId: '', userUniqueId: '', scope: 'marscode-us', tenant: 'marscode', region: 'EU', aiRegion: 'EU',
        appLanguage: 'en', appVersion: '1.0.0.1229', userRegion: 'US', userTimezone: undefined, userIdentity: 'Free',
        machineId: undefined, authMethod: 'imported',
      },
    })
  })

  test('devin and zed validate the pasted token before taking it', async () => {
    const devin = createDevinFlow()
    expect(devin.validateImportToken!(' ')).toEqual({ valid: false, reason: 'Token is empty' })
    expect(devin.validateImportToken!('x'.repeat(15))).toEqual({ valid: false, reason: 'Token is too short' })
    expect(devin.validateImportToken!('x'.repeat(16))).toEqual({ valid: true })
    const zed = createZedFlow()
    expect(zed.validateImportToken!('x'.repeat(7))).toEqual({ valid: false, reason: 'Token is too short' })
    expect(zed.validateImportToken!('x'.repeat(8))).toEqual({ valid: true })
    expect(await createOAuthFlows({ zed }).finalizeTokens('zed', { accessToken: 'k' })).toEqual({ accessToken: 'k', refreshToken: null, expiresIn: null })
    expect(createOAuthFlows({ zed }).generateAuthData('zed', 'r').error).toContain('keychain')
  })
})

describe('qoder', () => {
  const env = {
    THYROX_QODER_OAUTH_AUTHORIZE_URL: 'https://q.example/authorize',
    THYROX_QODER_OAUTH_TOKEN_URL: 'https://q.example/token',
    THYROX_QODER_OAUTH_USERINFO_URL: 'https://q.example/me',
    THYROX_QODER_OAUTH_CLIENT_ID: 'qid',
    THYROX_QODER_OAUTH_CLIENT_SECRET: 'qsec',
  }

  test('it exists only with the five variables declared, and says which ones', () => {
    expect(qoderOAuthConfig(env).enabled).toBe(true)
    expect(qoderOAuthConfig({ ...env, THYROX_QODER_OAUTH_CLIENT_SECRET: '' }).enabled).toBe(false)
    const off = createOAuthFlows({ qoder: createQoderFlow({ config: qoderOAuthConfig({}) }) })
    expect(() => off.generateAuthData('qoder', 'r')).toThrow('THYROX_QODER_OAUTH_')
  })

  test('phone login URL; the exchange authenticates the client both ways; the user comes from its success wrapper', async () => {
    const data = createOAuthFlows({ qoder: createQoderFlow({ config: qoderOAuthConfig(env) }) }).generateAuthData('qoder', 'http://l/cb')
    expect(Object.fromEntries(new URL(data.authUrl!).searchParams)).toEqual({
      loginMethod: 'phone', type: 'phone', redirect: 'http://l/cb', state: data.state!, client_id: 'qid',
    })
    const { calls, fetch } = scriptedFetch(url =>
      url.endsWith('/token')
        ? Response.json({ access_token: 'at', refresh_token: 'rt', expires_in: 60 })
        : Response.json({ success: true, data: { apiKey: 'pat', phone: '+1', nickname: 'Nick' } }),
    )
    const tokens = await createOAuthFlows({ qoder: createQoderFlow({ config: qoderOAuthConfig(env), fetch }) }).exchangeTokens('qoder', 'c', 'http://l/cb', 'v', 's')
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('qid:qsec').toString('base64')}`)
    expect(new URLSearchParams(String(calls[0]!.init.body)).get('client_secret')).toBe('qsec')
    expect(calls[1]!.url).toBe('https://q.example/me?accessToken=at')
    expect(tokens).toEqual({ accessToken: 'at', refreshToken: 'rt', expiresIn: 60, apiKey: 'pat', email: '+1', displayName: 'Nick' })
  })
})

describe('kilo code', () => {
  test('the device code is its own code, three seconds apart', async () => {
    const { fetch } = scriptedFetch(() => Response.json({ code: 'K-1', verificationUrl: 'https://kilo/v' }))
    expect(await createOAuthFlows({ kilocode: createKilocodeFlow({ fetch }) }).requestDeviceCode('kilocode', '')).toEqual({
      device_code: 'K-1', user_code: 'K-1', verification_uri: 'https://kilo/v', verification_uri_complete: 'https://kilo/v', expires_in: 300, interval: 3,
    })
  })

  test('too many pending requests is said plainly', async () => {
    const { fetch } = scriptedFetch(() => new Response('', { status: 429 }))
    await expect(createOAuthFlows({ kilocode: createKilocodeFlow({ fetch }) }).requestDeviceCode('kilocode', '')).rejects.toThrow('Too many pending authorization requests')
  })

  test('the poll status says pending, denied, expired or granted', async () => {
    const answers = [
      new Response('', { status: 202 }),
      new Response('', { status: 403 }),
      new Response('', { status: 410 }),
      new Response('', { status: 500 }),
      Response.json({ status: 'pending' }),
      Response.json({ status: 'approved', token: 'kt', userEmail: 'k@x.io' }),
    ]
    const { calls, fetch } = scriptedFetch(() => answers.shift()!)
    const flows = createOAuthFlows({ kilocode: createKilocodeFlow({ fetch }) })
    const errors = []
    for (let i = 0; i < 5; i += 1) errors.push((await flows.pollForToken('kilocode', 'K-1')) as { error: unknown })
    expect(errors.map(result => result.error)).toEqual(['authorization_pending', 'access_denied', 'expired_token', 'poll_failed', 'authorization_pending'])
    expect(calls[0]!.url).toBe('https://api.kilo.ai/api/device-auth/codes/K-1')
    expect(await flows.pollForToken('kilocode', 'K-1')).toEqual({ success: true, tokens: { accessToken: 'kt', refreshToken: null, expiresIn: null, email: 'k@x.io' } })
  })
})

describe('cline', () => {
  const encoded = (payload: Record<string, unknown>) => encodeURIComponent(Buffer.from(`${JSON.stringify(payload)}\u0000trailing`).toString('base64').replace(/=+$/, ''))

  test('the authorize URL is the extension client with the callback', () => {
    const url = new URL(createOAuthFlows({ cline: createClineFlow({}) }).generateAuthData('cline', 'http://l/cb').authUrl!)
    expect(url.origin + url.pathname).toBe('https://api.cline.bot/api/v1/auth/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({ client_type: 'extension', callback_url: 'http://l/cb', redirect_uri: 'http://l/cb' })
  })

  test('the tokens come inside the code, unpadded and URL-encoded', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({}))
    const flows = createOAuthFlows({ cline: createClineFlow({ fetch, now: () => Date.parse('2026-09-28T10:00:00Z') }) })
    const tokens = await flows.exchangeTokens(
      'cline',
      encoded({ accessToken: '>>>???', refreshToken: 'rt', email: 'c@x.io', firstName: 'Ada', lastName: 'L', expiresAt: '2026-09-28T11:00:00Z' }),
      'r', 'v', 's',
    )
    expect(calls).toHaveLength(0)
    expect(tokens).toEqual({ accessToken: '>>>???', refreshToken: 'rt', expiresIn: 3600, name: 'Ada L', email: 'c@x.io', providerSpecificData: { firstName: 'Ada', lastName: 'L' } })
  })

  test('a code that is not embedded tokens is exchanged; without names the email is the label', async () => {
    const { calls, fetch } = scriptedFetch(() => Response.json({ data: { accessToken: 'at2', refreshToken: 'rt2', userInfo: { email: 'd@x.io' } } }))
    const tokens = await createOAuthFlows({ cline: createClineFlow({ fetch }) }).exchangeTokens('cline', 'opaque-code', 'http://l/cb', 'v', 's')
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ grant_type: 'authorization_code', code: 'opaque-code', client_type: 'extension', redirect_uri: 'http://l/cb' })
    expect([tokens.accessToken, tokens.name, tokens.expiresIn]).toEqual(['at2', 'd@x.io', 3600])
  })
})
