/**
 * Porte de `ccnmt: packages/agent/__tests__/combinedAbortSignal.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente. Tres
 * disparadores —senal, segunda senal, vencimiento— y una limpieza que tiene
 * que ser idempotente: se llama en el camino de exito y en el de error.
 */
import { describe, expect, test } from 'bun:test'
import { createCombinedAbortSignal } from '../combinedAbortSignal.ts'

const espera = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

describe('createCombinedAbortSignal — una senal', () => {
  test('sin senal de entrada nace sin abortar', () => {
    const { signal, cleanup } = createCombinedAbortSignal(undefined)
    expect(signal.aborted).toBe(false)
    cleanup()
  })

  test('abortar la senal de entrada aborta la combinada', () => {
    const c = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(c.signal)
    expect(signal.aborted).toBe(false)
    c.abort()
    expect(signal.aborted).toBe(true)
    cleanup()
  })

  test('una senal ya abortada devuelve la combinada ya abortada', () => {
    const c = new AbortController()
    c.abort()
    const { signal, cleanup } = createCombinedAbortSignal(c.signal)
    expect(signal.aborted).toBe(true)
    cleanup()
  })
})

describe('createCombinedAbortSignal — segunda senal', () => {
  test('abortar signalB aborta la combinada', () => {
    const a = new AbortController()
    const b = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(a.signal, { signalB: b.signal })
    expect(signal.aborted).toBe(false)
    b.abort()
    expect(signal.aborted).toBe(true)
    cleanup()
  })

  test('signalB pre-abortada basta, aunque la primera este sana', () => {
    const a = new AbortController()
    const b = new AbortController()
    b.abort()
    const { signal, cleanup } = createCombinedAbortSignal(a.signal, { signalB: b.signal })
    expect(signal.aborted).toBe(true)
    cleanup()
  })

  test('abortar la primera basta, aunque signalB este sana', () => {
    const a = new AbortController()
    const b = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(a.signal, { signalB: b.signal })
    a.abort()
    expect(signal.aborted).toBe(true)
    expect(b.signal.aborted).toBe(false)
    cleanup()
  })
})

describe('createCombinedAbortSignal — vencimiento', () => {
  test('no aborta antes de que venza', async () => {
    const { signal, cleanup } = createCombinedAbortSignal(undefined, { timeoutMs: 100 })
    expect(signal.aborted).toBe(false)
    cleanup()
  })

  test('aborta al vencer', async () => {
    const { signal, cleanup } = createCombinedAbortSignal(undefined, { timeoutMs: 5 })
    expect(signal.aborted).toBe(false)
    await espera(30)
    expect(signal.aborted).toBe(true)
    cleanup()
  })

  test('limpiar antes del vencimiento lo impide', async () => {
    const { signal, cleanup } = createCombinedAbortSignal(undefined, { timeoutMs: 30 })
    cleanup()
    await espera(60)
    // Sigue sin abortar porque la limpieza cancelo el temporizador.
    expect(signal.aborted).toBe(false)
  })
})

describe('createCombinedAbortSignal — limpieza', () => {
  test('llamarla varias veces no revienta', () => {
    const c = new AbortController()
    const { cleanup } = createCombinedAbortSignal(c.signal)
    cleanup()
    cleanup()
    cleanup()
    expect(true).toBe(true)
  })

  test('retira la escucha: tras limpiar, abortar la entrada ya no propaga', () => {
    // No hay forma directa de contar escuchas, asi que se mide por conducta:
    // el controlador combinado sigue existiendo, pero el aborto de la entrada
    // ya no lo alcanza.
    const c = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(c.signal)
    cleanup()
    c.abort()
    expect(signal.aborted).toBe(false)
  })

  test('con la entrada ya abortada la limpieza es un no-op', () => {
    const c = new AbortController()
    c.abort()
    const { cleanup } = createCombinedAbortSignal(c.signal)
    expect(() => cleanup()).not.toThrow()
  })
})

describe('createCombinedAbortSignal — quien llega primero', () => {
  test('gana la primera senal', () => {
    const a = new AbortController()
    const b = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(a.signal, { signalB: b.signal })
    a.abort()
    b.abort()
    expect(signal.aborted).toBe(true)
    cleanup()
  })

  test('gana signalB si aborta antes', () => {
    const a = new AbortController()
    const b = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(a.signal, { signalB: b.signal })
    b.abort()
    a.abort()
    expect(signal.aborted).toBe(true)
    cleanup()
  })

  test('los tres disparadores conviven: el vencimiento aborta con las dos senales sanas', async () => {
    const a = new AbortController()
    const b = new AbortController()
    const { signal, cleanup } = createCombinedAbortSignal(a.signal, {
      signalB: b.signal,
      timeoutMs: 5,
    })
    expect(signal.aborted).toBe(false)
    await espera(30)
    expect(signal.aborted).toBe(true)
    cleanup()
  })
})
