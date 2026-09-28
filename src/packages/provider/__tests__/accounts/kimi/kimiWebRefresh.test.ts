/**
 * El token de Kimi web: su caducidad se lee del JWT y se renueva pidiendo
 * `/api/auth/token/refresh` con el refresh token como portador.
 *
 * Porte de `omniroute: open-sse/utils/kimiJwt.ts` y de `src/lib/kimi/tokenRefresh.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { isKimiTokenExpiringSoon, kimiTokenExpiration } from '../../../src/accounts/kimi/kimiJwt.ts'
import { exchangeKimiWebRefreshToken, kimiWebBaseUrl, refreshKimiWebConnection } from '../../../src/accounts/kimi/kimiWebRefresh.ts'

const NOW_MS = Date.parse('2026-09-28T12:00:00.000Z')
const NOW_SEC = NOW_MS / 1000
const jwt = (payload: Record<string, unknown>) => ['h', Buffer.from(JSON.stringify(payload)).toString('base64url'), 's'].join('.')

type Row = Record<string, unknown>

function exchanger(answer: () => Response | Promise<Response>, env: Record<string, string> = {}) {
  const calls: { url: string; headers: Record<string, string>; method?: string }[] = []
  const fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(input), headers: init.headers as Record<string, string>, method: init.method })
    return answer()
  }) as unknown as typeof globalThis.fetch
  return { calls, exchange: (token: string, baseUrl?: string) => exchangeKimiWebRefreshToken(token, { fetch, env, now: () => NOW_MS, baseUrl }) }
}

describe('the expiry of a Kimi token', () => {
  test('is read from the JWT against the given clock', () => {
    expect(kimiTokenExpiration(jwt({ exp: NOW_SEC + 100, iat: NOW_SEC - 50 }), NOW_MS)).toEqual({ expiresAtSec: NOW_SEC + 100, issuedAtSec: NOW_SEC - 50, remainingSec: 100, isExpired: false })
  })

  test('an issue date that is not a number reads as zero, and a past expiry as expired', () => {
    expect(kimiTokenExpiration(jwt({ exp: NOW_SEC, iat: '5' }), NOW_MS)).toEqual({ expiresAtSec: NOW_SEC, issuedAtSec: 0, remainingSec: 0, isExpired: true })
  })

  test('a token without a numeric expiry, or that is not a JWT, has none', () => {
    expect(kimiTokenExpiration(jwt({ exp: '99' }), NOW_MS)).toBeNull()
    expect(kimiTokenExpiration('not-a-jwt', NOW_MS)).toBeNull()
    expect(kimiTokenExpiration(undefined, NOW_MS)).toBeNull()
  })

  test('expires soon within the threshold, inclusive, and never without an expiry', () => {
    expect(isKimiTokenExpiringSoon(jwt({ exp: NOW_SEC + 240 }), 240, NOW_MS)).toBe(true)
    expect(isKimiTokenExpiringSoon(jwt({ exp: NOW_SEC + 241 }), 240, NOW_MS)).toBe(false)
    expect(isKimiTokenExpiringSoon(jwt({ exp: NOW_SEC + 200 }), undefined, NOW_MS)).toBe(true)
    expect(isKimiTokenExpiringSoon('opaque', 240, NOW_MS)).toBe(false)
  })
})

describe('the Kimi web base URL', () => {
  test('defaults to kimi.ai and is declared by THYROX_KIMI_WEB_BASE_URL without trailing slashes', () => {
    expect(kimiWebBaseUrl({})).toBe('https://www.kimi.ai')
    expect(kimiWebBaseUrl({ THYROX_KIMI_WEB_BASE_URL: ' https://kimi.test// ' })).toBe('https://kimi.test')
  })
})

describe('exchanging a Kimi web refresh token', () => {
  test('GETs the refresh endpoint with the token as bearer and reads the new expiry from the JWT', async () => {
    const access = jwt({ exp: NOW_SEC + 600 })
    const { calls, exchange } = exchanger(() => new Response(JSON.stringify({ access_token: access, refresh_token: 'r2' })), { THYROX_KIMI_WEB_BASE_URL: 'https://kimi.test/' })
    expect(await exchange('  r1 ')).toEqual({ success: true, accessToken: access, refreshToken: 'r2', expiresAtSec: NOW_SEC + 600 })
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe('https://kimi.test/api/auth/token/refresh')
    expect(calls[0]!.method).toBe('GET')
    expect(calls[0]!.headers.Authorization).toBe('Bearer r1')
    expect(calls[0]!.headers.Origin).toBe('https://kimi.test')
    expect(calls[0]!.headers.Referer).toBe('https://kimi.test/')
  })

  test('an explicit base URL wins over the environment', async () => {
    const { calls, exchange } = exchanger(() => new Response(JSON.stringify({ access_token: 'a' })), { THYROX_KIMI_WEB_BASE_URL: 'https://kimi.test' })
    await exchange('r1', 'https://other.test/')
    expect(calls[0]!.url).toBe('https://other.test/api/auth/token/refresh')
  })

  test('keeps the refresh token when none comes back, and an opaque token expires in fifteen minutes', async () => {
    const { exchange } = exchanger(() => new Response(JSON.stringify({ access_token: 'opaque' })))
    expect(await exchange('r1')).toEqual({ success: true, accessToken: 'opaque', refreshToken: 'r1', expiresAtSec: NOW_SEC + 900 })
  })

  test('an empty refresh token is refused without a request', async () => {
    const { calls, exchange } = exchanger(() => new Response('{}'))
    expect(await exchange('  ')).toEqual({ success: false, error: 'No refresh_token provided' })
    expect(calls).toEqual([])
  })

  test('an HTTP error carries its status and a sanitized body', async () => {
    const { exchange } = exchanger(() => new Response('bad token Bearer sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789', { status: 401 }))
    const outcome = await exchange('r1')
    expect(outcome.success).toBe(false)
    expect(outcome.error).toStartWith('Kimi refresh returned HTTP 401: ')
    expect(outcome.error).not.toContain('sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789')
  })

  test('a response without a string access token is invalid', async () => {
    const { exchange } = exchanger(() => new Response(JSON.stringify({ access_token: 5 })))
    expect(await exchange('r1')).toEqual({ success: false, error: 'Invalid response from Kimi: missing access_token' })
  })

  test('a network failure is reported, not thrown', async () => {
    const { exchange } = exchanger(() => {
      throw new Error('socket hang up')
    })
    expect(await exchange('r1')).toEqual({ success: false, error: 'Network error refreshing Kimi token: socket hang up' })
  })
})

describe('refreshing a stored Kimi web connection', () => {
  function store(rows: Row[]) {
    const byId = new Map(rows.map(row => [row.id as string, row]))
    const updates: [string, Row][] = []
    return { updates, store: { getById: (id: string) => byId.get(id) ?? null, update: (id: string, data: Row) => void updates.push([id, data]) } }
  }

  test('exchanges its refresh token and persists the new tokens as active', async () => {
    const { updates, store: s } = store([{ id: 'k', provider: 'kimi-web', refreshToken: 'r1' }])
    const used: string[] = []
    const outcome = await refreshKimiWebConnection('k', { store: s, exchange: async token => (used.push(token), { success: true, accessToken: 'a2', refreshToken: 'r2', expiresAtSec: NOW_SEC + 600 }) })
    expect(outcome).toEqual({ success: true, accessToken: 'a2', refreshToken: 'r2', expiresAtSec: NOW_SEC + 600 })
    expect(used).toEqual(['r1'])
    expect(updates).toEqual([['k', { apiKey: 'a2', accessToken: 'a2', refreshToken: 'r2', expiresAt: new Date((NOW_SEC + 600) * 1000).toISOString(), testStatus: 'active', lastError: null, errorCode: null }]])
  })

  test('falls back to the refresh token kept in the provider data', async () => {
    const { store: s } = store([{ id: 'k', providerSpecificData: { refreshToken: 'r9' } }])
    const used: string[] = []
    await refreshKimiWebConnection('k', { store: s, exchange: async token => (used.push(token), { success: false, error: 'x' }) })
    expect(used).toEqual(['r9'])
  })

  test('an unknown connection or one without a refresh token is refused, and a failed exchange writes nothing', async () => {
    const { updates, store: s } = store([{ id: 'k', providerSpecificData: {} }, { id: 'f', refreshToken: 'r1' }])
    const exchange = async () => ({ success: false, error: 'down' })
    expect(await refreshKimiWebConnection('nope', { store: s, exchange })).toEqual({ success: false, error: 'Connection nope not found' })
    expect(await refreshKimiWebConnection('k', { store: s, exchange })).toEqual({ success: false, error: 'Connection does not contain a refresh_token' })
    expect(await refreshKimiWebConnection('f', { store: s, exchange })).toEqual({ success: false, error: 'down' })
    expect(updates).toEqual([])
  })

  test('a new token without an expiry leaves the stored expiry undeclared', async () => {
    const { updates, store: s } = store([{ id: 'k', refreshToken: 'r1' }])
    await refreshKimiWebConnection('k', { store: s, exchange: async () => ({ success: true, accessToken: 'a2', refreshToken: 'r1' }) })
    expect(updates[0]![1].expiresAt).toBeUndefined()
  })
})
