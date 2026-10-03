import { describe, expect, test } from 'bun:test'

import type { GgufMetadata } from '../ggufMetadata.js'
import {
  InvalidMemoryEstimateInputError,
  KV_CACHE_BYTES_PER_ELEMENT,
  MissingGgufKeyError,
  SERVING_BUFFER_MARGIN_BYTES,
  attentionShapeOf,
  estimateServingMemory,
  estimateServingMemoryFromShape,
} from '../memoryEstimate.js'

const QWEN2_METADATA: GgufMetadata = {
  'general.architecture': 'qwen2',
  'qwen2.block_count': 24,
  'qwen2.attention.head_count_kv': 2,
  'qwen2.attention.head_count': 14,
  'qwen2.embedding_length': 896,
}
const Q4_K_M_BYTES = 397_807_712

describe('estimateServingMemory', () => {
  test('peso = bytes del archivo; KV = 2 × capas × contexto × cabezas_kv × dim_cabeza × bytes', () => {
    const estimate = estimateServingMemory({ ggufBytes: Q4_K_M_BYTES, metadata: QWEN2_METADATA, contextLength: 2048, kvCacheType: 'f16' })
    expect(estimate.weightsBytes).toBe(Q4_K_M_BYTES)
    expect(estimate.kvCacheBytes).toBe(2 * 24 * 2048 * 2 * 64 * 2)
    expect(estimate.bufferBytes).toBe(SERVING_BUFFER_MARGIN_BYTES)
    expect(estimate.totalBytes).toBe(Q4_K_M_BYTES + 25_165_824 + SERVING_BUFFER_MARGIN_BYTES)
  })

  test('el tipo de caché KV escala la caché, no el peso', () => {
    const base = { ggufBytes: Q4_K_M_BYTES, metadata: QWEN2_METADATA, contextLength: 4096 }
    const f16 = estimateServingMemory({ ...base, kvCacheType: 'f16' }).kvCacheBytes
    expect(estimateServingMemory({ ...base, kvCacheType: 'f32' }).kvCacheBytes).toBe(f16 * 2)
    expect(estimateServingMemory({ ...base, kvCacheType: 'q8_0' }).kvCacheBytes).toBe(Math.ceil(f16 / 2 * KV_CACHE_BYTES_PER_ELEMENT.q8_0))
    expect(estimateServingMemory({ ...base, kvCacheType: 'q4_0' }).kvCacheBytes).toBe(Math.ceil(f16 / 2 * KV_CACHE_BYTES_PER_ELEMENT.q4_0))
  })

  test('cota superior de lo que Ollama 0.35.0 reservó para el mismo GGUF (/api/ps)', () => {
    const measured: readonly [number, number][] = [[2048, 619_614_042], [8192, 747_026_512]]
    for (const [contextLength, ollamaSize] of measured) {
      const { totalBytes } = estimateServingMemory({ ggufBytes: Q4_K_M_BYTES, metadata: QWEN2_METADATA, contextLength, kvCacheType: 'f16' })
      expect(totalBytes).toBeGreaterThanOrEqual(ollamaSize)
    }
  })

  test('las claves se leen de la arquitectura declarada, no de una fija', () => {
    const llama: GgufMetadata = {
      'general.architecture': 'llama', 'llama.block_count': 32, 'llama.attention.head_count_kv': 8,
      'llama.attention.head_count': 32, 'llama.embedding_length': 4096,
    }
    const estimate = estimateServingMemory({ ggufBytes: 1, metadata: llama, contextLength: 1, kvCacheType: 'f16' })
    expect(estimate.kvCacheBytes).toBe(2 * 32 * 1 * 8 * 128 * 2)
  })
})

