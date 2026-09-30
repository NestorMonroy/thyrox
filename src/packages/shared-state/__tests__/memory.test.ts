/**
 * Suite del adaptador `memory`: la suite de contrato compartida más los
 * bordes que sólo un reloj inyectado puede fijar con exactitud (el instante
 * mismo en que algo caduca, el cambio de ventana).
 */
import { describe, expect, test } from 'bun:test'

import { describeSharedStateStoreContract } from '../contract.ts'
import { createMemorySharedStateStore } from '../memory.ts'

describeSharedStateStoreContract('memory', async () => createMemorySharedStateStore())

describe('memory: bordes con reloj inyectado', () => {
  function clockStore() {
    let currentTime = 0
    const store = createMemorySharedStateStore({ now: () => currentTime })
    return {
      store,
      advanceTo(time: number) {
        currentTime = time
      },
    }
  }

  test('un lease caduca en su instante exacto, no un tick después', async () => {
    const { store, advanceTo } = clockStore()
    await store.acquireLease('l', 'p1', 100)
    advanceTo(99)
    expect(await store.acquireLease('l', 'p2', 100)).toBe(false)
    advanceTo(100)
    expect(await store.acquireLease('l', 'p2', 100)).toBe(true)
  })

  test('un valor caduca en su instante exacto, no un tick después', async () => {
    const { store, advanceTo } = clockStore()
    await store.setWithTtl('v', 'valor', 50)
    advanceTo(49)
    expect(await store.getWithTtl('v')).toBe('valor')
    advanceTo(50)
    expect(await store.getWithTtl('v')).toBeNull()
  })

  test('releaseLease sobre un lease ya caducado devuelve false', async () => {
    const { store, advanceTo } = clockStore()
    await store.acquireLease('l', 'p1', 100)
    advanceTo(100)
    expect(await store.releaseLease('l', 'p1')).toBe(false)
  })

  test('incrementWindow cambia de ventana exactamente en el múltiplo de windowMs', async () => {
    const { store, advanceTo } = clockStore()
    expect(await store.incrementWindow('w', 100, 3)).toBe(3)
    advanceTo(99)
    expect(await store.incrementWindow('w', 100)).toBe(4)
    advanceTo(100)
    expect(await store.incrementWindow('w', 100)).toBe(1)
  })

  test('incrementWindow rechaza by cero o negativo', async () => {
    const { store } = clockStore()
    await expect(store.incrementWindow('w', 100, 0)).rejects.toThrow()
    await expect(store.incrementWindow('w', 100, -1)).rejects.toThrow()
  })

  test('close vacía el estado: lo previo no sobrevive', async () => {
    const { store } = clockStore()
    await store.incrementWindow('w', 10_000, 5)
    await store.acquireLease('l', 'p1', 10_000)
    await store.setWithTtl('v', 'valor', 10_000)
    await store.close()
    expect(await store.incrementWindow('w', 10_000)).toBe(1)
    expect(await store.acquireLease('l', 'p2', 10_000)).toBe(true)
    expect(await store.getWithTtl('v')).toBeNull()
  })
})
