import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ModelCatalogEntry } from '../catalogEntry.js'
import { MissingGgufKeyError } from '../memoryEstimate.js'
import {
  CatalogEntryConflictError,
  CatalogFileError,
  InvalidCatalogEntryError,
  ModelCatalog,
  catalogEntryFromGguf,
  loadModelCatalog,
  saveModelCatalog,
  validateCatalogEntry,
} from '../modelCatalog.js'
import { thyroxModelName } from '../modelName.js'
import { syntheticGgufBytes, type SyntheticValue } from '../testing/syntheticGguf.js'

const WORKDIR = mkdtempSync(join(tmpdir(), 'model-catalog-'))
afterAll(() => rmSync(WORKDIR, { recursive: true, force: true }))

const REPOSITORY = 'Qwen/Qwen2.5-0.5B-Instruct-GGUF'
const REVISION = '9217f5db79a29953eb74d5343926648285ec7e67'
const SHA256 = 'a'.repeat(64)

function entryFor(quantization: string, declaredAt: string): ModelCatalogEntry {
  return {
    name: thyroxModelName({ repository: REPOSITORY, quantization, source: 'hf', revision: REVISION }),
    repository: REPOSITORY,
    source: 'hf',
    revision: REVISION,
    quantization: quantization as ModelCatalogEntry['quantization'],
    artifact: { format: 'gguf', sha256: SHA256, bytes: 397_807_712 },
    architecture: 'qwen2',
    attention: { blockCount: 24, kvHeadCount: 2, headDimension: 64 },
    maxContextLength: 32_768,
    defaultKvCacheType: 'f16',
    capabilities: ['completion', 'tools'],
    declaredAt,
  }
}

const VALID = entryFor('q4_k_m', '2026-09-30T12:00:00Z')

/** Copia la entrada válida con `mutate` aplicado sobre un objeto profundo y mutable. */
function variant(mutate: (entry: Record<string, any>) => void): unknown {
  const copy = JSON.parse(JSON.stringify(VALID)) as Record<string, any>
  mutate(copy)
  return copy
}

function rejectionField(value: unknown): string {
  try {
    validateCatalogEntry(value)
  } catch (error) {
    if (error instanceof InvalidCatalogEntryError) return error.field
    throw error
  }
  throw new Error('se esperaba un rechazo')
}

describe('validateCatalogEntry — entrada válida', () => {
  test('devuelve la entrada intacta', () => {
    expect(validateCatalogEntry(VALID)).toEqual(VALID)
  })
})

