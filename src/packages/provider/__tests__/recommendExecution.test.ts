import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
import { attentionShapeOf } from '@thyrox/model-artifacts/memoryEstimate.ts'
import type { ModelQualification } from '@thyrox/model-artifacts/modelQualification.ts'
import { thyroxModelName } from '@thyrox/model-artifacts/modelName.ts'
import { recommend, recommendExecution } from '../src/cost/policy.ts'
import { ExecutionPolicyError, allowsEntry, parseExecutionPolicy } from '../src/cost/executionPolicy.ts'

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
    kind: 'task',
    taskClass: 'mecanica',
    suite: 'mecanica-items@1',
    casesPassed: 6,
    casesTotal: 6,
    passed: true,
    contextTokens: 65_536,
    tokensPerSecond: 20,
    measurementCondition: 'isolated',
    measuredAt: '2026-10-01T01:00:00Z',
    ...overrides,
  }
}

/** La cualificación de protocolo que todo candidato elegible necesita además de la de tarea. */
function protocol(model: string): ModelQualification {
  const { taskClass: _taskClass, ...rest } = qualification(model, { kind: 'protocol', suite: 'tool-calling@1' })
  return rest
}

const SLOW = catalogEntry('qwen/slow', 'a')
const FAST = catalogEntry('qwen/fast', 'c')

