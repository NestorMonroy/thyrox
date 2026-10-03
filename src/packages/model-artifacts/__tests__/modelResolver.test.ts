import { describe, expect, test } from 'bun:test'

import type { ModelCapability, ModelCatalogEntry } from '../catalogEntry.js'
import type { GgufMetadata } from '../ggufMetadata.js'
import { attentionShapeOf, estimateServingMemory } from '../memoryEstimate.js'
import { thyroxModelName } from '../modelName.js'
import type { QuantizationLevel } from '../quantizationLevel.js'
import {
  AmbiguousModelRequestError,
  ContextLengthExceededError,
  MissingCapabilityError,
  ModelNotDeclaredError,
  resolveModel,
} from '../modelResolver.js'

const QWEN2_METADATA: GgufMetadata = {
  'general.architecture': 'qwen2',
  'qwen2.block_count': 24,
  'qwen2.attention.head_count_kv': 2,
  'qwen2.attention.head_count': 14,
  'qwen2.embedding_length': 896,
}
const REPOSITORY = 'Qwen/Qwen2.5-0.5B-Instruct-GGUF'
const REVISION_A = '9217f5db79a29953eb74d5343926648285ec7e67'
const REVISION_B = '0123456789abcdef0123456789abcdef01234567'
const Q4_K_M_BYTES = 397_807_712
const MAX_CONTEXT = 32_768

interface EntryParts {
  readonly quantization?: QuantizationLevel
  readonly revision?: string
  readonly capabilities?: readonly ModelCapability[]
  readonly repository?: string
}

function entry(parts: EntryParts = {}): ModelCatalogEntry {
  const repository = parts.repository ?? REPOSITORY
  const quantization = parts.quantization ?? 'q4_k_m'
  const revision = parts.revision ?? REVISION_A
  return {
    name: thyroxModelName({ repository, quantization, source: 'hf', revision }),
    repository,
    source: 'hf',
    revision,
    quantization,
    artifact: { format: 'gguf', sha256: 'a'.repeat(64), bytes: Q4_K_M_BYTES },
    architecture: 'qwen2',
    attention: attentionShapeOf(QWEN2_METADATA),
    maxContextLength: MAX_CONTEXT,
    defaultKvCacheType: 'f16',
    capabilities: parts.capabilities ?? ['completion', 'tools'],
    declaredAt: '2026-09-30T23:00:00Z',
  }
}

const Q4 = entry()
const Q8 = entry({ quantization: 'q8_0' })
const Q4_OTHER_REVISION = entry({ revision: REVISION_B })
const OTHER_REPOSITORY = entry({ repository: 'meta-llama/Llama-3.2-1B-Instruct' })

describe('resolveModel — por nombre exacto', () => {
  test('devuelve esa entrada y su artefacto', () => {
    const resolved = resolveModel({ model: Q8.name }, [Q4, Q8])
    expect(resolved.entry).toBe(Q8)
    expect(resolved.artifact).toMatchObject({ modelId: Q8.name, artifactId: Q8.artifact.sha256, quantization: 'q8_0', revision: Q8.revision })
  })

  test('un nombre no declarado se rehúsa nombrándolo', () => {
    const missing = entry({ quantization: 'q6_k' }).name
    const run = (): unknown => resolveModel({ model: missing }, [Q4, Q8])
    expect(run).toThrow(ModelNotDeclaredError)
    expect(run).toThrow(missing)
  })
})

