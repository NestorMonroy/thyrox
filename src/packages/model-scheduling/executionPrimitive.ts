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

/** La ejecución que la primitiva creó a partir de un grant: el único sitio donde vive un endpoint de runtime local. */
export interface ExecutionUnit {
  readonly unitId: string
  readonly grantId: string
  readonly model: string
  readonly residencyKey: string
  readonly generation: number
  readonly runtime: ExecutionGrant['runtime']
  /** Base URL del runtime de esta unidad, en loopback. */
  readonly endpoint: string
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

export interface RuntimeAdapter {
  load(unit: ExecutionUnit, grant: ExecutionGrant): Promise<RuntimeLoadOutcome>
  /** Qué modelo sirve la unidad, observado en el runtime; `undefined` si ninguno. */
  loadedModel(unit: ExecutionUnit): Promise<string | undefined>
}
