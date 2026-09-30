/**
 * Las invariantes del corpus durable (ADR-THYROX-008 1.2.0) contra un
 * PostgreSQL real: el índice no depende de la fuente, la reingesta es
 * idempotente por hash, una versión nueva oculta la anterior, el cambio de
 * modelo re-embebe desde los chunks persistidos y un análisis guardado
 * sobrevive a la reingesta y al retiro de su espacio.
 *
 * Sin `THYROX_TEST_POSTGRES_URL` la suite se declara NO MEDIDA en vez de pasar.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

import { resolvePostgresTestUrl, withDisposableSchema } from '@thyrox/store/testing/postgresTestSchema.ts'

import { EmbeddingSpaceStateError, NoActiveEmbeddingSpaceError } from '../errors.ts'
import type { SemanticSearchStore } from '../store.ts'
import { countRows, currentSchema, embedPending, embedText, openStoreFor, withCorpusStore } from './support/corpusFixtures.ts'

const url = resolvePostgresTestUrl()

const MODEL_A = { model: 'model-a', dimensions: 4, representation: 'vector' as const }
const MODEL_B = { model: 'model-b', dimensions: 6, representation: 'halfvec' as const }
const SCOPE = 'adr'
const NOTES = {
  'alpha.md': ['PostgreSQL guarda el texto de cada chunk.', 'El embedding se regenera desde los chunks.'],
  'beta.md': ['Un worker que muere no se lleva el corpus.'],
}
const CANDIDATES = { candidates: 10 }
const STALE_VERSIONS = 45
const NEAR_QUERY = [1, 1, 1, 1]
const FAR_FROM_QUERY = [-1, -1, -1, -1]

/**
 * La misma base con el recorrido secuencial desactivado en cada conexión: con
 * pocas filas el planificador prefiere recorrer la tabla y ordenar, y el
 * filtro de versión vigente no se ejercitaría sobre el plan del HNSW.
 */
function indexOnlyUrl(original: string): string {
  const parsed = new URL(original)
  parsed.searchParams.set('options', '-c enable_seqscan=off')
  return parsed.toString()
}

/** Escribe las notas en un directorio temporal y lo devuelve; quien llama lo borra. */
function writeSourceDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'semantic-corpus-source-'))
  for (const [name, chunks] of Object.entries(NOTES)) writeFileSync(join(directory, name), chunks.join('\n'))
  return directory
}

/** Ingiere cada archivo del directorio como un documento: un chunk por línea. */
async function ingestDirectory(store: SemanticSearchStore, directory: string): Promise<void> {
  for (const name of readdirSync(directory).sort()) {
    const chunks = readFileSync(join(directory, name), 'utf8').split('\n')
    await store.ingestDocument({ scope: SCOPE, sourceIdentity: `tmp:${name}`, metadata: { name }, chunks })
  }
}

/** Crea un espacio, embebe lo pendiente y lo activa. */
async function activateNewSpace(store: SemanticSearchStore, shape: typeof MODEL_A | typeof MODEL_B): Promise<number> {
  const space = await store.createEmbeddingSpace(shape)
  await embedPending(store, space.spaceId, shape.dimensions)
  await store.activateSpace(space.spaceId)
  return space.spaceId
}

async function topText(store: SemanticSearchStore, text: string, dimensions: number): Promise<string | undefined> {
  const [first] = await store.searchNearest(embedText(text, dimensions), 1, CANDIDATES)
  return first?.text
}

