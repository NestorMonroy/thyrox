/**
 * Dobles de los puertos del scheduler para sus pruebas. Cada uno escribe sus
 * llamadas en un diario común, así una prueba puede afirmar el orden de la
 * cadena y de sus compensaciones, y se le puede ordenar fallar en un paso.
 */
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'

import type { GenerationLease, LeaseAcquisition, LeaseValidity, ModelSchedulingCoordination, MutationOperation } from '../coordination.ts'
import type {
  ArtifactIdentityVerification, ExecutionUnit, ExpectedResidency, HealthObservation, MaterializationOutcome, ModelExecutionPrimitive,
  ObservedResidency, ResidencyBinding, RuntimeAdapter, RuntimeCapabilities, RuntimeMutationOutcome,
} from '../executionPrimitive.ts'
import type { ExecutionPlan, GrantIssuer, IssueOutcome } from '../scheduler.ts'
import type { RequestAllocation, RequestAllocationOutcome, ReservationOutcome, ResidencyVramLedger, VramReservation, VramReservationRequest } from '../vramLedger.ts'

export type Journal = string[]

export class FakeCoordination implements ModelSchedulingCoordination {
  readonly topology = 'local' as const
  unavailable = false
  private readonly holders = new Map<string, { owner: string; generation: number }>()
  private readonly generations = new Map<string, number>()

  constructor(private readonly journal: Journal) {}

  /** Otro coordinador toma la residencia: el lease vigente queda viejo. */
  steal(residencyKey: string, owner: string): void {
    const generation = (this.generations.get(residencyKey) ?? 0) + 1
    this.generations.set(residencyKey, generation)
    this.holders.set(residencyKey, { owner, generation })
  }

  async acquireResidency(residencyKey: string, owner: string): Promise<LeaseAcquisition> {
    this.journal.push(`coordination.acquire ${residencyKey}`)
    if (this.unavailable) return { status: 'unavailable', reason: 'redis no responde' }
    const holder = this.holders.get(residencyKey)
    if (holder && holder.owner !== owner) return { status: 'held', holder: holder.owner }
    const generation = (this.generations.get(residencyKey) ?? 0) + 1
    this.generations.set(residencyKey, generation)
    this.holders.set(residencyKey, { owner, generation })
    return { status: 'acquired', lease: { kind: 'residency', residencyKey, owner, generation } }
  }

  async renew(lease: GenerationLease): Promise<LeaseValidity> {
    return this.validity(lease)
  }

  async validity(lease: GenerationLease): Promise<LeaseValidity> {
    if (this.unavailable) return 'unavailable'
    const holder = this.holders.get(lease.residencyKey)
    return holder?.owner === lease.owner && holder.generation === lease.generation ? 'current' : 'stale'
  }

  async release(lease: GenerationLease): Promise<LeaseValidity> {
    this.journal.push(`coordination.release ${lease.residencyKey}`)
    const validity = await this.validity(lease)
    if (validity === 'current') this.holders.delete(lease.residencyKey)
    return validity
  }

  async acquireMutation(residency: GenerationLease, _operation: MutationOperation): Promise<LeaseAcquisition> {
    const validity = await this.validity(residency)
    if (validity === 'unavailable') return { status: 'unavailable', reason: 'redis no responde' }
    if (validity === 'stale') return { status: 'stale', currentGeneration: this.generations.get(residency.residencyKey) ?? 0 }
    return { status: 'acquired', lease: { ...residency, kind: 'mutation' } }
  }

  async currentGeneration(residencyKey: string): Promise<number | 'unavailable'> {
    return this.unavailable ? 'unavailable' : (this.generations.get(residencyKey) ?? 0)
  }

  async close(): Promise<void> {}
}

export class FakeLedger implements ResidencyVramLedger {
  failWith: Exclude<ReservationOutcome['status'], 'reserved'> | undefined
  failRelease = false
  readonly held: VramReservation[] = []
  readonly requests: RequestAllocation[] = []

  constructor(private readonly journal: Journal) {}

  async reserve(request: VramReservationRequest): Promise<ReservationOutcome> {
    this.journal.push(`ledger.reserve g${request.generation}`)
    if (this.failWith === 'insufficient') return { status: 'insufficient', device: 'GPU-0', freeMib: 0, requestedMib: request.vramMib }
    if (this.failWith === 'stale_generation') return { status: 'stale_generation', currentGeneration: request.generation + 1 }
    const reservation = { ...request, reservationId: `reservation-${this.held.length + 1}` }
    this.held.push(reservation)
    return { status: 'reserved', reservation }
  }

  async release(reservation: VramReservation): Promise<'released' | 'absent'> {
    this.journal.push(`ledger.release ${reservation.reservationId}`)
    if (this.failRelease) throw new Error('el ledger no responde')
    const index = this.held.findIndex(held => held.reservationId === reservation.reservationId)
    if (index < 0) return 'absent'
    this.held.splice(index, 1)
    return 'released'
  }

