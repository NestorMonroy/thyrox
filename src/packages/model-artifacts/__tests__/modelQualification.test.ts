import { describe, expect, test } from 'bun:test'

import type { ModelCatalogEntry } from '../catalogEntry.js'
import { attentionShapeOf } from '../memoryEstimate.js'
import { thyroxModelName } from '../modelName.js'
import {
  InvalidQualificationError,
  LOCAL_REASONING_EFFORT,
  parseQualifications,
  qualifiedEmbeddingModels,
  qualifiedModels,
  serializeQualifications,
  validateQualification,
  type ModelQualification,
} from '../modelQualification.js'
import { localModelHome } from '../localModelHome.js'

const ATTENTION = attentionShapeOf({
  'general.architecture': 'qwen2',
  'qwen2.block_count': 36,
  'qwen2.attention.head_count_kv': 2,
  'qwen2.attention.head_count': 16,
  'qwen2.embedding_length': 2048,
})

function entry(repository: string, revision: string): ModelCatalogEntry {
  return {
    name: thyroxModelName({ repository, quantization: 'q4_k_m', source: 'hf', revision }),
    repository,
    source: 'hf',
    revision,
    quantization: 'q4_k_m',
    artifact: { format: 'gguf', sha256: 'b'.repeat(64), bytes: 1_929_912_432 },
    architecture: 'qwen2',
    attention: ATTENTION,
    maxContextLength: 32_768,
    defaultKvCacheType: 'f16',
    capabilities: ['completion', 'tools'],
    declaredAt: '2026-10-01T00:00:00Z',
  }
}

const FAST = entry('Qwen/Qwen2.5-3B-Instruct-GGUF', 'a'.repeat(40))
const SLOW = entry('meta-llama/Llama-3.2-3B-Instruct', 'c'.repeat(40))

function measured(model: string, parts: Partial<ModelQualification> = {}): ModelQualification {
  return {
    model,
    kind: 'task',
    taskClass: 'mecanica',
    suite: 'mecanica-items@1',
    casesPassed: 6,
    casesTotal: 6,
    passed: true,
    contextTokens: 32_768,
    tokensPerSecond: 8,
    measurementCondition: 'isolated',
    measuredAt: '2026-10-01T00:10:00Z',
    reasoningEffort: LOCAL_REASONING_EFFORT,
    ...parts,
  }
}

function protocolPass(model: string, parts: Partial<ModelQualification> = {}): ModelQualification {
  const { taskClass: _taskClass, ...rest } = measured(model, { kind: 'protocol', suite: 'tool-calling@1', ...parts })
  return rest
}

describe('validateQualification', () => {
  test('una medición válida se devuelve intacta', () => {
    const q = measured(FAST.name)
    expect(validateQualification(q)).toEqual(q)
  })

  test('una clase desconocida se rehúsa con la ruta del campo', () => {
    expect(() => validateQualification({ ...measured(FAST.name), taskClass: 'rapida' }))
      .toThrow(new InvalidQualificationError('qualification.taskClass', '«rapida» no es mecanica, analisis, adversarial, frontera'))
  })

  test('cero casos o más aprobados que totales no es una medición', () => {
    expect(() => validateQualification(measured(FAST.name, { casesPassed: 0, casesTotal: 0 }))).toThrow(InvalidQualificationError)
    expect(() => validateQualification(measured(FAST.name, { casesPassed: 7, casesTotal: 6 }))).toThrow(InvalidQualificationError)
  })

  test('un instante sin zona UTC se rehúsa', () => {
    expect(() => validateQualification(measured(FAST.name, { measuredAt: '2026-10-01 00:10:00' }))).toThrow(InvalidQualificationError)
  })
})

describe('parse y serialize', () => {
  test('ida y vuelta estable, ordenada por modelo, clase e instante', () => {
    const later = measured(FAST.name, { measuredAt: '2026-10-01T01:00:00Z' })
    const text = serializeQualifications([later, measured(SLOW.name), measured(FAST.name)])
    expect(parseQualifications(text).map((q) => [q.model, q.measuredAt])).toEqual([
      [SLOW.name, '2026-10-01T00:10:00Z'],
      [FAST.name, '2026-10-01T00:10:00Z'],
      [FAST.name, '2026-10-01T01:00:00Z'],
    ].sort((a, b) => a[0]!.localeCompare(b[0]!) || a[1]!.localeCompare(b[1]!)))
    expect(serializeQualifications(parseQualifications(text))).toBe(text)
  })

  test('el error de un elemento nombra su posición', () => {
    expect(() => parseQualifications(JSON.stringify({ qualifications: [measured(FAST.name), { model: 'x' }] })))
      .toThrow(/qualifications\[1\]/)
  })
})

