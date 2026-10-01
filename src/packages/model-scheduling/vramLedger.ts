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
