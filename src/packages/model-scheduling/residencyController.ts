/**
 * `ResidencyController`: lleva una `ModelResidency` de la topología A
 * (ADR-007 1.13.0) por su ciclo de vida y admite peticiones sobre ella.
 *
 *   lease (N) → planned → reserva de la residencia (N) → grant (N)
 *     → materializing → primitive.materialize → ¿generación N vigente?
 *     → loading → probeHealth (reintentos aquí, no en el adapter)
 *     → prepareRuntimeArtifact → verifyArtifactIdentity → loadResidency
 *     → observeResidency → resident → asignación de la petición
 *
 * Una residencia `resident` se reutiliza: la petición siguiente sólo asigna su
 * VRAM de petición, no materializa otra unidad. El desalojo es
 *
 *   resident → draining → (activas = 0) → evicting → unloadResidency (opcional)
 *     → primitive.destroy → unidad ausente confirmada → VRAM → grant → lease → absent
 *
 * y la destrucción de la unidad es la frontera definitiva: un `unloadResidency`
 * fallido no la impide. La VRAM no se suelta mientras la ausencia de la unidad
 * no esté confirmada.
 */
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'

import type { GenerationLease, LeaseAcquisition, ModelSchedulingCoordination } from './coordination.ts'
import type {
  ExecutionUnit, ExpectedResidency, HealthObservation, ModelExecutionPrimitive, ResidencyBinding, RuntimeAdapter, RuntimeMutationOutcome,
} from './executionPrimitive.ts'
import { type ModelResidency, type ResidencyRegistry, type ResidencyState, UnknownResidencyError } from './residency.ts'
import { CompensationStack, type ExecutionPlan, type GrantIssuer, markOnThrow, type ReconciliationMark } from './scheduler.ts'
import type { RequestAllocation, ResidencyVramLedger, VramReservation } from './vramLedger.ts'

/** La política de espera de salud: la decide el controlador, el adapter sólo observa una vez. */
export interface HealthPolicy {
  readonly attempts: number
  readonly intervalMs: number
}

export interface ResidencyControllerDependencies {
  readonly coordination: ModelSchedulingCoordination
  readonly ledger: ResidencyVramLedger
  readonly issuer: GrantIssuer
  readonly primitive: ModelExecutionPrimitive
  readonly runtime: RuntimeAdapter
  readonly registry: ResidencyRegistry
  readonly leaseTtlMs: number
  readonly health: HealthPolicy
  /** Inyectable para que las pruebas no esperen de verdad. */
  readonly sleep?: (ms: number) => Promise<void>
}

export type ResidencyStage = 'lease' | 'reserve' | 'grant' | 'materialize' | 'generation' | 'health' | 'prepare' | 'verify' | 'load' | 'observe' | 'allocate'

/** Una petición admitida: lo que `finish` necesita para soltarla. */
export interface Admission {
  readonly requestId: string
  readonly residency: ModelResidency
  readonly unit: ExecutionUnit
  readonly allocation: RequestAllocation
  /** Verdadero si la residencia ya estaba `resident` y sólo se asignó la petición. */
  readonly reused: boolean
}

export type AdmissionOutcome =
  | ({ readonly status: 'admitted' } & Admission)
  /** Rehusado antes de crear nada. */
  | { readonly status: 'refused'; readonly stage: ResidencyStage; readonly reason: string }
  /** Falló tras crear algo; todo lo creado se deshizo salvo lo marcado. */
  | { readonly status: 'failed'; readonly stage: ResidencyStage; readonly reason: string; readonly marks: readonly ReconciliationMark[] }

export type EvictionOutcome =
  | { readonly status: 'evicted' }
  /** Quedó en `draining`: no admite peticiones nuevas y espera a que terminen las activas. */
  | { readonly status: 'draining'; readonly activeRequests: number }
  | { readonly status: 'refused'; readonly reason: string }
  /** La unidad no se pudo confirmar ausente: la VRAM sigue reservada y queda marcada. */
  | { readonly status: 'failed'; readonly reason: string; readonly marks: readonly ReconciliationMark[] }

/** Lo que una residencia establecida retiene y que su desalojo suelta. */
interface EstablishedResidency {
  readonly lease: GenerationLease
  readonly reservation: VramReservation
  readonly grant: ExecutionGrant
  readonly unit: ExecutionUnit
}