describe('qualifiedModels', () => {
  const PROTOCOLS = [protocolPass(FAST.name), protocolPass(SLOW.name)]

  test('sólo cuenta una medición de tarea aprobada de esa clase', () => {
    const qualifications = [...PROTOCOLS, measured(FAST.name), measured(SLOW.name, { taskClass: 'analisis' })]
    expect(qualifiedModels([FAST, SLOW], qualifications, 'mecanica', 8_192).map((q) => q.entry.name)).toEqual([FAST.name])
    expect(qualifiedModels([FAST, SLOW], qualifications, 'adversarial', 8_192)).toEqual([])
  })

  test('el protocolo aprobado solo no hace elegible: compatibilidad no es competencia', () => {
    expect(qualifiedModels([FAST], [protocolPass(FAST.name)], 'mecanica', 1)).toEqual([])
  })

  test('sin protocolo aprobado, una tarea aprobada tampoco basta', () => {
    expect(qualifiedModels([FAST], [measured(FAST.name)], 'mecanica', 1)).toEqual([])
    const failedProtocol = protocolPass(FAST.name, { passed: false, casesPassed: 1 })
    expect(qualifiedModels([FAST], [failedProtocol, measured(FAST.name)], 'mecanica', 1)).toEqual([])
  })

  test('sin medición no hay modelo: el rango no se declara', () => {
    expect(qualifiedModels([FAST, SLOW], [], 'mecanica', 1)).toEqual([])
  })

  test('la medición más reciente gobierna: una que suspende retira la aprobación', () => {
    const failedLater = measured(FAST.name, { passed: false, casesPassed: 2, measuredAt: '2026-10-01T02:00:00Z' })
    expect(qualifiedModels([FAST], [...PROTOCOLS, measured(FAST.name), failedLater], 'mecanica', 1)).toEqual([])
  })

  test('un contexto medido menor que el exigido no cumple', () => {
    expect(qualifiedModels([FAST], [...PROTOCOLS, measured(FAST.name, { contextTokens: 4_096 })], 'mecanica', 24_000)).toEqual([])
  })

  test('una cualificación de otra revisión no cuenta', () => {
    const otherRevision = entry('Qwen/Qwen2.5-3B-Instruct-GGUF', 'd'.repeat(40))
    expect(qualifiedModels([otherRevision], [...PROTOCOLS, measured(FAST.name)], 'mecanica', 1)).toEqual([])
  })

  test('entre medidas aisladas, del más rápido al más lento', () => {
    const qualifications = [...PROTOCOLS, measured(FAST.name, { tokensPerSecond: 11.5 }), measured(SLOW.name, { tokensPerSecond: 8.2 })]
    expect(qualifiedModels([SLOW, FAST], qualifications, 'mecanica', 1).map((q) => q.entry.name)).toEqual([FAST.name, SLOW.name])
  })

  test('una velocidad contendida no ordena: va detrás aunque su cifra sea mayor', () => {
    const qualifications = [...PROTOCOLS,
      measured(FAST.name, { tokensPerSecond: 50, measurementCondition: 'contended' }),
      measured(SLOW.name, { tokensPerSecond: 0.3 })]
    expect(qualifiedModels([FAST, SLOW], qualifications, 'mecanica', 1).map((q) => q.entry.name)).toEqual([SLOW.name, FAST.name])
  })
})

describe('forma de cada tipo de cualificación', () => {
  test('una de tarea exige su clase', () => {
    const { taskClass: _taskClass, ...withoutClass } = measured(FAST.name)
    expect(() => validateQualification(withoutClass)).toThrow(/qualification\.taskClass/)
  })

  test('una de protocolo no mide ninguna clase', () => {
    expect(() => validateQualification({ ...protocolPass(FAST.name), taskClass: 'mecanica' }))
      .toThrow(new InvalidQualificationError('qualification.taskClass', 'una cualificación de protocolo no mide ninguna clase'))
  })

  test('la condición de medición es isolated o contended', () => {
    expect(() => validateQualification({ ...measured(FAST.name), measurementCondition: 'quiet' }))
      .toThrow(/qualification\.measurementCondition/)
  })
})

