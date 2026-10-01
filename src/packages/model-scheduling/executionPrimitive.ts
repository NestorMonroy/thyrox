/**
 * Los dos puertos que quedan después del grant (ADR-007 1.10.0–1.12.0): la
 * primitiva materializa un `ExecutionGrant` vigente en una `ExecutionUnit`, y
 * el adapter del runtime sólo habla con el runtime desde esa unidad.
 *
 * Ninguno decide: la primitiva rechaza un grant caducado o de una generación
 * que ya no es la vigente (M17, M19), y el adapter no conoce otro endpoint que
 * el de la unidad. Así `ningún grant → ninguna unidad → ninguna ejecución
 * local` sale de los tipos, no de un control posterior.
 */
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'

/**
 * La ejecución que la primitiva creó a partir de un grant: una identidad, no
 * sólo un endpoint (ADR-007 1.13.0). Es el único sitio donde vive el endpoint
 * de un runtime local, y su relación con la residencia es 1:1 en la topología A.
 */
export interface ExecutionUnit {
  readonly unitId: string
  readonly grantId: string
  readonly model: string
  readonly residencyKey: string
  readonly generation: number
  readonly runtime: ExecutionGrant['runtime']
  /** Base URL del runtime de esta unidad, en loopback. */
  readonly endpoint: string
  readonly containerId: string
  /** UUID de los dispositivos concedidos; vacío en CPU. */
  readonly devices: readonly string[]
  /** El cgroup del contenedor visto desde el anfitrión, si Podman lo informa. */
  readonly cgroup?: string
  /** PIDs del runtime vistos desde el anfitrión. */
  readonly hostPids: readonly number[]
  /** Instante ISO 8601 en UTC. */
  readonly createdAt: string
}

/**
 * Lo que un runtime declara que thyrox puede controlar por residencia. Una
 * unidad con varias residencias (topología B) sólo se evalúa si TODAS son
 * verdaderas; Ollama las declara en falso.
 */
export interface RuntimeCapabilities {
  readonly multipleResidencies: boolean
  readonly explicitLoad: boolean
  readonly explicitUnload: boolean
  readonly perResidencyIdentity: boolean
  readonly residencyObservation: boolean
  readonly placementEnforceable: boolean
}

/** Si el runtime deja a thyrox gobernar varias residencias en una unidad sin cederle autoridad. */
export function admitsSharedUnits(capabilities: RuntimeCapabilities): boolean {
  return Object.values(capabilities).every(Boolean)
}

export type MaterializationOutcome =
  | { readonly status: 'materialized'; readonly unit: ExecutionUnit }
  | { readonly status: 'rejected'; readonly reason: 'stale_generation' | 'expired_grant'; readonly detail: string }
  /** `partial`: quedó algo creado que hay que retirar. */
  | { readonly status: 'failed'; readonly reason: string; readonly partial: boolean; readonly unitId?: string }

export interface ModelExecutionPrimitive {
  materialize(grant: ExecutionGrant): Promise<MaterializationOutcome>
  retire(unitId: string): Promise<'retired' | 'absent' | 'failed'>
  /** Las unidades de modelo que existen, para reconciliar. */
  units(): Promise<readonly ExecutionUnit[]>
}

export type RuntimeLoadOutcome = { readonly status: 'loaded' } | { readonly status: 'failed'; readonly reason: string }

/** `stale_generation`: la unidad pertenece a una generación que ya no es la vigente. */
export type RuntimeOperationOutcome =
  | { readonly status: 'ok' }
  | { readonly status: 'stale_generation'; readonly currentGeneration: number | 'unavailable' }
  | { readonly status: 'failed'; readonly reason: string }

/** Lo que el runtime sirve bajo el nombre del grant, comparado con lo que el grant autoriza. */
export type RuntimeVerification =
  | { readonly status: 'matches' }
  | { readonly status: 'mismatch'; readonly expectedSha256: string; readonly observedSha256: string | undefined }
  | { readonly status: 'failed'; readonly reason: string }

/**
 * Traduce la ejecución concedida al protocolo del runtime y sólo habla con el
 * endpoint de una `ExecutionUnit`. Toda operación que muta rechaza una unidad
 * de una generación vieja (ADR-007 1.13.0).
 */
export interface RuntimeAdapter {
  readonly capabilities: RuntimeCapabilities
  /** Espera a que el runtime de la unidad responda. */
  awaitHealthy(unit: ExecutionUnit): Promise<RuntimeOperationOutcome>
  load(unit: ExecutionUnit, grant: ExecutionGrant): Promise<RuntimeLoadOutcome>
  /** Modelo, revisión y cuantización exactos: el contenido servido bajo el nombre es el sha256 del grant. */
  verify(unit: ExecutionUnit, grant: ExecutionGrant): Promise<RuntimeVerification>
  unload(unit: ExecutionUnit): Promise<RuntimeOperationOutcome>
  /** Qué modelo sirve la unidad, observado en el runtime; `undefined` si ninguno. */
  loadedModel(unit: ExecutionUnit): Promise<string | undefined>
}
