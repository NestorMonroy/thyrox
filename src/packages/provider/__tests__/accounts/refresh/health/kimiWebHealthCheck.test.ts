/**
 * Kimi web en el refresco proactivo: el token se renueva en segundo plano
 * cuando le quedan menos segundos que una ventana repartida entre uno y
 * cuatro minutos, para que una flota de conexiones no pida el refresco a la
 * vez.
 *
 * Porte de `omniroute: src/lib/tokenHealthCheckKimi.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createKimiWebHealthCheck, kimiRefreshJitterSec } from '../../../../src/accounts/refresh/health/kimiWebHealthCheck.ts'
import type { KimiWebRefreshResult } from '../../../../src/accounts/kimi/kimiWebRefresh.ts'

const NOW_MS = Date.parse('2026-09-28T12:00:00.000Z')
const NOW = new Date(NOW_MS).toISOString()
const NOW_SEC = NOW_MS / 1000
const jwt = (secondsLeft: number) => ['h', Buffer.from(JSON.stringify({ exp: NOW_SEC + secondsLeft })).toString('base64url'), 's'].join('.')

type Row = Record<string, unknown>

function setup(result: KimiWebRefreshResult, jitterSec = 120) {
  const updates: [string, Row][] = []
  const exchanged: string[] = []
  const logs: string[] = []
  const check = createKimiWebHealthCheck({
    store: { getById: () => null, update: (id: string, data: Row) => void updates.push([id, data]) },
    exchange: async token => (exchanged.push(token), result),
    jitterSec: () => jitterSec,
    now: () => NOW_MS,
    log: { info: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`info ${m}`)), warn: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`warn ${m}`)) },
  })
  return { check, updates, exchanged, logs }
}

const kimi = (overrides: Row = {}) => ({ id: 'k', provider: 'kimi-web', name: 'main', refreshToken: 'r1', apiKey: jwt(60), ...overrides })
const refreshed: KimiWebRefreshResult = { success: true, accessToken: 'a2', refreshToken: 'r2', expiresAtSec: NOW_SEC + 900 }

describe('the Kimi web health check', () => {
  test('a token inside the window is refreshed and persisted as active', async () => {
    const { check, updates, exchanged, logs } = setup(refreshed)
    await check(kimi(), NOW)
    expect(exchanged).toEqual(['r1'])
    expect(updates).toEqual([['k', { apiKey: 'a2', accessToken: 'a2', refreshToken: 'r2', expiresAt: new Date((NOW_SEC + 900) * 1000).toISOString(), testStatus: 'active', lastError: null, errorCode: null }]])
    expect(logs).toEqual(['info kimi-web/main token expiring soon; refreshing in background', 'info kimi-web/main token refreshed'])
  })

  test('a token outside the window is left alone', async () => {
    const { check, updates, exchanged } = setup(refreshed, 59)
    await check(kimi(), NOW)
    expect(exchanged).toEqual([])
    expect(updates).toEqual([])
  })

  test('the access token stands in for the API key, and the provider data for the refresh token', async () => {
    const { check, exchanged } = setup(refreshed)
    await check(kimi({ apiKey: undefined, accessToken: jwt(10), refreshToken: undefined, providerSpecificData: { refreshToken: 'r9' } }), NOW)
    expect(exchanged).toEqual(['r9'])
  })

  test('without a refresh token nothing is attempted', async () => {
    const { check, exchanged, updates } = setup(refreshed)
    await check(kimi({ refreshToken: undefined }), NOW)
    expect(exchanged).toEqual([])
    expect(updates).toEqual([])
  })

  test('another provider is not its business', async () => {
    const { check, exchanged } = setup(refreshed)
    await check(kimi({ provider: 'kimi-coding' }), NOW)
    expect(exchanged).toEqual([])
  })

  test('the underscore spelling and any case are Kimi web too', async () => {
    const { check, exchanged } = setup(refreshed)
    await check(kimi({ provider: 'Kimi_Web' }), NOW)
    expect(exchanged).toEqual(['r1'])
  })

  test('a failed refresh is warned and writes nothing', async () => {
    const { check, updates, logs } = setup({ success: false, error: 'HTTP 401' })
    await check(kimi(), NOW)
    expect(updates).toEqual([])
    expect(logs).toEqual(['info kimi-web/main token expiring soon; refreshing in background', 'warn Failed to auto-refresh Kimi web token: HTTP 401'])
  })

  test('a success without an access token counts as a failure', async () => {
    const { check, updates } = setup({ success: true })
    await check(kimi(), NOW)
    expect(updates).toEqual([])
  })
})

describe('the refresh window', () => {
  test('spreads over [60, 240) seconds', () => {
    expect(kimiRefreshJitterSec(() => 0)).toBe(60)
    expect(kimiRefreshJitterSec(() => 0.5)).toBe(150)
    expect(kimiRefreshJitterSec(() => 0.99999)).toBe(239)
  })
})