/** Una residencia en curso de establecerse: su lease y las compensaciones de lo creado. */
interface Establishment {
  readonly plan: ExecutionPlan
  readonly lease: GenerationLease
  readonly compensations: CompensationStack
}


/** Estados desde los que se puede iniciar o continuar un desalojo. */
const EVICTABLE_STATES: readonly ResidencyState[] = ['resident', 'draining']

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function leaseId(lease: GenerationLease): string {
  return `${lease.residencyKey}#${lease.generation}`
}

function bindingOf(unit: ExecutionUnit): ResidencyBinding {
  return { unit, residencyKey: unit.residencyKey, generation: unit.generation }
}

function expectedResidencyOf(unit: ExecutionUnit): ExpectedResidency {
  return { residencyKey: unit.residencyKey, generation: unit.generation, model: unit.model, sha256: unit.artifactSha256 }
}

function mutationFailure(outcome: Exclude<RuntimeMutationOutcome, { status: 'done' }>): string {
  return outcome.status === 'failed' ? outcome.reason : `generación vieja, vigente ${outcome.currentGeneration}`
}

function leaseRefusal(acquisition: Exclude<LeaseAcquisition, { status: 'acquired' }>): string {
  if (acquisition.status === 'unavailable') return `coordinación no disponible: ${acquisition.reason}`
  if (acquisition.status === 'held') return `la residencia la tiene ${acquisition.holder}`
  return `generación vieja, vigente ${acquisition.currentGeneration}`
}

function unitMark(unitId: string, reason: string): ReconciliationMark {
  return { resource: 'unit', id: unitId, reason }
}

export class ResidencyController {
  private readonly established = new Map<string, EstablishedResidency>()
  private readonly sleep: (ms: number) => Promise<void>

  constructor(private readonly dependencies: ResidencyControllerDependencies) {
    this.sleep = dependencies.sleep ?? defaultSleep
  }

  /** Admite la petición del plan: reutiliza la residencia `resident` o la establece. */
  async admit(plan: ExecutionPlan): Promise<AdmissionOutcome> {
    const residency = this.dependencies.registry.get(plan.residencyKey)
    const held = this.established.get(plan.residencyKey)
    if (residency?.state === 'resident' && held) return this.allocate(plan, held, true)
    if (residency && residency.state !== 'absent') {
      return { status: 'refused', stage: 'lease', reason: `la residencia ${plan.residencyKey} está ${residency.state}: no admite peticiones nuevas` }
    }
    return this.establish(plan)
  }

  /** Suelta la VRAM de la petición y descuenta la residencia. */
  async finish(admission: Admission): Promise<void> {
    await this.dependencies.ledger.releaseRequest(admission.allocation)
    const residency = this.dependencies.registry.get(admission.residency.residencyKey)
    if (!residency) return
    this.dependencies.registry.amend(residency.residencyKey, residency.generation, { activeRequests: residency.activeRequests - 1 })
  }

  /** Inicia o continúa el desalojo de la residencia. */
  async evict(residencyKey: string): Promise<EvictionOutcome> {
    const residency = this.dependencies.registry.get(residencyKey)
    const held = this.established.get(residencyKey)
    if (!residency || !held || !EVICTABLE_STATES.includes(residency.state)) {
      return { status: 'refused', reason: `la residencia ${residencyKey} no está resident ni draining` }
    }
    const { registry } = this.dependencies
    if (residency.state === 'resident') registry.transition(residencyKey, residency.generation, 'draining')
    if (residency.activeRequests > 0) return { status: 'draining', activeRequests: residency.activeRequests }
    registry.transition(residencyKey, residency.generation, 'evicting')
    return this.retire(residency, held)
  }

  private async establish(plan: ExecutionPlan): Promise<AdmissionOutcome> {
    const acquisition = await this.dependencies.coordination.acquireResidency(plan.residencyKey, plan.owner, this.dependencies.leaseTtlMs)
    if (acquisition.status !== 'acquired') return { status: 'refused', stage: 'lease', reason: leaseRefusal(acquisition) }
    const compensations = new CompensationStack()
    compensations.push(() => this.releaseLease(acquisition.lease))
    this.dependencies.registry.plan(plan.residencyKey, acquisition.lease.generation, plan.model)
    return this.reserveAndIssue({ plan, lease: acquisition.lease, compensations })
  }

