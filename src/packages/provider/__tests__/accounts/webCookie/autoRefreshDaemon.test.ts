/**
 * El demonio que vigila la vigencia de las credenciales de cookie web: cada
 * intervalo pide la página de inicio de cada proveedor registrado; un 401/403
 * la marca caducada para que otra capa decida. No inicia sesión por su cuenta.
 *
 * Porte de `omniroute: open-sse/services/autoRefreshDaemon.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createAutoRefreshDaemon } from '../../../src/accounts/webCookie/autoRefreshDaemon.ts'

function setup(answer: (url: string, init: RequestInit) => Response | Promise<Response>, checkIntervalMs?: number) {
  const intervals: { fn: () => void; ms: number; unref: number }[] = []
  const cleared: unknown[] = []
  const urls: { url: string; method?: string }[] = []
  const logs: string[] = []
  let clock = 1000
  const daemon = createAutoRefreshDaemon({
    checkIntervalMs,
    fetch: (async (input: string | URL | Request, init: RequestInit = {}) => (urls.push({ url: String(input), method: init.method }), answer(String(input), init))) as unknown as typeof globalThis.fetch,
    timers: {
      setInterval: (fn, ms) => {
        const handle = { fn, ms, unref: 0 }
        intervals.push(handle)
        return { unref: () => void handle.unref++, handle }
      },
      clearInterval: handle => void cleared.push(handle),
    },
    now: () => clock,
    requestTimeoutMs: 20,
    log: { info: (t, m) => void (t === 'AUTO_REFRESH' && logs.push(`info ${m}`)), warn: (t, m) => void (t === 'AUTO_REFRESH' && logs.push(`warn ${m}`)) },
  })
  return { daemon, intervals, cleared, urls, logs, advance: (ms: number) => void (clock += ms) }
}

describe('the credential validity daemon', () => {
  test('a rejected home page marks the credential expired, once', async () => {
    const { daemon, urls, logs } = setup(() => new Response('', { status: 403 }))
    daemon.registerCredential('grok-web', 'sso=1')
    await daemon.check()
    await daemon.check()
    expect(urls).toEqual([{ url: 'https://grok.com', method: 'HEAD' }, { url: 'https://grok.com', method: 'HEAD' }])
    expect(daemon.getStatus()).toEqual({ running: false, checkedProviderCount: 1, expiredCredentials: ['grok-web'], lastRun: 1000 })
    expect(logs).toEqual(['warn Credential expired for "grok-web" (Grok Web)', 'warn Credential expired for "grok-web" (Grok Web)'])
  })

  test('a 401 expires too, and any other status keeps it valid', async () => {
    const expired = setup(() => new Response('', { status: 401 }))
    expired.daemon.registerCredential('poe-web', 'p-b=1')
    await expired.daemon.check()
    expect(expired.daemon.getStatus().expiredCredentials).toEqual(['poe-web'])
    const fine = setup(() => new Response('', { status: 302 }))
    fine.daemon.registerCredential('poe-web', 'p-b=1')
    await fine.daemon.check()
    expect(fine.daemon.getStatus().expiredCredentials).toEqual([])
  })

  test('a provider without an extraction config is dropped', async () => {
    const { daemon, urls } = setup(() => new Response(''))
    daemon.registerCredential('unknown-web', 'c')
    await daemon.check()
    expect(urls).toEqual([])
    expect(daemon.getStatus().checkedProviderCount).toBe(0)
  })

  test('a network failure or a timeout keeps the credential valid, with a warning', async () => {
    const failing = setup(() => {
      throw new Error('ECONNRESET')
    })
    failing.daemon.registerCredential('grok-web', 'sso=1')
    await failing.daemon.check()
    expect(failing.daemon.getStatus().expiredCredentials).toEqual([])
    expect(failing.logs).toEqual(['warn Network error validating credential for "grok-web" — treated as valid (fail-open), will retry next cycle: ECONNRESET'])
    const hanging = setup((_url, init) => new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted')))))
    hanging.daemon.registerCredential('grok-web', 'sso=1')
    await hanging.daemon.check()
    expect(hanging.daemon.getStatus().expiredCredentials).toEqual([])
  })

  test('an unregistered credential is no longer checked, and the expired list can be cleared', async () => {
    const { daemon, urls } = setup(() => new Response('', { status: 403 }))
    daemon.registerCredential('grok-web', 'sso=1')
    await daemon.check()
    daemon.getStatus().expiredCredentials.push('tampered')
    expect(daemon.getStatus().expiredCredentials).toEqual(['grok-web'])
    daemon.clearExpired()
    expect(daemon.getStatus().expiredCredentials).toEqual([])
    daemon.unregisterCredential('grok-web')
    await daemon.check()
    expect(urls).toHaveLength(1)
  })

  test('starting checks at once and every interval, without keeping the process alive', async () => {
    const { daemon, intervals, urls, logs } = setup(() => new Response(''), 5 * 60 * 1000)
    daemon.registerCredential('grok-web', 'sso=1')
    daemon.start()
    daemon.start()
    await Promise.resolve()
    expect(urls).toHaveLength(1)
    expect(intervals).toHaveLength(1)
    expect(intervals[0]!.ms).toBe(300_000)
    expect(intervals[0]!.unref).toBe(1)
    expect(daemon.getStatus().running).toBe(true)
    intervals[0]!.fn()
    await Promise.resolve()
    expect(urls).toHaveLength(2)
    expect(logs).toEqual(['info Started — checking 1 credentials every 300s'])
  })

  test('the interval defaults to fifteen minutes and never drops under one', () => {
    const byDefault = setup(() => new Response(''))
    byDefault.daemon.start()
    expect(byDefault.intervals[0]!.ms).toBe(900_000)
    const tooShort = setup(() => new Response(''), 10)
    tooShort.daemon.start()
    expect(tooShort.intervals[0]!.ms).toBe(60_000)
  })

  test('stopping clears the timer, twice is harmless, and restart starts again', () => {
    const { daemon, intervals, cleared, logs } = setup(() => new Response(''))
    daemon.stop()
    expect(cleared).toEqual([])
    daemon.start()
    daemon.stop()
    daemon.stop()
    expect(cleared).toHaveLength(1)
    expect(daemon.getStatus().running).toBe(false)
    daemon.restart()
    expect(intervals).toHaveLength(2)
    daemon.restart()
    expect(cleared).toHaveLength(2)
    expect(intervals).toHaveLength(3)
    expect(daemon.getStatus().running).toBe(true)
    expect(logs.filter(line => line === 'info Stopped')).toHaveLength(2)
  })
})