describe('resolveModel — por repositorio', () => {
  test('una sola variante se resuelve sin más filtros', () => {
    expect(resolveModel({ model: { repository: REPOSITORY } }, [Q4, OTHER_REPOSITORY]).entry).toBe(Q4)
  })

  test('el repositorio se compara sin mayúsculas, como el nombre', () => {
    expect(resolveModel({ model: { repository: REPOSITORY.toLowerCase() } }, [Q4]).entry).toBe(Q4)
  })

  test('un repositorio sin entradas se rehúsa nombrándolo', () => {
    const run = (): unknown => resolveModel({ model: { repository: 'org/absent' } }, [Q4])
    expect(run).toThrow(ModelNotDeclaredError)
    expect(run).toThrow('org/absent')
  })

  test('dos variantes sin filtro: rehúsa listando los candidatos, no elige', () => {
    const run = (): unknown => resolveModel({ model: { repository: REPOSITORY } }, [Q8, Q4])
    expect(run).toThrow(AmbiguousModelRequestError)
    try {
      run()
    } catch (error) {
      expect((error as AmbiguousModelRequestError).candidates).toEqual([Q4.name, Q8.name].sort())
    }
  })

  test('la cuantización filtra, normalizada', () => {
    expect(resolveModel({ model: { repository: REPOSITORY, quantization: 'Q8_0' } }, [Q4, Q8]).entry).toBe(Q8)
  })

  test('una cuantización sin coincidencia se rehúsa nombrándola, no cambia de nivel', () => {
    const run = (): unknown => resolveModel({ model: { repository: REPOSITORY, quantization: 'q6_k' } }, [Q4, Q8])
    expect(run).toThrow(ModelNotDeclaredError)
    expect(run).toThrow('q6_k')
  })

  test('el prefijo de revisión filtra', () => {
    const request = { model: { repository: REPOSITORY, revision: REVISION_B.slice(0, 7) } }
    expect(resolveModel(request, [Q4, Q4_OTHER_REVISION]).entry).toBe(Q4_OTHER_REVISION)
  })

  test('el prefijo de un digest se acepta con sha256: y en mayúsculas', () => {
    const digest = 'c'.repeat(64)
    const ollama = { ...entry({ repository: 'library/qwen2.5-0.5b' }), source: 'ollama' as const, revision: digest }
    const request = { model: { repository: 'library/qwen2.5-0.5b', revision: 'SHA256:CCCCCC' } }
    expect(resolveModel(request, [ollama]).entry).toBe(ollama)
  })

  test('una revisión sin coincidencia se rehúsa nombrándola', () => {
    const run = (): unknown => resolveModel({ model: { repository: REPOSITORY, revision: 'deadbeef' } }, [Q4, Q4_OTHER_REVISION])
    expect(run).toThrow(ModelNotDeclaredError)
    expect(run).toThrow('deadbeef')
  })
})

describe('resolveModel — capacidades', () => {
  test('una capacidad ausente se rehúsa nombrándola', () => {
    const run = (): unknown => resolveModel({ model: Q4.name, requiredCapabilities: ['embeddings'] }, [Q4])
    expect(run).toThrow(MissingCapabilityError)
    expect(run).toThrow('embeddings')
  })

  test('las capacidades filtran candidatos por repositorio', () => {
    const embedder = entry({ quantization: 'f16', capabilities: ['embeddings'] })
    const request = { model: { repository: REPOSITORY }, requiredCapabilities: ['embeddings'] as const }
    expect(resolveModel(request, [Q4, embedder]).entry).toBe(embedder)
  })

  test('por repositorio sin candidato capaz: rehúsa con la capacidad', () => {
    const run = (): unknown => resolveModel({ model: { repository: REPOSITORY }, requiredCapabilities: ['embeddings'] }, [Q4, Q8])
    expect(run).toThrow(MissingCapabilityError)
    expect(run).toThrow('embeddings')
  })
})

describe('resolveModel — contexto, caché KV y perfil de memoria', () => {
  test('sin contexto pedido, el efectivo es el máximo del modelo', () => {
    expect(resolveModel({ model: Q4.name }, [Q4]).contextLength).toBe(MAX_CONTEXT)
  })

  test('un contexto pedido dentro del máximo se respeta', () => {
    expect(resolveModel({ model: Q4.name, contextLength: 2048 }, [Q4]).contextLength).toBe(2048)
  })

  test('un contexto mayor que el máximo se rehúsa con los dos números', () => {
    const run = (): unknown => resolveModel({ model: Q4.name, contextLength: MAX_CONTEXT + 1 }, [Q4])
    expect(run).toThrow(ContextLengthExceededError)
    expect(run).toThrow(String(MAX_CONTEXT + 1))
    expect(run).toThrow(String(MAX_CONTEXT))
  })

  test('el tipo de caché KV efectivo es el pedido o el de la entrada', () => {
    expect(resolveModel({ model: Q4.name }, [Q4]).kvCacheType).toBe('f16')
    expect(resolveModel({ model: Q4.name, kvCacheType: 'q8_0' }, [Q4]).kvCacheType).toBe('q8_0')
  })

  test('el perfil coincide con estimateServingMemory sobre la metadata equivalente', () => {
    const resolved = resolveModel({ model: Q4.name, contextLength: 2048, kvCacheType: 'q8_0' }, [Q4])
    const expected = estimateServingMemory({ ggufBytes: Q4_K_M_BYTES, metadata: QWEN2_METADATA, contextLength: 2048, kvCacheType: 'q8_0' })
    expect(resolved.memoryProfile).toEqual(expected)
  })

  test('el perfil por defecto usa el contexto máximo', () => {
    const expected = estimateServingMemory({ ggufBytes: Q4_K_M_BYTES, metadata: QWEN2_METADATA, contextLength: MAX_CONTEXT, kvCacheType: 'f16' })
    expect(resolveModel({ model: Q4.name }, [Q4]).memoryProfile).toEqual(expected)
  })
})
