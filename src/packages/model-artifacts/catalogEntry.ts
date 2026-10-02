/**
 * Forma de una entrada del catálogo de modelos (ADR-007 1.7.0, `ModelCatalog`):
 * qué modelo, variante, revisión y cuantización están declarados, con lo que
 * hace falta para resolverlo sin volver a leer el artefacto.
 *
 * Es el contrato compartido entre el catálogo (TASK-THYROX-0697), que la
 * valida y la persiste, y el resolver (TASK-THYROX-0698), que la consume. No
 * dice nada de residencia ni de dispositivo: eso es del scheduler.
 */

import type { AttentionShape, KvCacheType } from './memoryEstimate.js'
import type { ModelSource } from './modelName.js'
import type { QuantizationLevel } from './quantizationLevel.js'

export type { AttentionShape }

/**
 * Dónde vive el artefacto: un GGUF propio, un modelo del registro de Ollama o
 * un snapshot de safetensors que carga Transformers (TASK-THYROX-0761); el
 * `artifactId` de un snapshot es el sha256 de su manifiesto.
 */
export type ArtifactFormat = 'gguf' | 'ollama-registry' | 'safetensors'

/** Capacidades que una petición puede exigir al modelo. */
export type ModelCapability = 'completion' | 'tools' | 'embeddings'

/** Digest y tamaño exactos del artefacto que se sirve. */
export interface CatalogArtifact {
  readonly format: ArtifactFormat
  /** 64 hex en minúsculas, sin prefijo `sha256:`. */
  readonly sha256: string
  readonly bytes: number
}

export interface ModelCatalogEntry {
  /** Nombre contractual `thyrox-<org>--<repo>:<quant>-<source>-<revision12>`. */
  readonly name: string
  readonly repository: string
  readonly source: ModelSource
  /** Revisión completa: commit de HF (40 hex) o digest del manifiesto (64 hex). */
  readonly revision: string
  readonly quantization: QuantizationLevel
  readonly artifact: CatalogArtifact
  /** `general.architecture` del GGUF. */
  readonly architecture: string
  /** Extraída de la metadata GGUF al declarar (`attentionShapeOf`): basta para estimar la caché KV sin releer el archivo. */
  readonly attention: AttentionShape
  /** `<arch>.context_length`: el máximo que el modelo admite. */
  readonly maxContextLength: number
  readonly defaultKvCacheType: KvCacheType
  readonly capabilities: readonly ModelCapability[]
  /** Instante ISO 8601 en UTC en que se declaró la entrada. */
  readonly declaredAt: string
}