  async reservations(): Promise<readonly VramReservation[]> {
    this.journal.push('ledger.reservations')
    return [...this.held]
  }

  async allocateRequest(reservation: VramReservation, requestId: string, vramMib: number): Promise<RequestAllocationOutcome> {
    this.journal.push(`ledger.allocateRequest ${requestId}`)
    if (!this.held.some(held => held.reservationId === reservation.reservationId)) return { status: 'absent' }
    const allocation = { allocationId: `allocation-${requestId}`, reservationId: reservation.reservationId, requestId, generation: reservation.generation, vramMib }
    this.requests.push(allocation)
    return { status: 'allocated', allocation }
  }

  async releaseRequest(allocation: RequestAllocation): Promise<'released' | 'absent'> {
    this.journal.push(`ledger.releaseRequest ${allocation.requestId}`)
    const index = this.requests.findIndex(held => held.allocationId === allocation.allocationId)
    if (index < 0) return 'absent'
    this.requests.splice(index, 1)
    return 'released'
  }

  async allocations(): Promise<readonly RequestAllocation[]> {
    return [...this.requests]
  }
}

export class FakeIssuer implements GrantIssuer {
  fail = false
  readonly active = new Set<string>()

  constructor(private readonly journal: Journal) {}

  async issue(plan: ExecutionPlan, generation: number): Promise<IssueOutcome> {
    this.journal.push(`issuer.issue g${generation}`)
    if (this.fail) return { status: 'failed', reason: 'el emisor rehusó' }
    const grant: ExecutionGrant = {
      grantId: `grant-${plan.requestId}`,
      requestId: plan.requestId,
      model: plan.model,
      revision: plan.revision,
      artifact: plan.artifact,
      runtime: plan.runtime,
      placement: plan.placement,
      residency: { mode: 'create', instance: plan.residencyKey, generation },
      residencyVramMib: plan.residencyVramMib,
      requestVramMib: plan.requestVramMib,
      contextLength: plan.contextLength,
      kvCacheType: plan.kvCacheType,
      issuedAt: '2026-10-01T00:00:00.000Z',
      expiresAt: '2026-10-01T01:00:00.000Z',
    }
    this.active.add(grant.grantId)
    return { status: 'issued', grant }
  }

  async revoke(grantId: string): Promise<'revoked' | 'absent'> {
    this.journal.push(`issuer.revoke ${grantId}`)
    return this.active.delete(grantId) ? 'revoked' : 'absent'
  }
}

export class FakePrimitive implements ModelExecutionPrimitive {
  outcome: 'materialized' | 'failed-partial' | 'failed-clean' = 'materialized'
  failDestroy = false
  /** `destroy` responde `destroyed` pero la unidad sigue listada. */
  destroyLies = false
  /** Se ejecuta tras materializar: permite que otro coordinador tome la residencia en medio. */
  afterMaterialize: (() => void) | undefined
  readonly live: ExecutionUnit[] = []

  constructor(private readonly journal: Journal, private readonly coordination: ModelSchedulingCoordination) {}

  async materialize(grant: ExecutionGrant): Promise<MaterializationOutcome> {
    this.journal.push(`primitive.materialize g${grant.residency.generation}`)
    // La primitiva real valida la generación del grant contra la coordinación.
    const current = await this.coordination.currentGeneration(grant.residency.instance)
    if (current !== grant.residency.generation) {
      return { status: 'rejected', reason: 'stale_generation', detail: `grant g${grant.residency.generation}, vigente ${current}` }
    }
    const unitId = `unit-${grant.grantId}`
    if (this.outcome === 'failed-clean') return { status: 'failed', reason: 'podman create falló', partial: false }
    const unit: ExecutionUnit = {
      unitId, grantId: grant.grantId, model: grant.model, artifactSha256: grant.artifact.sha256, residencyKey: grant.residency.instance,
      generation: grant.residency.generation, runtime: grant.runtime, endpoint: 'http://127.0.0.1:61000',
      containerId: `container-${unitId}`, devices: grant.placement.kind === 'gpu' ? grant.placement.devices : [],
      hostPids: [4242], createdAt: '2026-10-01T00:00:00.000Z',
    }
    this.live.push(unit)
    this.afterMaterialize?.()
    if (this.outcome === 'failed-partial') return { status: 'failed', reason: 'podman start falló', partial: true, unitId }
    return { status: 'materialized', unit }
  }

  async destroy(unitId: string): Promise<'destroyed' | 'absent' | 'failed'> {
    this.journal.push(`primitive.destroy ${unitId}`)
    if (this.failDestroy) return 'failed'
    if (this.destroyLies) return 'destroyed'
    const index = this.live.findIndex(unit => unit.unitId === unitId)
    if (index < 0) return 'absent'
    this.live.splice(index, 1)
    return 'destroyed'
  }

  async units(): Promise<readonly ExecutionUnit[]> {
    this.journal.push('primitive.units')
    return [...this.live]
  }
}

