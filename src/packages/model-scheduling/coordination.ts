/**
 * El puerto de coordinación del scheduling de modelos (ADR-007 1.11.0 y
 * 1.12.0): quién tiene derecho temporal a coordinar una residencia o a mutarla.
 * Nunca es la verdad de residencia, ni una reserva, ni una autorización (M13).
 *
 * Cada adquisición del lease de propiedad de una residencia sube su
 * generación, que es el fencing de toda la cadena: la reserva de VRAM, el grant
 * y la primitiva rechazan una generación vieja aunque su dueño siga vivo (M19).
 * Es la misma semántica que `pool_lifecycle` aplica a los ítems de pool, con la
 * generación obligatoria.
 *
 * La topología la declara el scheduler, no el proxy:
 * `THYROX_MODEL_SCHEDULING_COORDINATION` = `local` (una sola autoridad,
 * coordinación en el proceso) o `shared` (varios coordinadores, Redis
 * obligatorio; sin Redis, nuevas admisiones rehusadas).
 */

export type CoordinationTopology = 'local' | 'shared'

export const COORDINATION_TOPOLOGY_ENV = 'THYROX_MODEL_SCHEDULING_COORDINATION'
const DEFAULT_TOPOLOGY: CoordinationTopology = 'local'
const TOPOLOGIES: readonly CoordinationTopology[] = ['local', 'shared']

export class InvalidCoordinationTopologyError extends Error {
  constructor(readonly value: string) {
    super(`${COORDINATION_TOPOLOGY_ENV}=${value} no es una topología: se declara local o shared`)
    this.name = 'InvalidCoordinationTopologyError'
  }
}

/** La topología declarada, `local` si no se declara. Nunca se deduce del proxy ni de Redis. */
export function coordinationTopologyOf(env: Readonly<Record<string, string | undefined>>): CoordinationTopology {
  const value = env[COORDINATION_TOPOLOGY_ENV]?.trim()
  if (!value) return DEFAULT_TOPOLOGY
  if (!TOPOLOGIES.includes(value as CoordinationTopology)) throw new InvalidCoordinationTopologyError(value)
  return value as CoordinationTopology
}

/** El lease de propiedad de una residencia o el lock de una mutación sobre ella. */
export interface GenerationLease {
  readonly kind: 'residency' | 'mutation'
  /** La residencia, p. ej. `residency/<modelo>/<placement>`. */
  readonly residencyKey: string
  readonly owner: string
  /** La generación de la residencia en el momento de adquirir. */
  readonly generation: number
}

export type MutationOperation = 'load' | 'evict'

export type LeaseAcquisition =
  | { readonly status: 'acquired'; readonly lease: GenerationLease }
  | { readonly status: 'held'; readonly holder: string }
  | { readonly status: 'stale'; readonly currentGeneration: number }
  | { readonly status: 'unavailable'; readonly reason: string }

/** `stale`: la generación del lease ya no es la vigente, aunque su dueño viva. */
export type LeaseValidity = 'current' | 'stale' | 'unavailable'

export interface ModelSchedulingCoordination {
  readonly topology: CoordinationTopology
  /** Toma la propiedad de una residencia libre o caducada; cada adquisición sube su generación. */
  acquireResidency(residencyKey: string, owner: string, ttlMs: number): Promise<LeaseAcquisition>
  /** Renueva sin cambiar la generación; un lease caducado o tomado por otro es `stale`. */
  renew(lease: GenerationLease, ttlMs: number): Promise<LeaseValidity>
  /** Si el lease sigue siendo el vigente: mismo dueño y misma generación. */
  validity(lease: GenerationLease): Promise<LeaseValidity>
  /** Suelta el lease sólo si sigue siendo el vigente. */
  release(lease: GenerationLease): Promise<LeaseValidity>
  /**
   * Toma el lock de una mutación concreta sobre una residencia cuya propiedad
   * tiene el que pide. Es otro lease: no renueva la propiedad ni la suelta.
   */
  acquireMutation(residency: GenerationLease, operation: MutationOperation, ttlMs: number): Promise<LeaseAcquisition>
  /** La generación vigente de una residencia, para que la primitiva valide un grant sin conocer a su dueño. */
  currentGeneration(residencyKey: string): Promise<number | 'unavailable'>
  close(): Promise<void>
}
