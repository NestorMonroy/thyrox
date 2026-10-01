import { describe, expect, test } from 'bun:test'

import type { ModelCatalogEntry } from '../catalogEntry.js'
import { attentionShapeOf } from '../memoryEstimate.js'
import { thyroxModelName } from '../modelName.js'
import {
  InvalidQualificationError,
  parseQualifications,
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
    taskClass: 'mecanica',
    suite: 'tool-calling@1',
    casesPassed: 6,
    casesTotal: 6,
    passed: true,
    contextTokens: 32_768,
    tokensPerSecond: 8,
    measuredAt: '2026-10-01T00:10:00Z',
    ...parts,
  }
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
  test('sólo cuenta una medición aprobada de esa clase', () => {
    const qualifications = [measured(FAST.name), measured(SLOW.name, { taskClass: 'analisis' })]
    expect(qualifiedModels([FAST, SLOW], qualifications, 'mecanica', 8_192).map((q) => q.entry.name)).toEqual([FAST.name])
    expect(qualifiedModels([FAST, SLOW], qualifications, 'adversarial', 8_192)).toEqual([])
  })

  test('sin medición no hay modelo: el rango no se declara', () => {
    expect(qualifiedModels([FAST, SLOW], [], 'mecanica', 1)).toEqual([])
  })

  test('la medición más reciente gobierna: una que suspende retira la aprobación', () => {
    const failedLater = measured(FAST.name, { passed: false, casesPassed: 2, measuredAt: '2026-10-01T02:00:00Z' })
    expect(qualifiedModels([FAST], [measured(FAST.name), failedLater], 'mecanica', 1)).toEqual([])
  })

  test('un contexto medido menor que el exigido no cumple', () => {
    expect(qualifiedModels([FAST], [measured(FAST.name, { contextTokens: 4_096 })], 'mecanica', 24_000)).toEqual([])
  })

  test('una cualificación de otra revisión no cuenta', () => {
    const otherRevision = entry('Qwen/Qwen2.5-3B-Instruct-GGUF', 'd'.repeat(40))
    expect(qualifiedModels([otherRevision], [measured(FAST.name)], 'mecanica', 1)).toEqual([])
  })

  test('del más rápido al más lento', () => {
    const qualifications = [measured(FAST.name, { tokensPerSecond: 11.5 }), measured(SLOW.name, { tokensPerSecond: 8.2 })]
    expect(qualifiedModels([SLOW, FAST], qualifications, 'mecanica', 1).map((q) => q.entry.name)).toEqual([FAST.name, SLOW.name])
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
