/**
 * El estado que el refresco proactivo guarda en cada conexión: cuándo caduca
 * su token, cuántas veces se reintentó una conexión expirada, y el circuito
 * que espacia los reintentos tras un fallo — exponencial si el fallo se
 * repite, plano y corto si fue de red.
 *
 * Porte de `omniroute: src/lib/tokenRefreshCircuit.ts` y de las funciones de
 * estado de `src/lib/tokenHealthCheck.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import {
  canClearGithubNoRefreshTokenState,
  copilotTokenBaseUrl,
  effectiveTokenExpiryMs,
  expiredRetryAt,
  expiredRetryCount,
  isGithubAccessTokenOnlyConnection,
  parseTokenExpiryMs,
  withClearedExpiredRetry,
  withExpiredRetry,
} from '../../../../src/accounts/refresh/health/connectionExpiry.ts'
import {
  buildRefreshFailureUpdate,
  buildTransientRefreshRetryUpdate,
  clearRefreshCircuit,
  isInRefreshBackoff,
  preservesRefreshTokenOnUnrecoverable,
  refreshBackoffUntil,
  shouldNullRefreshTokenAfterUnrecoverable,
} from '../../../../src/accounts/refresh/health/refreshCircuit.ts'

const NOW = '2026-09-28T12:00:00.000Z'
const NOW_MS = Date.parse(NOW)
const plusMinutes = (minutes: number) => new Date(NOW_MS + minutes * 60_000).toISOString()

describe('token expiry', () => {
  test('epoch seconds and milliseconds, as numbers or text, and ISO dates', () => {
    expect(parseTokenExpiryMs(1_789_012_345)).toBe(1_789_012_345_000)
    expect(parseTokenExpiryMs(1_789_012_345_678)).toBe(1_789_012_345_678)
    expect(parseTokenExpiryMs('1789012345')).toBe(1_789_012_345_000)
    expect(parseTokenExpiryMs(' 1789012345678 ')).toBe(1_789_012_345_678)
    expect(parseTokenExpiryMs('1789012345.5')).toBe(1_789_012_345_500)
    expect(parseTokenExpiryMs(NOW)).toBe(NOW_MS)
  })

  test('anything without a usable time is zero', () => {
    for (const value of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, '', '   ', '0', 'not a date', null, undefined, {}]) expect(parseTokenExpiryMs(value)).toBe(0)
  })

  test('the token expiry wins over the connection expiry', () => {
    expect(effectiveTokenExpiryMs({ tokenExpiresAt: NOW, expiresAt: plusMinutes(60) })).toBe(NOW_MS)
    expect(effectiveTokenExpiryMs({ expiresAt: NOW })).toBe(NOW_MS)
    expect(effectiveTokenExpiryMs(null)).toBe(0)
  })
})

describe('expired retries', () => {
  test('the count and time live in the connection data, with the old columns as fallback', () => {
    expect(expiredRetryCount({ providerSpecificData: { expiredRetry: { count: 2, at: NOW } }, expiredRetryCount: 9 })).toBe(2)
    expect(expiredRetryCount({ expiredRetryCount: 1 })).toBe(1)
    expect(expiredRetryCount({})).toBe(0)
    expect(expiredRetryAt({ providerSpecificData: { expiredRetry: { count: 2, at: NOW } }, expiredRetryAt: 'old-column' })).toBe(NOW)
    expect(expiredRetryAt({ expiredRetryAt: 'x' })).toBe('x')
    expect(expiredRetryAt({})).toBeNull()
  })

  test('setting and clearing the retry keeps the rest of the data', () => {
    expect(withExpiredRetry({ tier: 'free' }, 3, NOW)).toEqual({ tier: 'free', expiredRetry: { count: 3, at: NOW } })
    const data = { tier: 'free', expiredRetry: { count: 1, at: NOW } }
    expect(withClearedExpiredRetry(data)).toEqual({ tier: 'free' })
    expect(data).toEqual({ tier: 'free', expiredRetry: { count: 1, at: NOW } })
  })
})

describe('GitHub Copilot connections', () => {
  test('github and ghe-copilot with an access token have no refresh token by design', () => {
    expect(isGithubAccessTokenOnlyConnection({ provider: 'github', accessToken: 'gho' })).toBe(true)
    expect(isGithubAccessTokenOnlyConnection({ provider: 'GHE-Copilot', accessToken: 'gho' })).toBe(true)
    for (const connection of [{ provider: 'github', accessToken: '  ' }, { provider: 'github' }, { provider: 'codex', accessToken: 'x' }]) expect(isGithubAccessTokenOnlyConnection(connection)).toBe(false)
  })

  test('the Copilot token comes from the enterprise host for ghe-copilot', () => {
    expect(copilotTokenBaseUrl({ provider: 'ghe-copilot', providerSpecificData: { gheUrl: 'https://ghe.acme.test//' } })).toBe('https://ghe.acme.test/api/v3')
    expect(copilotTokenBaseUrl({ provider: 'ghe-copilot', providerSpecificData: { gheUrl: '  ' } })).toBe('https://api.github.com')
    expect(copilotTokenBaseUrl({ provider: 'github', providerSpecificData: { gheUrl: 'https://ghe.acme.test' } })).toBe('https://api.github.com')
  })

  test('only an active, untested or no-refresh-token state may be cleared', () => {
    expect(canClearGithubNoRefreshTokenState({})).toBe(true)
    expect(canClearGithubNoRefreshTokenState({ testStatus: 'active' })).toBe(true)
    expect(canClearGithubNoRefreshTokenState({ testStatus: 'expired', errorCode: 'no_refresh_token' })).toBe(true)
    expect(canClearGithubNoRefreshTokenState({ testStatus: 'expired', errorCode: 'refresh_failed' })).toBe(false)
    expect(canClearGithubNoRefreshTokenState({ testStatus: 'error' })).toBe(false)
  })
})

describe('refresh circuit', () => {
  test('the backoff doubles from five minutes and stops at four hours', () => {
    expect([0, 1, 2, 3, 6, 7, 20].map(streak => refreshBackoffUntil(streak, NOW))).toEqual([5, 5, 10, 20, 160, 240, 240].map(plusMinutes))
  })

  test('a connection is in backoff only while a valid window is still open', () => {
    expect(isInRefreshBackoff({ providerSpecificData: { refreshCircuit: { until: plusMinutes(1) } } }, NOW_MS)).toBe(true)
    for (const until of [NOW, plusMinutes(-1), 'garbage', 42, NOW_MS + 60_000, undefined]) expect(isInRefreshBackoff({ providerSpecificData: { refreshCircuit: { until } } }, NOW_MS)).toBe(false)
    expect(isInRefreshBackoff(null, NOW_MS)).toBe(false)
  })

  test('a failed refresh keeps an active connection active and opens the circuit', () => {
    const update = buildRefreshFailureUpdate({ testStatus: 'active', providerSpecificData: { tier: 'free', refreshCircuit: { streak: 2 } } }, NOW)
    expect(update).toEqual({
      lastHealthCheckAt: NOW,
      testStatus: 'active',
      lastError: 'Health check: token refresh failed',
      lastErrorAt: NOW,
      lastErrorType: 'token_refresh_failed',
      lastErrorSource: 'oauth',
      errorCode: 'refresh_failed',
      providerSpecificData: { tier: 'free', refreshCircuit: { streak: 3, until: plusMinutes(20), lastFailAt: NOW } },
    })
  })

  test('an expired connection stays expired and counts the retry; overrides win', () => {
    const update = buildRefreshFailureUpdate({ testStatus: 'expired', providerSpecificData: { expiredRetry: { count: 1, at: 'x' } } }, NOW, { errorCode: 'invalid_grant', testStatus: 'error' })
    expect(update).toMatchObject({ testStatus: 'error', errorCode: 'invalid_grant', expiredRetryCount: 2, expiredRetryAt: NOW, providerSpecificData: { expiredRetry: { count: 2, at: NOW }, refreshCircuit: { streak: 1, until: plusMinutes(5) } } })
  })

  test('a transient failure retries in two minutes without growing the streak', () => {
    const update = buildTransientRefreshRetryUpdate({ testStatus: 'active', providerSpecificData: { refreshCircuit: { streak: 4, until: plusMinutes(1) } } }, NOW)
    expect(update).toEqual({
      lastHealthCheckAt: NOW,
      testStatus: 'active',
      lastError: 'Health check: token refresh transient error (network/timeout)',
      lastErrorAt: NOW,
      lastErrorType: 'token_refresh_transient',
      lastErrorSource: 'oauth',
      errorCode: 'refresh_transient',
      providerSpecificData: { refreshCircuit: { streak: 4, until: plusMinutes(2), lastFailAt: NOW, transient: true } },
    })
  })

  test('a transient failure keeps a longer backoff already in place, and ignores a malformed one', () => {
    const longer = buildTransientRefreshRetryUpdate({ testStatus: 'expired', providerSpecificData: { refreshCircuit: { streak: 5, until: plusMinutes(80) } } }, NOW)
    expect(longer.providerSpecificData.refreshCircuit).toEqual({ streak: 5, until: plusMinutes(80), lastFailAt: NOW, transient: false })
    expect(longer).toMatchObject({ testStatus: 'expired', expiredRetryCount: 1, expiredRetryAt: NOW })
    const malformed = buildTransientRefreshRetryUpdate({ providerSpecificData: { refreshCircuit: { until: 'garbage' } } }, NOW)
    expect(malformed.providerSpecificData.refreshCircuit).toEqual({ streak: 0, until: plusMinutes(2), lastFailAt: NOW, transient: true })
  })

  test('a successful refresh clears the circuit and the retries, and nothing else', () => {
    expect(clearRefreshCircuit({ tier: 'free', refreshCircuit: {}, expiredRetry: {} })).toEqual({ tier: 'free' })
    expect(clearRefreshCircuit({ tier: 'free', expiredRetry: {} })).toEqual({ tier: 'free' })
    expect(clearRefreshCircuit({ tier: 'free' })).toBeUndefined()
    expect(clearRefreshCircuit(null)).toBeUndefined()
  })

  test('rotating providers drop a dead refresh token, except Anthropic, which keeps it for the retries', () => {
    for (const provider of ['codex', 'openai', 'kimi-coding', 'cline', 'kiro', 'amazon-q', 'gitlab-duo', 'openference', 'Codex']) expect(shouldNullRefreshTokenAfterUnrecoverable(provider)).toBe(true)
    for (const provider of ['claude', 'antigravity', 'github', '', null]) expect(shouldNullRefreshTokenAfterUnrecoverable(provider)).toBe(false)
    expect(preservesRefreshTokenOnUnrecoverable('CLAUDE')).toBe(true)
    expect(preservesRefreshTokenOnUnrecoverable('codex')).toBe(false)
  })
})
