/**
 * La identidad resuelta de un artefacto (ADR-007 1.14.0). Qué haría fallar a
 * esta suite: tratar la cuantización como identidad —dos modelos distintos con
 * `Q4_K_M` saldrían iguales, o dos cuantizaciones de un mismo modelo—; perder
 * la revisión completa y quedarse con sus 12 primeros hex; o aceptar una
 * identidad cuyo nombre contractual no abrevia sus propios campos.
 */
import { describe, expect, test } from 'bun:test'

import type { ModelCatalogEntry } from '../catalogEntry.js'
import type { GgufMetadata } from '../ggufMetadata.js'
import { attentionShapeOf } from '../memoryEstimate.js'
import { thyroxModelName } from '../modelName.js'
import type { QuantizationLevel } from '../quantizationLevel.js'
import {
  assertConsistentIdentity,
  InconsistentModelIdentityError,
  resolvedArtifactOf,
  sameArtifactIdentity,
  type ResolvedModelArtifact,
} from '../resolvedModelArtifact.js'

const QWEN2_METADATA: GgufMetadata = {
  'general.architecture': 'qwen2',
  'qwen2.block_count': 24,
  'qwen2.attention.head_count_kv': 2,
  'qwen2.attention.head_count': 14,
  'qwen2.embedding_length': 896,
}
const QWEN = 'Qwen/Qwen2.5-0.5B-Instruct-GGUF'
const DEEPSEEK = 'TheBloke/deepseek-coder-6.7B-instruct-GGUF'
const QWEN_REVISION = '9217f5db79a29953eb74d5343926648285ec7e67'
const DEEPSEEK_REVISION = '0123456789abcdef0123456789abcdef01234567'

function entry(repository: string, quantization: QuantizationLevel, revision: string, sha256: string): ModelCatalogEntry {
  return {
    name: thyroxModelName({ repository, quantization, source: 'hf', revision }),
    repository,
    source: 'hf',
    revision,
    quantization,
    artifact: { format: 'gguf', sha256, bytes: 397_807_712 },
    architecture: 'qwen2',
    attention: attentionShapeOf(QWEN2_METADATA),
    maxContextLength: 32_768,
    defaultKvCacheType: 'f16',
    capabilities: ['completion'],
    declaredAt: '2026-10-01T00:00:00Z',
  }
}

const QWEN_Q4 = entry(QWEN, 'q4_k_m', QWEN_REVISION, 'a'.repeat(64))
const QWEN_Q8 = entry(QWEN, 'q8_0', QWEN_REVISION, 'b'.repeat(64))
const DEEPSEEK_Q4 = entry(DEEPSEEK, 'q4_k_m', DEEPSEEK_REVISION, 'c'.repeat(64))

describe('resolvedArtifactOf', () => {
  test('lleva la identidad entera, con la revisión completa', () => {
    expect(resolvedArtifactOf(QWEN_Q4)).toEqual({
      modelId: QWEN_Q4.name, repository: QWEN, source: 'hf', revision: QWEN_REVISION,
      artifactId: 'a'.repeat(64), format: 'gguf', quantization: 'q4_k_m', bytes: 397_807_712,
    })
  })
})

describe('sameArtifactIdentity', () => {
  test('dos modelos con la misma cuantización no son la misma identidad', () => {
    expect(sameArtifactIdentity(resolvedArtifactOf(QWEN_Q4), resolvedArtifactOf(DEEPSEEK_Q4))).toBe(false)
  })

  test('dos cuantizaciones de un mismo modelo no son la misma identidad', () => {
    expect(sameArtifactIdentity(resolvedArtifactOf(QWEN_Q4), resolvedArtifactOf(QWEN_Q8))).toBe(false)
  })

  test('cualquier campo distinto basta: el mismo nombre con otro artefacto no es la misma', () => {
    const resolved = resolvedArtifactOf(QWEN_Q4)
    expect(sameArtifactIdentity(resolved, { ...resolved })).toBe(true)
    expect(sameArtifactIdentity(resolved, { ...resolved, artifactId: 'd'.repeat(64) })).toBe(false)
    expect(sameArtifactIdentity(resolved, { ...resolved, revision: QWEN_REVISION.replace(/.$/, '0') })).toBe(false)
  })
})

describe('assertConsistentIdentity', () => {
  const consistent = (): ResolvedModelArtifact => resolvedArtifactOf(QWEN_Q4)

  function rejectedField(artifact: ResolvedModelArtifact): string | undefined {
    try {
      assertConsistentIdentity(artifact)
      return undefined
    } catch (error) {
      if (!(error instanceof InconsistentModelIdentityError)) throw error
      return error.field
    }
  }

  test('acepta una identidad cuyo nombre abrevia sus campos', () => {
    expect(rejectedField(consistent())).toBeUndefined()
  })

  test('rechaza una cuantización que el nombre no declara', () => {
    expect(rejectedField({ ...consistent(), quantization: 'q8_0' })).toBe('quantization')
  })

  test('rechaza una revisión que no empieza por los 12 hex del nombre', () => {
    expect(rejectedField({ ...consistent(), revision: DEEPSEEK_REVISION })).toBe('revision')
  })

  test('rechaza una revisión abreviada a 12 hex', () => {
    expect(rejectedField({ ...consistent(), revision: QWEN_REVISION.slice(0, 12) })).toBe('revision')
  })

  test('rechaza un repositorio que el nombre no abrevia', () => {
    expect(rejectedField({ ...consistent(), repository: DEEPSEEK })).toBe('repository')
  })

  test('rechaza un artefacto que no es un sha256 de 64 hex', () => {
    expect(rejectedField({ ...consistent(), artifactId: `sha256:${'a'.repeat(64)}` })).toBe('artifactId')
  })
})
