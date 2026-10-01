/**
 * Las conexiones de cookie web en el refresco proactivo: sólo se verifican,
 * cada intervalo. Un 401/403 inequívoco las marca expiradas; cualquier fallo
 * ambiguo sólo sella la marca de tiempo, porque un parpadeo de red no puede
 * dejar en estado terminal una cookie sana.
 *
 * Porte de `omniroute: src/lib/tokenHealthCheckWebCookie.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createWebCookieHealthCheck } from '../../../../src/accounts/refresh/health/webCookieHealthCheck.ts'
import type { WebCookieValidation } from '../../../../src/accounts/webCookie/webCookieProbe.ts'

const NOW_MS = Date.parse('2026-09-28T12:00:00.000Z')
const NOW = new Date(NOW_MS).toISOString()
const minutesAgo = (minutes: number) => new Date(NOW_MS - minutes * 60_000).toISOString()

type Row = Record<string, unknown>

function setup(result: WebCookieValidation) {
  const updates: [string, Row][] = []
  const probed: { provider: string; apiKey?: string }[] = []
  const logs: string[] = []
  const check = createWebCookieHealthCheck({
    store: { getById: () => null, update: (id: string, data: Row) => void updates.push([id, data]) },
    probe: async request => (probed.push(request), result),
    log: { info: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`info ${m}`)), warn: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`warn ${m}`)) },
  })
  return { check, updates, probed, logs }
}

const cookie = (overrides: Row = {}) => ({ id: 'w', provider: 'deepseek-web', name: 'main', apiKey: ' sid=1 ', lastHealthCheckAt: minutesAgo(90), ...overrides })
const STAMP = { lastHealthCheckAt: NOW }

describe('the web-cookie health check', () => {
  test('a valid cookie only stamps the check, silently', async () => {
    const { check, updates, probed, logs } = setup({ valid: true, error: null, unsupported: false })
    await check(cookie(), 60, NOW)
    expect(probed).toEqual([{ provider: 'deepseek-web', apiKey: 'sid=1' }])
    expect(updates).toEqual([['w', STAMP]])
    expect(logs).toEqual([])
  })

  test('a check inside its interval is skipped', async () => {
    const { check, updates, probed } = setup({ valid: true, error: null, unsupported: false })
    await check(cookie({ lastHealthCheckAt: minutesAgo(59) }), 60, NOW)
    expect(probed).toEqual([])
    expect(updates).toEqual([])
  })

  test('a check exactly one interval old, or never done, is probed', async () => {
    const { check, probed } = setup({ valid: true, error: null, unsupported: false })
    await check(cookie({ lastHealthCheckAt: minutesAgo(60) }), 60, NOW)
    await check(cookie({ lastHealthCheckAt: null }), 60, NOW)
    expect(probed).toHaveLength(2)
  })

  test('an expired session marks the connection expired', async () => {
    const { check, updates, logs } = setup({ valid: false, error: 'SESSION_EXPIRED', errorCode: 'AUTH_007', unsupported: false })
    await check(cookie(), 60, NOW)
    expect(updates).toEqual([['w', { testStatus: 'expired', lastHealthCheckAt: NOW, lastError: 'Session cookie expired or was revoked by the upstream site.', lastErrorAt: NOW, lastErrorType: 'session_expired', lastErrorSource: 'webcookie', errorCode: 'session_expired' }]])
    expect(logs).toEqual(['warn deepseek-web/main cookie rejected by upstream (401/403); marking expired — re-paste the cookie to reactivate'])
  })

  test('the expired code alone, or the words in the error, are enough', async () => {
    const byCode = setup({ valid: false, error: 'x', errorCode: 'AUTH_007', unsupported: false })
    await byCode.check(cookie(), 60, NOW)
    expect(byCode.updates[0]![1].testStatus).toBe('expired')
    const byText = setup({ valid: false, error: 'upstream says session_expired', unsupported: false })
    await byText.check(cookie(), 60, NOW)
    expect(byText.updates[0]![1].testStatus).toBe('expired')
  })

  test('an unsupported provider only stamps, silently', async () => {
    const { check, updates, logs } = setup({ valid: false, error: 'SESSION_EXPIRED', errorCode: 'AUTH_007', unsupported: true })
    await check(cookie(), 60, NOW)
    expect(updates).toEqual([['w', STAMP]])
    expect(logs).toEqual([])
  })

  test('an ambiguous failure warns and only stamps', async () => {
    const { check, updates, logs } = setup({ valid: false, error: 'Network error', unsupported: false })
    await check(cookie(), 60, NOW)
    expect(updates).toEqual([['w', STAMP]])
    expect(logs).toEqual(['warn deepseek-web/main probe inconclusive (Network error); will retry next interval'])
  })

  test('without a credential it stamps without probing, and the cookie in the provider data counts', async () => {
    const { check, updates, probed } = setup({ valid: true, error: null, unsupported: false })
    await check(cookie({ apiKey: '  ' }), 60, NOW)
    expect(probed).toEqual([])
    expect(updates).toEqual([['w', STAMP]])
    await check(cookie({ apiKey: null, providerSpecificData: { cookie: ' c=2 ' } }), 60, NOW)
    expect(probed).toEqual([{ provider: 'deepseek-web', apiKey: 'c=2' }])
  })

  test('a provider outside the catalog is not its business', async () => {
    const { check, updates, probed } = setup({ valid: true, error: null, unsupported: false })
    await check(cookie({ provider: 'openai' }), 60, NOW)
    expect(probed).toEqual([])
    expect(updates).toEqual([])
  })
})
