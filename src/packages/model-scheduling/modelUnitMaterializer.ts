/**
 * Los dos puertos que quedan después del grant (ADR-007 1.10.0–1.12.0): la
 * primitiva materializa un `ExecutionGrant` vigente en una `ModelExecutionUnit`, y
 * el adapter del runtime sólo habla con el runtime desde esa unidad.
 *
 * Ninguno decide: la primitiva rechaza un grant caducado o de una generación
 * que ya no es la vigente (M17, M19), y el adapter no conoce otro endpoint que
 * el de la unidad. Así `ningún grant → ninguna unidad → ninguna ejecución
 * local` sale de los tipos, no de un control posterior.
 */
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'
import type { ExecutionUnit } from '@thyrox/podman-execution/executionAuthorization.ts'

/**
 * La ejecución que la primitiva creó a partir de un grant: una identidad, no
 * sólo un endpoint (ADR-007 1.13.0). Es el único sitio donde vive el endpoint
 * de un runtime local, y su relación con la residencia es 1:1 en la topología A.
 */
export interface ModelExecutionUnit extends ExecutionUnit {
  readonly kind: 'model-runtime'
  readonly reference: { readonly kind: 'grant'; readonly grantId: string }
  readonly grantId: string
  /** La identidad que el grant concede; la reconciliación la compara con lo residente. */
  readonly artifact: ResolvedModelArtifact
  readonly residencyKey: string
  readonly generation: number
  readonly runtime: ExecutionGrant['runtime']
  /** Base URL del runtime de esta unidad, en loopback. */
  readonly endpoint: string
  /** UUID de los dispositivos concedidos; vacío en CPU. */
  readonly devices: readonly string[]
  /**
   * Con qué corre la unidad: imagen del runtime, CPU, memoria y entorno
   * (TASK-THYROX-0931). La cualificación lo registra; una unidad reconstruida de
   * un contenedor anterior a la etiqueta no lo tiene.
   */
  readonly profile?: ModelUnitProfile
}

/** El perfil de ejecución de una unidad, tal como la materializó la primitiva. */
export interface ModelUnitProfile {
  readonly image: string
  readonly cpus: number
  readonly memoryMib: number
  readonly environment: Readonly<Record<string, string>>
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
  | { readonly status: 'materialized'; readonly unit: ModelExecutionUnit }
  | { readonly status: 'rejected'; readonly reason: 'stale_generation' | 'expired_grant'; readonly detail: string }
  /** `partial`: quedó algo creado que hay que retirar. */
  | { readonly status: 'failed'; readonly reason: string; readonly partial: boolean; readonly unitId?: string }
export interface ModelUnitMaterializer {
  materialize(grant: ExecutionGrant): Promise<MaterializationOutcome>
  /**
   * Destruye la unidad: en la topología A es la frontera material definitiva de
   * un desalojo, y ningún runtime puede impedirla. `absent` si ya no existía.
   */
  destroy(unitId: string): Promise<'destroyed' | 'absent' | 'failed'>
  /** Las unidades de modelo que existen, para reconciliar. */
  units(): Promise<readonly ModelExecutionUnit[]>
}

/**
 * A qué residencia y generación se ata una operación que muta el runtime. El
 * adapter rechaza una generación que no es la vigente antes de tocar nada.
 */
export interface ResidencyBinding {
  readonly unit: ModelExecutionUnit
  readonly residencyKey: string
  readonly generation: number
}

/** Observación de salud: una sola consulta; reintentos y plazos los decide quien llama. */
export type HealthObservation = { readonly status: 'healthy' } | { readonly status: 'unhealthy'; readonly reason: string }

/** Resultado de una operación que muta el runtime. */
export type RuntimeMutationOutcome =
  | { readonly status: 'done' }
  | { readonly status: 'stale_generation'; readonly currentGeneration: number | 'unavailable' }
  | { readonly status: 'failed'; readonly reason: string }

/**
 * Identidad del artefacto que el runtime sirve bajo el nombre del grant, tal
 * como la informa: lo que el runtime no declara queda `undefined` y no
 * coincide con nada. La revisión no es observable en el runtime: la ata el
 * digest del artefacto, que el catálogo resolvió para esa revisión.
 */
export interface ObservedArtifactIdentity {
  readonly modelId: string
  readonly artifactId: string | undefined
  readonly format: string | undefined
  readonly quantization: string | undefined
}

export type ArtifactIdentityVerification =
  | { readonly status: 'matches'; readonly observed: ObservedArtifactIdentity }
  | { readonly status: 'mismatch'; readonly expected: ResolvedModelArtifact; readonly observed: ObservedArtifactIdentity | undefined }
  | { readonly status: 'failed'; readonly reason: string }

/** Lo que la reconciliación espera encontrar en una unidad. */
export interface ExpectedResidency {
  readonly residencyKey: string
  readonly generation: number
  readonly artifact: ResolvedModelArtifact
}

/** Estado de dominio observado en el runtime de una unidad, sin inferirlo de una carga anterior. */
export type ObservedResidency =
  | { readonly status: 'absent' }
  | { readonly status: 'loading' }
  | { readonly status: 'resident'; readonly observed: ObservedArtifactIdentity }
  | { readonly status: 'mismatch'; readonly observed: ObservedArtifactIdentity }
  | { readonly status: 'error'; readonly reason: string }

/**
 * El runtime de una `ModelExecutionUnit` visto por thyrox (ADR-007 1.13.0). Traduce
 * la ejecución concedida al protocolo del runtime y sólo habla con el endpoint
 * de la unidad; los verbos y estados HTTP del runtime quedan dentro de cada
 * implementación. No decide modelo, revisión ni cuantización: vienen en el
 * grant. Las operaciones de lectura no tienen efectos; las que mutan van atadas
 * a unidad, residencia y generación, y rechazan una generación vieja antes de
 * tocar el runtime.
 */
export interface RuntimeAdapter {
  readonly capabilities: RuntimeCapabilities
  /** Lectura: el runtime de la unidad responde. */
  probeHealth(unit: ModelExecutionUnit): Promise<HealthObservation>
  /** Muta: hace utilizable en ESTA unidad el artefacto exacto del grant, que `ensureModel` ya materializó. */
  prepareRuntimeArtifact(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome>
  /** Lectura: modelo, digest y cuantización que el runtime sirve, contra los del grant. */
  verifyArtifactIdentity(unit: ModelExecutionUnit, grant: ExecutionGrant): Promise<ArtifactIdentityVerification>
  /** Muta: deja residente el modelo exacto del grant. */
  loadResidency(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome>
  /** Lectura: qué residencia hay de verdad en la unidad, para reconciliar. */
  observeResidency(unit: ModelExecutionUnit, expected: ExpectedResidency): Promise<ObservedResidency>
  /** Muta: descarga con gracia; si falla, destruir la unidad sigue siendo posible y definitivo. */
  unloadResidency(binding: ResidencyBinding): Promise<RuntimeMutationOutcome>
}