if (!url) {
  describe('corpus durable — postgres', () => {
    test.skip('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correrlo', () => {})
  })
} else {
  const testUrl = url
  const target = NOTES['beta.md'][0] ?? ''

  describe('corpus durable — la fuente puede desaparecer', () => {
    test('ingerir → borrar la fuente → la búsqueda devuelve el texto con su identidad', async () => {
      await withCorpusStore(testUrl, async store => {
        const directory = writeSourceDirectory()
        await ingestDirectory(store, directory)
        rmSync(directory, { recursive: true, force: true })
        await activateNewSpace(store, MODEL_A)
        const [first] = await store.searchNearest(embedText(target, MODEL_A.dimensions), 1, CANDIDATES)
        expect(first?.text).toBe(target)
        expect(first?.sourceIdentity).toBe('tmp:beta.md')
        expect(first?.version).toBe(1)
        expect(first?.similarity).toBeCloseTo(1, 5)
        expect(typeof first?.documentId).toBe('string')
        expect(typeof first?.chunkId).toBe('string')
      })
    })
  })

  describe('corpus durable — ingesta idempotente por hash', () => {
    test('el mismo contenido otra vez: unchanged y 0 filas nuevas en documentos, chunks y embeddings', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const document = { scope: SCOPE, sourceIdentity: 'git:repo@abc:a.md', metadata: {}, chunks: ['uno', 'dos'] }
        const first = await store.ingestDocument(document)
        expect(first.status).toBe('created')
        const spaceId = await activateNewSpace(store, MODEL_A)
        const before = [await countRows(sql, 'documents'), await countRows(sql, 'document_chunks'), await countRows(sql, `space_embeddings_${spaceId}`)]
        const again = await store.ingestDocument(document)
        expect(again).toEqual({ status: 'unchanged', documentId: first.documentId, version: 1 })
        const after = [await countRows(sql, 'documents'), await countRows(sql, 'document_chunks'), await countRows(sql, `space_embeddings_${spaceId}`)]
        expect(after).toEqual(before)
        expect(await store.chunksWithoutEmbedding(spaceId, 10)).toEqual([])
      })
    })
  })

  describe('corpus durable — cambio de contenido', () => {
    test('otro contenido crea la versión 2 y la versión 1 deja de aparecer en la búsqueda', async () => {
      await withCorpusStore(testUrl, async store => {
        const identity = { scope: SCOPE, sourceIdentity: 'git:repo@abc:c.md', metadata: {} }
        const first = await store.ingestDocument({ ...identity, chunks: ['texto viejo del documento'] })
        const spaceId = await activateNewSpace(store, MODEL_A)
        const second = await store.ingestDocument({ ...identity, chunks: ['texto nuevo del documento'] })
        expect(second).toEqual({ status: 'new-version', documentId: first.documentId, version: 2 })
        await embedPending(store, spaceId, MODEL_A.dimensions)
        const results = await store.searchNearest(embedText('texto viejo del documento', MODEL_A.dimensions), 10, CANDIDATES)
        expect(results.map(result => result.text)).toEqual(['texto nuevo del documento'])
        expect(results[0]?.version).toBe(2)
      })
    })
  })

  describe('corpus durable — versiones viejas más cercanas que la vigente', () => {
    // Versiones reemplazadas a distancia 0 de la consulta y la vigente a la
    // máxima, recorridas por el HNSW: el filtro descarta las viejas y deja la vigente.
    test('la versión vigente aparece aunque haya muchas versiones viejas más cercanas', async () => {
      await withCorpusStore(indexOnlyUrl(testUrl), async store => {
        const identity = { scope: SCOPE, sourceIdentity: 'git:repo@abc:e.md', metadata: {} }
        const space = await store.createEmbeddingSpace(MODEL_A)
        await store.activateSpace(space.spaceId)
        for (let version = 1; version <= STALE_VERSIONS; version++) {
          await store.ingestDocument({ ...identity, chunks: [`redacción ${version}`] })
          const pending = await store.chunksWithoutEmbedding(space.spaceId, 1)
          await store.putEmbeddings(space.spaceId, pending.map(chunk => ({ chunkId: chunk.chunkId, embedding: NEAR_QUERY })))
        }
        await store.ingestDocument({ ...identity, chunks: ['redacción vigente'] })
        await store.putEmbeddings(space.spaceId, (await store.chunksWithoutEmbedding(space.spaceId, 1)).map(chunk => ({ chunkId: chunk.chunkId, embedding: FAR_FROM_QUERY })))
        const results = await store.searchNearest(NEAR_QUERY, 1, CANDIDATES)
        expect(results.map(result => [result.text, result.version])).toEqual([['redacción vigente', STALE_VERSIONS + 1]])
      })
    })
  })

  describe('corpus durable — espacios de embeddings', () => {
    test('re-embedding A (dim 4) → B (dim 6) desde los chunks persistidos, sin la fuente; A queda retired', async () => {
      await withCorpusStore(testUrl, async store => {
        const directory = writeSourceDirectory()
        await ingestDirectory(store, directory)
        const spaceA = await activateNewSpace(store, MODEL_A)
        rmSync(directory, { recursive: true, force: true })
        const spaceB = await store.createEmbeddingSpace(MODEL_B)
        expect(spaceB.state).toBe('building')
        expect(await embedPending(store, spaceB.spaceId, MODEL_B.dimensions)).toBe(3)
        expect(await topText(store, target, MODEL_A.dimensions)).toBe(target)
        expect(await store.activateSpace(spaceB.spaceId)).toEqual({ activated: spaceB.spaceId, retired: spaceA })
        expect(await topText(store, target, MODEL_B.dimensions)).toBe(target)
        expect((await store.getEmbeddingSpace(spaceA))?.state).toBe('retired')
        expect((await store.activeEmbeddingSpace())?.spaceId).toBe(spaceB.spaceId)
      })
    })

    test('putEmbeddings con otra dimensión que la del espacio rehúsa nombrando las dos', async () => {
      await withCorpusStore(testUrl, async store => {
        await store.ingestDocument({ scope: SCOPE, sourceIdentity: 's', metadata: {}, chunks: ['x'] })
        const space = await store.createEmbeddingSpace(MODEL_A)
        const [chunk] = await store.chunksWithoutEmbedding(space.spaceId, 1)
        await expect(store.putEmbeddings(space.spaceId, [{ chunkId: chunk?.chunkId ?? '', embedding: [1, 2] }])).rejects.toThrow(/2 dimensions.*4/)
      })
    })

    test('sin espacio activo la búsqueda rehúsa nombrándolo, no devuelve vacío', async () => {
      await withCorpusStore(testUrl, async store => {
        await store.ingestDocument({ scope: SCOPE, sourceIdentity: 's', metadata: {}, chunks: ['x'] })
        await store.createEmbeddingSpace(MODEL_A)
        await expect(store.searchNearest([1, 1, 1, 1], 1, CANDIDATES)).rejects.toBeInstanceOf(NoActiveEmbeddingSpaceError)
        await expect(store.searchNearest([1, 1, 1, 1], 1, CANDIDATES)).rejects.toThrow(/active embedding space/)
      })
    })

    test('dropSpace sólo sobre un espacio retired; conserva documentos, chunks y analysis_runs', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const directory = writeSourceDirectory()
        await ingestDirectory(store, directory)
        rmSync(directory, { recursive: true, force: true })
        const spaceA = await activateNewSpace(store, MODEL_A)
        await expect(store.dropSpace(spaceA)).rejects.toBeInstanceOf(EmbeddingSpaceStateError)
        const results = await store.searchNearest(embedText(target, MODEL_A.dimensions), 2, CANDIDATES)
        const run = await store.recordAnalysisRun({
          input: target,
          spaceId: spaceA,
          candidates: results.map(result => ({ chunkId: result.chunkId, score: result.similarity })),
          output: { verdict: 'ok' },
        })
        await activateNewSpace(store, MODEL_B)
        const counts = [await countRows(sql, 'documents'), await countRows(sql, 'document_chunks'), await countRows(sql, 'analysis_runs')]
        await store.dropSpace(spaceA)
        expect([await countRows(sql, 'documents'), await countRows(sql, 'document_chunks'), await countRows(sql, 'analysis_runs')]).toEqual(counts)
        const [table] = (await sql.unsafe('SELECT to_regclass($1) IS NOT NULL AS found', [`space_embeddings_${spaceA}`])) as { found: boolean }[]
        expect(table?.found).toBe(false)
        expect((await store.getAnalysisRun(run))?.candidates[0]?.text).toBe(target)
        await expect(store.dropSpace(spaceA)).rejects.toBeInstanceOf(EmbeddingSpaceStateError)
      })
    })
  })

  describe('corpus durable — análisis persistido', () => {
    test('un analysis_run sobrevive a la reingesta y al retiro de su espacio con el mismo texto', async () => {
      await withCorpusStore(testUrl, async store => {
        const identity = { scope: SCOPE, sourceIdentity: 'git:repo@abc:d.md', metadata: {} }
        await store.ingestDocument({ ...identity, chunks: ['primera redacción', 'otro párrafo'] })
        const spaceA = await activateNewSpace(store, MODEL_A)
        const results = await store.searchNearest(embedText('primera redacción', MODEL_A.dimensions), 2, CANDIDATES)
        const analysisId = await store.recordAnalysisRun({
          input: 'primera redacción',
          spaceId: spaceA,
          candidates: results.map(result => ({ chunkId: result.chunkId, score: result.similarity })),
          reranker: 'cross-encoder-x',
          output: { summary: 'dos candidatos' },
        })
        const before = await store.getAnalysisRun(analysisId)
        await store.ingestDocument({ ...identity, chunks: ['segunda redacción'] })
        await activateNewSpace(store, MODEL_B)
        await store.dropSpace(spaceA)
        const after = await store.getAnalysisRun(analysisId)
        expect(after).toEqual(before)
        expect(after?.candidates.map(candidate => candidate.text)).toEqual(results.map(result => result.text))
        expect(after?.candidates.every(candidate => candidate.version === 1)).toBe(true)
        expect(after?.corpusVersions).toEqual([{ documentId: results[0]?.documentId ?? '', version: 1 }])
        expect(after?.space).toEqual({ spaceId: spaceA, model: MODEL_A.model, dimensions: MODEL_A.dimensions, representation: MODEL_A.representation })
        expect(after?.reranker).toBe('cross-encoder-x')
        expect(after?.output).toEqual({ summary: 'dos candidatos' })
        expect(await store.getAnalysisRun(crypto.randomUUID())).toBeNull()
      })
    })
  })

  describe('corpus durable — worker recreado', () => {
    test('cerrar el store y abrir otro sobre la misma URL conserva corpus, espacio activo y análisis', async () => {
      await withDisposableSchema(testUrl, async sql => {
        const schema = await currentSchema(sql)
        const first = openStoreFor(testUrl, schema)
        await first.migrate()
        const directory = writeSourceDirectory()
        await ingestDirectory(first, directory)
        rmSync(directory, { recursive: true, force: true })
        const spaceId = await activateNewSpace(first, MODEL_A)
        const results = await first.searchNearest(embedText(target, MODEL_A.dimensions), 1, CANDIDATES)
        const analysisId = await first.recordAnalysisRun({ input: target, spaceId, candidates: [{ chunkId: results[0]?.chunkId ?? '', score: 1 }], output: {} })
        const recorded = await first.getAnalysisRun(analysisId)
        await first.close()
        const recreated = openStoreFor(testUrl, schema)
        try {
          expect(await recreated.migrate()).toEqual([])
          expect(await topText(recreated, target, MODEL_A.dimensions)).toBe(target)
          expect(await recreated.getAnalysisRun(analysisId)).toEqual(recorded)
          expect((await recreated.ingestDocument({ scope: SCOPE, sourceIdentity: 'tmp:beta.md', metadata: {}, chunks: NOTES['beta.md'] })).status).toBe('unchanged')
        } finally {
          await recreated.close()
        }
      })
    })
  })
}
