/**
 * VRAM de residencia y de petición (ADR-007 1.13.0): la residencia se reserva
 * una vez y cada petición concurrente es una asignación incremental.
 *
 * Qué haría fallar a esta suite: contar la VRAM de la residencia por petición
 * (3 × 6 GiB), admitir una petición sobre una reserva que no existe o de una
 * generación vieja, o no devolver la VRAM de una petición al soltarla.
 */
import { describe, expect, test } from 'bun:test'

import { createMemoryResidencyVramLedger } from '../memoryVramLedger.ts'
import type { VramReservation } from '../vramLedger.ts'

const GPU = 'GPU-0'
const RESIDENCY_MIB = 6_144
const REQUEST_MIB = 1_024

async function reserveResidency(capacityMib: number) {
  const ledger = createMemoryResidencyVramLedger({ capacityMib: { [GPU]: capacityMib } })
  const outcome = await ledger.reserve({ residencyKey: 'residency/qwen/gpu0', owner: 'coordinator-a', generation: 1, devices: [GPU], vramMib: RESIDENCY_MIB })
  if (outcome.status !== 'reserved') throw new Error(outcome.status)
  return { ledger, reservation: outcome.reservation }
}

describe('ResidencyVramLedger en memoria', () => {
  test('tres peticiones sobre una residencia son 6 GiB + 3 × 1 GiB, no 3 × 6 GiB', async () => {
    const { ledger, reservation } = await reserveResidency(RESIDENCY_MIB + 3 * REQUEST_MIB)
    for (const requestId of ['a', 'b', 'c']) {
      expect((await ledger.allocateRequest(reservation, requestId, REQUEST_MIB)).status).toBe('allocated')
    }
    expect((await ledger.reservations()).length).toBe(1)
    expect((await ledger.allocations()).length).toBe(3)
    expect(await ledger.allocateRequest(reservation, 'd', REQUEST_MIB))
      .toEqual({ status: 'insufficient', device: GPU, freeMib: 0, requestedMib: REQUEST_MIB })
  })

  test('soltar una petición devuelve su VRAM incremental', async () => {
    const { ledger, reservation } = await reserveResidency(RESIDENCY_MIB + REQUEST_MIB)
    const first = await ledger.allocateRequest(reservation, 'a', REQUEST_MIB)
    if (first.status !== 'allocated') throw new Error(first.status)
    expect(await ledger.releaseRequest(first.allocation)).toBe('released')
    expect(await ledger.releaseRequest(first.allocation)).toBe('absent')
    expect((await ledger.allocateRequest(reservation, 'b', REQUEST_MIB)).status).toBe('allocated')
  })

  test('una petición sobre una reserva soltada es absent', async () => {
    const { ledger, reservation } = await reserveResidency(RESIDENCY_MIB)
    await ledger.release(reservation)
    expect(await ledger.allocateRequest(reservation, 'a', 0)).toEqual({ status: 'absent' })
  })

  test('una petición sobre una reserva de generación vieja se rechaza', async () => {
    const { ledger, reservation } = await reserveResidency(2 * RESIDENCY_MIB)
    await ledger.reserve({ ...reservation, generation: 2, owner: 'coordinator-b' })
    const stale: VramReservation = reservation
    expect(await ledger.allocateRequest(stale, 'a', REQUEST_MIB)).toEqual({ status: 'stale_generation', currentGeneration: 2 })
  })

  test('el ledger de residencias conserva el contrato de FencedVramLedger', async () => {
    const { ledger } = await reserveResidency(RESIDENCY_MIB)
    expect(await ledger.reserve({ residencyKey: 'residency/qwen/gpu0', owner: 'coordinator-a', generation: 0, devices: [GPU], vramMib: 1 }))
      .toEqual({ status: 'stale_generation', currentGeneration: 1 })
  })
})
