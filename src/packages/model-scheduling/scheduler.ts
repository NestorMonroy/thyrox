/**
 * `ModelScheduler`: decide y encadena, con sus compensaciones, la ejecución de
 * un modelo local gestionado (ADR-007 1.10.0–1.12.0).
 *
 *   lease de residencia (generación N) → reserva de VRAM (N) → ExecutionGrant (N)
 *     → PodmanExecutionPrimitive.materialize → ModelExecutionUnit → RuntimeAdapter.load
 *
 * Cada paso que falla deshace los anteriores en orden inverso; lo que no se
 * puede deshacer se devuelve marcado para reconciliación, nunca se calla (M18).
 * Antes del primer grant reconcilia unidades, reservas y runtime (M20), y tras
 * una coordinación no disponible congela las admisiones hasta reconciliar otra
 * vez. No mata ejecuciones materializadas por una caída de la coordinación.
 */
import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'
import type { ExecutionGrant, ExecutionPlacement, ModelRuntime } from '@thyrox/model-artifacts/executionGrant.ts'
import type { KvCacheType } from '@thyrox/model-artifacts/memoryEstimate.ts'

import type { GenerationLease, LeaseAcquisition, ModelSchedulingCoordination } from './coordination.ts'
import type { ModelExecutionUnit, ExpectedResidency, ModelUnitMaterializer, RuntimeAdapter } from './modelUnitMaterializer.ts'
import type { FencedVramLedger, VramReservation } from './vramLedger.ts'

/** Lo que el resolver y el planner ya decidieron; el scheduler añade generación, reserva y grant. */
export interface ExecutionPlan {
  readonly requestId: string
  /** Identidad de este coordinador: dueño del lease y de la reserva. */
  readonly owner: string
  readonly residencyKey: string
  /** La identidad exacta que el resolver fijó. */
  readonly artifact: ResolvedModelArtifact
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
      readonly unit: ModelExecutionUnit
    }
  /** Rehusado antes de crear nada. */
  | { readonly status: 'refused'; readonly stage: ScheduleStage; readonly reason: string }
  /** Falló tras crear algo; todo lo creado se deshizo salvo lo marcado. */
  | { readonly status: 'failed'; readonly stage: ScheduleStage; readonly reason: string; readonly marks: readonly ReconciliationMark[] }

export interface ReconciliationReport {
  readonly units: readonly ModelExecutionUnit[]
  readonly reservations: readonly VramReservation[]
  readonly marks: readonly ReconciliationMark[]
}

export interface ModelSchedulerDependencies {
  readonly coordination: ModelSchedulingCoordination
  readonly ledger: FencedVramLedger
  readonly issuer: GrantIssuer
  readonly primitive: ModelUnitMaterializer
  readonly runtime: RuntimeAdapter
  readonly leaseTtlMs: number
}

/** Deshace un paso ya hecho; devuelve la marca si no pudo completarse. */
type Compensation = () => Promise<ReconciliationMark | undefined>

/**
 * Las compensaciones de una ejecución en curso: se apilan según se crea cada
 * recurso y se deshacen en orden inverso. Una que no se completa no detiene a
 * las siguientes: queda como marca (M18).
 */
export class CompensationStack {
  private readonly pending: Compensation[] = []

  push(compensation: Compensation): void {
    this.pending.push(compensation)
  }

  async unwind(): Promise<readonly ReconciliationMark[]> {
    const marks: ReconciliationMark[] = []
    for (const compensation of this.pending.reverse()) {
      const mark = await compensation()
      if (mark) marks.push(mark)
    }
    return marks
  }
}

/** Ejecuta una compensación y convierte su excepción en una marca con contexto. */
export async function markOnThrow(resource: ReconciliationMark['resource'], id: string, undo: () => Promise<ReconciliationMark | undefined>): Promise<ReconciliationMark | undefined> {
  try {
    return await undo()
  } catch (error) {
    return { resource, id, reason: `la compensación lanzó: ${error instanceof Error ? error.message : String(error)}` }
  }
}

function leaseId(lease: GenerationLease): string {
  return `${lease.residencyKey}#${lease.generation}`
}

/** Un grant `create` levanta la residencia y atiende la petición: reserva las dos. */
function reservedVramMib(plan: ExecutionPlan): number {
  return plan.residencyVramMib + plan.requestVramMib
}

function expectedResidencyOf(unit: ModelExecutionUnit): ExpectedResidency {
  return { residencyKey: unit.residencyKey, generation: unit.generation, artifact: unit.artifact }
}

export class ModelScheduler {
  /** M20: falso al arrancar y cada vez que la coordinación responde `unavailable`. */
  private reconciled = false

  constructor(private readonly dependencies: ModelSchedulerDependencies) {}

  /**
   * Lo que sobrevivió a un coordinador anterior: unidades, reservas y lo que
   * el runtime sirve. Sólo observa y marca; nunca retira nada.
   */
  async reconcile(): Promise<ReconciliationReport> {
    const units = await this.dependencies.primitive.units()
    const reservations = await this.dependencies.ledger.reservations()
    const marks: ReconciliationMark[] = []
    for (const unit of units) {
      const mark = await this.markUnitNotServing(unit)
      if (mark) marks.push(mark)
    }
    this.reconciled = true
    return { units, reservations, marks }
  }