  private async reserveAndIssue(establishment: Establishment): Promise<AdmissionOutcome> {
    const { plan, lease, compensations } = establishment
    const reserved = await this.dependencies.ledger.reserve({
      residencyKey: plan.residencyKey,
      owner: plan.owner,
      generation: lease.generation,
      devices: plan.placement.kind === 'gpu' ? plan.placement.devices : [],
      vramMib: plan.residencyVramMib,
    })
    if (reserved.status !== 'reserved') return this.fail(establishment, 'reserve', `la reserva salió ${reserved.status}`)
    compensations.push(() => this.releaseReservation(reserved.reservation))
    const issued = await this.dependencies.issuer.issue(plan, lease.generation)
    if (issued.status !== 'issued') return this.fail(establishment, 'grant', issued.reason)
    compensations.push(() => this.revokeGrant(issued.grant))
    this.dependencies.registry.transition(plan.residencyKey, lease.generation, 'materializing', {
      grantId: issued.grant.grantId, reservationId: reserved.reservation.reservationId,
    })
    return this.materialize(establishment, reserved.reservation, issued.grant)
  }

  private async materialize(establishment: Establishment, reservation: VramReservation, grant: ExecutionGrant): Promise<AdmissionOutcome> {
    const materialization = await this.dependencies.primitive.materialize(grant)
    if (materialization.status === 'rejected') return this.fail(establishment, 'materialize', `${materialization.reason}: ${materialization.detail}`)
    if (materialization.status === 'failed') {
      if (materialization.partial) establishment.compensations.push(() => this.retirePartialUnit(materialization.unitId, grant))
      return this.fail(establishment, 'materialize', materialization.reason)
    }
    const unit = materialization.unit
    establishment.compensations.push(() => this.retireUnit(unit.unitId))
    const current = await this.dependencies.coordination.currentGeneration(establishment.plan.residencyKey)
    if (current !== establishment.lease.generation) {
      return this.fail(establishment, 'generation', `el lease era de la generación ${establishment.lease.generation}, vigente ${current}`)
    }
    this.dependencies.registry.transition(establishment.plan.residencyKey, establishment.lease.generation, 'loading', { unitId: unit.unitId })
    return this.bringUp(establishment, { lease: establishment.lease, reservation, grant, unit })
  }

  /** La cadena del adapter: salud, artefacto, identidad, carga y observación. */
  private async bringUp(establishment: Establishment, held: EstablishedResidency): Promise<AdmissionOutcome> {
    const { runtime } = this.dependencies
    const { unit, grant } = held
    const health = await this.awaitHealth(unit)
    if (health.status !== 'healthy') return this.fail(establishment, 'health', health.reason)
    const prepared = await runtime.prepareRuntimeArtifact(bindingOf(unit), grant)
    if (prepared.status !== 'done') return this.fail(establishment, 'prepare', mutationFailure(prepared))
    const identity = await runtime.verifyArtifactIdentity(unit, grant)
    if (identity.status === 'failed') return this.fail(establishment, 'verify', identity.reason)
    if (identity.status === 'mismatch') return this.fail(establishment, 'verify', `el runtime sirve ${identity.observed?.sha256}, el grant concede ${identity.expected.sha256}`)
    const loaded = await runtime.loadResidency(bindingOf(unit), grant)
    if (loaded.status !== 'done') return this.fail(establishment, 'load', mutationFailure(loaded))
    const observed = await runtime.observeResidency(unit, expectedResidencyOf(unit))
    if (observed.status !== 'resident') return this.fail(establishment, 'observe', `el runtime muestra la residencia ${observed.status}`)
    this.dependencies.registry.transition(establishment.plan.residencyKey, establishment.lease.generation, 'resident')
    this.established.set(establishment.plan.residencyKey, held)
    return this.allocate(establishment.plan, held, false)
  }

  /** Sondea la salud hasta `attempts` veces, esperando `intervalMs` entre sondas y no tras la última. */
  private async awaitHealth(unit: ExecutionUnit): Promise<HealthObservation> {
    const { attempts, intervalMs } = this.dependencies.health
    let observation = await this.dependencies.runtime.probeHealth(unit)
    for (let attempt = 1; attempt < attempts && observation.status !== 'healthy'; attempt += 1) {
      await this.sleep(intervalMs)
      observation = await this.dependencies.runtime.probeHealth(unit)
    }
    return observation
  }

