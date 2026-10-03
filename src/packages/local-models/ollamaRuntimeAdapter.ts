/**
 * `OllamaRuntimeAdapter`: el `RuntimeAdapter` de una `ModelExecutionUnit` de
 * Ollama (ADR-007 1.13.0). Habla sólo con el endpoint de la unidad y sólo por
 * la API pública medida en Ollama 0.35.0 (H-THYROX-305): los verbos y estados
 * HTTP quedan aquí, el puerto no los conoce.
 *
 * - `probeHealth`: una consulta a `/api/version`; nunca espera ni reintenta.
 * - `prepareRuntimeArtifact`: crea el modelo desde el blob del grant
 *   (`/api/create`). Con el artefacto montado en la unidad (`artifactMounted`)
 *   el blob ya está y nunca se sube: si falta, rehúsa en vez de copiarlo
 *   (H-THYROX-471). Sin montaje lo sube si falta (`HEAD`/`POST /api/blobs`).
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
import { normalizeQuantizationLevel } from '@thyrox/model-artifacts/quantizationLevel.ts'
import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'
import type {
  ArtifactIdentityVerification, ModelExecutionUnit, ExpectedResidency, HealthObservation, ObservedArtifactIdentity,
  ObservedResidency, ResidencyBinding, RuntimeAdapter, RuntimeCapabilities, RuntimeMutationOutcome,
} from '@thyrox/model-scheduling/modelUnitMaterializer.ts'

import { OllamaApi, OllamaRequestError } from './ollamaApi.ts'
import { artifactIdentityMatches, mutateAtCurrentGeneration, reasonOf } from './runtimeMutation.ts'

/** Ollama no deja gobernar varias residencias dentro de una unidad (topología A). */
export const OLLAMA_RUNTIME_CAPABILITIES: RuntimeCapabilities = {
  multipleResidencies: false, explicitLoad: true, explicitUnload: true,
  perResidencyIdentity: false, residencyObservation: true, placementEnforceable: false,
}

/** `keep_alive` de `/api/generate`: negativo deja el modelo residente sin plazo; 0 lo descarga. */
const KEEP_ALIVE_FOREVER = -1
const KEEP_ALIVE_UNLOAD = 0
const GENERATE_PATH = '/api/generate'
/** El `FROM` del modelfile que `/api/show` devuelve nombra el blob como `.../blobs/sha256-<hex>`. */
const FROM_BLOB_DIGEST = /^FROM\s+\S*sha256-([0-9a-f]{64})\s*$/m


export interface OllamaRuntimeAdapterOptions {
  /** Ruta local del artefacto que `ensureModel` dejó verificado en la caché. */
  artifactPath(sha256: string): string
  /** La generación vigente de una residencia, de la coordinación. */
  currentGeneration(residencyKey: string): Promise<number | 'unavailable'>
  /** La unidad ve el artefacto de la caché montado como su blob: no se sube. */
  readonly artifactMounted?: boolean
}

export class MountedBlobMissingError extends Error {
  constructor(sha256: string) {
    super(`el blob montado sha256-${sha256} no está en la unidad: no se copia a su almacén`)
  }
}

export class OllamaRuntimeAdapter implements RuntimeAdapter {
  readonly capabilities = OLLAMA_RUNTIME_CAPABILITIES

  constructor(private readonly options: OllamaRuntimeAdapterOptions) {}

  async probeHealth(unit: ModelExecutionUnit): Promise<HealthObservation> {
    try {
      await apiOf(unit).version()
      return { status: 'healthy' }
    } catch (error) {
      return { status: 'unhealthy', reason: reasonOf(error) }
    }
  }

  async prepareRuntimeArtifact(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    const sha256 = grant.artifact.artifactId
    return this.mutate(binding, async api => {
      if (!await api.hasBlob(sha256)) {
        if (this.options.artifactMounted) throw new MountedBlobMissingError(sha256)
        await api.pushBlob(sha256, this.options.artifactPath(sha256))
      }
      await api.createModel(grant.artifact.modelId, sha256)
    })
  }

  async verifyArtifactIdentity(unit: ModelExecutionUnit, grant: ExecutionGrant): Promise<ArtifactIdentityVerification> {
    const expected = grant.artifact
    try {
      const observed = await observeIdentity(apiOf(unit), expected.modelId)
      if (observed && artifactIdentityMatches(expected, observed)) return { status: 'matches', observed }
      return { status: 'mismatch', expected, observed }
    } catch (error) {
      return { status: 'failed', reason: reasonOf(error) }
    }
  }

  async loadResidency(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    return this.mutate(binding, () => setKeepAlive(binding.unit, grant.artifact.modelId, KEEP_ALIVE_FOREVER))
  }

  async observeResidency(unit: ModelExecutionUnit, expected: ExpectedResidency): Promise<ObservedResidency> {
    try {
      const api = apiOf(unit)
      if (!(await api.residentModelNames()).includes(expected.artifact.modelId)) return { status: 'absent' }
      const observed = await observeIdentity(api, expected.artifact.modelId)
      if (!observed) return { status: 'absent' }
      if (!artifactIdentityMatches(expected.artifact, observed)) return { status: 'mismatch', observed }
      return { status: 'resident', observed }
    } catch (error) {
      return { status: 'error', reason: reasonOf(error) }
    }
  }

  async unloadResidency(binding: ResidencyBinding): Promise<RuntimeMutationOutcome> {
    return this.mutate(binding, () => setKeepAlive(binding.unit, binding.unit.artifact.modelId, KEEP_ALIVE_UNLOAD))
  }

  private mutate(binding: ResidencyBinding, change: (api: OllamaApi) => Promise<void>): Promise<RuntimeMutationOutcome> {
    return mutateAtCurrentGeneration(this.options.currentGeneration, binding, () => change(apiOf(binding.unit)))
  }
}

function apiOf(unit: ModelExecutionUnit): OllamaApi {
  return new OllamaApi(unit.endpoint)
}

/** Identidad que el runtime sirve bajo `model`, o `undefined` si no lo tiene instalado. */
async function observeIdentity(api: OllamaApi, model: string): Promise<ObservedArtifactIdentity | undefined> {
  const details = await api.findModelDetails(model)
  if (!details) return undefined
  return {
    modelId: model,
    artifactId: FROM_BLOB_DIGEST.exec(details.modelfile)?.[1],
    format: details.format === '' ? undefined : details.format,
    quantization: canonicalQuantization(details.quantizationLevel),
  }
}


/** La forma canónica de una cuantización; vacía o desconocida es `undefined` y no coincide con ninguna. */
function canonicalQuantization(level: string): string | undefined {
  if (level === '') return undefined
  try {
    return normalizeQuantizationLevel(level)
  } catch {
    return undefined
  }
}


/**
 * `POST /api/generate` sin `prompt`: sólo fija la residencia del modelo en la
 * unidad (`keep_alive` -1 la deja sin plazo, 0 la descarga). Vive aquí y no en
 * `OllamaApi` porque sólo la frontera que recibe grant y unidad puede tocar la
 * inferencia del runtime (M8).
 */
async function setKeepAlive(unit: ModelExecutionUnit, model: string, keepAlive: number): Promise<void> {
  const response = await fetch(`${unit.endpoint}${GENERATE_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, keep_alive: keepAlive, stream: false }),
  })
  const text = await response.text()
  if (!response.ok) throw new OllamaRequestError(GENERATE_PATH, response.status, text)
}