describe('cualificación de embeddings', () => {
  const EMBEDDER: ModelCatalogEntry = { ...entry('nomic-ai/nomic-embed-text-v1.5-GGUF', 'd'.repeat(40)), capabilities: ['embeddings'] }
  const embedding = (model: string, parts: Partial<ModelQualification> = {}): ModelQualification => {
    const { taskClass: _omitted, ...base } = measured(model, { kind: 'embedding', suite: 'embedding@1', ...parts })
    return base
  }

  test('una de embeddings no mide ninguna clase', () => {
    expect(validateQualification(embedding(EMBEDDER.name))).toEqual(embedding(EMBEDDER.name))
    expect(() => validateQualification({ ...embedding(EMBEDDER.name), taskClass: 'mecanica' })).toThrow(InvalidQualificationError)
  })

  test('elegible: capacidad embeddings declarada y su medición vigente aprobada', () => {
    expect(qualifiedEmbeddingModels([EMBEDDER, FAST], [embedding(EMBEDDER.name)]).map(candidate => candidate.entry.name)).toEqual([EMBEDDER.name])
  })

  test('la medición más reciente gobierna: una que suspende retira la aprobación', () => {
    const failed = embedding(EMBEDDER.name, { passed: false, casesPassed: 3, measuredAt: '2026-10-01T00:20:00Z' })
    expect(qualifiedEmbeddingModels([EMBEDDER], [embedding(EMBEDDER.name), failed])).toEqual([])
  })

  test('sin la capacidad declarada no es elegible aunque aprobara: el nombre no la prueba', () => {
    expect(qualifiedEmbeddingModels([FAST], [embedding(FAST.name)])).toEqual([])
  })

  test('un modelo de API compite con el mismo criterio que uno local: capacidad declarada y medición aprobada', () => {
    const api = { name: 'api:openai-compat:text-embedding-3-small', route: 'api', capabilities: ['embeddings'] } as const
    const selected = qualifiedEmbeddingModels([EMBEDDER, api], [embedding(EMBEDDER.name), embedding(api.name)])
    expect(selected.map(candidate => candidate.entry.name)).toEqual([EMBEDDER.name, api.name])
    expect(qualifiedEmbeddingModels([api], [])).toEqual([])
  })

  test('una cualificación de tarea no hace elegible para embeddings', () => {
    expect(qualifiedEmbeddingModels([EMBEDDER], [measured(EMBEDDER.name)])).toEqual([])
  })
})

describe('localModelHome', () => {
  test('por defecto, bajo .thyrox/models de la raíz', () => {
    expect(localModelHome({}, '/opt/thyrox/')).toEqual({
      catalog: '/opt/thyrox/.thyrox/models/catalog.json',
      qualifications: '/opt/thyrox/.thyrox/models/qualifications.json',
    })
  })

  test('lo declarado gana, y una declaración vacía no cuenta', () => {
    expect(localModelHome({ THYROX_MODEL_CATALOG: '/data/c.json', THYROX_MODEL_QUALIFICATIONS: '  ' }, '/r')).toEqual({
      catalog: '/data/c.json',
      qualifications: '/r/.thyrox/models/qualifications.json',
    })
  })
})

// El worker local corre con el razonamiento apagado (el relé envía
// `reasoning_effort: none`): una cualificación medida razonando no es evidencia
// de ese perfil (TASK-THYROX-0919; revisión del ejecutor 2026-10-03).
describe('la cualificación lleva el perfil de razonamiento con que se midió', () => {
  test('el perfil del worker local es sin razonamiento', () => {
    expect(LOCAL_REASONING_EFFORT).toBe('none')
  })

  test('validateQualification acepta el perfil y rehúsa uno desconocido', () => {
    expect(validateQualification(measured(FAST.name, { reasoningEffort: 'model-default' })).reasoningEffort).toBe('model-default')
    expect(() => validateQualification({ ...measured(FAST.name), reasoningEffort: 'mucho' })).toThrow()
  })

  test('una cualificación de otro perfil, o sin perfil, no habilita al modelo', () => {
    const { reasoningEffort: _legacyTask, ...legacyTask } = measured(FAST.name)
    const { reasoningEffort: _legacyProtocol, ...legacyProtocol } = protocolPass(FAST.name)
    expect(qualifiedModels([FAST], [legacyProtocol, legacyTask], 'mecanica', 1)).toEqual([])
    expect(qualifiedModels([FAST], [protocolPass(FAST.name, { reasoningEffort: 'model-default' }), measured(FAST.name, { reasoningEffort: 'model-default' })], 'mecanica', 1)).toEqual([])
    expect(qualifiedModels([FAST], [protocolPass(FAST.name), measured(FAST.name)], 'mecanica', 1).map(q => q.entry.name)).toEqual([FAST.name])
  })
})
