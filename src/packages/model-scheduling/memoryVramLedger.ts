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

interface DeviceShortfall {
  readonly device: string
  readonly freeMib: number
}

export function createMemoryVramLedger(options: MemoryVramLedgerOptions): FencedVramLedger {
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
    return capacityOf(device) - reservedOn(device)
  }

  /** La generación vigente de la residencia si la petición es más vieja; si no, `undefined`. */
  function supersedingGeneration(request: VramReservationRequest): number | undefined {
    const highest = highestGeneration.get(request.residencyKey)
    return highest !== undefined && request.generation < highest ? highest : undefined
  }

  function firstShortfall(request: VramReservationRequest): DeviceShortfall | undefined {
    for (const device of request.devices) {
      const freeMib = freeOn(device)
      if (freeMib < request.vramMib) return { device, freeMib }
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

  return {
    async reserve(request: VramReservationRequest): Promise<ReservationOutcome> {
      const currentGeneration = supersedingGeneration(request)
      if (currentGeneration !== undefined) return { status: 'stale_generation', currentGeneration }
      const shortfall = firstShortfall(request)
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
}
