/**
 * Ledger de VRAM en el proceso, con capacidad declarada por dispositivo y
 * fencing por generación de residencia.
 *
 * La generación mayor vista se guarda por residencia y sobrevive a soltar la
 * reserva: una generación vieja no se rehabilita porque su sucesora terminó.
 * Sólo una reserva concedida fija esa generación; un rechazo no la mueve. El
 * fencing se evalúa antes que la capacidad, porque una reserva vieja no debe
 * llegar a competir por VRAM.
 */
import type {
  FencedVramLedger,
  RequestAllocation,
  RequestAllocationOutcome,
  ResidencyVramLedger,
  ReservationOutcome,
  VramReservation,
  VramReservationRequest,
} from './vramLedger.ts'

export interface MemoryVramLedgerOptions {
  /** MiB admisibles por UUID de dispositivo. */
  readonly capacityMib: Readonly<Record<string, number>>
}

const UNDECLARED_CAPACITY_MIB = 0
const RESERVATION_ID_PREFIX = 'vram-reservation-'
const ALLOCATION_ID_PREFIX = 'vram-allocation-'

interface DeviceShortfall {
  readonly device: string
  readonly freeMib: number
}

/** MiB comprometidos en un dispositivo fuera de las reservas del núcleo. */
type CommittedOutsideReservations = (device: string) => number

/**
 * El estado del ledger con fencing, expuesto a quien lo extiende: la reserva
 * activa por id, la generación que supera a una dada y la VRAM libre.
 */
interface FencedLedgerCore {
  readonly ledger: FencedVramLedger
  activeReservation(reservationId: string): VramReservation | undefined
  supersedingGeneration(residencyKey: string, generation: number): number | undefined
  firstShortfall(devices: readonly string[], vramMib: number): DeviceShortfall | undefined
}

const NOTHING_COMMITTED_OUTSIDE: CommittedOutsideReservations = () => 0

export function createMemoryVramLedger(options: MemoryVramLedgerOptions): FencedVramLedger {
  return createFencedLedgerCore(options, NOTHING_COMMITTED_OUTSIDE).ledger
}

/**
 * El ledger en memoria con asignaciones por petición (ADR-007 1.13.0). Cada
 * asignación cuenta contra la capacidad de los dispositivos de su reserva, y
 * soltar la reserva suelta con ella sus asignaciones.
 */
export function createMemoryResidencyVramLedger(options: MemoryVramLedgerOptions): ResidencyVramLedger {
  const allocations = new Map<string, RequestAllocation>()
  const core = createFencedLedgerCore(options, allocatedOn)
  let issued = 0

  function allocatedOn(device: string): number {
    let total = 0
    for (const allocation of allocations.values()) {
      if (core.activeReservation(allocation.reservationId)?.devices.includes(device)) total += allocation.vramMib
    }
    return total
  }

  function dropAllocationsOf(reservationId: string): void {
    for (const [allocationId, allocation] of allocations) {
      if (allocation.reservationId === reservationId) allocations.delete(allocationId)
    }
  }

  function grant(reservation: VramReservation, requestId: string, vramMib: number): RequestAllocation {
    issued += 1
    const allocation: RequestAllocation = {
      allocationId: `${ALLOCATION_ID_PREFIX}${issued}`,
      reservationId: reservation.reservationId,
      requestId,
      generation: reservation.generation,
      vramMib,
    }
    allocations.set(allocation.allocationId, allocation)
    return allocation
  }

  return {
    reserve: core.ledger.reserve,
    reservations: core.ledger.reservations,

    async release(reservation: VramReservation): Promise<'released' | 'absent'> {
      const outcome = await core.ledger.release(reservation)
      if (outcome === 'released') dropAllocationsOf(reservation.reservationId)
      return outcome
    },

    async allocateRequest(reservation: VramReservation, requestId: string, vramMib: number): Promise<RequestAllocationOutcome> {
      const currentGeneration = core.supersedingGeneration(reservation.residencyKey, reservation.generation)
      if (currentGeneration !== undefined) return { status: 'stale_generation', currentGeneration }
      const active = core.activeReservation(reservation.reservationId)
      if (active === undefined) return { status: 'absent' }
      const shortfall = core.firstShortfall(active.devices, vramMib)
      if (shortfall !== undefined) {
        return { status: 'insufficient', device: shortfall.device, freeMib: shortfall.freeMib, requestedMib: vramMib }
      }
      return { status: 'allocated', allocation: grant(active, requestId, vramMib) }
    },

    async releaseRequest(allocation: RequestAllocation): Promise<'released' | 'absent'> {
      return allocations.delete(allocation.allocationId) ? 'released' : 'absent'
    },

    async allocations(): Promise<readonly RequestAllocation[]> {
      return [...allocations.values()]
    },
  }
}

function createFencedLedgerCore(
  options: MemoryVramLedgerOptions,
  committedOutside: CommittedOutsideReservations,
): FencedLedgerCore {
  const active = new Map<string, VramReservation>()
  const highestGeneration = new Map<string, number>()
  let issued = 0

  function capacityOf(device: string): number {
    return options.capacityMib[device] ?? UNDECLARED_CAPACITY_MIB
  }

  function reservedOn(device: string): number {
    let total = 0
    for (const reservation of active.values()) {
      if (reservation.devices.includes(device)) total += reservation.vramMib
    }
    return total
  }

  function freeOn(device: string): number {
    return capacityOf(device) - reservedOn(device) - committedOutside(device)
  }

  /** La generación vigente de la residencia si la dada es más vieja; si no, `undefined`. */
  function supersedingGeneration(residencyKey: string, generation: number): number | undefined {
    const highest = highestGeneration.get(residencyKey)
    return highest !== undefined && generation < highest ? highest : undefined
  }

  function firstShortfall(devices: readonly string[], vramMib: number): DeviceShortfall | undefined {
    for (const device of devices) {
      const freeMib = freeOn(device)
      if (freeMib < vramMib) return { device, freeMib }
    }
    return undefined
  }

  function grant(request: VramReservationRequest): VramReservation {
    issued += 1
    const reservation: VramReservation = { ...request, reservationId: `${RESERVATION_ID_PREFIX}${issued}` }
    active.set(reservation.reservationId, reservation)
    highestGeneration.set(request.residencyKey, request.generation)
    return reservation
  }

  const ledger: FencedVramLedger = {
    async reserve(request: VramReservationRequest): Promise<ReservationOutcome> {
      const currentGeneration = supersedingGeneration(request.residencyKey, request.generation)
      if (currentGeneration !== undefined) return { status: 'stale_generation', currentGeneration }
      const shortfall = firstShortfall(request.devices, request.vramMib)
      if (shortfall !== undefined) {
        return { status: 'insufficient', device: shortfall.device, freeMib: shortfall.freeMib, requestedMib: request.vramMib }
      }
      return { status: 'reserved', reservation: grant(request) }
    },

    async release(reservation: VramReservation): Promise<'released' | 'absent'> {
      return active.delete(reservation.reservationId) ? 'released' : 'absent'
    },

    async reservations(): Promise<readonly VramReservation[]> {
      return [...active.values()]
    },
  }

  return {
    ledger,
    activeReservation: (reservationId) => active.get(reservationId),
    supersedingGeneration,
    firstShortfall,
  }
}
