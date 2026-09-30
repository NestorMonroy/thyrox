/**
 * Qué hace el refresco proactivo con cada conexión antes de llamar a nadie:
 * saltarla, marcarla, pasarla a la comprobación de su proveedor o
 * refrescarla, y con qué motivo. Y cómo se escribe lo que vuelve: un
 * refresco que funcionó, un token muerto o un fallo de red.
 *
 * Porte de la decisión de `checkConnection` en
 * `omniroute: src/lib/tokenHealthCheck.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { isTransientRefreshError, planConnectionCheck, refreshedConnectionUpdate, unrecoverableRefreshOutcome } from '../../../../src/accounts/refresh/health/checkPlan.ts'

const NOW_MS = Date.parse('2026-09-28T12:00:00.000Z')
const iso = (minutes: number) => new Date(NOW_MS + minutes * 60_000).toISOString()

const context = (overrides: Partial<Parameters<typeof planConnectionCheck>[1]> = {}) => ({
  nowMs: NOW_MS,
  skipProviders: new Set<string>(),
  supportsTokenRefresh: (provider: string) => !['devin-cli', 'mystery'].includes(provider),
  isWebCookieProvider: (provider: string) => provider === 'chatgpt-web',
  ...overrides,
})

const oauth = (overrides: Record<string, unknown> = {}) => ({ id: 'c-1', provider: 'kiro', isActive: true, refreshToken: 'rt', accessToken: 'at', ...overrides })
const plan = (connection: Record<string, unknown>, overrides = {}) => planConnectionCheck(connection, context(overrides))
/** El `update` de una decisión o de un resultado que lo lleva. */
const updateOf = (outcome: object) => (outcome as { update: Record<string, unknown> }).update

describe('connections that are not checked', () => {
  test('no id, a skipped provider, a disabled interval, or an inactive connection', () => {
    expect(plan({ provider: 'kiro', isActive: true, refreshToken: 'rt', expiresAt: iso(1) })).toEqual({ action: 'skip' })
    expect(plan(oauth({ provider: 'Codex', expiresAt: iso(1) }), { skipProviders: new Set(['codex']) })).toEqual({ action: 'skip' })
    for (const healthCheckInterval of [0, -1]) expect(plan(oauth({ healthCheckInterval, expiresAt: iso(1) }))).toEqual({ action: 'skip' })
    expect(plan(oauth({ isActive: false, expiresAt: iso(1) }))).toEqual({ action: 'skip' })
  })

  test('an inactive expired connection is still checked while it has retries left', () => {
    expect(plan(oauth({ isActive: false, testStatus: 'expired', expiresAt: iso(1) }))).toMatchObject({ action: 'refresh', retryAttempt: 1 })
    expect(plan(oauth({ isActive: false, testStatus: 'expired', providerSpecificData: { expiredRetry: { count: 3 } } }))).toEqual({ action: 'skip' })
  })

  test('banned or expired connections are terminal, except the recoverable ones', () => {
    expect(plan(oauth({ testStatus: 'BANNED', expiresAt: iso(1) }))).toEqual({ action: 'skip' })
    expect(plan(oauth({ testStatus: 'expired', lastErrorType: 'account_deactivated', expiresAt: iso(1) }))).toEqual({ action: 'skip' })
    expect(plan(oauth({ testStatus: 'expired', providerSpecificData: { expiredRetry: { count: 3 } } }))).toEqual({ action: 'skip' })
    expect(plan({ id: 'g', provider: 'github', isActive: true, accessToken: 'gho', testStatus: 'expired', errorCode: 'no_refresh_token', providerSpecificData: { expiredRetry: { count: 3 } } })).toEqual({ action: 'github-copilot' })
    expect(plan({ id: 'k', provider: 'cursor', isActive: true, accessToken: 'at', testStatus: 'expired', providerSpecificData: { expiredRetry: { count: 3 } } })).toEqual({ action: 'cursor' })
  })
})

