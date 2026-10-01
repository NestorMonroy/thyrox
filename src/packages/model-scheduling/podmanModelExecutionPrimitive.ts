/**
 * `PodmanModelExecutionPrimitive`: materializa un `ExecutionGrant` vigente en
 * un contenedor de runtime por residencia (ADR-007 1.13.0, topología A).
 *
 * Rechaza sin tocar Podman un grant caducado o de una generación que no es la
 * vigente (M17, M19); con la coordinación no disponible también rechaza. El
 * contenedor lleva en sus etiquetas la identidad de la unidad —grant,
 * residencia, generación, digest— para que `units()` la reconstruya al
 * reconciliar sin otra fuente. No borra imágenes ni volúmenes: `destroy`
 * retira el contenedor de la unidad y nada más.
 */
import type { ExecutionGrant, ModelRuntime } from '@thyrox/model-artifacts/executionGrant.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import type { ExecutionUnit, MaterializationOutcome, ModelExecutionPrimitive } from './executionPrimitive.ts'

/** Prefijo del nombre de contenedor de una unidad de modelo. */
export const MODEL_UNIT_CONTAINER_PREFIX = 'thyrox-model-'

/** Las etiquetas con que una unidad se identifica en Podman. */
export const MODEL_UNIT_LABELS = {
  unit: 'thyrox.model.unit',
  grant: 'thyrox.model.grant',
  model: 'thyrox.model.name',
  residency: 'thyrox.model.residency',
  generation: 'thyrox.model.generation',
  sha256: 'thyrox.model.sha256',
  runtime: 'thyrox.model.runtime',
  port: 'thyrox.model.port',
  createdAt: 'thyrox.model.created-at',
} as const

/** Cómo se levanta el contenedor de un runtime: imagen local y entorno según el puerto de loopback. */
export interface RuntimeContainerProfile {
  /** Referencia local; la primitiva no descarga imágenes. */
  readonly image: string
  environment(port: number): Readonly<Record<string, string>>
}

export interface PodmanModelExecutionPrimitiveOptions {
  readonly podman: PodmanExecutor
  /** La generación vigente de una residencia, de la coordinación. */
  currentGeneration(residencyKey: string): Promise<number | 'unavailable'>
  readonly profiles: Partial<Record<ModelRuntime, RuntimeContainerProfile>>
  /** Un puerto de loopback libre para la unidad. */
  allocatePort(): Promise<number>
  readonly now: () => Date
}

export class PodmanModelExecutionPrimitive implements ModelExecutionPrimitive {
  constructor(private readonly options: PodmanModelExecutionPrimitiveOptions) {}

  async materialize(grant: ExecutionGrant): Promise<MaterializationOutcome> {
    void grant; void this.options
    throw new Error('PodmanModelExecutionPrimitive.materialize: por implementar')
  }

  async destroy(unitId: string): Promise<'destroyed' | 'absent' | 'failed'> {
    void unitId
    throw new Error('PodmanModelExecutionPrimitive.destroy: por implementar')
  }

  async units(): Promise<readonly ExecutionUnit[]> {
    throw new Error('PodmanModelExecutionPrimitive.units: por implementar')
  }
}