/** Lo que Ollama declara: thyrox no puede gobernar varias residencias dentro de una unidad. */
export const SINGLE_RESIDENCY_CAPABILITIES: RuntimeCapabilities = {
  multipleResidencies: false, explicitLoad: true, explicitUnload: true,
  perResidencyIdentity: false, residencyObservation: true, placementEnforceable: false,
}

export class FakeRuntime implements RuntimeAdapter {
  readonly capabilities = SINGLE_RESIDENCY_CAPABILITIES
  /** Falla `loadResidency`. */
  fail = false
  failPrepare = false
  /** `loadResidency` responde con una generación vieja. */
  staleOnLoad = false
  failUnload = false
  unhealthy = false
  /** Cuántas sondas responden `unhealthy` antes de la primera sana. */
  unhealthyProbes = 0
  /** El sha256 que el runtime dice servir; por defecto el del grant. */
  servesSha256: string | undefined
  /** Lo que `observeResidency` informa en lugar de deducirlo de la carga. */
  observeAs: ObservedResidency['status'] | undefined
  /** Se ejecuta tras cargar: permite que otro coordinador tome la residencia en medio. */
  afterLoad: (() => void) | undefined
  /** unitId → modelo residente. */
  readonly loaded = new Map<string, string>()

  /** Sin coordinación, el doble no comprueba la generación de las mutaciones. */
  constructor(private readonly journal: Journal, private readonly coordination?: ModelSchedulingCoordination) {}

  async probeHealth(unit: ExecutionUnit): Promise<HealthObservation> {
    this.journal.push(`runtime.probeHealth ${unit.unitId}`)
    if (this.unhealthyProbes > 0) {
      this.unhealthyProbes -= 1
      return { status: 'unhealthy', reason: 'el runtime aún arranca' }
    }
    return this.unhealthy ? { status: 'unhealthy', reason: 'el runtime no respondió' } : { status: 'healthy' }
  }

  async prepareRuntimeArtifact(binding: ResidencyBinding, _grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    this.journal.push(`runtime.prepareRuntimeArtifact ${binding.unit.unitId}`)
    const stale = await this.staleGeneration(binding)
    if (stale) return stale
    return this.failPrepare ? { status: 'failed', reason: 'el runtime rechazó el artefacto' } : { status: 'done' }
  }

  async verifyArtifactIdentity(unit: ExecutionUnit, grant: ExecutionGrant): Promise<ArtifactIdentityVerification> {
    this.journal.push(`runtime.verifyArtifactIdentity ${unit.unitId}`)
    const expected = { model: grant.model, sha256: grant.artifact.sha256, quantization: undefined }
    const observed = { ...expected, sha256: this.servesSha256 ?? grant.artifact.sha256 }
    return observed.sha256 === expected.sha256 ? { status: 'matches', observed } : { status: 'mismatch', expected, observed }
  }

  async loadResidency(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    this.journal.push(`runtime.loadResidency ${binding.unit.unitId}`)
    const stale = await this.staleGeneration(binding)
    if (stale) return stale
    if (this.staleOnLoad) return { status: 'stale_generation', currentGeneration: binding.generation + 1 }
    if (this.fail) return { status: 'failed', reason: 'el runtime no cargó el modelo' }
    this.loaded.set(binding.unit.unitId, grant.model)
    this.afterLoad?.()
    return { status: 'done' }
  }

  async observeResidency(unit: ExecutionUnit, expected: ExpectedResidency): Promise<ObservedResidency> {
    this.journal.push(`runtime.observeResidency ${unit.unitId}`)
    const model = this.loaded.get(unit.unitId)
    const status = this.observeAs ?? (model === undefined ? 'absent' : 'resident')
    const observed = { model: model ?? expected.model, sha256: this.servesSha256 ?? expected.sha256, quantization: undefined }
    if (status === 'resident' && (observed.model !== expected.model || observed.sha256 !== expected.sha256)) return { status: 'mismatch', observed }
    if (status === 'resident' || status === 'mismatch') return { status, observed }
    if (status === 'error') return { status, reason: 'el runtime no respondió a la observación' }
    return { status }
  }

  async unloadResidency(binding: ResidencyBinding): Promise<RuntimeMutationOutcome> {
    this.journal.push(`runtime.unloadResidency ${binding.unit.unitId}`)
    const stale = await this.staleGeneration(binding)
    if (stale) return stale
    if (this.failUnload) return { status: 'failed', reason: 'el runtime no descargó' }
    this.loaded.delete(binding.unit.unitId)
    return { status: 'done' }
  }

  /** La comprobación que el adapter real hace antes de tocar el runtime. */
  private async staleGeneration(binding: ResidencyBinding): Promise<RuntimeMutationOutcome | undefined> {
    if (!this.coordination) return undefined
    const current = await this.coordination.currentGeneration(binding.residencyKey)
    return current === binding.generation ? undefined : { status: 'stale_generation', currentGeneration: current }
  }
}