describe('validateCatalogEntry — cada campo inválido nombra su ruta', () => {
  const cases: readonly [string, (entry: Record<string, any>) => void][] = [
    ['repository', entry => { entry.repository = '' }],
    ['source', entry => { entry.source = 'civitai' }],
    ['revision', entry => { entry.revision = REVISION.slice(0, 12) }],
    ['quantization', entry => { entry.quantization = 'q9_9' }],
    ['quantization', entry => { entry.quantization = 'Q4_K_M' }],
    ['name', entry => { entry.name = 'thyrox-otro--nombre:q4_k_m-hf-9217f5db79a2' }],
    ['artifact', entry => { entry.artifact = 'gguf' }],
    ['artifact.format', entry => { entry.artifact.format = 'safetensors' }],
    ['artifact.sha256', entry => { entry.artifact.sha256 = 'A'.repeat(64) }],
    ['artifact.sha256', entry => { entry.artifact.sha256 = 'a'.repeat(63) }],
    ['artifact.bytes', entry => { entry.artifact.bytes = 0 }],
    ['artifact.bytes', entry => { entry.artifact.bytes = 1.5 }],
    ['architecture', entry => { entry.architecture = '' }],
    ['attention', entry => { delete entry.attention }],
    ['attention.blockCount', entry => { entry.attention.blockCount = -1 }],
    ['attention.kvHeadCount', entry => { entry.attention.kvHeadCount = '2' }],
    ['attention.headDimension', entry => { entry.attention.headDimension = 0 }],
    ['maxContextLength', entry => { entry.maxContextLength = 0 }],
    ['defaultKvCacheType', entry => { entry.defaultKvCacheType = 'bf16' }],
    ['defaultKvCacheType', entry => { entry.defaultKvCacheType = 'toString' }],
    ['capabilities', entry => { entry.capabilities = [] }],
    ['capabilities', entry => { entry.capabilities = ['tools', 'tools'] }],
    ['capabilities[1]', entry => { entry.capabilities = ['tools', 'vision'] }],
    ['declaredAt', entry => { entry.declaredAt = '2026-09-30 12:00:00' }],
    ['declaredAt', entry => { entry.declaredAt = '2026-09-30T12:00:00+02:00' }],
    ['declaredAt', entry => { entry.declaredAt = '2026-02-30T12:00:00Z' }],
  ]
  for (const [field, mutate] of cases) {
    test(`${field} ← ${mutate.toString().replace(/^entry => /, '')}`, () => {
      expect(rejectionField(variant(mutate))).toBe(field)
    })
  }

  test('un campo ausente se nombra como ausente', () => {
    expect(() => validateCatalogEntry(variant(entry => { delete entry.maxContextLength }))).toThrow(/maxContextLength: falta/)
  })

  test('un valor que no es objeto se rehúsa en la raíz', () => {
    expect(rejectionField(null)).toBe('<raíz>')
    expect(rejectionField([VALID])).toBe('<raíz>')
  })
})

describe('validateCatalogEntry — el nombre se deriva de sus partes', () => {
  test('un nombre de otra cuantización no pasa aunque sea un nombre thyrox- válido', () => {
    const otherName = thyroxModelName({ repository: REPOSITORY, quantization: 'q8_0', source: 'hf', revision: REVISION })
    expect(rejectionField(variant(entry => { entry.name = otherName }))).toBe('name')
  })

  test('una revisión que no es completa (prefijo de 12) se rehúsa aunque derive el mismo nombre', () => {
    expect(rejectionField(variant(entry => { entry.revision = REVISION.slice(0, 12) }))).toBe('revision')
  })

  test('una revisión de ollama es el digest de 64 hex', () => {
    const digest = 'b'.repeat(64)
    const ollama = variant(entry => {
      entry.source = 'ollama'
      entry.repository = 'library/qwen2.5-0.5b'
      entry.revision = digest
      entry.artifact.format = 'ollama-registry'
      entry.name = thyroxModelName({ repository: 'library/qwen2.5-0.5b', quantization: 'q4_k_m', source: 'ollama', revision: digest })
    })
    expect(validateCatalogEntry(ollama).source).toBe('ollama')
    expect(rejectionField({ ...(ollama as object), revision: REVISION })).toBe('revision')
  })
})

