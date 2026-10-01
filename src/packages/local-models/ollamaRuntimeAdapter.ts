/**
 * `OllamaRuntimeAdapter`: el `RuntimeAdapter` de una `ExecutionUnit` de
 * Ollama (ADR-007 1.13.0). Habla sólo con el endpoint de la unidad y sólo por
 * la API pública medida en Ollama 0.35.0 (H-THYROX-305): los verbos y estados
 * HTTP quedan aquí, el puerto no los conoce.
 *
 * - `probeHealth`: una consulta a `/api/version`; nunca espera ni reintenta.
 * - `prepareRuntimeArtifact`: sube el blob del grant si la unidad no lo tiene
 *   (`HEAD`/`POST /api/blobs`) y crea el modelo desde él (`/api/create`).
 * - `verifyArtifactIdentity`: `POST /api/show`, el `FROM` del blob y la
 *   cuantización contra el grant.
 * - `loadResidency` / `unloadResidency`: `/api/generate` con `keep_alive`.
 * - `observeResidency`: `/api/ps` más `/api/show`, porque `/api/ps` informa el
 *   digest del manifiesto y no el del blob.
 *
 * Toda operación que muta compara antes la generación del binding con la
 * vigente y no toca el runtime si es vieja. Ninguna borra modelos: no hay
 * `/api/delete` en este adapter.
 */
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import type {
  ArtifactIdentityVerification, ExecutionUnit, ExpectedResidency, HealthObservation, ObservedResidency,
  ResidencyBinding, RuntimeAdapter, RuntimeCapabilities, RuntimeMutationOutcome,
} from '@thyrox/model-scheduling/executionPrimitive.ts'

/** Ollama no deja gobernar varias residencias dentro de una unidad (topología A). */
export const OLLAMA_RUNTIME_CAPABILITIES: RuntimeCapabilities = {
  multipleResidencies: false, explicitLoad: true, explicitUnload: true,
  perResidencyIdentity: false, residencyObservation: true, placementEnforceable: false,
}

export interface OllamaRuntimeAdapterOptions {
  /** Ruta local del artefacto que `ensureModel` dejó verificado en la caché. */
  artifactPath(sha256: string): string
  /** La generación vigente de una residencia, de la coordinación. */
  currentGeneration(residencyKey: string): Promise<number | 'unavailable'>
}

export class OllamaRuntimeAdapter implements RuntimeAdapter {
  readonly capabilities = OLLAMA_RUNTIME_CAPABILITIES

  constructor(private readonly options: OllamaRuntimeAdapterOptions) {}

  async probeHealth(unit: ExecutionUnit): Promise<HealthObservation> {
    void unit; void this.options
    throw new Error('OllamaRuntimeAdapter.probeHealth: por implementar')
  }

  async prepareRuntimeArtifact(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    void binding; void grant
    throw new Error('OllamaRuntimeAdapter.prepareRuntimeArtifact: por implementar')
  }

  async verifyArtifactIdentity(unit: ExecutionUnit, grant: ExecutionGrant): Promise<ArtifactIdentityVerification> {
    void unit; void grant
    throw new Error('OllamaRuntimeAdapter.verifyArtifactIdentity: por implementar')
  }

  async loadResidency(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    void binding; void grant
    throw new Error('OllamaRuntimeAdapter.loadResidency: por implementar')
  }

  async observeResidency(unit: ExecutionUnit, expected: ExpectedResidency): Promise<ObservedResidency> {
    void unit; void expected
    throw new Error('OllamaRuntimeAdapter.observeResidency: por implementar')
  }

  async unloadResidency(binding: ResidencyBinding): Promise<RuntimeMutationOutcome> {
    void binding
    throw new Error('OllamaRuntimeAdapter.unloadResidency: por implementar')
  }
}