  /**
   * Asigna la VRAM de la petición sobre una residencia ya `resident`. Si no
   * cabe, la petición se rehúsa y la residencia sigue establecida: no hay nada
   * de la petición que deshacer.
   */
  private async allocate(plan: ExecutionPlan, held: EstablishedResidency, reused: boolean): Promise<AdmissionOutcome> {
    const allocated = await this.dependencies.ledger.allocateRequest(held.reservation, plan.requestId, plan.requestVramMib)
    if (allocated.status !== 'allocated') return { status: 'refused', stage: 'allocate', reason: `la asignación de la petición salió ${allocated.status}` }
    const { registry } = this.dependencies
    const residency = registry.get(plan.residencyKey)
    if (!residency) throw new UnknownResidencyError(plan.residencyKey)
    const counted = registry.amend(plan.residencyKey, residency.generation, { activeRequests: residency.activeRequests + 1 })
    return { status: 'admitted', requestId: plan.requestId, residency: counted, unit: held.unit, allocation: allocated.allocation, reused }
  }

  /** Deshace lo creado y deja la residencia `absent`, o `error` si algo quedó marcado. */
  private async fail(establishment: Establishment, stage: ResidencyStage, reason: string): Promise<AdmissionOutcome> {
    const marks = await establishment.compensations.unwind()
    const target: ResidencyState = marks.length === 0 ? 'absent' : 'error'
    this.dependencies.registry.transition(establishment.plan.residencyKey, establishment.lease.generation, target, { reason })
    return { status: 'failed', stage, reason, marks }
  }

  /**
   * Desaloja una residencia sin peticiones. La destrucción de la unidad es la
   * frontera: hasta confirmarla ausente la VRAM no se suelta.
   */
  private async retire(residency: ModelResidency, held: EstablishedResidency): Promise<EvictionOutcome> {
    await this.unloadGracefully(held.unit)
    const unitLeft = await this.confirmUnitGone(held.unit.unitId)
    if (unitLeft) return this.failEviction(residency, [unitLeft])
    this.established.delete(residency.residencyKey)
    const marks: ReconciliationMark[] = []
    for (const release of [() => this.releaseReservation(held.reservation), () => this.revokeGrant(held.grant), () => this.releaseLease(held.lease)]) {
      const mark = await release()
      if (mark) marks.push(mark)
    }
    if (marks.length > 0) return this.failEviction(residency, marks)
    this.dependencies.registry.transition(residency.residencyKey, residency.generation, 'absent')
    return { status: 'evicted' }
  }

  /** La descarga es cortesía: su fallo no impide destruir la unidad. */
  private async unloadGracefully(unit: ExecutionUnit): Promise<void> {
    await markOnThrow('unit', unit.unitId, async () => {
      await this.dependencies.runtime.unloadResidency(bindingOf(unit))
      return undefined
    })
  }

  /** Destruye la unidad y comprueba en `units()` que ya no existe; devuelve la marca si sigue. */
  private confirmUnitGone(unitId: string): Promise<ReconciliationMark | undefined> {
    return markOnThrow('unit', unitId, async () => {
      const destroyed = await this.dependencies.primitive.destroy(unitId)
      if (destroyed === 'failed') return unitMark(unitId, 'la primitiva no pudo destruir la unidad; la VRAM sigue reservada')
      const units = await this.dependencies.primitive.units()
      if (units.some(unit => unit.unitId === unitId)) return unitMark(unitId, `destroy respondió ${destroyed} y la unidad sigue listada; la VRAM sigue reservada`)
      return undefined
    })
  }

  private failEviction(residency: ModelResidency, marks: readonly ReconciliationMark[]): EvictionOutcome {
    const reason = marks.map(mark => mark.reason).join('; ')
    this.dependencies.registry.transition(residency.residencyKey, residency.generation, 'error', { reason })
    return { status: 'failed', reason, marks }
  }

  private retirePartialUnit(unitId: string | undefined, grant: ExecutionGrant): Promise<ReconciliationMark | undefined> {
    if (unitId === undefined) {
      return Promise.resolve(unitMark(grant.grantId, 'materialización parcial sin unitId: la unidad del grant no se pudo retirar'))
    }
    return this.retireUnit(unitId)
  }

  private retireUnit(unitId: string): Promise<ReconciliationMark | undefined> {
    return markOnThrow('unit', unitId, async () => {
      const destroyed = await this.dependencies.primitive.destroy(unitId)
      return destroyed === 'failed' ? unitMark(unitId, 'la primitiva no pudo destruir la unidad') : undefined
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
      return validity === 'unavailable' ? { resource: 'lease', id: leaseId(lease), reason: 'coordinación no disponible al soltar el lease' } : undefined
    })
  }
}
