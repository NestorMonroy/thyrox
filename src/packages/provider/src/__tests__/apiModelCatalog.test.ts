/**
 * El catálogo de modelos de API de un proveedor, transcrito de su página
 * pública: cada fila se lee con su capacidad, precios, contexto y ciclo de
 * vida, y compite en la misma selección que un modelo local.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { qualifiedEmbeddingModels, type ModelQualification } from '@thyrox/model-artifacts/modelQualification.ts'

import { ALIBABA_MODEL_STUDIO_CATALOG_PATH, InvalidApiModelCatalogError, loadApiModelCatalog } from '../cost/apiModelCatalog.ts'

const HEADER = 'id\tdisplayName\tinputUsdPerMTokens\toutputUsdPerMTokens\tcontext\tmaxOutput\tlifecycle\tcapability'

let root: string
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'api-model-catalog-')) })
afterEach(() => rmSync(root, { recursive: true, force: true }))

function catalogFile(...rows: string[]): string {
  const path = join(root, 'catalog.tsv')
  writeFileSync(path, `${[HEADER, ...rows].join('\n')}\n`)
  return path
}

describe('loadApiModelCatalog', () => {
  test('a chat row: name scoped by provider, price ranges, context and lifecycle as published', async () => {
    const [entry] = await loadApiModelCatalog(catalogFile('qwen3.7-plus\tQwen3.7-Plus\t0.32-0.96\t1.28-3.84\t1 M\t131.1 K\tactive\tcompletion'), 'alibaba-model-studio')
    expect(entry).toEqual({
      name: 'api:alibaba-model-studio:qwen3.7-plus', provider: 'alibaba-model-studio', model: 'qwen3.7-plus', displayName: 'Qwen3.7-Plus',
      route: 'api', capabilities: ['completion'], lifecycle: 'active',
      inputUsdPerMTokens: { min: 0.32, max: 0.96 }, outputUsdPerMTokens: { min: 1.28, max: 3.84 },
      contextTokens: 1_000_000, maxOutputTokens: 131_100,
    })
  })

  test('an embedding row publishes no output price nor max output', async () => {
    const [entry] = await loadApiModelCatalog(catalogFile('qwen3.7-text-embedding\tQwen-Embedding\t0.07\t-\t131.1 K\t-\tactive\tembeddings'), 'alibaba-model-studio')
    expect(entry).toMatchObject({ capabilities: ['embeddings'], inputUsdPerMTokens: { min: 0.07, max: 0.07 }, contextTokens: 131_100 })
    expect(entry?.outputUsdPerMTokens).toBeUndefined()
    expect(entry?.maxOutputTokens).toBeUndefined()
  })

  test('an unknown lifecycle or capability is refused with its line and field', async () => {
    await expect(loadApiModelCatalog(catalogFile('x\tX\t1\t2\t1 M\t1 K\tsunset\tcompletion'), 'p')).rejects.toThrow(InvalidApiModelCatalogError)
    await expect(loadApiModelCatalog(catalogFile('x\tX\t1\t2\t1 M\t1 K\tsunset\tcompletion'), 'p')).rejects.toThrow('línea 2: lifecycle')
    await expect(loadApiModelCatalog(catalogFile('x\tX\t1\t2\t1 M\t1 K\tactive\tvision'), 'p')).rejects.toThrow('capability')
  })

  test('a malformed price or size is refused, not read as zero', async () => {
    await expect(loadApiModelCatalog(catalogFile('x\tX\tfree\t2\t1 M\t1 K\tactive\tcompletion'), 'p')).rejects.toThrow('inputUsdPerMTokens')
    await expect(loadApiModelCatalog(catalogFile('x\tX\t1\t2\t1 G\t1 K\tactive\tcompletion'), 'p')).rejects.toThrow('context')
  })

  test('the transcribed Model Studio catalog loads whole, and its embedding models compete in the shared selection', async () => {
    const catalog = await loadApiModelCatalog(ALIBABA_MODEL_STUDIO_CATALOG_PATH, 'alibaba-model-studio')
    expect(catalog).toHaveLength(51)
    const embedders = catalog.filter(entry => entry.capabilities.includes('embeddings')).map(entry => entry.model)
    expect(embedders).toEqual(['tongyi-embedding-vision-plus', 'qwen3.7-text-embedding'])
    const measured: ModelQualification = {
      model: 'api:alibaba-model-studio:qwen3.7-text-embedding', kind: 'embedding', suite: 'embedding-findings@1', casesPassed: 40, casesTotal: 40,
      passed: true, contextTokens: 8192, tokensPerSecond: 100, measurementCondition: 'contended', measuredAt: '2026-10-02T11:00:00Z',
    }
    expect(qualifiedEmbeddingModels(catalog, [measured]).map(candidate => candidate.entry.model)).toEqual(['qwen3.7-text-embedding'])
  })
})