describe('ModelCatalog', () => {
  const q8 = entryFor('q8_0', '2026-09-30T11:00:00Z')
  const f16 = entryFor('f16', '2026-09-30T11:00:00Z')

  test('dos variantes del mismo repositorio conviven con nombres distintos', () => {
    const catalog = ModelCatalog.empty().with(VALID).with(q8)
    expect(catalog.entries().map(entry => entry.name)).toHaveLength(2)
    expect(catalog.byName(VALID.name)).toEqual(VALID)
    expect(catalog.byName(q8.name)).toEqual(q8)
    expect(catalog.byName('thyrox-no--existe:q4_k_m-hf-000000000000')).toBeUndefined()
  })

  test('variantsOf ordena por declaredAt y después por nombre, sea cual sea el orden de alta', () => {
    const forward = ModelCatalog.empty().with(VALID).with(q8).with(f16)
    const backward = ModelCatalog.empty().with(f16).with(q8).with(VALID)
    const expected = [f16.name, q8.name].sort().concat(VALID.name)
    expect(forward.variantsOf(REPOSITORY).map(entry => entry.name)).toEqual(expected)
    expect(backward.variantsOf(REPOSITORY).map(entry => entry.name)).toEqual(expected)
    expect(forward.variantsOf('otra/cosa')).toEqual([])
  })

  test('variantsOf compara instantes, no texto: la fracción de segundo no reordena', () => {
    // Como texto, «.500Z» precede a «Z» («.» < «Z»); como instante va después.
    const early = entryFor('q8_0', '2026-09-30T11:00:00Z')
    const late = entryFor('f16', '2026-09-30T11:00:00.500Z')
    const catalog = ModelCatalog.empty().with(late).with(early)
    expect(catalog.variantsOf(REPOSITORY).map(entry => entry.name)).toEqual([early.name, late.name])
  })

  test('with devuelve un catálogo nuevo y no altera el anterior', () => {
    const empty = ModelCatalog.empty()
    const one = empty.with(VALID)
    expect(empty.entries()).toEqual([])
    expect(one.entries()).toEqual([VALID])
    expect(Object.isFrozen(one.entries())).toBe(true)
  })

  test('with es idempotente para una entrada idéntica', () => {
    const once = ModelCatalog.empty().with(VALID)
    const twice = once.with({ ...VALID, capabilities: [...VALID.capabilities] })
    expect(twice.entries()).toEqual([VALID])
  })

  test('with rehúsa un nombre repetido con otro contenido', () => {
    const conflicting = { ...VALID, artifact: { ...VALID.artifact, bytes: 1 } }
    expect(() => ModelCatalog.empty().with(VALID).with(conflicting)).toThrow(CatalogEntryConflictError)
  })

  test('with valida la entrada', () => {
    expect(() => ModelCatalog.empty().with({ ...VALID, maxContextLength: 0 })).toThrow(InvalidCatalogEntryError)
  })
})

describe('loadModelCatalog / saveModelCatalog', () => {
  test('ida y vuelta por disco byte a byte, con claves ordenadas', async () => {
    const path = join(WORKDIR, 'roundtrip.json')
    const catalog = ModelCatalog.empty().with(VALID).with(entryFor('q8_0', '2026-09-30T11:00:00Z'))
    await saveModelCatalog(path, catalog)
    const firstBytes = readFileSync(path, 'utf8')
    const loaded = await loadModelCatalog(path)
    expect(loaded.entries()).toEqual(catalog.entries())
    await saveModelCatalog(path, loaded)
    expect(readFileSync(path, 'utf8')).toBe(firstBytes)
    const artifactStart = firstBytes.indexOf('"artifact"')
    expect(firstBytes.indexOf('"architecture"')).toBeLessThan(artifactStart)
    expect(firstBytes.indexOf('"bytes"', artifactStart)).toBeLessThan(firstBytes.indexOf('"format"', artifactStart))
  })

  test('el orden de alta no cambia los bytes', async () => {
    const q8 = entryFor('q8_0', '2026-09-30T11:00:00Z')
    const left = join(WORKDIR, 'left.json')
    const right = join(WORKDIR, 'right.json')
    await saveModelCatalog(left, ModelCatalog.empty().with(VALID).with(q8))
    await saveModelCatalog(right, ModelCatalog.empty().with(q8).with(VALID))
    expect(readFileSync(left, 'utf8')).toBe(readFileSync(right, 'utf8'))
  })

  test('la escritura no deja temporales al lado', async () => {
    const directory = mkdtempSync(join(WORKDIR, 'atomic-'))
    await saveModelCatalog(join(directory, 'catalog.json'), ModelCatalog.empty().with(VALID))
    expect(readdirSync(directory)).toEqual(['catalog.json'])
  })

  test('archivo ausente → catálogo vacío', async () => {
    const catalog = await loadModelCatalog(join(WORKDIR, 'no-existe.json'))
    expect(catalog.entries()).toEqual([])
  })

  test('archivo corrupto → error con la ruta, nunca vacío', async () => {
    const path = join(WORKDIR, 'corrupt.json')
    writeFileSync(path, '{"entries": [')
    const error = await loadModelCatalog(path).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(CatalogFileError)
    expect((error as CatalogFileError).path).toBe(path)
  })

  test('archivo con una entrada inválida → error con la ruta del archivo y del campo', async () => {
    const path = join(WORKDIR, 'invalid.json')
    writeFileSync(path, JSON.stringify({ entries: [{ ...VALID, maxContextLength: -1 }] }))
    const error = await loadModelCatalog(path).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(CatalogFileError)
    expect((error as Error).message).toContain(path)
    expect((error as Error).message).toContain('entries[0].maxContextLength')
  })

  test('archivo sin lista de entradas → error', async () => {
    const path = join(WORKDIR, 'no-entries.json')
    writeFileSync(path, '{}')
    await expect(loadModelCatalog(path)).rejects.toThrow(CatalogFileError)
  })

  test('archivo con dos entradas del mismo nombre y distinto contenido → error', async () => {
    const path = join(WORKDIR, 'duplicate.json')
    writeFileSync(path, JSON.stringify({ entries: [VALID, { ...VALID, architecture: 'llama' }] }))
    await expect(loadModelCatalog(path)).rejects.toThrow(CatalogFileError)
  })

  test('una ruta que es un directorio no se lee como vacío', async () => {
    await expect(loadModelCatalog(WORKDIR)).rejects.toThrow(CatalogFileError)
  })
})

