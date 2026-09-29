/**
 * Ventana de peticiones global por credencial (ADR-THYROX-006, 1.1.0): dos
 * proxies que comparten un `SharedStateStore` ven la misma cuenta, aunque
 * cada uno tenga su propia instancia de `RateLimitManager`.
 */
import { describe, expect, test } from 'bun:test'
import { createMemorySharedStateStore } from '@thyrox/shared-state/memory.ts'
import { RateLimitManager } from '../rateLimitManager.ts'

const CREDENTIAL_ID = 'cred-1'
const WINDOW_MS = 60_000

describe('RateLimitManager — ventana global compartida', () => {
  test('dos managers con el mismo store suman en la misma ventana, y el que pasa el límite recibe "excedido"', async () => {
    let currentTime = 0
    const store = createMemorySharedStateStore({ now: () => currentTime })
    const proxyA = new RateLimitManager({}, store)
    const proxyB = new RateLimitManager({}, store)

    expect(await proxyA.checkGlobalWindow(CREDENTIAL_ID, 2, WINDOW_MS)).toBe(false)
    expect(await proxyB.checkGlobalWindow(CREDENTIAL_ID, 2, WINDOW_MS)).toBe(false)
    // La tercera petición, venga de quien venga, ya pasa el límite de 2.
    expect(await proxyA.checkGlobalWindow(CREDENTIAL_ID, 2, WINDOW_MS)).toBe(true)

    await store.close()
  })

  test('en una ventana nueva el conteo reinicia', async () => {
    let currentTime = 0
    const store = createMemorySharedStateStore({ now: () => currentTime })
    const proxyA = new RateLimitManager({}, store)

    expect(await proxyA.checkGlobalWindow(CREDENTIAL_ID, 1, WINDOW_MS)).toBe(false)
    expect(await proxyA.checkGlobalWindow(CREDENTIAL_ID, 1, WINDOW_MS)).toBe(true)

    currentTime += WINDOW_MS
    expect(await proxyA.checkGlobalWindow(CREDENTIAL_ID, 1, WINDOW_MS)).toBe(false)

    await store.close()
  })

  test('sin sharedState cada manager cuenta solo lo suyo', async () => {
    const proxyA = new RateLimitManager()
    const proxyB = new RateLimitManager()

    expect(await proxyA.checkGlobalWindow(CREDENTIAL_ID, 1, WINDOW_MS)).toBe(false)
    // proxyB no ve la petición de proxyA: sin store compartido no hay vista global.
    expect(await proxyB.checkGlobalWindow(CREDENTIAL_ID, 1, WINDOW_MS)).toBe(false)
  })
})
