/**
 * Puerto fiel de
 * `ccnmt: packages/bridge/src/__tests__/capacityWake.test.ts`
 * (198 líneas fuente, 100% portado). Sin mocks — `createCapacityWake`
 * no tiene dependencias cruzadas.
 */
import { describe, expect, test } from 'bun:test'
import { createCapacityWake } from '../capacityWake.js'

describe('createCapacityWake — initial state', () => {
  test('signal() returns a non-aborted signal when neither side aborted', () => {
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    const { signal } = wake.signal()
    expect(signal.aborted).toBe(false)
  })

  test('signal() returns a cleanup function', () => {
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    const { cleanup } = wake.signal()
    expect(typeof cleanup).toBe('function')
  })
})

describe('outer signal abort propagation', () => {
  test('outer abort BEFORE signal() → returns already-aborted signal', () => {
    // Crítico: tras abortar el outer, llamadas futuras a signal() no
    // deben devolver una señal que nunca resuelve y cuelgue el poll loop.
    const outer = new AbortController()
    outer.abort()
    const wake = createCapacityWake(outer.signal)
    const { signal } = wake.signal()
    expect(signal.aborted).toBe(true)
  })

  test('outer abort AFTER signal() → propagates abort', () => {
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    const { signal } = wake.signal()
    expect(signal.aborted).toBe(false)
    outer.abort()
    expect(signal.aborted).toBe(true)
  })

  test('cleanup is a no-op when outer-abort already returned (no listener attached)', () => {
    // Cuando el constructor ve el outer ya abortado, devuelve un
    // cleanup no-op. Llamarlo no debe lanzar.
    const outer = new AbortController()
    outer.abort()
    const wake = createCapacityWake(outer.signal)
    const { cleanup } = wake.signal()
    expect(() => cleanup()).not.toThrow()
  })
})

describe('wake() — early sleep abort', () => {
  test('wake() BEFORE signal() → next signal returns already-aborted', () => {
    // wake() arma un controlador nuevo así que el PRÓXIMO signal()
    // arranca fresco. Pero si se llama wake() e inmediatamente signal(),
    // el wakeController ya fue reemplazado — el nuevo NO está abortado,
    // así que la señal sale fresca.
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    wake.wake()
    const { signal } = wake.signal()
    // wake() reemplaza el controlador después de abortar, así que la
    // señal nueva NO está abortada al momento de signal(). Documenta
    // este contrato.
    expect(signal.aborted).toBe(false)
  })

  test('wake() AFTER signal() → propagates abort to that signal', () => {
    // El caso de uso clásico: el poll loop está dormido (signal ya
    // devuelto), se libera capacidad → wake() dispara → el sleep aborta
    // antes.
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    const { signal } = wake.signal()
    expect(signal.aborted).toBe(false)
    wake.wake()
    expect(signal.aborted).toBe(true)
  })

  test('multiple wake() calls — only the FIRST aborts the active signal', () => {
    // Una vez abortado, el AbortController no puede re-abortarse. wake()
    // DEBE reemplazar el controlador (que es lo que hace) para que las
    // llamadas subsecuentes a signal() reciban señales frescas. Pero la
    // señal activa se queda abortada.
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    const { signal: s1 } = wake.signal()
    wake.wake()
    expect(s1.aborted).toBe(true)
    wake.wake() // un segundo wake no debería reventar
    expect(s1.aborted).toBe(true)
  })

  test('wake() arms a fresh controller for the NEXT signal()', () => {
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    const { signal: s1 } = wake.signal()
    wake.wake()
    expect(s1.aborted).toBe(true)
    // Tras reemplazar el controlador, un signal() NUEVO debe salir fresco.
    const { signal: s2 } = wake.signal()
    expect(s2.aborted).toBe(false)
    // s2 puede abortarse de forma independiente.
    wake.wake()
    expect(s2.aborted).toBe(true)
  })
})

describe('outer + wake — merged abort semantics', () => {
  test('either source aborts the merged signal', () => {
    // Cada llamada a signal() fusiona outer + wake. CUALQUIERA de las
    // dos fuentes que aborte debe abortar la señal fusionada.
    const outer1 = new AbortController()
    const wake1 = createCapacityWake(outer1.signal)
    const { signal: s1 } = wake1.signal()
    outer1.abort()
    expect(s1.aborted).toBe(true)

    const outer2 = new AbortController()
    const wake2 = createCapacityWake(outer2.signal)
    const { signal: s2 } = wake2.signal()
    wake2.wake()
    expect(s2.aborted).toBe(true)
  })

  test('cleanup() removes listeners — outer abort no longer triggers merged', () => {
    // Tras cleanup, los listeners de abort se remueven. Un abort
    // subsecuente del outer NO debe propagar a la señal fusionada (que
    // no estaba abortada, así que se queda sin abortar).
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    const { signal, cleanup } = wake.signal()
    cleanup()
    outer.abort()
    expect(signal.aborted).toBe(false)
  })

  test('cleanup() removes wake listener — wake() no longer triggers merged', () => {
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    const { signal, cleanup } = wake.signal()
    cleanup()
    wake.wake()
    expect(signal.aborted).toBe(false)
  })

  test('cleanup() is idempotent — calling twice is safe', () => {
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    const { cleanup } = wake.signal()
    expect(() => {
      cleanup()
      cleanup()
    }).not.toThrow()
  })
})

describe('isolation — multiple wakes on same outer', () => {
  test('two CapacityWakes on the same outer signal are independent', () => {
    // Sanidad: dos poll loops que comparten el mismo abort externo
    // pueden tener sus propios capacity wakes. wake() en uno no afecta
    // al otro.
    const outer = new AbortController()
    const wakeA = createCapacityWake(outer.signal)
    const wakeB = createCapacityWake(outer.signal)
    const { signal: sA } = wakeA.signal()
    const { signal: sB } = wakeB.signal()
    wakeA.wake()
    expect(sA.aborted).toBe(true)
    expect(sB.aborted).toBe(false)
  })

  test('outer abort fires BOTH wakes (shared upstream)', () => {
    const outer = new AbortController()
    const wakeA = createCapacityWake(outer.signal)
    const wakeB = createCapacityWake(outer.signal)
    const { signal: sA } = wakeA.signal()
    const { signal: sB } = wakeB.signal()
    outer.abort()
    expect(sA.aborted).toBe(true)
    expect(sB.aborted).toBe(true)
  })
})

describe('AbortSignal listener leak prevention', () => {
  // Cada llamada a signal() agrega 2 listeners (outer + wake). Sin
  // cleanup, los poll loops de larga duración perderían ~2 listeners
  // por iteración. La opción `{ once: true }` ayuda pero sólo dispara
  // una vez por abort; si la señal nunca se aborta (el sleep termina
  // normal), hace falta cleanup.

  test('cleanup() unregisters listeners — repeated cycles do not leak', () => {
    const outer = new AbortController()
    const wake = createCapacityWake(outer.signal)
    // Simula 100 ciclos de sleep. Cada uno llama signal(), luego cleanup().
    // Si cleanup pierde listeners, esto ralentizaría o daría warning.
    for (let i = 0; i < 100; i++) {
      const { cleanup } = wake.signal()
      cleanup()
    }
    // Ahora aborta el outer — ninguna de las señales fusionadas (ya
    // limpiadas) debería tener listeners disparándose. Sólo verifica
    // que no haya crash / excepción.
    expect(() => outer.abort()).not.toThrow()
  })
})
