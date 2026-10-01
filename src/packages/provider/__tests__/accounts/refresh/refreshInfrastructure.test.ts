/**
 * La infraestructura común del refresco de tokens: clasificar un error OAuth
 * irrecuperable en cualquier forma de cuerpo, no pisar una rotación ajena al
 * persistir, reintentar con disyuntor por proveedor, redirigir a quien llega
 * con un refresh token ya rotado, y elegir el cliente de Google que emitió el
 * token.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/{shared,casGuard,
 * circuitBreaker,rotationMap,googleClientBinding}.ts` y de
 * `wasRefreshTokenRotated` en `refreshSerializer.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { casGuardShouldSkipPersist, getActiveCasGuard, getCasGuardStats, resetCasGuardStats, runWithCasGuard } from '../../../src/accounts/refresh/casGuard.ts'
import { createRefreshRetrier } from '../../../src/accounts/refresh/circuitBreaker.ts'
import { selectGoogleRefreshClient } from '../../../src/accounts/refresh/googleClientBinding.ts'
import { buildFormParams, extractOAuthErrorCode, isUnrecoverableRefreshError, readRefreshErrorBody, wasRefreshTokenRotated } from '../../../src/accounts/refresh/refreshErrors.ts'
import { createRotationMap, refreshCacheKey } from '../../../src/accounts/refresh/rotationMap.ts'

describe('refresh errors', () => {
  test('form params keep only non-empty strings', () => {
    expect(Object.fromEntries(buildFormParams({ a: 'x', b: '', c: 3, d: null, e: 'y' }))).toEqual({ a: 'x', e: 'y' })
  })

  test('an unrecoverable code is found bare, in fields, nested, double-encoded or in a sentence', () => {
    expect(extractOAuthErrorCode(' invalid_grant ')).toBe('invalid_grant')
    expect(extractOAuthErrorCode({ error: 'refresh_token_reused' })).toBe('refresh_token_reused')
    expect(extractOAuthErrorCode({ error: { code: 'invalid_token' } })).toBe('invalid_token')
    expect(extractOAuthErrorCode({ error_code: 'expired_token' })).toBe('expired_token')
    expect(extractOAuthErrorCode({ code: 'access_denied' })).toBe('access_denied')
    expect(extractOAuthErrorCode(JSON.stringify(JSON.stringify({ error: 'invalid_grant' })))).toBe('invalid_grant')
    expect(extractOAuthErrorCode({ error: '{"error":"unauthorized_client"}' })).toBe('unauthorized_client')
    expect(extractOAuthErrorCode('garbage {"error": "invalid_request" trailing')).toBe('invalid_request')
    expect(extractOAuthErrorCode({ error: 'failed to refresh token: INVALID_GRANT' })).toBe('invalid_grant')
  })

  test('the field wins over a code merely mentioned earlier in the text', () => {
    const nested = '{"message":"access_denied earlier","error":{"code":"invalid_token"}}'
    expect(extractOAuthErrorCode(nested)).toBe('invalid_token')
    expect(extractOAuthErrorCode(` ${nested} `)).toBe('invalid_token')
    expect(extractOAuthErrorCode('noise access_denied "error": "invalid_grant" broken{')).toBe('invalid_grant')
  })

  test('transient codes, partial words, unknown shapes and deep nesting give nothing', () => {
    for (const raw of [null, undefined, '', '   ', 'server_error', { error: 'temporarily_unavailable' }, 'xinvalid_grant', 'invalid_grantx', '<html>502</html>', 42, ['invalid_grant'], '{not json', '"error":"server_error"']) {
      expect(extractOAuthErrorCode(raw)).toBeNull()
    }
    let deep: unknown = 'invalid_grant'
    for (let i = 0; i < 8; i++) deep = { error: deep }
    expect(extractOAuthErrorCode(deep)).toBeNull()
    let shallow: unknown = 'invalid_grant'
    for (let i = 0; i < 6; i++) shallow = { error: shallow }
    expect(extractOAuthErrorCode(shallow)).toBe('invalid_grant')
  })

  test('the error body is read once, parsed when it is JSON, and classified', async () => {
    expect(await readRefreshErrorBody(new Response('{"error":"invalid_grant"}', { status: 400 }))).toEqual({ rawText: '{"error":"invalid_grant"}', code: 'invalid_grant' })
    expect(await readRefreshErrorBody(new Response('plain invalid_grant text', { status: 400 }))).toEqual({ rawText: 'plain invalid_grant text', code: 'invalid_grant' })
    expect(await readRefreshErrorBody(new Response('{"error":"server_error"}', { status: 500 }))).toEqual({ rawText: '{"error":"server_error"}', code: null })
    expect((await readRefreshErrorBody(new Response('{"message":"invalid_grant"}', { status: 400 }))).code).toBe('invalid_grant')
  })

  test('the unrecoverable result markers', () => {
    for (const error of ['unrecoverable_refresh_error', 'refresh_token_reused', 'invalid_request', 'invalid_grant']) expect(isUnrecoverableRefreshError({ error })).toBe(true)
    expect(isUnrecoverableRefreshError({ error: 'expired_token' })).toBe(false)
    expect(isUnrecoverableRefreshError(null)).toBe(false)
    expect(isUnrecoverableRefreshError('invalid_grant')).toBe(false)
  })

  test('a rotation needs two different non-empty tokens', () => {
    expect(wasRefreshTokenRotated('old', 'new')).toBe(true)
    expect(wasRefreshTokenRotated('old', 'old')).toBe(false)
    expect(wasRefreshTokenRotated('', 'new')).toBe(false)
    expect(wasRefreshTokenRotated('old', '')).toBe(false)
    expect(wasRefreshTokenRotated('old', null)).toBe(false)
    expect(wasRefreshTokenRotated(7, 'new')).toBe(false)
  })
})

describe('CAS guard', () => {
  test('without a guard the persist goes ahead and nothing is counted', async () => {
    resetCasGuardStats()
    expect(getActiveCasGuard()).toBeUndefined()
    expect(await casGuardShouldSkipPersist()).toBe(false)
    expect(await runWithCasGuard(null, async () => casGuardShouldSkipPersist())).toBe(false)
    expect(getCasGuardStats()).toEqual({ skipped: 0, persisted: 0 })
  })

  test('a row rotated by someone else is not overwritten; one still ours is persisted', async () => {
    resetCasGuardStats()
    const warnings: string[] = []
    const log = { warn: (_tag: string, message: string) => warnings.push(message) }
    expect(await runWithCasGuard({ expectedRefreshToken: 'rt-1', reread: async () => 'rt-2' }, () => casGuardShouldSkipPersist(log))).toBe(true)
    expect(warnings).toHaveLength(1)
    expect(await runWithCasGuard({ expectedRefreshToken: 'rt-1', reread: async () => 'rt-1' }, () => casGuardShouldSkipPersist(log))).toBe(false)
    expect(getCasGuardStats()).toEqual({ skipped: 1, persisted: 1 })
  })

  test('no presented token, an empty row or a failed reread never block the persist', async () => {
    resetCasGuardStats()
    expect(await runWithCasGuard({ expectedRefreshToken: null, reread: async () => 'x' }, () => casGuardShouldSkipPersist())).toBe(false)
    expect(await runWithCasGuard({ expectedRefreshToken: 'rt', reread: async () => null }, () => casGuardShouldSkipPersist())).toBe(false)
    expect(await runWithCasGuard({ expectedRefreshToken: 'rt', reread: async () => { throw new Error('db') } }, () => casGuardShouldSkipPersist())).toBe(false)
    expect(getCasGuardStats()).toEqual({ skipped: 0, persisted: 1 })
  })

  test('the guard is only visible inside its run', async () => {
    const guard = { expectedRefreshToken: 'a', reread: async () => 'a' }
    expect(await runWithCasGuard(guard, async () => getActiveCasGuard())).toBe(guard)
    expect(getActiveCasGuard()).toBeUndefined()
  })
})

function retrier(overrides: { timeoutMs?: number } = {}) {
  let now = 0
  const sleeps: number[] = []
  const logs: string[] = []
  const log = { warn: (_t: string, m: string) => logs.push(`warn ${m}`), error: (_t: string, m: string) => logs.push(`error ${m}`), debug: (_t: string, m: string) => logs.push(`debug ${m}`) }
  const instance = createRefreshRetrier({ now: () => now, sleep: async ms => void sleeps.push(ms), ...overrides })
  return { instance, sleeps, logs, log, advance: (ms: number) => (now += ms), at: () => now }
}

describe('retry with circuit breaker', () => {
  test('a result on the first attempt is returned without waiting', async () => {
    const { instance, sleeps } = retrier()
    expect(await instance.refreshWithRetry(async () => ({ accessToken: 'a' }), { provider: 'codex' })).toEqual({ accessToken: 'a' })
    expect(sleeps).toEqual([])
  })

  test('failures back off linearly and the third attempt can succeed', async () => {
    const { instance, sleeps } = retrier()
    let calls = 0
    const result = await instance.refreshWithRetry(async () => {
      calls++
      if (calls === 1) throw new Error('boom')
      if (calls === 2) return null
      return { accessToken: 'late' }
    }, { provider: 'codex' })
    expect(result).toEqual({ accessToken: 'late' })
    expect(sleeps).toEqual([1000, 2000])
  })

  test('an unrecoverable result stops retrying and is returned', async () => {
    const { instance, sleeps } = retrier()
    let calls = 0
    expect(await instance.refreshWithRetry(async () => (calls++, { error: 'invalid_grant' }), { provider: 'codex' })).toEqual({ error: 'invalid_grant' })
    expect(calls).toBe(1)
    expect(sleeps).toEqual([])
  })

  test('an unrecoverable result leaves the failure count alone', async () => {
    const { instance } = retrier()
    await instance.refreshWithRetry(async () => null, { provider: 'codex', maxRetries: 1 })
    await instance.refreshWithRetry(async () => ({ error: 'refresh_token_reused' }), { provider: 'codex' })
    expect(instance.status().codex?.failures).toBe(1)
  })

  test('an attempt that hangs is cut by the timeout and counts as a failure', async () => {
    const { instance } = retrier({ timeoutMs: 5 })
    expect(await instance.refreshWithRetry(() => new Promise(() => {}), { provider: 'slow', maxRetries: 1 })).toBeNull()
    expect(instance.status().slow?.failures).toBe(1)
  })

  test('five exhausted refreshes trip the breaker for thirty minutes, then it resets', async () => {
    const { instance, advance, log, logs } = retrier()
    for (let i = 0; i < 4; i++) await instance.refreshWithRetry(async () => null, { provider: 'codex', maxRetries: 1, log })
    expect(instance.isProviderBlocked('codex')).toBe(false)
    await instance.refreshWithRetry(async () => null, { provider: 'codex', maxRetries: 1, log })
    expect(instance.isProviderBlocked('codex')).toBe(true)
    expect(instance.status().codex).toEqual({ failures: 5, blocked: true, blockedUntil: new Date(30 * 60 * 1000).toISOString(), remainingMs: 30 * 60 * 1000 })
    expect(logs.some(line => line.startsWith('error') && line.includes('Circuit breaker tripped'))).toBe(true)
    let called = false
    expect(await instance.refreshWithRetry(async () => ((called = true), { accessToken: 'x' }), { provider: 'codex', log })).toBeNull()
    expect(called).toBe(false)
    expect(instance.isProviderBlocked('other')).toBe(false)
    advance(30 * 60 * 1000 - 1)
    expect(instance.isProviderBlocked('codex')).toBe(true)
    advance(1)
    expect(instance.isProviderBlocked('codex')).toBe(false)
    expect(instance.status().codex).toBeUndefined()
  })

  test('a success clears the failure count', async () => {
    const { instance } = retrier()
    await instance.refreshWithRetry(async () => null, { provider: 'codex', maxRetries: 1 })
    expect(instance.status().codex?.failures).toBe(1)
    await instance.refreshWithRetry(async () => ({ accessToken: 'ok' }), { provider: 'codex' })
    expect(instance.status().codex).toBeUndefined()
  })

  test('the default is three attempts under an unknown provider', async () => {
    const { instance, sleeps } = retrier()
    let calls = 0
    expect(await instance.refreshWithRetry(async () => (calls++, null))).toBeNull()
    expect(calls).toBe(3)
    expect(sleeps).toEqual([1000, 2000])
    expect(instance.status().unknown?.failures).toBe(1)
  })
})

describe('rotation map', () => {
  test('the key hashes the refresh token under its provider', () => {
    const key = refreshCacheKey('codex', 'rt-old')
    expect(key).toMatch(/^codex:[0-9a-f]{64}$/)
    expect(key).not.toContain('rt-old')
    expect(refreshCacheKey('codex', 'rt-old')).toBe(key)
    expect(refreshCacheKey('kimi', 'rt-old')).not.toBe(key)
    expect(refreshCacheKey('codex', 'rt-other')).not.toBe(key)
  })

  test('a recent rotation redirects a caller with the old token for sixty seconds', () => {
    let now = 0
    const map = createRotationMap({ now: () => now })
    const result = { accessToken: 'a2', refreshToken: 'rt-2' }
    map.record('codex', 'rt-1', result)
    expect(map.lookup('codex', 'rt-1')).toEqual({ result, expiresAt: 60_000 })
    expect(map.lookup('kimi', 'rt-1')).toBeUndefined()
    now = 59_999
    expect(map.lookup('codex', 'rt-1')?.result).toBe(result)
    now = 60_000
    expect(map.lookup('codex', 'rt-1')).toBeUndefined()
    expect(map.size()).toBe(0)
  })

  test('nothing is recorded without two different tokens', () => {
    const map = createRotationMap({ now: () => 0 })
    map.record('codex', '', { accessToken: 'a', refreshToken: 'rt-2' })
    map.record('codex', 'rt-1', { accessToken: 'a', refreshToken: '' })
    map.record('codex', 'rt-1', { accessToken: 'a', refreshToken: 'rt-1' })
    expect(map.size()).toBe(0)
  })

  test('expired rotations are pruned on lookup, and the map can be cleared', () => {
    let now = 0
    const map = createRotationMap({ now: () => now })
    map.record('codex', 'rt-1', { accessToken: 'a', refreshToken: 'rt-2' })
    now = 30_000
    map.record('codex', 'rt-3', { accessToken: 'b', refreshToken: 'rt-4' })
    now = 60_000
    expect(map.lookup('codex', 'rt-3')?.result.accessToken).toBe('b')
    expect(map.size()).toBe(1)
    map.clear()
    expect(map.size()).toBe(0)
  })
})

describe('Google refresh client', () => {
  const builtinClients = { antigravity: { clientId: 'ag-id', clientSecret: 'ag-secret' }, gemini: { clientId: 'ge-id', clientSecret: 'ge-secret' } }

  test('a token issued by the configured custom client keeps refreshing with it', () => {
    expect(selectGoogleRefreshClient('antigravity', 'custom:mine', { clientId: 'mine', clientSecret: 's' }, builtinClients)).toEqual({ clientId: 'mine', clientSecret: 's' })
  })

  test('a rotated custom client, a missing secret, no marker or builtin fall back to the provider builtin', () => {
    expect(selectGoogleRefreshClient('antigravity', 'custom:old', { clientId: 'new', clientSecret: 's' }, builtinClients)).toEqual(builtinClients.antigravity)
    expect(selectGoogleRefreshClient('antigravity', 'custom:mine', { clientId: 'mine' }, builtinClients)).toEqual(builtinClients.antigravity)
    expect(selectGoogleRefreshClient('antigravity', undefined, { clientId: 'mine', clientSecret: 's' }, builtinClients)).toEqual(builtinClients.antigravity)
    expect(selectGoogleRefreshClient('antigravity', 'builtin', null, builtinClients)).toEqual(builtinClients.antigravity)
    expect(selectGoogleRefreshClient('antigravity', 'mine' as never, { clientId: 'mine', clientSecret: 's' }, builtinClients)).toEqual(builtinClients.antigravity)
    expect(selectGoogleRefreshClient('antigravity', 'Custom:mine' as never, { clientId: 'mine', clientSecret: 's' }, builtinClients)).toEqual(builtinClients.antigravity)
  })

  test('agy shares the antigravity builtin; gemini has its own; an unknown provider is refused', () => {
    expect(selectGoogleRefreshClient('agy', 'builtin', null, builtinClients)).toEqual(builtinClients.antigravity)
    expect(selectGoogleRefreshClient('gemini', 'builtin', null, builtinClients)).toEqual(builtinClients.gemini)
    expect(() => selectGoogleRefreshClient('vertex', 'builtin', null, builtinClients)).toThrow('no builtin OAuth client registered for provider: vertex')
  })

  test('a builtin client that is not declared is refused naming the provider', () => {
    expect(() => selectGoogleRefreshClient('gemini', 'builtin', null, { antigravity: builtinClients.antigravity })).toThrow('gemini')
  })
})