describe('recommendExecution — local primero, claude-cli declarado como respaldo', () => {
  test('un modelo local cualificado gana: runtime ollama con su cualificación', () => {
    const fast = qualification(FAST.name, { tokensPerSecond: 40 })
    const result = recommendExecution('mecanica', { contextTokens: CONTEXT_TOKENS }, {
      entries: [SLOW, FAST],
      qualifications: [protocol(SLOW.name), protocol(FAST.name), qualification(SLOW.name), fast],
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
      qualifications: [protocol(SLOW.name), qualification(SLOW.name), qualification(SLOW.name, { taskClass: 'analisis', passed: false, casesPassed: 4 })],
    })
    expect(result.runtime).toBe('claude-cli')
    expect(result.model.startsWith('claude-')).toBe(true)
    expect(result.runtime === 'claude-cli' ? result.fallbackReason : '').toMatch(/sin cualificación aprobada.*analisis/)
  })

  test('contexto medido insuficiente: cae y nombra el contexto medido y el exigido', () => {
    const result = recommendExecution('mecanica', { contextTokens: 100_000 }, {
      entries: [SLOW],
      qualifications: [protocol(SLOW.name), qualification(SLOW.name, { contextTokens: 65_536 })],
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

describe('recommendExecution con una política de ejecución declarada (TASK-THYROX-0773)', () => {
  const QWEN = catalogEntry('Qwen/Qwen2.5-7B-Instruct-GGUF', '3')
  const PROFILE = { contextTokens: CONTEXT_TOKENS }
  const policyOf = (fallback: boolean) => parseExecutionPolicy(JSON.stringify({
    allowed: [{ runtime: 'ollama', repository: 'Qwen/Qwen2.5-7B-Instruct-GGUF', quantization: 'q4_k_m' }],
    fallback: { enabled: fallback },
  }))
  const both = {
    entries: [QWEN, FAST],
    qualifications: [protocol(QWEN.name), qualification(QWEN.name), protocol(FAST.name), qualification(FAST.name, { tokensPerSecond: 99 })],
  }
  const onlyOther = { entries: [FAST], qualifications: [protocol(FAST.name), qualification(FAST.name)] }

  test('elige sólo entre los modelos que la política permite, aunque otro sea más rápido', () => {
    const result = recommendExecution('mecanica', PROFILE, both, policyOf(false))
    expect(result.runtime).toBe('ollama')
    expect(result.runtime === 'ollama' ? result.model : '').toBe(QWEN.name)
  })

  test('sin candidato permitido cualificado y sin respaldo: bloqueada con su causa, nunca claude-cli', () => {
    const result = recommendExecution('mecanica', PROFILE, onlyOther, policyOf(false))
    expect(result.runtime).toBe('blocked')
    expect(result.runtime === 'blocked' ? result.blockedReason : '').toMatch(/política/)
  })

  test('con el respaldo declarado, cae a claude-cli y lo nombra', () => {
    const result = recommendExecution('mecanica', PROFILE, onlyOther, policyOf(true))
    expect(result.runtime).toBe('claude-cli')
  })

  test('sin política, el comportamiento de hoy no cambia', () => {
    expect(recommendExecution('mecanica', PROFILE, both).runtime).toBe('ollama')
    expect(recommendExecution('mecanica', PROFILE, both).model).toBe(FAST.name)
  })
})

describe('parseExecutionPolicy', () => {
  test('el respaldo no tiene valor por defecto: sin declararlo se rehúsa', () => {
    expect(() => parseExecutionPolicy(JSON.stringify({ allowed: [] }))).toThrow(ExecutionPolicyError)
  })

  test('sólo se permiten modelos locales por su repositorio; un proveedor no se lista', () => {
    expect(() => parseExecutionPolicy(JSON.stringify({ allowed: [{ runtime: 'claude-cli', repository: 'anthropic/claude' }], fallback: { enabled: false } })))
      .toThrow(ExecutionPolicyError)
  })

  test('un JSON ilegible se rehúsa con su causa', () => {
    expect(() => parseExecutionPolicy('{ no es json')).toThrow(ExecutionPolicyError)
  })

  const BASE = { allowed: [], fallback: { enabled: false } }

  test('la sección controller se valida y se conserva: es el mismo esquema que lee el preflight', () => {
    const policy = parseExecutionPolicy(JSON.stringify({ ...BASE, controller: { subagents: false, unmanagedPayloads: true, implementation: 'managed-only' } }))
    expect(policy.controller).toEqual({ subagents: false, unmanagedPayloads: true, implementation: 'managed-only' })
  })

  test('sin sección controller la política sólo gobierna la selección', () => {
    expect(parseExecutionPolicy(JSON.stringify(BASE)).controller).toBeUndefined()
  })

  test('un permiso del controlador que no es booleano, o que falta, se rehúsa', () => {
    expect(() => parseExecutionPolicy(JSON.stringify({ ...BASE, controller: { subagents: 'no', unmanagedPayloads: false, implementation: 'managed-only' } })))
      .toThrow(ExecutionPolicyError)
    expect(() => parseExecutionPolicy(JSON.stringify({ ...BASE, controller: { subagents: false, implementation: 'managed-only' } })))
      .toThrow(ExecutionPolicyError)
  })

  test('una implementación que no es bootstrap-exception ni managed-only se rehúsa', () => {
    expect(() => parseExecutionPolicy(JSON.stringify({ ...BASE, controller: { subagents: false, unmanagedPayloads: false, implementation: 'cualquiera' } })))
      .toThrow(ExecutionPolicyError)
  })

  test('la política versionada del árbol se lee igual que en el preflight (test_execution_policy_enforcement, caso 13)', () => {
    const policy = parseExecutionPolicy(readFileSync(resolve(import.meta.dir, '../../../session/execution_policy.json'), 'utf8'))
    expect([policy.fallback.enabled, policy.controller?.subagents, policy.controller?.unmanagedPayloads, policy.controller?.implementation])
      .toEqual([false, false, false, 'bootstrap-exception'])
  })
})

describe('la política nombra lo que excluye y distingue la fuente (TASK-THYROX-0778)', () => {
  const PROFILE = { contextTokens: CONTEXT_TOKENS }
  const LIBRARY_QWEN: ModelCatalogEntry = { ...catalogEntry('library/qwen2.5-7b-instruct', '4'), source: 'ollama' }
  const HF_HOMONYM = catalogEntry('library/qwen2.5-7b-instruct', '5')
  const policyFor = (selector: Record<string, unknown>) => parseExecutionPolicy(JSON.stringify({
    allowed: [{ runtime: 'ollama', ...selector }],
    fallback: { enabled: false },
  }))
  const qualified = (entry: ModelCatalogEntry) => [protocol(entry.name), qualification(entry.name)]

  test('si la política excluye todo el catálogo, la causa lo dice y no habla de un catálogo vacío', () => {
    const policy = policyFor({ repository: 'Qwen/Qwen2.5-7B-Instruct-GGUF' })
    const result = recommendExecution('mecanica', PROFILE, { entries: [LIBRARY_QWEN], qualifications: qualified(LIBRARY_QWEN) }, policy)
    const reason = result.runtime === 'blocked' ? result.blockedReason : ''
    expect(reason).toMatch(/la política no permite ninguna de las 1 entrada\(s\) del catálogo local/)
    expect(reason).not.toMatch(/catálogo local vacío/)
  })

  test('un selector con fuente admite la entrada de esa fuente y no a su homónima de otra', () => {
    const policy = policyFor({ repository: 'library/qwen2.5-7b-instruct', source: 'ollama' })
    const inventory = {
      entries: [HF_HOMONYM, LIBRARY_QWEN],
      qualifications: [...qualified(HF_HOMONYM), ...qualified(LIBRARY_QWEN)],
    }
    const result = recommendExecution('mecanica', PROFILE, inventory, policy)
    expect(result.runtime === 'ollama' ? result.model : '').toBe(LIBRARY_QWEN.name)
    const onlyHomonym = { entries: [HF_HOMONYM], qualifications: qualified(HF_HOMONYM) }
    expect(recommendExecution('mecanica', PROFILE, onlyHomonym, policy).runtime).toBe('blocked')
  })

  test('un selector sin fuente sigue admitiendo cualquier fuente', () => {
    const policy = policyFor({ repository: 'library/qwen2.5-7b-instruct' })
    const result = recommendExecution('mecanica', PROFILE, { entries: [LIBRARY_QWEN], qualifications: qualified(LIBRARY_QWEN) }, policy)
    expect(result.runtime).toBe('ollama')
  })

  test('una fuente desconocida se rehúsa al leer la política', () => {
    expect(() => policyFor({ repository: 'library/qwen2.5-7b-instruct', source: 'docker' })).toThrow(ExecutionPolicyError)
  })
})

describe('la política canónica y el Qwen3-4B instalado en el clon (TASK-THYROX-0912)', () => {
  // El modelo que el clon tiene instalado y publicado es el GGUF de Hugging
  // Face: la biblioteca de Ollama no es descargable desde este anfitrión. La
  // política versionada lo admite como modelo local sin abrir el respaldo.
  const CANONICAL = parseExecutionPolicy(readFileSync(resolve(import.meta.dir, '../../../session/execution_policy.json'), 'utf8'))
  const HF_QWEN = catalogEntry('Qwen/Qwen3-4B-GGUF', 'e')
  const NOT_ALLOWED = catalogEntry('Qwen/Qwen2.5-7B-Instruct-GGUF', 'f')
  /** La necesidad medida de un turno de `thyrox -p` en A6. */
  const A6_PROFILE = { contextTokens: 24_663 }
  const qualifiedAt = (entry: ModelCatalogEntry, contextTokens: number) =>
    [protocol(entry.name), qualification(entry.name, { contextTokens })]

  test('admite el Qwen3-4B de Hugging Face en Q4_K_M', () => {
    expect(allowsEntry(CANONICAL, HF_QWEN)).toBe(true)
  })

  test('cualificado con contexto suficiente, es el candidato local: ollama, sin respaldo', () => {
    const result = recommendExecution('mecanica', A6_PROFILE, { entries: [HF_QWEN], qualifications: qualifiedAt(HF_QWEN, 32_768) }, CANONICAL)
    expect([result.runtime, result.runtime === 'ollama' ? result.model : '', 'fallbackReason' in result])
      .toEqual(['ollama', HF_QWEN.name, false])
  })

  test('con una cualificación de 8192 no alcanza la necesidad de A6: blocked, nunca claude-cli', () => {
    const result = recommendExecution('mecanica', A6_PROFILE, { entries: [HF_QWEN], qualifications: qualifiedAt(HF_QWEN, 8_192) }, CANONICAL)
    expect(result.runtime).toBe('blocked')
  })

  test('un modelo local que la política no admite queda blocked, nunca claude-cli', () => {
    const result = recommendExecution('mecanica', A6_PROFILE, { entries: [NOT_ALLOWED], qualifications: qualifiedAt(NOT_ALLOWED, 32_768) }, CANONICAL)
    expect(result.runtime).toBe('blocked')
  })

  test('el respaldo sigue cerrado', () => {
    expect(CANONICAL.fallback.enabled).toBe(false)
  })
})
