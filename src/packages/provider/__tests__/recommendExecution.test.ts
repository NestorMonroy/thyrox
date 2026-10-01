import { describe, expect, test } from 'bun:test'

import type { ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
import { attentionShapeOf } from '@thyrox/model-artifacts/memoryEstimate.ts'
import type { ModelQualification } from '@thyrox/model-artifacts/modelQualification.ts'
import { thyroxModelName } from '@thyrox/model-artifacts/modelName.ts'
import { recommend, recommendExecution } from '../src/cost/policy.ts'

const CONTEXT_TOKENS = 32_000
const ATTENTION = attentionShapeOf({
  'general.architecture': 'qwen2',
  'qwen2.block_count': 36,
  'qwen2.attention.head_count_kv': 2,
  'qwen2.attention.head_count': 16,
  'qwen2.embedding_length': 2048,
})

function catalogEntry(repository: string, revisionDigit: string): ModelCatalogEntry {
  const revision = revisionDigit.repeat(40)
  return {
    name: thyroxModelName({ repository, quantization: 'q4_k_m', source: 'hf', revision }),
    repository,
    source: 'hf',
    revision,
    quantization: 'q4_k_m',
    artifact: { format: 'gguf', sha256: 'b'.repeat(64), bytes: 1_929_912_432 },
    architecture: 'qwen2',
    attention: ATTENTION,
    maxContextLength: 65_536,
    defaultKvCacheType: 'f16',
    capabilities: ['completion', 'tools'],
    declaredAt: '2026-10-01T00:00:00Z',
  }
}

function qualification(model: string, overrides: Partial<ModelQualification> = {}): ModelQualification {
  return {
    model,
    taskClass: 'mecanica',
    suite: 'tool-calling@1',
    casesPassed: 6,
    casesTotal: 6,
    passed: true,
    contextTokens: 65_536,
    tokensPerSecond: 20,
    measuredAt: '2026-10-01T01:00:00Z',
    ...overrides,
  }
}

const SLOW = catalogEntry('qwen/slow', 'a')
const FAST = catalogEntry('qwen/fast', 'c')

describe('recommendExecution — local primero, claude-cli declarado como respaldo', () => {
  test('un modelo local cualificado gana: runtime ollama con su cualificación', () => {
    const fast = qualification(FAST.name, { tokensPerSecond: 40 })
    const result = recommendExecution('mecanica', { contextTokens: CONTEXT_TOKENS }, {
      entries: [SLOW, FAST],
      qualifications: [qualification(SLOW.name), fast],
    })
    expect(result.runtime).toBe('ollama')
    expect(result.model).toBe(FAST.name)
    expect(result.taskClass).toBe('mecanica')
    expect(result.runtime === 'ollama' ? result.qualification : undefined).toEqual(fast)
    expect('fallbackReason' in result).toBe(false)
  })

  test('catálogo vacío: cae a claude-cli y lo nombra', () => {
    const result = recommendExecution('mecanica', { contextTokens: CONTEXT_TOKENS }, { entries: [], qualifications: [] })
    expect(result.runtime).toBe('claude-cli')
    expect(result.model).toBe(recommend('mecanica', { contextTokens: CONTEXT_TOKENS }).model)
    expect(result.runtime === 'claude-cli' ? result.fallbackReason : '').toMatch(/catálogo local vacío/)
  })

  test('sin cualificación aprobada de la clase: cae y nombra la clase', () => {
    const result = recommendExecution('analisis', { contextTokens: CONTEXT_TOKENS }, {
      entries: [SLOW],
      qualifications: [qualification(SLOW.name), qualification(SLOW.name, { taskClass: 'analisis', passed: false, casesPassed: 4 })],
    })
    expect(result.runtime).toBe('claude-cli')
    expect(result.model.startsWith('claude-')).toBe(true)
    expect(result.runtime === 'claude-cli' ? result.fallbackReason : '').toMatch(/sin cualificación aprobada.*analisis/)
  })

  test('contexto medido insuficiente: cae y nombra el contexto medido y el exigido', () => {
    const result = recommendExecution('mecanica', { contextTokens: 100_000 }, {
      entries: [SLOW],
      qualifications: [qualification(SLOW.name, { contextTokens: 65_536 })],
    })
    expect(result.runtime).toBe('claude-cli')
    expect(result.runtime === 'claude-cli' ? result.fallbackReason : '').toMatch(/contexto medido insuficiente.*65536.*100000/)
  })

  test('el respaldo conserva la recomendación del catálogo del proveedor', () => {
    const result = recommendExecution('adversarial', { contextTokens: CONTEXT_TOKENS }, { entries: [], qualifications: [] })
    const provider = recommend('adversarial', { contextTokens: CONTEXT_TOKENS })
    expect(result.runtime === 'claude-cli' ? result.excluded : []).toEqual(provider.excluded)
    expect(result.runtime === 'claude-cli' ? result.effort : undefined).toBe(provider.effort)
  })
})
