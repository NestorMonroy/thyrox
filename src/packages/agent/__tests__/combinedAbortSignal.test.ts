/**
 * Porte de `ccnmt: packages/agent/__tests__/combinedAbortSignal.test.ts`.
 * Tres disparadores —senal, segunda senal, vencimiento— y una limpieza que
 * tiene que ser idempotente: se llama en el camino de exito y en el de error.
 */
import { describe, expect, test } from 'bun:test'
import { createCombinedAbortSignal } from '../combinedAbortSignal.ts'

const abortada = (): AbortSignal => {
  const c = new AbortController()
  c.abort()
  return c.signal
}

const espera = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

describe('createCombinedAbortSignal — una senal', () => {
  test('sin senal y sin vencimiento nace sin abortar', () => {
    const { signal } = createCombinedAbortSignal(undefined)
    expect(signal.aborted).toBe(false)
  })

  test('abortar la senal de entrada aborta la combinada', () => {
    const c = new AbortController()
    const { signal } = createCombinedAbortSignal(c.signal)
    c.abort()
    expect(signal.aborted).toBe(true)
  })

  test('una senal ya abortada devuelve la combinada ya abortada', () => {
    expect(createCombinedAbortSignal(abortada()).signal.aborted).toBe(true)
  })
})

describe('createCombinedAbortSignal — segunda senal', () => {
  test('abortar signalB aborta la combinada', () => {
    const b = new AbortController()
    const { signal } = createCombinedAbortSignal(undefined, { signalB: b.signal })
    b.abort()
    expect(signal.aborted).toBe(true)
  })

  test('signalB pre-abortada basta, aunque la primera este sana', () => {
    const a = new AbortController()
    const { signal } = createCombinedAbortSignal(a.signal, { signalB: abortada() })
    expect(signal.aborted).toBe(true)
  })

  test('abortar la primera basta, aunque signalB este sana', () => {
    const a = new AbortController()
    const b = new AbortController()
    const { signal } = createCombinedAbortSignal(a.signal, { signalB: b.signal })
    a.abort()
    expect(signal.aborted).toBe(true)
    expect(b.signal.aborted).toBe(false)
  })
})

describe('createCombinedAbortSignal — vencimiento', () => {
  test('no aborta antes de que venza', async () => {
    const { signal } = createCombinedAbortSignal(undefined, { timeoutMs: 60 })
    await espera(10)
    expect(signal.aborted).toBe(false)
  })

  test('aborta al vencer', async () => {
    const { signal } = createCombinedAbortSignal(undefined, { timeoutMs: 10 })
    await espera(40)
    expect(signal.aborted).toBe(true)
  })

  test('limpiar antes del vencimiento lo impide', async () => {
    const { signal, cleanup } = createCombinedAbortSignal(undefined, { timeoutMs: 20 })
    cleanup()
    await espera(50)
    expect(signal.aborted).toBe(false)
  })
})

describe('createCombinedAbortSignal — limpieza', () => {
  test('llamarla dos veces no revienta', () => {
    const { cleanup } = createCombinedAbortSignal(new AbortController().signal)
    cleanup()
    expect(() => cleanup()).not.toThrow()
  })

  test('retira la escucha: tras limpiar, abortar la entrada ya no propaga', () => {
    const c = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(c.signal)
    cleanup()
    c.abort()
    expect(signal.aborted).toBe(false)
  })

  test('con las dos ya abortadas la limpieza es un no-op', () => {
    const { cleanup } = createCombinedAbortSignal(abortada(), { signalB: abortada() })
    expect(() => cleanup()).not.toThrow()
  })
})

describe('createCombinedAbortSignal — quien llega primero', () => {
  test('gana la primera senal', () => {
    const a = new AbortController()
    const b = new AbortController()
    const { signal } = createCombinedAbortSignal(a.signal, { signalB: b.signal })
    a.abort()
    b.abort()
    expect(signal.aborted).toBe(true)
  })

  test('gana signalB si aborta antes', () => {
    const a = new AbortController()
    const b = new AbortController()
    const { signal } = createCombinedAbortSignal(a.signal, { signalB: b.signal })
    b.abort()
    expect(signal.aborted).toBe(true)
  })

  test('los tres disparadores conviven: la senal gana al vencimiento largo', async () => {
    const a = new AbortController()
    const b = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(a.signal, {
      signalB: b.signal,
      timeoutMs: 5000,
    })
    a.abort()
    await espera(5)
    expect(signal.aborted).toBe(true)
    cleanup()
  })
})