describe('deprecated providers', () => {
  test('are marked expired once, naming where to migrate', () => {
    const result = plan(oauth({ provider: 'gemini-cli' }))
    expect(result).toMatchObject({ action: 'mark', update: { testStatus: 'expired', lastErrorType: 'provider_deprecated', errorCode: 'provider_deprecated', lastErrorSource: 'oauth', lastHealthCheckAt: new Date(NOW_MS).toISOString() } })
    expect(updateOf(result).lastError).toContain('`gemini` provider')
  })
})

describe('providers with their own check', () => {
  test('cursor is renewed only when its token is unknown or about to expire, and not in backoff', () => {
    expect(plan({ id: 'k', provider: 'cursor', isActive: true, accessToken: 'at', expiresAt: iso(4) })).toEqual({ action: 'cursor' })
    expect(plan({ id: 'k', provider: 'cursor', isActive: true, accessToken: 'at' })).toEqual({ action: 'cursor' })
    expect(plan({ id: 'k', provider: 'cursor', isActive: true, accessToken: 'at', expiresAt: iso(6) })).toEqual({ action: 'skip' })
    expect(plan({ id: 'k', provider: 'cursor', isActive: true, expiresAt: iso(4), providerSpecificData: { refreshCircuit: { until: iso(1) } } })).toEqual({ action: 'skip' })
  })

  test('Kimi web, web cookies and Copilot go to their own checks', () => {
    for (const provider of ['kimi-web', 'KIMI_WEB']) expect(plan({ id: 'w', provider, isActive: true })).toEqual({ action: 'kimi-web' })
    expect(plan({ id: 'w', provider: 'chatgpt-web', isActive: true, healthCheckInterval: 30 })).toEqual({ action: 'web-cookie', intervalMin: 30 })
    expect(plan({ id: 'g', provider: 'ghe-copilot', isActive: true, accessToken: 'gho' })).toEqual({ action: 'github-copilot' })
  })
})

describe('connections without a refresh token', () => {
  test('a refreshable provider needs re-authentication', () => {
    for (const testStatus of [undefined, 'active']) expect(plan({ id: 'a', provider: 'antigravity', isActive: true, testStatus })).toMatchObject({ action: 'mark', update: { testStatus: 'expired', errorCode: 'no_refresh_token', lastErrorType: 'no_refresh_token', lastError: 'No refresh token available — re-authenticate this account.' } })
  })

  test('an API key, a provider without refresh, or another state is left alone', () => {
    expect(plan({ id: 'a', provider: 'antigravity', isActive: true, apiKey: 'k' })).toEqual({ action: 'skip' })
    expect(plan({ id: 'a', provider: 'devin-cli', isActive: true })).toEqual({ action: 'skip' })
    expect(plan({ id: 'a', provider: 'antigravity', isActive: true, testStatus: 'unavailable' })).toEqual({ action: 'skip' })
    expect(plan({ id: 'a', provider: 'antigravity', isActive: true, refreshToken: 7 })).toMatchObject({ action: 'mark' })
  })
})

describe('expired connections with retries left', () => {
  test('wait five minutes doubled per retry, then retry; exhausted ones are deactivated once', () => {
    const expired = (count: number, minutesAgo: number, extra = {}) => oauth({ testStatus: 'expired', providerSpecificData: { expiredRetry: { count, at: iso(-minutesAgo) } }, expiresAt: iso(1), ...extra })
    expect(plan(expired(0, 4))).toEqual({ action: 'skip' })
    expect(plan(expired(0, 5))).toMatchObject({ action: 'refresh', retryAttempt: 1 })
    expect(plan(expired(2, 19))).toEqual({ action: 'skip' })
    expect(plan(expired(2, 20))).toMatchObject({ action: 'refresh', retryAttempt: 3 })
    expect(plan({ id: 'g', provider: 'github', isActive: true, accessToken: 'gho', refreshToken: 'rt', testStatus: 'expired', errorCode: 'no_refresh_token', providerSpecificData: { expiredRetry: { count: 3 } } })).toEqual({ action: 'deactivate' })
  })
})

