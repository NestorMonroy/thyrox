/**
 * `ModelSchedulingCoordinator`: la única autoridad de admisión de modelos de
 * un anfitrión (ADR-007 1.14.0). Los proxies, los ítems del pool y `thyrox -p`
 * son sus clientes: piden una admisión y reciben un ticket con el grant y la
 * `ExecutionUnit`; usan sólo el endpoint de esa unidad. Ninguno mantiene
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
import type { ModelExecutionRequest, ResolvedModel } from '@thyrox/model-artifacts/modelResolver.ts'
import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'

import type { ExecutionUnit } from './executionPrimitive.ts'
import type { EvictionOutcome, ResidencyController, ResidencyStage } from './residencyController.ts'

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
  readonly unit: ExecutionUnit
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

/** La clave de residencia de una identidad en una colocación. */
export function residencyKeyOf(artifact: ResolvedModelArtifact, placement: ExecutionPlacement): string {
  void artifact; void placement
  throw new Error('residencyKeyOf: por implementar')
}

export class ModelSchedulingCoordinator {
  constructor(private readonly dependencies: ModelSchedulingCoordinatorDependencies) {}

  /** Resuelve, coloca y admite; el ticket es la única vía hasta el runtime. */
  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    void request; void this.dependencies
    throw new Error('ModelSchedulingCoordinator.admit: por implementar')
  }

  /** Suelta la petición de un ticket; `absent` si ya no estaba admitida. */
  async finish(admissionId: string): Promise<'finished' | 'absent'> {
    void admissionId
    throw new Error('ModelSchedulingCoordinator.finish: por implementar')
  }

  async evict(residencyKey: string): Promise<EvictionOutcome> {
    void residencyKey
    throw new Error('ModelSchedulingCoordinator.evict: por implementar')
  }

  /** Los tickets vigentes, para observar y reconciliar. */
  admissions(): readonly AdmissionTicket[] {
    throw new Error('ModelSchedulingCoordinator.admissions: por implementar')
  }
}
