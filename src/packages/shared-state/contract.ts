/**
 * La suite de contrato de `SharedStateStore`: cada adaptador la ejecuta
 * desde su propia prueba con su fábrica. Mide la semántica que los
 * consumidores dan por supuesta, no la implementación: si `memory` y `redis`
 * la pasan los dos, un proxy puede cambiar de uno a otro sin cambiar de
 * conducta.
 *
 * Los plazos son cortos y reales: el adaptador `redis` usa el reloj del
 * servidor, así que no hay reloj inyectable común a los dos.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import type { SharedStateStore } from './port.ts'

const SHORT_TTL_MS = 60
const PAST_SHORT_TTL_MS = 150

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function describeSharedStateStoreContract(label: string, create: () => Promise<SharedStateStore>): void {
  describe(`contrato de SharedStateStore: ${label}`, () => {
    let store: SharedStateStore
    let prefix: string

    beforeEach(async () => {
      store = await create()
      prefix = `contract:${crypto.randomUUID()}:`
    })

    afterEach(async () => {
      await store.close()
    })

    test('incrementWindow acumula dentro de la ventana y cuenta 1 por omisión', async () => {
      expect(await store.incrementWindow(`${prefix}w`, 10_000)).toBe(1)
      expect(await store.incrementWindow(`${prefix}w`, 10_000, 4)).toBe(5)
    })

    test('incrementWindow vuelve a cero en una ventana nueva', async () => {
      await store.incrementWindow(`${prefix}w`, SHORT_TTL_MS, 3)
      await sleep(PAST_SHORT_TTL_MS)
      expect(await store.incrementWindow(`${prefix}w`, SHORT_TTL_MS)).toBe(1)
    })

    test('las claves no se mezclan', async () => {
      await store.incrementWindow(`${prefix}a`, 10_000, 2)
      expect(await store.incrementWindow(`${prefix}b`, 10_000)).toBe(1)
    })

    test('un lease tomado no lo obtiene otro dueño', async () => {
      expect(await store.acquireLease(`${prefix}l`, 'p1', 10_000)).toBe(true)
      expect(await store.acquireLease(`${prefix}l`, 'p2', 10_000)).toBe(false)
    })

    test('el mismo dueño lo vuelve a obtener y lo renueva', async () => {
      expect(await store.acquireLease(`${prefix}l`, 'p1', SHORT_TTL_MS)).toBe(true)
      expect(await store.acquireLease(`${prefix}l`, 'p1', 10_000)).toBe(true)
      await sleep(PAST_SHORT_TTL_MS)
      expect(await store.acquireLease(`${prefix}l`, 'p2', 10_000)).toBe(false)
    })

    test('un lease caducado queda libre', async () => {
      await store.acquireLease(`${prefix}l`, 'p1', SHORT_TTL_MS)
      await sleep(PAST_SHORT_TTL_MS)
      expect(await store.acquireLease(`${prefix}l`, 'p2', 10_000)).toBe(true)
    })

    test('releaseLease sólo suelta el lease de su dueño', async () => {
      await store.acquireLease(`${prefix}l`, 'p1', 10_000)
      expect(await store.releaseLease(`${prefix}l`, 'p2')).toBe(false)
      expect(await store.acquireLease(`${prefix}l`, 'p2', 10_000)).toBe(false)
      expect(await store.releaseLease(`${prefix}l`, 'p1')).toBe(true)
      expect(await store.acquireLease(`${prefix}l`, 'p2', 10_000)).toBe(true)
    })

    test('releaseLease sobre un lease inexistente devuelve false', async () => {
      expect(await store.releaseLease(`${prefix}nadie`, 'p1')).toBe(false)
    })

    test('setWithTtl guarda y getWithTtl devuelve null al caducar', async () => {
      expect(await store.getWithTtl(`${prefix}v`)).toBeNull()
      await store.setWithTtl(`${prefix}v`, 'valor', SHORT_TTL_MS)
      expect(await store.getWithTtl(`${prefix}v`)).toBe('valor')
      await sleep(PAST_SHORT_TTL_MS)
      expect(await store.getWithTtl(`${prefix}v`)).toBeNull()
    })
  })
}
