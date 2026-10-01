/**
 * La reserva de VRAM del scheduling, con fencing por generación (ADR-007
 * 1.12.0). Responde qué VRAM está reservada por dispositivo y puede admitirse;
 * no elige modelo ni placement.
 *
 * A diferencia de `gpu_monitor`, que reserva por PID del dueño, aquí cada
 * reserva lleva la generación de su residencia: una reserva con una generación
 * menor que la mayor vista para esa residencia se rechaza aunque su dueño viva.
 */

export interface VramReservationRequest {
  readonly residencyKey: string
  readonly owner: string
  readonly generation: number
  /** UUID de cada dispositivo; vacío en CPU. */
  readonly devices: readonly string[]
  /** MiB por dispositivo; 0 en CPU. */
  readonly vramMib: number
}

export interface VramReservation extends VramReservationRequest {
  readonly reservationId: string
}

export type ReservationOutcome =
  | { readonly status: 'reserved'; readonly reservation: VramReservation }
  | { readonly status: 'stale_generation'; readonly currentGeneration: number }
  | { readonly status: 'insufficient'; readonly device: string; readonly freeMib: number; readonly requestedMib: number }

export interface FencedVramLedger {
  reserve(request: VramReservationRequest): Promise<ReservationOutcome>
  release(reservation: VramReservation): Promise<'released' | 'absent'>
  reservations(): Promise<readonly VramReservation[]>
}

/**
 * VRAM incremental de una petición sobre una residencia ya reservada (ADR-007
 * 1.13.0): la residencia se reserva una vez, cada petición concurrente se
 * admite aparte. Tres peticiones sobre 6 GiB con 1 GiB incremental son
 * 6 + 3 × 1, nunca 3 × 6.
 */
export interface RequestAllocation {
  readonly allocationId: string
  readonly reservationId: string
  readonly requestId: string
  readonly generation: number
  readonly vramMib: number
}

export type RequestAllocationOutcome =
  | { readonly status: 'allocated'; readonly allocation: RequestAllocation }
  | { readonly status: 'stale_generation'; readonly currentGeneration: number }
  | { readonly status: 'absent' }
  | { readonly status: 'insufficient'; readonly device: string; readonly freeMib: number; readonly requestedMib: number }

/** El ledger con asignaciones por petición sobre la reserva de una residencia. */
export interface ResidencyVramLedger extends FencedVramLedger {
  allocateRequest(reservation: VramReservation, requestId: string, vramMib: number): Promise<RequestAllocationOutcome>
  releaseRequest(allocation: RequestAllocation): Promise<'released' | 'absent'>
  allocations(): Promise<readonly RequestAllocation[]>
}
