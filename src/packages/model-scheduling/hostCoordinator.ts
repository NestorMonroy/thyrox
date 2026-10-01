/**
 * `ModelSchedulingCoordinator`: la única autoridad de admisión de modelos de
 * un anfitrión (ADR-007 1.14.0). Los proxies, los ítems del pool y `thyrox -p`
 * son sus clientes: piden una admisión y reciben un ticket con el grant y la
 * `ModelExecutionUnit`; usan sólo el endpoint de esa unidad. Ninguno mantiene
 * residencias propias ni fabrica admisiones.
 *
 *   AdmissionRequest → ModelResolver (catálogo) → identidad exacta
 *     → colocación y clave de residencia → ResidencyController.admit
 *     → AdmissionTicket { grant, unit }
 *
 * Una misma residencia sirve a todos los clientes que piden la misma identidad
 * en la misma colocación: la clave de residencia deriva de la identidad entera
 * —modelo, revisión, artefacto, cuantización— y de la colocación, nunca de la
 * cuantización sola.
 */
import type { ExecutionGrant, ExecutionPlacement, ModelRuntime } from '@thyrox/model-artifacts/executionGrant.ts'
import type { ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
import {
  AmbiguousModelRequestError, ContextLengthExceededError, MissingCapabilityError, type ModelExecutionRequest, ModelNotDeclaredError,
  type ResolvedModel, resolveModel,
} from '@thyrox/model-artifacts/modelResolver.ts'
import { InconsistentModelIdentityError, type ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'

import type { ModelExecutionUnit } from './modelUnitMaterializer.ts'
import type { Admission, EvictionOutcome, ResidencyController, ResidencyStage } from './residencyController.ts'
import type { ExecutionPlan } from './scheduler.ts'

/** Lo que pide un cliente: un modelo del catálogo y las restricciones de la petición. */
export interface AdmissionRequest {
  readonly requestId: string
  /** Quién pide: un proxy, un ítem, `thyrox -p`. Sólo sirve para trazar. */
  readonly client: string
  readonly model: ModelExecutionRequest['model']
  readonly contextLength?: number
  readonly requiredCapabilities?: ModelExecutionRequest['requiredCapabilities']
}

/** Lo que recibe el cliente: la única autorización con la que puede alcanzar el runtime. */
export interface AdmissionTicket {
  readonly admissionId: string
  readonly requestId: string
  readonly client: string
  readonly grant: ExecutionGrant
  readonly unit: ModelExecutionUnit
}

export type CoordinatorStage = 'resolve' | 'placement' | ResidencyStage

export type CoordinatorAdmission =
  | { readonly status: 'admitted'; readonly ticket: AdmissionTicket }
  | { readonly status: 'refused'; readonly stage: CoordinatorStage; readonly reason: string }
  | { readonly status: 'failed'; readonly stage: CoordinatorStage; readonly reason: string }

/** Dónde y con cuánta memoria corre una identidad resuelta; la decide el planificador de recursos. */
export interface PlacementDecision {
  readonly runtime: ModelRuntime
  readonly placement: ExecutionPlacement
  readonly residencyVramMib: number
  readonly requestVramMib: number
}

export interface ModelSchedulingCoordinatorDependencies {
  /** Las entradas declaradas del catálogo, leídas en cada admisión. */
  catalogEntries(): Promise<readonly ModelCatalogEntry[]>
  /** Decide la colocación; `undefined` si no cabe en ningún sitio. */
  place(resolved: ResolvedModel): PlacementDecision | undefined
  readonly controller: ResidencyController
  /** Identidad de este coordinador: dueño de sus leases y reservas. */
  readonly owner: string
  readonly newAdmissionId: () => string
}

/** Los errores con los que el resolver declara que la petición no tiene identidad exacta. */
const RESOLVER_ERRORS = [
  ModelNotDeclaredError, AmbiguousModelRequestError, MissingCapabilityError, ContextLengthExceededError, InconsistentModelIdentityError,
] as const

type ResolutionOutcome =
  | { readonly status: 'resolved'; readonly resolved: ResolvedModel }
  | { readonly status: 'refused'; readonly stage: 'resolve'; readonly reason: string }

/** Un ticket vigente y la admisión del controlador que `finish` suelta. */
interface ActiveAdmission {
  readonly ticket: AdmissionTicket
  readonly admission: Admission
}

function isResolverError(error: unknown): error is Error {
  return RESOLVER_ERRORS.some(errorClass => error instanceof errorClass)
}

/** `cpu`, o `gpu:` con los dispositivos ordenados: el orden declarado no cambia la colocación. */
function placementSegment(placement: ExecutionPlacement): string {
  if (placement.kind === 'cpu') return 'cpu'
  return `gpu:${[...placement.devices].sort().join(',')}`
}

/** La clave de residencia de una identidad en una colocación. */
export function residencyKeyOf(artifact: ResolvedModelArtifact, placement: ExecutionPlacement): string {
  return `residency/${artifact.modelId}@${artifact.artifactId}/${placementSegment(placement)}`
}

export class ModelSchedulingCoordinator {
  private readonly active = new Map<string, ActiveAdmission>()

  constructor(private readonly dependencies: ModelSchedulingCoordinatorDependencies) {}

  /** Resuelve, coloca y admite; el ticket es la única vía hasta el runtime. */
  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    const resolution = await this.resolve(request)
    if (resolution.status === 'refused') return resolution
    const decision = this.dependencies.place(resolution.resolved)
    if (!decision) return { status: 'refused', stage: 'placement', reason: `${resolution.resolved.artifact.modelId} no cabe en ninguna colocación` }
    const outcome = await this.dependencies.controller.admit(this.planOf(request, resolution.resolved, decision))
    if (outcome.status !== 'admitted') return { status: outcome.status, stage: outcome.stage, reason: outcome.reason }
    return { status: 'admitted', ticket: this.issueTicket(request, outcome) }
  }

  /** Suelta la petición de un ticket; `absent` si ya no estaba admitida. */
  async finish(admissionId: string): Promise<'finished' | 'absent'> {
    const entry = this.active.get(admissionId)
    if (!entry) return 'absent'
    this.active.delete(admissionId)
    await this.dependencies.controller.finish(entry.admission)
    return 'finished'
  }

  async evict(residencyKey: string): Promise<EvictionOutcome> {
    return this.dependencies.controller.evict(residencyKey)
  }

  /** Los tickets vigentes, para observar y reconciliar. */
  admissions(): readonly AdmissionTicket[] {
    return [...this.active.values()].map(entry => entry.ticket)
  }

  /** Un error del resolver rehúsa la petición antes de tocar lease, reserva o unidad. */
  private async resolve(request: AdmissionRequest): Promise<ResolutionOutcome> {
    const entries = await this.dependencies.catalogEntries()
    try {
      const resolved = resolveModel({ model: request.model, contextLength: request.contextLength, requiredCapabilities: request.requiredCapabilities }, entries)
      return { status: 'resolved', resolved }
    } catch (error) {
      if (!isResolverError(error)) throw error
      return { status: 'refused', stage: 'resolve', reason: error.message }
    }
  }

  private planOf(request: AdmissionRequest, resolved: ResolvedModel, decision: PlacementDecision): ExecutionPlan {
    return {
      requestId: request.requestId,
      owner: this.dependencies.owner,
      residencyKey: residencyKeyOf(resolved.artifact, decision.placement),
      artifact: resolved.artifact,
      runtime: decision.runtime,
      placement: decision.placement,
      residencyVramMib: decision.residencyVramMib,
      requestVramMib: decision.requestVramMib,
      contextLength: resolved.contextLength,
      kvCacheType: resolved.kvCacheType,
    }
  }

  private issueTicket(request: AdmissionRequest, admission: Admission): AdmissionTicket {
    const ticket: AdmissionTicket = {
      admissionId: this.dependencies.newAdmissionId(),
      requestId: request.requestId,
      client: request.client,
      grant: admission.grant,
      unit: admission.unit,
    }
    this.active.set(ticket.admissionId, { ticket, admission })
    return ticket
  }
}
