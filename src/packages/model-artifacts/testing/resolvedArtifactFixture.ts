/**
 * Identidades resueltas coherentes para las pruebas: el nombre contractual se
 * deriva de los campos con `thyroxModelName`, así que nunca lo contradicen.
 * Dos modelos distintos con la misma cuantización, para que una prueba que
 * confunda cuantización con identidad falle.
 */
import { thyroxModelName } from '../modelName.js'
import type { QuantizationLevel } from '../quantizationLevel.js'
import type { ResolvedModelArtifact } from '../resolvedModelArtifact.js'

export const QWEN_REPOSITORY = 'Qwen/Qwen2.5-0.5B-Instruct'
export const QWEN_REVISION = '7ae557604adf67be50417f59c2c2f167def9a775'
export const DEEPSEEK_REPOSITORY = 'TheBloke/deepseek-coder-6.7B-instruct-GGUF'
export const DEEPSEEK_REVISION = '0123456789abcdef0123456789abcdef01234567'

export interface ArtifactParts {
  readonly repository?: string
  readonly revision?: string
  readonly quantization?: QuantizationLevel
  readonly artifactId?: string
  readonly bytes?: number
}

/** Una identidad resuelta coherente; por defecto Qwen2.5-0.5B-Instruct, revisión completa, Q4_K_M. */
export function resolvedArtifact(parts: ArtifactParts = {}): ResolvedModelArtifact {
  const repository = parts.repository ?? QWEN_REPOSITORY
  const revision = parts.revision ?? QWEN_REVISION
  const quantization = parts.quantization ?? 'q4_k_m'
  return {
    modelId: thyroxModelName({ repository, quantization, source: 'hf', revision }),
    repository,
    source: 'hf',
    revision,
    artifactId: parts.artifactId ?? 'b'.repeat(64),
    format: 'gguf',
    quantization,
    bytes: parts.bytes ?? 397_807_712,
  }
}