describe('catalogEntryFromGguf', () => {
  const QWEN2_KEYS: readonly (readonly [string, SyntheticValue])[] = [
    ['general.architecture', { type: 'string', value: 'qwen2' }],
    ['qwen2.block_count', { type: 'uint32', value: 24 }],
    ['qwen2.context_length', { type: 'uint32', value: 32_768 }],
    ['qwen2.embedding_length', { type: 'uint32', value: 896 }],
    ['qwen2.attention.head_count', { type: 'uint32', value: 14 }],
    ['qwen2.attention.head_count_kv', { type: 'uint32', value: 2 }],
  ]

  let counter = 0
  function writeGguf(entries: readonly (readonly [string, SyntheticValue])[]): string {
    counter += 1
    const path = join(WORKDIR, `model-${counter}.gguf`)
    writeFileSync(path, syntheticGgufBytes({ entries }))
    return path
  }

  function declaration(path: string) {
    return {
      path,
      repository: REPOSITORY,
      source: 'hf' as const,
      revision: REVISION,
      quantization: 'Q4_K_M',
      sha256: SHA256,
      capabilities: ['completion', 'tools'] as const,
      declaredAt: '2026-09-30T12:00:00Z',
      defaultKvCacheType: 'f16' as const,
    }
  }

  test('GGUF sintético → entrada válida con arquitectura, atención, contexto y bytes del archivo', async () => {
    const path = writeGguf(QWEN2_KEYS)
    const entry = await catalogEntryFromGguf(declaration(path))
    expect(entry).toEqual({ ...VALID, artifact: { ...VALID.artifact, bytes: readFileSync(path).byteLength } })
  })

  for (const [missing] of QWEN2_KEYS) {
    test(`clave ausente ${missing} se rehúsa con su nombre`, async () => {
      const path = writeGguf(QWEN2_KEYS.filter(([key]) => key !== missing))
      const error = await catalogEntryFromGguf(declaration(path)).catch((caught: unknown) => caught)
      expect(error).toBeInstanceOf(MissingGgufKeyError)
      expect((error as MissingGgufKeyError).key).toBe(missing)
    })
  }

  test('un context_length no entero se rehúsa con el campo', async () => {
    const path = writeGguf(QWEN2_KEYS.map(([key, value]) =>
      key === 'qwen2.context_length' ? [key, { type: 'string', value: '32k' }] as const : [key, value] as const))
    const error = await catalogEntryFromGguf(declaration(path)).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(InvalidCatalogEntryError)
    expect((error as InvalidCatalogEntryError).field).toBe('qwen2.context_length')
  })
})