describe('when a refresh is due', () => {
  test('a provider without a refresh route is only stamped', () => {
    expect(plan(oauth({ provider: 'mystery' }))).toEqual({ action: 'touch' })
  })

  test('a token about to expire is refreshed; one with time left waits', () => {
    expect(plan(oauth({ expiresAt: iso(4) }))).toEqual({ action: 'refresh', reason: 'token expiring soon' })
    expect(plan(oauth({ tokenExpiresAt: iso(4), expiresAt: iso(600) }))).toEqual({ action: 'refresh', reason: 'token expiring soon' })
    expect(plan(oauth({ expiresAt: iso(6) }))).toEqual({ action: 'skip' })
  })

  test('without a known expiry, non-rotating providers refresh on their interval; rotating ones never do', () => {
    expect(plan(oauth({ provider: 'antigravity', lastHealthCheckAt: iso(-61) }))).toEqual({ action: 'refresh', reason: 'interval: 60min' })
    expect(plan(oauth({ provider: 'antigravity', lastHealthCheckAt: iso(-59) }))).toEqual({ action: 'skip' })
    expect(plan(oauth({ provider: 'antigravity', healthCheckInterval: 10, lastHealthCheckAt: iso(-11) }))).toEqual({ action: 'refresh', reason: 'interval: 10min' })
    expect(plan(oauth({ provider: 'kiro', lastHealthCheckAt: iso(-600) }))).toEqual({ action: 'skip' })
    expect(plan(oauth({ provider: 'antigravity', expiresAt: iso(600), lastHealthCheckAt: iso(-600) }))).toEqual({ action: 'skip' })
  })

  test('an open circuit postpones a due refresh', () => {
    expect(plan(oauth({ expiresAt: iso(1), providerSpecificData: { refreshCircuit: { until: iso(3) } } }))).toEqual({ action: 'skip' })
  })
})

describe('network errors', () => {
  test('aborts, timeouts and socket codes are transient, also when wrapped', () => {
    const named = (name: string) => Object.assign(new Error('x'), { name })
    for (const error of [named('AbortError'), named('TimeoutError'), new Error('fetch failed'), new Error('socket hang up'), Object.assign(new Error('boom'), { code: 'ECONNRESET' }), Object.assign(new Error('boom'), { cause: Object.assign(new Error('getaddrinfo EAI_AGAIN host'), { code: 'EAI_AGAIN' }) }), Object.assign(new Error('boom'), { cause: new Error('socket hang up') }), { name: 'TimeoutError' }]) expect(isTransientRefreshError(error)).toBe(true)
  })

  test('anything else is permanent', () => {
    for (const error of [new Error('SQLITE_BUSY'), new TypeError('x is undefined'), 'ECONNRESET as text only?', null, { code: 'EPERM' }]) expect({ error: String(error), transient: isTransientRefreshError(error) }).toEqual({ error: String(error), transient: error === 'ECONNRESET as text only?' })
  })
})

describe('a successful refresh', () => {
  const now = new Date(NOW_MS).toISOString()

  test('stores the new tokens, clears errors and the circuit, and derives the expiry', () => {
    const connection = { providerSpecificData: { tier: 'free', refreshCircuit: { streak: 2 }, expiredRetry: { count: 1 } } }
    expect(refreshedConnectionUpdate(connection, { accessToken: 'at2', refreshToken: 'rt2', expiresIn: 3600 }, NOW_MS)).toEqual({
      accessToken: 'at2',
      refreshToken: 'rt2',
      lastHealthCheckAt: now,
      testStatus: 'active',
      lastError: null,
      lastErrorAt: null,
      lastErrorType: null,
      lastErrorSource: null,
      errorCode: null,
      expiresAt: iso(60),
      tokenExpiresAt: iso(60),
      providerSpecificData: { tier: 'free' },
    })
  })

  test('an explicit expiry wins, no refresh token keeps the stored one, and new data is merged', () => {
    const update = refreshedConnectionUpdate({ providerSpecificData: { tier: 'free' } }, { accessToken: 'at2', expiresAt: iso(30), expiresIn: 3600, providerSpecificData: { projectId: 'p' } }, NOW_MS)
    expect(update).toMatchObject({ expiresAt: iso(30), tokenExpiresAt: iso(30), providerSpecificData: { tier: 'free', projectId: 'p' } })
    expect('refreshToken' in update).toBe(false)
    expect('providerSpecificData' in refreshedConnectionUpdate({ providerSpecificData: { tier: 'free' } }, { accessToken: 'at2' }, NOW_MS)).toBe(false)
  })
})

