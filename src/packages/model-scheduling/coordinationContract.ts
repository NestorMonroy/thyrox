/**
 * Contrato de `ModelSchedulingCoordination`, el mismo para `local` (memoria) y
 * `shared` (Redis). Fija la generación como fencing (ADR-007 1.12.0):
 *
 * - cada adquisición de una residencia sube su generación; renovar no;
 * - un lease caducado no se renueva aunque su dueño viva: es `stale` (M19);
 * - el lock de mutación es otro lease: exige la propiedad vigente y no la toca.
 *
 * Qué haría fallar a este contrato: una generación que no sube al cambiar de
 * dueño, un dueño caducado que sigue `current`, una mutación concedida con una
 * propiedad vieja, o soltar la mutación soltando también la propiedad.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import type { GenerationLease, ModelSchedulingCoordination } from './coordination.ts'

const LONG_TTL_MS = 10_000
const SHORT_TTL_MS = 60
const PAST_SHORT_TTL_MS = 150

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function acquired(coordination: ModelSchedulingCoordination, key: string, owner: string, ttlMs: number): Promise<GenerationLease> {
  const outcome = await coordination.acquireResidency(key, owner, ttlMs)
  if (outcome.status !== 'acquired') throw new Error(`se esperaba adquirir ${key}, salió ${outcome.status}`)
  return outcome.lease
}

export function describeCoordinationContract(label: string, create: () => Promise<ModelSchedulingCoordination>): void {
  describe(`contrato de ModelSchedulingCoordination: ${label}`, () => {
    let coordination: ModelSchedulingCoordination
    let key: string

    beforeEach(async () => {
      coordination = await create()
      key = `residency/${crypto.randomUUID()}/cpu`
    })

    afterEach(async () => {
      await coordination.close()
    })

    test('la primera adquisición da la generación 1 y otro dueño la ve ocupada', async () => {
      const lease = await acquired(coordination, key, 'coordinator-a', LONG_TTL_MS)
      expect(lease).toEqual({ kind: 'residency', residencyKey: key, owner: 'coordinator-a', generation: 1 })
      expect(await coordination.acquireResidency(key, 'coordinator-b', LONG_TTL_MS)).toEqual({ status: 'held', holder: 'coordinator-a' })
      expect(await coordination.currentGeneration(key)).toBe(1)
    })

    test('soltar y volver a adquirir sube la generación', async () => {
      const first = await acquired(coordination, key, 'coordinator-a', LONG_TTL_MS)
      expect(await coordination.release(first)).toBe('current')
      const second = await acquired(coordination, key, 'coordinator-b', LONG_TTL_MS)
      expect(second.generation).toBe(2)
      expect(await coordination.validity(first)).toBe('stale')
    })

    test('renovar el lease vigente conserva la generación', async () => {
      const lease = await acquired(coordination, key, 'coordinator-a', SHORT_TTL_MS)
      expect(await coordination.renew(lease, LONG_TTL_MS)).toBe('current')
      await sleep(PAST_SHORT_TTL_MS)
      expect(await coordination.validity(lease)).toBe('current')
      expect(await coordination.currentGeneration(key)).toBe(1)
    })

    test('un lease caducado con su dueño vivo queda stale y no se renueva (M19)', async () => {
      const lost = await acquired(coordination, key, 'coordinator-a', SHORT_TTL_MS)
      await sleep(PAST_SHORT_TTL_MS)
      const taken = await acquired(coordination, key, 'coordinator-b', LONG_TTL_MS)
      expect(taken.generation).toBe(2)
      expect(await coordination.validity(lost)).toBe('stale')
      expect(await coordination.renew(lost, LONG_TTL_MS)).toBe('stale')
      expect(await coordination.release(lost)).toBe('stale')
      expect(await coordination.validity(taken)).toBe('current')
    })

    test('un lease caducado sin nadie que lo tome tampoco se renueva: hay que readquirir', async () => {
      const lost = await acquired(coordination, key, 'coordinator-a', SHORT_TTL_MS)
      await sleep(PAST_SHORT_TTL_MS)
      expect(await coordination.renew(lost, LONG_TTL_MS)).toBe('stale')
      const again = await acquired(coordination, key, 'coordinator-a', LONG_TTL_MS)
      expect(again.generation).toBe(2)
    })

    test('el lock de mutación exige la propiedad vigente y es otro lease', async () => {
      const residency = await acquired(coordination, key, 'coordinator-a', LONG_TTL_MS)
      const load = await coordination.acquireMutation(residency, 'load', LONG_TTL_MS)
      if (load.status !== 'acquired') throw new Error(`se esperaba el lock de carga, salió ${load.status}`)
      expect(load.lease).toEqual({ kind: 'mutation', residencyKey: key, owner: 'coordinator-a', generation: 1 })
      expect((await coordination.acquireMutation(residency, 'evict', LONG_TTL_MS)).status).toBe('held')
      expect(await coordination.release(load.lease)).toBe('current')
      expect(await coordination.validity(residency)).toBe('current')
      expect((await coordination.acquireMutation(residency, 'evict', LONG_TTL_MS)).status).toBe('acquired')
    })

    test('una propiedad vieja no obtiene el lock de mutación', async () => {
      const lost = await acquired(coordination, key, 'coordinator-a', SHORT_TTL_MS)
      await sleep(PAST_SHORT_TTL_MS)
      await acquired(coordination, key, 'coordinator-b', LONG_TTL_MS)
      expect(await coordination.acquireMutation(lost, 'load', LONG_TTL_MS)).toEqual({ status: 'stale', currentGeneration: 2 })
    })

    test('una residencia nunca adquirida tiene generación 0', async () => {
      expect(await coordination.currentGeneration(key)).toBe(0)
    })
  })
}
