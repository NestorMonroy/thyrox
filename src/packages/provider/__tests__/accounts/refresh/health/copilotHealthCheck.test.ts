/**
 * Copilot en el refresco proactivo. Una conexión de GitHub o GHE Copilot no
 * tiene refresh token: cada barrido valida su token de GitHub pidiendo el
 * subtoken de Copilot, lo renueva cuando está por caducar y la marca expirada
 * sólo si GitHub rechaza el token. Tras refrescar una conexión de GitHub con
 * refresh token, el subtoken se renueva también.
 *
 * Porte de la rama sin refresh token de `checkConnection` en
 * `omniroute: src/lib/tokenHealthCheck.ts` y de `src/lib/tokenHealthCheckCopilot.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createCopilotHealthChecks } from '../../../../src/accounts/refresh/health/copilotHealthCheck.ts'

const NOW_MS = Date.parse('2026-09-28T12:00:00.000Z')
const NOW = new Date(NOW_MS).toISOString()
const secondsFromNow = (minutes: number) => Math.floor((NOW_MS + minutes * 60_000) / 1000)

type Row = Record<string, unknown>

function setup(answer: (url: string) => Response | Promise<Response>, rows: Row[] = []) {
  const byId = new Map(rows.map(row => [row.id as string, row]))
  const updates: [string, Row][] = []
  const urls: string[] = []
  const authorizations: string[] = []
  const logs: string[] = []
  const checks = createCopilotHealthChecks({
    store: { getById: (id: string) => byId.get(id) ?? null, update: (id: string, data: Row) => void updates.push([id, data]) },
    fetch: (async (input: string | URL | Request, init: RequestInit = {}) => {
      urls.push(String(input))
      authorizations.push((init.headers as Record<string, string>)?.Authorization)
      return answer(String(input))
    }) as unknown as typeof globalThis.fetch,
    env: {},
    now: () => NOW_MS,
    log: { info: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`info ${m}`)), warn: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`warn ${m}`)), error: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`error ${m}`)) },
  })
  return { checks, updates, urls, authorizations, logs }
}

const copilot = (token = 'cop2', expiresAt = secondsFromNow(30)) => new Response(JSON.stringify({ token, expires_at: expiresAt }))
const github = (overrides: Row = {}) => ({ id: 'g', provider: 'github', accessToken: 'gho', providerSpecificData: { tier: 'pro' }, ...overrides })

describe('a Copilot connection without a refresh token', () => {
  test('a sub-token about to expire is renewed and the connection stays active', async () => {
    const { checks, updates, urls, logs } = setup(() => copilot())
    await checks.githubCopilot(github({ providerSpecificData: { tier: 'pro', copilotToken: 'cop1', copilotTokenExpiresAt: secondsFromNow(2), expiredRetry: { count: 1 } } }), NOW)
    expect(urls).toEqual(['https://api.github.com/copilot_internal/v2/token'])
    expect(updates).toEqual([['g', { lastHealthCheckAt: NOW, testStatus: 'active', lastError: null, lastErrorAt: null, lastErrorType: null, lastErrorSource: null, errorCode: null, providerSpecificData: { tier: 'pro', copilotToken: 'cop2', copilotTokenExpiresAt: secondsFromNow(30) } }]])
    expect(logs).toEqual(['info github/g Copilot token refreshed (no refresh token; connection stays active)'])
  })

  test('a fresh sub-token is only validated, silently', async () => {
    const { checks, updates, logs } = setup(() => copilot())
    await checks.githubCopilot(github({ providerSpecificData: { copilotToken: 'cop1', copilotTokenExpiresAt: secondsFromNow(20) } }), NOW)
    expect(updates).toEqual([['g', { lastHealthCheckAt: NOW, testStatus: 'active', lastError: null, lastErrorAt: null, lastErrorType: null, lastErrorSource: null, errorCode: null, providerSpecificData: { copilotToken: 'cop1', copilotTokenExpiresAt: secondsFromNow(20) } }]])
    expect(logs).toEqual([])
  })

  test('a missing or blank sub-token is renewed even with a far expiry', async () => {
    for (const copilotToken of [undefined, '   ']) {
      const { checks, updates } = setup(() => copilot())
      await checks.githubCopilot(github({ providerSpecificData: { copilotToken, copilotTokenExpiresAt: secondsFromNow(20) } }), NOW)
      expect(updates[0][1].providerSpecificData).toMatchObject({ copilotToken: 'cop2' })
    }
  })

  test('a failed renewal is recorded without leaving the connection', async () => {
    const { checks, updates, logs } = setup(() => new Response('busy', { status: 503 }))
    await checks.githubCopilot(github(), NOW)
    expect(updates[0][1]).toMatchObject({ testStatus: 'active', lastError: 'Health check: Copilot token refresh failed', lastErrorAt: NOW, lastErrorType: 'token_refresh_failed', lastErrorSource: 'oauth', errorCode: 'refresh_failed' })
    expect(logs.at(-1)).toBe('warn github/g Copilot token refresh FAILED (no refresh token; connection stays active)')
  })

  test('GitHub rejecting the access token expires the connection', async () => {
    const { checks, updates } = setup(() => new Response('bad', { status: 401 }))
    await checks.githubCopilot(github(), NOW)
    expect(updates).toEqual([['g', { testStatus: 'expired', lastHealthCheckAt: NOW, lastError: 'GitHub rejected the access token', lastErrorAt: NOW, lastErrorType: 'github_access_token_invalid', lastErrorSource: 'oauth', errorCode: 'github_access_token_invalid' }]])
  })

  test('an enterprise connection asks its own host', async () => {
    const { checks, urls } = setup(() => copilot())
    await checks.githubCopilot(github({ provider: 'ghe-copilot', providerSpecificData: { gheUrl: 'https://ghe.acme.test/' } }), NOW)
    expect(urls).toEqual(['https://ghe.acme.test/api/v3/copilot_internal/v2/token'])
  })

  test('another state is only stamped, with the renewed sub-token if any', async () => {
    const { checks, updates } = setup(() => copilot())
    await checks.githubCopilot(github({ testStatus: 'unavailable' }), NOW)
    expect(updates).toEqual([['g', { lastHealthCheckAt: NOW, providerSpecificData: { tier: 'pro', copilotToken: 'cop2', copilotTokenExpiresAt: secondsFromNow(30) } }]])
    const failed = setup(() => new Response('busy', { status: 503 }))
    await failed.checks.githubCopilot(github({ testStatus: 'unavailable' }), NOW)
    expect(failed.updates).toEqual([['g', { lastHealthCheckAt: NOW }]])
  })

  test('an expired no-refresh-token connection is healed', async () => {
    const { checks, updates } = setup(() => copilot())
    await checks.githubCopilot(github({ testStatus: 'expired', errorCode: 'no_refresh_token' }), NOW)
    expect(updates[0][1]).toMatchObject({ testStatus: 'active', errorCode: null })
  })
})

describe('the Copilot sub-token after a GitHub refresh', () => {
  test('is renewed with the new access token when about to expire, over the latest row', async () => {
    const latest = github({ providerSpecificData: { tier: 'team', copilotTokenExpiresAt: secondsFromNow(1) } })
    const { checks, updates, urls, authorizations, logs } = setup(() => copilot('cop9'), [latest])
    await checks.copilotSubToken(github(), { accessToken: 'gho-new' })
    expect(urls).toEqual(['https://api.github.com/copilot_internal/v2/token'])
    expect(authorizations).toEqual(['token gho-new'])
    expect(updates).toEqual([['g', { providerSpecificData: { tier: 'team', copilotTokenExpiresAt: secondsFromNow(30), copilotToken: 'cop9' } }]])
    expect(logs).toEqual(['info Refreshing GitHub Copilot sub-token for github/g', 'info GitHub Copilot sub-token refreshed for github/g'])
  })

  test('a sub-token with time left, or no token at all, is left alone', async () => {
    const fresh = setup(() => copilot(), [github({ providerSpecificData: { copilotTokenExpiresAt: secondsFromNow(20) } })])
    await fresh.checks.copilotSubToken(github(), { accessToken: 'gho-new' })
    expect(fresh.urls).toEqual([])
    const none = setup(() => copilot(), [github({ accessToken: undefined })])
    await none.checks.copilotSubToken(github({ accessToken: undefined }), { accessToken: '' })
    expect(none.urls).toEqual([])
  })

  test('the expiry falls back to the connection given, and accepts milliseconds and dates', async () => {
    for (const copilotTokenExpiresAt of [NOW_MS + 20 * 60_000, new Date(NOW_MS + 20 * 60_000).toISOString()]) {
      const { checks, urls } = setup(() => copilot(), [github({ providerSpecificData: {} })])
      await checks.copilotSubToken(github({ providerSpecificData: { copilotTokenExpiresAt } }), { accessToken: 'x' })
      expect(urls).toEqual([])
    }
  })

  test('a failed renewal is warned; an error is logged', async () => {
    const failed = setup(() => new Response('busy', { status: 503 }), [github()])
    await failed.checks.copilotSubToken(github(), { accessToken: 'x' })
    expect(failed.updates).toEqual([])
    expect(failed.logs.at(-1)).toBe('warn GitHub Copilot sub-token refresh failed for github/g')
    const broken = setup(() => copilot(), [github()])
    const throwing = createCopilotHealthChecks({ store: { getById: () => { throw new Error('locked') }, update: () => { throw new Error('disk full') } }, fetch: (async () => copilot()) as unknown as typeof globalThis.fetch, env: {}, now: () => NOW_MS, log: { info: () => {}, error: (_t, m) => void broken.logs.push(`error ${m}`) } })
    await throwing.copilotSubToken(github(), { accessToken: 'x' })
    expect(broken.logs.at(-1)).toBe('error Error refreshing Copilot sub-token: disk full')
  })
})