  async execute(plan: ExecutionPlan): Promise<ScheduleOutcome> {
    if (!this.reconciled) await this.reconcile()
    const acquisition = await this.dependencies.coordination.acquireResidency(plan.residencyKey, plan.owner, this.dependencies.leaseTtlMs)
    if (acquisition.status !== 'acquired') return this.refuseLease(acquisition)
    const compensations = new CompensationStack()
    compensations.push(() => this.releaseLease(acquisition.lease))
    return this.reserveAndRun(plan, acquisition.lease, compensations)
  }

  private async markUnitNotServing(unit: ModelExecutionUnit): Promise<ReconciliationMark | undefined> {
    return markOnThrow('unit', unit.unitId, async () => {
      const observed = await this.dependencies.runtime.observeResidency(unit, expectedResidencyOf(unit))
      if (observed.status === 'resident') return undefined
      return { resource: 'unit', id: unit.unitId, reason: `el runtime de la unidad está ${observed.status}; el grant ${unit.grantId} es de ${unit.artifact.modelId}` }
    })
  }

  private refuseLease(acquisition: Exclude<LeaseAcquisition, { status: 'acquired' }>): ScheduleOutcome {
    if (acquisition.status === 'unavailable') {
      this.reconciled = false
      return { status: 'refused', stage: 'lease', reason: `coordinación no disponible: ${acquisition.reason}` }
    }
    const reason = acquisition.status === 'held' ? `la residencia la tiene ${acquisition.holder}` : `generación vieja, vigente ${acquisition.currentGeneration}`
    return { status: 'refused', stage: 'lease', reason }
  }

  private async reserveAndRun(plan: ExecutionPlan, lease: GenerationLease, compensations: CompensationStack): Promise<ScheduleOutcome> {
    const reserved = await this.dependencies.ledger.reserve({
      residencyKey: plan.residencyKey,
      owner: plan.owner,
      generation: lease.generation,
      devices: plan.placement.kind === 'gpu' ? plan.placement.devices : [],
      vramMib: reservedVramMib(plan),
    })
    if (reserved.status !== 'reserved') return this.fail('reserve', `la reserva salió ${reserved.status}`, compensations)
    compensations.push(() => this.releaseReservation(reserved.reservation))
    const issued = await this.dependencies.issuer.issue(plan, lease.generation)
    if (issued.status !== 'issued') return this.fail('grant', issued.reason, compensations)
    compensations.push(() => this.revokeGrant(issued.grant))
    return this.materializeAndLoad({ lease, reservation: reserved.reservation, grant: issued.grant }, compensations)
  }

  private async materializeAndLoad(
    held: { readonly lease: GenerationLease; readonly reservation: VramReservation; readonly grant: ExecutionGrant },
    compensations: CompensationStack,
  ): Promise<ScheduleOutcome> {
    const materialization = await this.dependencies.primitive.materialize(held.grant)
    if (materialization.status === 'rejected') return this.fail('materialize', `${materialization.reason}: ${materialization.detail}`, compensations)
    if (materialization.status === 'failed') {
      if (materialization.partial) compensations.push(() => this.retirePartialUnit(materialization.unitId, held.grant))
      return this.fail('materialize', materialization.reason, compensations)
    }
    const unit = materialization.unit
    compensations.push(() => this.retireUnit(unit.unitId))
    const binding = { unit, residencyKey: unit.residencyKey, generation: unit.generation }
    const loaded = await this.dependencies.runtime.loadResidency(binding, held.grant)
    if (loaded.status !== 'done') return this.fail('load', loaded.status === 'failed' ? loaded.reason : `generación vieja, vigente ${loaded.currentGeneration}`, compensations)
    return { status: 'executing', ...held, unit }
  }

  private async fail(stage: ScheduleStage, reason: string, compensations: CompensationStack): Promise<ScheduleOutcome> {
    return { status: 'failed', stage, reason, marks: await compensations.unwind() }
  }

  private retirePartialUnit(unitId: string | undefined, grant: ExecutionGrant): Promise<ReconciliationMark | undefined> {
    if (unitId === undefined) {
      return Promise.resolve({ resource: 'unit', id: grant.grantId, reason: 'materialización parcial sin unitId: la unidad del grant no se pudo retirar' })
    }
    return this.retireUnit(unitId)
  }

  private retireUnit(unitId: string): Promise<ReconciliationMark | undefined> {
    return markOnThrow('unit', unitId, async () => {
      const destroyed = await this.dependencies.primitive.destroy(unitId)
      return destroyed === 'failed' ? { resource: 'unit', id: unitId, reason: 'la primitiva no pudo destruir la unidad' } : undefined
    })
  }

  private revokeGrant(grant: ExecutionGrant): Promise<ReconciliationMark | undefined> {
    return markOnThrow('grant', grant.grantId, async () => {
      await this.dependencies.issuer.revoke(grant.grantId)
      return undefined
    })
  }

  private releaseReservation(reservation: VramReservation): Promise<ReconciliationMark | undefined> {
    return markOnThrow('reservation', reservation.reservationId, async () => {
      await this.dependencies.ledger.release(reservation)
      return undefined
    })
  }

  /** `stale` no se marca: el lease ya no es nuestro y no queda nada que soltar. */
  private releaseLease(lease: GenerationLease): Promise<ReconciliationMark | undefined> {
    return markOnThrow('lease', leaseId(lease), async () => {
      const validity = await this.dependencies.coordination.release(lease)
      if (validity !== 'unavailable') return undefined
      this.reconciled = false
      return { resource: 'lease', id: leaseId(lease), reason: 'coordinación no disponible al soltar el lease' }
    })
  }
}
