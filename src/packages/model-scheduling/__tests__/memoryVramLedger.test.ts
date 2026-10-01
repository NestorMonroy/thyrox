/**
 * El ledger de VRAM con fencing por generación (ADR-007 1.12.0).
 *
 * Qué haría fallar a esta suite: admitir más de la capacidad de un
 * dispositivo, aceptar una generación menor que la mayor vista para su
 * residencia aunque su dueño viva, o no devolver la VRAM al soltar.
 */
import { describe, expect, test } from 'bun:test'

import { createMemoryVramLedger } from '../memoryVramLedger.ts'
import type { VramReservationRequest } from '../vramLedger.ts'

const GPU = 'GPU-0'

function request(overrides: Partial<VramReservationRequest> = {}): VramReservationRequest {
  return { residencyKey: 'residency/qwen/gpu0', owner: 'coordinator-a', generation: 1, devices: [GPU], vramMib: 4_000, ...overrides }
}

describe('FencedVramLedger en memoria', () => {
  test('reserva dentro de la capacidad y la lista', async () => {
    const ledger = createMemoryVramLedger({ capacityMib: { [GPU]: 8_000 } })
    const outcome = await ledger.reserve(request())
    expect(outcome.status).toBe('reserved')
    expect((await ledger.reservations()).length).toBe(1)
  })

  test('rehúsa lo que no cabe, nombrando dispositivo, libre y pedido', async () => {
    const ledger = createMemoryVramLedger({ capacityMib: { [GPU]: 8_000 } })
    await ledger.reserve(request({ residencyKey: 'residency/a/gpu0' }))
    expect(await ledger.reserve(request({ residencyKey: 'residency/b/gpu0', vramMib: 5_000 })))
      .toEqual({ status: 'insufficient', device: GPU, freeMib: 4_000, requestedMib: 5_000 })
  })

  test('una generación menor que la mayor vista se rechaza aunque su dueño viva (M19)', async () => {
    const ledger = createMemoryVramLedger({ capacityMib: { [GPU]: 16_000 } })
    expect((await ledger.reserve(request({ owner: 'coordinator-b', generation: 2 }))).status).toBe('reserved')
    expect(await ledger.reserve(request({ owner: 'coordinator-a', generation: 1 })))
      .toEqual({ status: 'stale_generation', currentGeneration: 2 })
  })

  test('soltar devuelve la VRAM, y soltar dos veces es absent', async () => {
    const ledger = createMemoryVramLedger({ capacityMib: { [GPU]: 4_000 } })
    const first = await ledger.reserve(request())
    if (first.status !== 'reserved') throw new Error(first.status)
    expect(await ledger.release(first.reservation)).toBe('released')
    expect(await ledger.release(first.reservation)).toBe('absent')
    expect((await ledger.reserve(request({ generation: 2 }))).status).toBe('reserved')
  })

  test('soltar la reserva no olvida la generación: una vieja sigue rechazada (M19)', async () => {
    const ledger = createMemoryVramLedger({ capacityMib: { [GPU]: 8_000 } })
    const current = await ledger.reserve(request({ owner: 'coordinator-b', generation: 2 }))
    if (current.status !== 'reserved') throw new Error(current.status)
    expect(await ledger.release(current.reservation)).toBe('released')
    expect(await ledger.reserve(request({ owner: 'coordinator-a', generation: 1 })))
      .toEqual({ status: 'stale_generation', currentGeneration: 2 })
  })

  test('en CPU no hay VRAM que reservar, pero la generación sigue mandando', async () => {
    const ledger = createMemoryVramLedger({ capacityMib: {} })
    const cpu = request({ residencyKey: 'residency/qwen/cpu', devices: [], vramMib: 0 })
    expect((await ledger.reserve({ ...cpu, generation: 3 })).status).toBe('reserved')
    expect(await ledger.reserve({ ...cpu, generation: 2 })).toEqual({ status: 'stale_generation', currentGeneration: 3 })
  })

  test('un dispositivo sin capacidad declarada no admite nada', async () => {
    const ledger = createMemoryVramLedger({ capacityMib: {} })
    expect(await ledger.reserve(request())).toEqual({ status: 'insufficient', device: GPU, freeMib: 0, requestedMib: 4_000 })
  })
})
