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
import type { ModelSchedulingCoordination } from './coordination.ts'
import type { ExecutionUnit, ModelExecutionPrimitive, RuntimeAdapter } from './executionPrimitive.ts'
import type { ModelResidency, ResidencyRegistry } from './residency.ts'
import type { ExecutionPlan, GrantIssuer, ReconciliationMark } from './scheduler.ts'
import type { RequestAllocation, ResidencyVramLedger } from './vramLedger.ts'

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

export class ResidencyController {
  constructor(private readonly dependencies: ResidencyControllerDependencies) {}

  /** Admite la petición del plan: reutiliza la residencia `resident` o la establece. */
  async admit(plan: ExecutionPlan): Promise<AdmissionOutcome> {
    void plan; void this.dependencies
    throw new Error('ResidencyController.admit: por implementar')
  }

  /** Suelta la VRAM de la petición y descuenta la residencia. */
  async finish(admission: Admission): Promise<void> {
    void admission
    throw new Error('ResidencyController.finish: por implementar')
  }

  /** Inicia o continúa el desalojo de la residencia. */
  async evict(residencyKey: string): Promise<EvictionOutcome> {
    void residencyKey
    throw new Error('ResidencyController.evict: por implementar')
  }
}
