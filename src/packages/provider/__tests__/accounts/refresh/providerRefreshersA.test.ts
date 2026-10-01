/**
 * El refresco de cada proveedor del lote A: Anthropic, GitHub y su token de
 * Copilot, Google, GitLab Duo, Qoder, Cline y CodeBuddy CN. Cada uno manda el
 * refresh token en la forma que su servicio pide y distingue un token muerto
 * (se pide volver a autenticar) de un fallo pasajero (se reintenta).
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/{claudeOAuth,
 * github, copilot, google, gitlabDuo, qoder, cline, codebuddyCn}.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { anthropicOAuthConfig } from '../../../src/accounts/oauth/flows/anthropicFlow.ts'
import { gitlabDuoOAuthConfig } from '../../../src/accounts/oauth/flows/gitlabDuoFlow.ts'
import { githubOAuthConfig } from '../../../src/accounts/oauth/flows/githubFlow.ts'
import { qoderOAuthConfig } from '../../../src/accounts/oauth/flows/qoderFlow.ts'
import { refreshAnthropicOAuthToken } from '../../../src/accounts/refresh/providers/anthropicRefresh.ts'
import { refreshClineToken } from '../../../src/accounts/refresh/providers/clineRefresh.ts'
import { refreshCodebuddyCnToken } from '../../../src/accounts/refresh/providers/codebuddyCnRefresh.ts'
import { refreshCopilotToken } from '../../../src/accounts/refresh/providers/copilotRefresh.ts'
import { refreshGitLabDuoToken } from '../../../src/accounts/refresh/providers/gitlabDuoRefresh.ts'
import { refreshGithubToken } from '../../../src/accounts/refresh/providers/githubRefresh.ts'
import { refreshGoogleToken } from '../../../src/accounts/refresh/providers/googleRefresh.ts'
import { refreshQoderToken } from '../../../src/accounts/refresh/providers/qoderRefresh.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const text = (body: string, status: number) => new Response(body, { status })

function scriptedFetch(answer: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), init })
    return answer(String(input), init)
  }
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls }
}

const offline = (async () => {
  throw new Error('offline')
}) as unknown as typeof globalThis.fetch

function recordingLog() {
  const lines: string[] = []
  const at = (level: string) => (_tag: string, message: string) => void lines.push(`${level} ${message}`)
  return { log: { info: at('info'), warn: at('warn'), error: at('error'), debug: at('debug') }, lines }
}

const form = (init: RequestInit) => Object.fromEntries(new URLSearchParams(String(init.body)))
const headersOf = (init: RequestInit) => init.headers as Record<string, string>
const dead = (code: string) => ({ error: 'unrecoverable_refresh_error' as const, code })

async function rejectionOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    return (error as Error).message
  }
  return ''
}

describe('Anthropic', () => {
  const config = anthropicOAuthConfig({ THYROX_CLAUDE_OAUTH_CLIENT_ID: 'anthropic-client' })

  test('the refresh is form-encoded with the client and the OAuth beta', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'at', refresh_token: 'rt2', expires_in: 3600 }))
    const { log, lines } = recordingLog()
    expect(await refreshAnthropicOAuthToken('rt', { config, fetch, log })).toEqual({ accessToken: 'at', refreshToken: 'rt2', expiresIn: 3600 })
    expect(calls[0].url).toBe(config.tokenUrl)
    expect(calls[0].init.method).toBe('POST')
    expect(headersOf(calls[0].init)).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'anthropic-beta': 'oauth-2025-04-20' })
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'rt', client_id: 'anthropic-client' })
    expect(lines.some(line => line.startsWith('info'))).toBe(true)
  })

  test('without a rotated token the old one is kept', async () => {
    const { fetch } = scriptedFetch(() => json({ access_token: 'at' }))
    expect(await refreshAnthropicOAuthToken('rt', { config, fetch })).toMatchObject({ refreshToken: 'rt' })
  })

  test('a dead token in any body shape asks for re-authentication; anything else is transient', async () => {
    for (const body of ['{"error":"invalid_grant"}', JSON.stringify(JSON.stringify({ error: 'invalid_request' })), '{"error":{"code":"invalid_grant"}}']) {
      const { fetch } = scriptedFetch(() => text(body, 400))
      expect((await refreshAnthropicOAuthToken('rt', { config, fetch })) as unknown).toMatchObject({ error: 'unrecoverable_refresh_error' })
    }
    const { fetch } = scriptedFetch(() => text('{"error":"refresh_token_reused"}', 400))
    expect(await refreshAnthropicOAuthToken('rt', { config, fetch })).toBeNull()
    const { log, lines } = recordingLog()
    expect(await refreshAnthropicOAuthToken('rt', { config, fetch: scriptedFetch(() => text('{"error":"server_error"}', 500)).fetch, log })).toBeNull()
    expect(lines.some(line => line.startsWith('error'))).toBe(true)
    expect(await refreshAnthropicOAuthToken('rt', { config, fetch: offline, log })).toBeNull()
  })

  test('without a client id the refresh refuses naming the variable', async () => {
    expect(await rejectionOf(refreshAnthropicOAuthToken('rt', { config: anthropicOAuthConfig({}), fetch: offline }))).toContain('THYROX_CLAUDE_OAUTH_CLIENT_ID')
  })
})

describe('GitHub', () => {
  const config = githubOAuthConfig({ THYROX_GITHUB_OAUTH_CLIENT_ID: 'gh-client' })

  test('the refresh carries the client and, when declared, its secret', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'at', expires_in: 28800 }))
    expect(await refreshGithubToken('rt', { config, clientSecret: 'gh-secret', fetch })).toEqual({ accessToken: 'at', refreshToken: 'rt', expiresIn: 28800 })
    expect(calls[0].url).toBe('https://github.com/login/oauth/access_token')
    expect(headersOf(calls[0].init)).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' })
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'rt', client_id: 'gh-client', client_secret: 'gh-secret' })
    const bare = scriptedFetch(() => json({ access_token: 'at', refresh_token: 'rt2' }))
    expect(await refreshGithubToken('rt', { config, fetch: bare.fetch })).toMatchObject({ refreshToken: 'rt2' })
    expect(form(bare.calls[0].init).client_secret).toBeUndefined()
  })

  test('a dead token is unrecoverable, a transient failure is null, the network error propagates', async () => {
    expect(await refreshGithubToken('rt', { config, fetch: scriptedFetch(() => text('error=invalid_grant "error":"invalid_grant"', 400)).fetch })).toEqual(dead('invalid_grant'))
    expect(await refreshGithubToken('rt', { config, fetch: scriptedFetch(() => text('{"error":"access_denied"}', 400)).fetch })).toBeNull()
    expect(await refreshGithubToken('rt', { config, fetch: scriptedFetch(() => text('boom', 500)).fetch })).toBeNull()
    expect(await rejectionOf(refreshGithubToken('rt', { config, fetch: offline }))).toBe('offline')
  })
})

describe('Copilot', () => {
  test('the Copilot token is requested with the GitHub token and the Copilot client identity', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ token: 'cp', expires_at: 1790000000, extra: 1 }))
    expect(await refreshCopilotToken('gho_x', { fetch, env: {} })).toEqual({ token: 'cp', expiresAt: 1790000000 })
    expect(calls[0].url).toBe('https://api.github.com/copilot_internal/v2/token')
    expect(headersOf(calls[0].init)).toEqual({ Authorization: 'token gho_x', Accept: 'application/json', 'User-Agent': 'GithubCopilot/1.0', 'Editor-Version': 'copilot/1.0.88', 'Editor-Plugin-Version': 'copilot/1.0.88' })
  })

  test('an enterprise host gets its own endpoint, and a declared CLI version is used', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ token: 'cp' }))
    await refreshCopilotToken('t', { fetch, baseUrl: 'https://ghe.example/api/v3//', env: { THYROX_GITHUB_COPILOT_CLI_VERSION: '2.0.1' } })
    expect(calls[0].url).toBe('https://ghe.example/api/v3/copilot_internal/v2/token')
    expect(headersOf(calls[0].init)['Editor-Version']).toBe('copilot/2.0.1')
  })

  test('a refusal reports its status; a network failure a null status', async () => {
    expect(await refreshCopilotToken('t', { fetch: scriptedFetch(() => text('no', 401)).fetch, env: {} })).toEqual({ status: 401 })
    expect(await refreshCopilotToken('t', { fetch: offline, env: {} })).toEqual({ status: null })
  })
})

describe('Google', () => {
  const client = { clientId: 'g-id', clientSecret: 'g-secret' }

  test('the refresh uses the client that issued the token', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'ya29', expires_in: 3599 }))
    expect(await refreshGoogleToken('1//rt', client, { fetch })).toEqual({ accessToken: 'ya29', refreshToken: '1//rt', expiresIn: 3599 })
    expect(calls[0].url).toBe('https://oauth2.googleapis.com/token')
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: '1//rt', client_id: 'g-id', client_secret: 'g-secret' })
    expect(headersOf(calls[0].init)).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' })
  })

  test('only a JSON invalid_grant is unrecoverable', async () => {
    expect(await refreshGoogleToken('rt', client, { fetch: scriptedFetch(() => text('{"error":"invalid_grant"}', 400)).fetch })).toEqual(dead('invalid_grant'))
    expect(await refreshGoogleToken('rt', client, { fetch: scriptedFetch(() => text('{"error":"unauthorized_client"}', 401)).fetch })).toBeNull()
    expect(await refreshGoogleToken('rt', client, { fetch: scriptedFetch(() => text('invalid_grant', 400)).fetch })).toBeNull()
    const rotated = scriptedFetch(() => json({ access_token: 'a', refresh_token: '1//new' }))
    expect(await refreshGoogleToken('rt', client, { fetch: rotated.fetch })).toMatchObject({ refreshToken: '1//new' })
  })
})

describe('GitLab Duo', () => {
  const config = gitlabDuoOAuthConfig({ THYROX_GITLAB_DUO_OAUTH_CLIENT_ID: 'gl-client' })

  test('the instance and client of the connection win; the refresh needs no verifier', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'glat', refresh_token: 'glrt2', expires_in: 7200 }))
    expect(await refreshGitLabDuoToken('glrt', { baseUrl: ' https://gitlab.acme/ ', clientId: 'own-client' }, { config, fetch })).toEqual({ accessToken: 'glat', refreshToken: 'glrt2', expiresIn: 7200 })
    expect(calls[0].url).toBe('https://gitlab.acme/oauth/token')
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'glrt', client_id: 'own-client' })
  })

  test('without connection data the configured instance and client are used', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'glat' }))
    expect(await refreshGitLabDuoToken('glrt', null, { config, fetch })).toMatchObject({ refreshToken: 'glrt' })
    expect(calls[0].url).toBe('https://gitlab.com/oauth/token')
    expect(form(calls[0].init).client_id).toBe('gl-client')
  })

  test('no token is not attempted; dead codes are unrecoverable; the rest is null', async () => {
    const { fetch, calls } = scriptedFetch(() => json({}))
    expect(await refreshGitLabDuoToken('', null, { config, fetch })).toBeNull()
    expect(calls).toHaveLength(0)
    expect(await refreshGitLabDuoToken('rt', null, { config, fetch: scriptedFetch(() => text('{"error":"invalid_request"}', 400)).fetch })).toEqual(dead('invalid_request'))
    expect(await refreshGitLabDuoToken('rt', null, { config, fetch: scriptedFetch(() => text('{"error":"invalid_grant"}', 400)).fetch })).toEqual(dead('invalid_grant'))
    expect(await refreshGitLabDuoToken('rt', null, { config, fetch: scriptedFetch(() => text('<html>', 502)).fetch })).toBeNull()
    expect(await refreshGitLabDuoToken('rt', null, { config, fetch: offline })).toBeNull()
  })
})

describe('Qoder', () => {
  const env = { THYROX_QODER_OAUTH_AUTHORIZE_URL: 'https://q/a', THYROX_QODER_OAUTH_TOKEN_URL: 'https://q/token', THYROX_QODER_OAUTH_USERINFO_URL: 'https://q/me', THYROX_QODER_OAUTH_CLIENT_ID: 'q-id', THYROX_QODER_OAUTH_CLIENT_SECRET: 'q-secret' }

  test('the refresh authenticates the client with Basic and in the form', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ access_token: 'qa', refresh_token: 'qr2', expires_in: 60 }))
    expect(await refreshQoderToken('qr', { config: qoderOAuthConfig(env), fetch })).toEqual({ accessToken: 'qa', refreshToken: 'qr2', expiresIn: 60 })
    expect(calls[0].url).toBe('https://q/token')
    expect(headersOf(calls[0].init)).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', Authorization: `Basic ${btoa('q-id:q-secret')}` })
    expect(form(calls[0].init)).toEqual({ grant_type: 'refresh_token', refresh_token: 'qr', client_id: 'q-id', client_secret: 'q-secret' })
  })

  test('without the token URL, client or secret the refresh is skipped', async () => {
    for (const missing of ['THYROX_QODER_OAUTH_TOKEN_URL', 'THYROX_QODER_OAUTH_CLIENT_ID', 'THYROX_QODER_OAUTH_CLIENT_SECRET']) {
      const { fetch, calls } = scriptedFetch(() => json({}))
      const { log, lines } = recordingLog()
      expect(await refreshQoderToken('qr', { config: qoderOAuthConfig({ ...env, [missing]: '' }), fetch, log })).toBeNull()
      expect(calls).toHaveLength(0)
      expect(lines.some(line => line.startsWith('warn'))).toBe(true)
    }
  })

  test('a dead token is unrecoverable; the rest is null', async () => {
    expect(await refreshQoderToken('qr', { config: qoderOAuthConfig(env), fetch: scriptedFetch(() => text('{"error":"invalid_grant"}', 400)).fetch })).toEqual(dead('invalid_grant'))
    expect(await refreshQoderToken('qr', { config: qoderOAuthConfig(env), fetch: scriptedFetch(() => text('x', 500)).fetch })).toBeNull()
  })
})

describe('Cline', () => {
  const NOW = Date.parse('2026-09-28T10:00:00.000Z')

  test('the refresh is JSON and the lifetime comes from the declared expiry', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ data: { accessToken: 'ca', refreshToken: 'cr2', expiresAt: new Date(NOW + 90_500).toISOString() } }))
    expect(await refreshClineToken('cr', { fetch, now: () => NOW })).toEqual({ accessToken: 'ca', refreshToken: 'cr2', expiresIn: 90 })
    expect(calls[0].url).toBe('https://api.cline.bot/api/v1/auth/refresh')
    expect(headersOf(calls[0].init)).toEqual({ 'Content-Type': 'application/json', Accept: 'application/json' })
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ refreshToken: 'cr', grantType: 'refresh_token', clientType: 'extension' })
  })

  test('an unwrapped payload is read too; a past expiry still gives one second; no expiry gives none', async () => {
    expect(await refreshClineToken('cr', { fetch: scriptedFetch(() => json({ accessToken: 'ca', expiresAt: new Date(NOW - 5000).toISOString() })).fetch, now: () => NOW })).toEqual({ accessToken: 'ca', refreshToken: 'cr', expiresIn: 1 })
    expect(await refreshClineToken('cr', { fetch: scriptedFetch(() => json({ accessToken: 'ca' })).fetch, now: () => NOW })).toEqual({ accessToken: 'ca', refreshToken: 'cr', expiresIn: undefined })
  })

  test('a code inside the message is unrecoverable; the rest is null', async () => {
    expect(await refreshClineToken('cr', { fetch: scriptedFetch(() => text('{"error":"failed to refresh token: invalid_grant"}', 400)).fetch })).toEqual(dead('invalid_grant'))
    expect(await refreshClineToken('cr', { fetch: scriptedFetch(() => text('{"error":"expired_token"}', 400)).fetch })).toBeNull()
    expect(await refreshClineToken('cr', { fetch: offline })).toBeNull()
  })
})

describe('CodeBuddy CN', () => {
  test('the refresh token travels in a header, with the CLI identity', async () => {
    const { fetch, calls } = scriptedFetch(() => json({ code: 0, data: { accessToken: 'ba', refreshToken: 'br2', expiresIn: 86400 } }))
    expect(await refreshCodebuddyCnToken('br', { fetch })).toEqual({ accessToken: 'ba', refreshToken: 'br2', expiresIn: 86400 })
    expect(calls[0].url).toBe('https://copilot.tencent.com/v2/plugin/auth/token/refresh')
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.body).toBe('{}')
    expect(headersOf(calls[0].init)).toEqual({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'CLI/2.108.1 CodeBuddy/2.108.1',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Domain': 'copilot.tencent.com',
      'X-Refresh-Token': 'br',
      'X-Auth-Refresh-Source': 'plugin',
      'X-Product': 'SaaS',
    })
  })

  test('no token, a refusal, a non-zero code, no access token or the network give null', async () => {
    const { fetch, calls } = scriptedFetch(() => json({}))
    expect(await refreshCodebuddyCnToken('', { fetch })).toBeNull()
    expect(calls).toHaveLength(0)
    expect(await refreshCodebuddyCnToken('br', { fetch: scriptedFetch(() => json({ code: 0, data: { accessToken: 'ba' } }, 401)).fetch })).toBeNull()
    expect(await refreshCodebuddyCnToken('br', { fetch: scriptedFetch(() => json({ code: 7, data: { accessToken: 'ba' } })).fetch })).toBeNull()
    expect(await refreshCodebuddyCnToken('br', { fetch: scriptedFetch(() => json({ code: 0, data: {} })).fetch })).toBeNull()
    expect(await refreshCodebuddyCnToken('br', { fetch: offline })).toBeNull()
    expect(await refreshCodebuddyCnToken('br', { fetch: scriptedFetch(() => json({ code: 0, data: { accessToken: 'ba' } })).fetch })).toMatchObject({ refreshToken: 'br' })
  })
})
