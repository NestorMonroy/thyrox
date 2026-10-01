/**
 * `ModelScheduler`: decide y encadena, con sus compensaciones, la ejecución de
 * un modelo local gestionado (ADR-007 1.10.0–1.12.0).
 *
 *   lease de residencia (generación N) → reserva de VRAM (N) → ExecutionGrant (N)
 *     → PodmanExecutionPrimitive.materialize → ExecutionUnit → RuntimeAdapter.load
 *
 * Cada paso que falla deshace los anteriores en orden inverso; lo que no se
 * puede deshacer se devuelve marcado para reconciliación, nunca se calla (M18).
 * Antes del primer grant reconcilia unidades, reservas y runtime (M20), y tras
 * una coordinación no disponible congela las admisiones hasta reconciliar otra
 * vez. No mata ejecuciones materializadas por una caída de la coordinación.
 */
import type { CatalogArtifact } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { ExecutionGrant, ExecutionPlacement, ModelRuntime } from '@thyrox/model-artifacts/executionGrant.ts'
import type { KvCacheType } from '@thyrox/model-artifacts/memoryEstimate.ts'

import type { GenerationLease, ModelSchedulingCoordination } from './coordination.ts'
import type { ExecutionUnit, ModelExecutionPrimitive, RuntimeAdapter } from './executionPrimitive.ts'
import type { FencedVramLedger, VramReservation } from './vramLedger.ts'

/** Lo que el resolver y el planner ya decidieron; el scheduler añade generación, reserva y grant. */
export interface ExecutionPlan {
  readonly requestId: string
  /** Identidad de este coordinador: dueño del lease y de la reserva. */
  readonly owner: string
  readonly residencyKey: string
  readonly model: string
  readonly revision: string
  readonly artifact: CatalogArtifact
  readonly runtime: ModelRuntime
  readonly placement: ExecutionPlacement
  readonly residencyVramMib: number
  readonly requestVramMib: number
  readonly contextLength: number
  readonly kvCacheType: KvCacheType
}

export type IssueOutcome = { readonly status: 'issued'; readonly grant: ExecutionGrant } | { readonly status: 'failed'; readonly reason: string }

/** Emite y revoca grants; un grant revocado no autoriza nada aunque no haya caducado. */
export interface GrantIssuer {
  issue(plan: ExecutionPlan, generation: number): Promise<IssueOutcome>
  revoke(grantId: string): Promise<'revoked' | 'absent'>
}

export type ScheduleStage = 'reconcile' | 'lease' | 'reserve' | 'grant' | 'materialize' | 'load'

/** Algo que una compensación no pudo deshacer y queda para la reconciliación. */
export interface ReconciliationMark {
  readonly resource: 'lease' | 'reservation' | 'grant' | 'unit'
  readonly id: string
  readonly reason: string
}

export type ScheduleOutcome =
  | {
      readonly status: 'executing'
      readonly lease: GenerationLease
      readonly reservation: VramReservation
      readonly grant: ExecutionGrant
      readonly unit: ExecutionUnit
    }
  /** Rehusado antes de crear nada. */
  | { readonly status: 'refused'; readonly stage: ScheduleStage; readonly reason: string }
  /** Falló tras crear algo; todo lo creado se deshizo salvo lo marcado. */
  | { readonly status: 'failed'; readonly stage: ScheduleStage; readonly reason: string; readonly marks: readonly ReconciliationMark[] }

export interface ReconciliationReport {
  readonly units: readonly ExecutionUnit[]
  readonly reservations: readonly VramReservation[]
  readonly marks: readonly ReconciliationMark[]
}

export interface ModelSchedulerDependencies {
  readonly coordination: ModelSchedulingCoordination
  readonly ledger: FencedVramLedger
  readonly issuer: GrantIssuer
  readonly primitive: ModelExecutionPrimitive
  readonly runtime: RuntimeAdapter
  readonly leaseTtlMs: number
}

export class ModelScheduler {
  constructor(private readonly dependencies: ModelSchedulerDependencies) {}

  /** Lo que sobrevivió a un coordinador anterior: unidades, reservas y lo que el runtime sirve. */
  async reconcile(): Promise<ReconciliationReport> {
    void this.dependencies
    throw new Error('ModelScheduler.reconcile: por implementar')
  }

  async execute(_plan: ExecutionPlan): Promise<ScheduleOutcome> {
    throw new Error('ModelScheduler.execute: por implementar')
  }
}