describe('a dead refresh token', () => {
  const dead = { error: 'unrecoverable_refresh_error', code: 'invalid_grant' }
  const now = new Date(NOW_MS).toISOString()
  const attempted = { refreshToken: 'rt', accessToken: 'at' }

  test('is ignored when the stored credentials changed during the refresh', () => {
    expect(unrecoverableRefreshOutcome(oauth(), dead, { refreshToken: 'rt-new', accessToken: 'at' }, attempted, NOW_MS)).toEqual({ kind: 'changed', update: { lastHealthCheckAt: now } })
    expect(unrecoverableRefreshOutcome(oauth(), dead, { refreshToken: 'rt', accessToken: 'at-new' }, attempted, NOW_MS)).toMatchObject({ kind: 'changed' })
  })

  test('keeps the connection active while its access token still works', () => {
    expect(unrecoverableRefreshOutcome(oauth({ expiresAt: iso(10) }), dead, null, attempted, NOW_MS)).toEqual({
      kind: 'still-valid',
      update: { lastHealthCheckAt: now, testStatus: 'active', lastError: 'Health check refresh failed (unrecoverable_refresh_error). Re-authenticate before the current access token expires.', lastErrorAt: now, lastErrorType: 'unrecoverable_refresh_error', lastErrorSource: 'oauth', errorCode: 'unrecoverable_refresh_error' },
    })
  })

  test('otherwise expires the connection, counts the retry and drops a consumed rotating token', () => {
    const result = unrecoverableRefreshOutcome(oauth({ provider: 'codex', providerSpecificData: { tier: 'free' } }), dead, attempted, attempted, NOW_MS)
    expect(result).toEqual({
      kind: 'expired',
      exhausted: false,
      retry: 1,
      update: { lastHealthCheckAt: now, testStatus: 'expired', lastError: 'Refresh token consumed (invalid_grant). Please re-authenticate this account.', lastErrorAt: now, lastErrorType: 'unrecoverable_refresh_error', lastErrorSource: 'oauth', errorCode: 'invalid_grant', providerSpecificData: { tier: 'free', expiredRetry: { count: 1, at: now } }, refreshToken: null },
    })
  })

  test('a non-rotating or Anthropic token is kept; the third retry deactivates', () => {
    const google = unrecoverableRefreshOutcome(oauth({ provider: 'antigravity', providerSpecificData: { expiredRetry: { count: 2 } } }), { error: 'unrecoverable_refresh_error' }, null, attempted, NOW_MS)
    expect(google).toMatchObject({ kind: 'expired', exhausted: true, retry: 3, update: { isActive: false, errorCode: 'unrecoverable_refresh_error', lastError: 'Refresh token rejected (unrecoverable_refresh_error). Please re-authenticate this account.' } })
    expect('refreshToken' in updateOf(google)).toBe(false)
    const anthropic = unrecoverableRefreshOutcome(oauth({ provider: 'claude' }), dead, null, attempted, NOW_MS)
    expect('refreshToken' in updateOf(anthropic)).toBe(false)
    expect(updateOf(anthropic).lastError).toContain('consumed')
  })
})