describe('estimateServingMemory — una clave ausente es un error con su nombre, no un cero', () => {
  // head_count_kv es opcional por la especificación GGUF; su ausencia se prueba abajo.
  for (const key of Object.keys(QWEN2_METADATA).filter(name => name !== 'qwen2.attention.head_count_kv')) {
    test(key, () => {
      const metadata = Object.fromEntries(Object.entries(QWEN2_METADATA).filter(([name]) => name !== key))
      const run = (): unknown => estimateServingMemory({ ggufBytes: 1, metadata, contextLength: 1, kvCacheType: 'f16' })
      expect(run).toThrow(MissingGgufKeyError)
      expect(run).toThrow(key)
    })
  }
})

describe('estimateServingMemory — rehúsa entradas sin sentido', () => {
  const valid = { ggufBytes: Q4_K_M_BYTES, metadata: QWEN2_METADATA, contextLength: 2048, kvCacheType: 'f16' } as const

  test('una clave con un valor que no es entero positivo', () => {
    expect(() => estimateServingMemory({ ...valid, metadata: { ...QWEN2_METADATA, 'qwen2.block_count': 0 } })).toThrow(/qwen2.block_count/)
    expect(() => estimateServingMemory({ ...valid, metadata: { ...QWEN2_METADATA, 'qwen2.block_count': 'x' } })).toThrow(/qwen2.block_count/)
  })

  test('general.architecture que no es cadena', () => {
    expect(() => estimateServingMemory({ ...valid, metadata: { ...QWEN2_METADATA, 'general.architecture': 3 } })).toThrow(/general.architecture/)
  })

  test('embedding_length que no se reparte entre las cabezas', () => {
    expect(() => estimateServingMemory({ ...valid, metadata: { ...QWEN2_METADATA, 'qwen2.attention.head_count': 13 } })).toThrow(/head_count/)
  })

  test('contexto y bytes no positivos', () => {
    expect(() => estimateServingMemory({ ...valid, contextLength: 0 })).toThrow(InvalidMemoryEstimateInputError)
    expect(() => estimateServingMemory({ ...valid, ggufBytes: -1 })).toThrow(/ggufBytes/)
  })

  test('tipo de caché KV desconocido', () => {
    expect(() => estimateServingMemory({ ...valid, kvCacheType: 'q2_k' as 'f16' })).toThrow(/q2_k/)
  })
})

describe('estimateServingMemoryFromShape — la ruta del catálogo, sin metadata', () => {
  test('sin attention.head_count_kv las cabezas KV son las de atención (GGUF: sin GQA)', () => {
    const withoutKvHeads = Object.fromEntries(Object.entries(QWEN2_METADATA).filter(([name]) => name !== 'qwen2.attention.head_count_kv'))
    expect(attentionShapeOf(withoutKvHeads)).toEqual({ blockCount: 24, kvHeadCount: 14, headDimension: 64 })
  })

  test('attentionShapeOf extrae capas, cabezas KV y dimensión de cabeza', () => {
    expect(attentionShapeOf(QWEN2_METADATA)).toEqual({ blockCount: 24, kvHeadCount: 2, headDimension: 64 })
  })

  test('da la misma cifra que la estimación desde la metadata', () => {
    const fromMetadata = estimateServingMemory({ ggufBytes: Q4_K_M_BYTES, metadata: QWEN2_METADATA, contextLength: 8192, kvCacheType: 'q8_0' })
    const fromShape = estimateServingMemoryFromShape({
      ggufBytes: Q4_K_M_BYTES, attention: attentionShapeOf(QWEN2_METADATA), contextLength: 8192, kvCacheType: 'q8_0',
    })
    expect(fromShape).toEqual(fromMetadata)
  })

  test('una forma con un campo que no es entero positivo se rehúsa con su nombre', () => {
    const attention = { blockCount: 24, kvHeadCount: 0, headDimension: 64 }
    expect(() => estimateServingMemoryFromShape({ ggufBytes: Q4_K_M_BYTES, attention, contextLength: 2048, kvCacheType: 'f16' }))
      .toThrow(new InvalidMemoryEstimateInputError('attention.kvHeadCount', 'se espera un entero positivo, llegó 0'))
  })
})
