/**
 * El store contra un PostgreSQL real con pgvector: la migración del corpus en
 * el ledger de `@thyrox/store`, el rechazo de un ledger de la superficie
 * anterior, otra URL hacia la misma base, la forma de la tabla de un espacio y
 * las dos búsquedas sobre el espacio activo.
 *
 * Corre contra `THYROX_TEST_POSTGRES_URL`, cada caso en un esquema de usar y
 * tirar cuyo nombre se pasa al store, que abre su propia conexión por URL como
 * en uso real. Sin la variable, la suite se declara NO MEDIDA en vez de pasar.
 */
import { describe, expect, test } from 'bun:test'

import { resolvePostgresTestUrl, withDisposableSchema } from '@thyrox/store/testing/postgresTestSchema.ts'

import { MINIMUM_PGVECTOR_VERSION, VectorExtensionVersionError } from '../extension.ts'
import { openSemanticSearchStore, type SemanticSearchStore } from '../store.ts'
import { CORPUS_MIGRATIONS, MIGRATIONS_TABLE } from '../corpusSql.ts'
import { binaryCandidatesQuery, spaceIndexName, spaceTableName } from '../vectorSql.ts'
import { currentSchema, openStoreFor, withCorpusStore } from './support/corpusFixtures.ts'

const url = resolvePostgresTestUrl()
const DIMENSIONS = 4
const MIGRATION_VERSIONS = CORPUS_MIGRATIONS.map(migration => migration.version)
const CORPUS_TABLES = ['analysis_candidates', 'analysis_runs', 'document_chunks', 'documents', 'embedding_spaces']

/**
 * El conjunto conocido: con la consulta [1,1,1,1], el orden por distancia de
 * Hamming de la cuantización binaria (y:0, x:1, w:2, z:4) y el orden por coseno
 * exacto (x:0.866, y:0.503, w:0, z:-1) difieren en las dos primeras
 * posiciones, así que sólo el reranking exacto da [x, y].
 */
const QUERY = [1, 1, 1, 1]
const KNOWN_SET: Record<string, number[]> = {
  x: [1, 1, 1, -0.01],
  y: [5, 0.01, 0.01, 0.01],
  w: [1, 1, -1, -1],
  z: [-1, -1, -1, -1],
}

function cosine(left: number[], right: number[]): number {
  const dot = left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0)
  const norm = (vector: number[]): number => Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  return dot / (norm(left) * norm(right))
}

/**
 * Otra URL hacia la misma base: cambia el alias de loopback del host si lo
 * es, y si no añade un `application_name`. Se deriva de la URL declarada, sin
 * suponer dónde vive el servidor.
 */
function alternateUrl(original: string): string {
  const parsed = new URL(original)
  const loopbackAliases: Record<string, string> = { '127.0.0.1': 'localhost', localhost: '127.0.0.1' }
  const alias = loopbackAliases[parsed.hostname]
  if (alias) parsed.hostname = alias
  else parsed.searchParams.set('application_name', 'thyrox_semantic_search_alternate')
  return parsed.toString()
}

/** Ingiere el conjunto conocido como un documento de un chunk por etiqueta y lo embebe con sus vectores fijos. */
async function seedKnownSet(store: SemanticSearchStore): Promise<{ spaceId: number; labelOf: Map<string, string> }> {
  await store.ingestDocument({ domain: 'known', domainId: 'known-set', sourceRef: 'known-set.txt', sourceRevision: null, metadata: {}, chunks: Object.keys(KNOWN_SET) })
  const space = await store.createEmbeddingSpace({ model: 'fixed', dimensions: DIMENSIONS, representation: 'vector' })
  const pending = await store.chunksWithoutEmbedding(space.spaceId, 10)
  await store.putEmbeddings(space.spaceId, pending.map(chunk => ({ chunkId: chunk.chunkId, embedding: KNOWN_SET[chunk.text] ?? [] })))
  await store.activateSpace(space.spaceId)
  return { spaceId: space.spaceId, labelOf: new Map(pending.map(chunk => [chunk.chunkId, chunk.text])) }
}

if (!url) {
  describe('SemanticSearchStore — postgres', () => {
    test.skip('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correrlo', () => {})
  })
} else {
  const testUrl = url

  describe('SemanticSearchStore — migración', () => {
    test('crea las tablas del corpus y registra sus versiones en el ledger', async () => {
      await withDisposableSchema(testUrl, async sql => {
        const schema = await currentSchema(sql)
        const store = openStoreFor(testUrl, schema)
        try {
          expect(await store.migrate()).toEqual(MIGRATION_VERSIONS)
          const tables = (await sql.unsafe('SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename', [schema])) as { tablename: string }[]
          expect(tables.map(row => row.tablename).filter(name => name !== MIGRATIONS_TABLE)).toEqual(CORPUS_TABLES)
          const ledger = (await sql.unsafe(`SELECT version FROM ${MIGRATIONS_TABLE}`)) as { version: number }[]
          expect(ledger.map(row => row.version).sort()).toEqual(MIGRATION_VERSIONS)
          expect(await store.migrate()).toEqual([])
        } finally {
          await store.close()
        }
      })
    })

    test('un ledger de la superficie anterior (versión 1) rehúsa en vez de convivir con ella', async () => {
      await withDisposableSchema(testUrl, async sql => {
        const schema = await currentSchema(sql)
        await sql.unsafe(`CREATE TABLE ${MIGRATIONS_TABLE} (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`)
        await sql.unsafe(`INSERT INTO ${MIGRATIONS_TABLE} VALUES (1, 'create_embeddings_vector(4)', '2026-09-29')`)
        const store = openStoreFor(testUrl, schema)
        try {
          await expect(store.migrate()).rejects.toThrow(/version 1 applied/)
        } finally {
          await store.close()
        }
      })
    })

    test('con versión insuficiente (doble de la consulta) rehúsa con las dos versiones y no crea nada', async () => {
      await withDisposableSchema(testUrl, async sql => {
        const schema = await currentSchema(sql)
        const probeExtension = async (): Promise<{ availableVersion: string; installed: { version: string; schema: string } }> => ({
          availableVersion: '0.6.2',
          installed: { version: '0.6.2', schema: 'public' },
        })
        const store = openSemanticSearchStore({ url: testUrl, schema: { name: schema } }, { probeExtension })
        try {
          const rejection = store.migrate()
          await expect(rejection).rejects.toBeInstanceOf(VectorExtensionVersionError)
          await expect(rejection).rejects.toThrow(new RegExp(`0\\.6\\.2.*${MINIMUM_PGVECTOR_VERSION.replaceAll('.', '\\.')}`))
          const [found] = (await sql.unsafe('SELECT to_regclass($1) IS NOT NULL AS found', [MIGRATIONS_TABLE])) as { found: boolean }[]
          expect(found?.found).toBe(false)
        } finally {
          await store.close()
        }
      })
    })
  })

  describe('SemanticSearchStore — espacios', () => {
    test('cada espacio tiene su tabla con la columna de su forma y su índice HNSW binario', async () => {
      await withCorpusStore(testUrl, async (store, sql, schema) => {
        const extension = await store.vectorExtension()
        for (const representation of ['vector', 'halfvec'] as const) {
          const space = await store.createEmbeddingSpace({ model: `m-${representation}`, dimensions: DIMENSIONS, representation })
          const [column] = (await sql.unsafe(
            `SELECT format_type(atttypid, atttypmod) AS type FROM pg_attribute WHERE attrelid = to_regclass($1) AND attname = 'embedding'`,
            [spaceTableName(space.spaceId)],
          )) as { type: string }[]
          expect(column?.type).toBe(`${extension.schema}.${representation}(${DIMENSIONS})`)
          const indexes = (await sql.unsafe('SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename = $2', [
            schema,
            spaceTableName(space.spaceId),
          ])) as { indexname: string; indexdef: string }[]
          const binaryIndex = indexes.find(index => index.indexname === spaceIndexName(space.spaceId))
          expect(binaryIndex?.indexdef).toContain('USING hnsw')
          expect(binaryIndex?.indexdef).toContain('bit_hamming_ops')
          expect(binaryIndex?.indexdef).toContain(`binary_quantize(embedding))::bit(${DIMENSIONS})`)
        }
      })
    })

    test('a lo sumo un espacio activo: activar uno retira el anterior en la misma transacción', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const first = await store.createEmbeddingSpace({ model: 'a', dimensions: DIMENSIONS, representation: 'vector' })
        const second = await store.createEmbeddingSpace({ model: 'b', dimensions: DIMENSIONS, representation: 'vector' })
        expect(await store.activateSpace(first.spaceId)).toEqual({ activated: first.spaceId, retired: null })
        expect(await store.activateSpace(second.spaceId)).toEqual({ activated: second.spaceId, retired: first.spaceId })
        const states = (await sql.unsafe('SELECT state FROM embedding_spaces ORDER BY space_id')) as { state: string }[]
        expect(states.map(row => row.state)).toEqual(['retired', 'active'])
        const reactivateRetired = async (): Promise<unknown> => sql.unsafe(`UPDATE embedding_spaces SET state = 'active' WHERE space_id = $1`, [first.spaceId])
        await expect(reactivateRetired()).rejects.toThrow(/embedding_spaces_single_active/)
      })
    })
  })

  describe('SemanticSearchStore — conexión', () => {
    test('otra URL hacia la misma base abre el mismo store sin cambiar código', async () => {
      const otherUrl = alternateUrl(testUrl)
      expect(otherUrl).not.toBe(testUrl)
      await withCorpusStore(testUrl, async (store, _sql, schema) => {
        const ingested = await store.ingestDocument({ domain: 's', domainId: 'a', sourceRef: 'a', sourceRevision: null, metadata: { origin: 'first-url' }, chunks: ['a'] })
        const other = openStoreFor(otherUrl, schema)
        try {
          expect(await other.migrate()).toEqual([])
          expect(await other.ingestDocument({ domain: 's', domainId: 'a', sourceRef: 'a', sourceRevision: null, metadata: {}, chunks: ['a'] })).toEqual({ ...ingested, status: 'unchanged' })
        } finally {
          await other.close()
        }
      })
    })
  })

  describe('SemanticSearchStore — búsqueda', () => {
    test('searchBinaryCandidates ordena por distancia de Hamming de la cuantización binaria', async () => {
      await withCorpusStore(testUrl, async store => {
        const { labelOf } = await seedKnownSet(store)
        const candidates = await store.searchBinaryCandidates(QUERY, 4)
        expect(candidates.map(candidate => [labelOf.get(candidate.chunkId), candidate.hammingDistance])).toEqual([
          ['y', 0],
          ['x', 1],
          ['w', 2],
          ['z', 4],
        ])
      })
    })

    // CONTROL: sin el reranking exacto, el orden sería el de Hamming: [y, x].
    test('searchNearest reordena los candidatos por coseno exacto', async () => {
      await withCorpusStore(testUrl, async store => {
        await seedKnownSet(store)
        const nearest = await store.searchNearest(QUERY, 2, { candidates: 4 })
        expect(nearest.map(result => result.text)).toEqual(['x', 'y'])
        expect(nearest[0]?.similarity).toBeCloseTo(cosine(QUERY, KNOWN_SET.x ?? []), 5)
        expect(nearest[0]).toMatchObject({ domain: 'known', domainId: 'known-set', sourceRef: 'known-set.txt' })
      })
    })

    test('searchBinaryCandidates usa el índice HNSW binario del espacio (EXPLAIN)', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const { spaceId } = await seedKnownSet(store)
        const extension = await store.vectorExtension()
        const shape = { dimensions: DIMENSIONS, representation: 'vector' as const }
        const plan = await sql.begin(async tx => {
          await tx.unsafe('SET LOCAL enable_seqscan = off')
          return (await tx.unsafe(`EXPLAIN ${binaryCandidatesQuery(extension.schema, spaceId, shape)}`, [JSON.stringify(QUERY), 4])) as {
            'QUERY PLAN': string
          }[]
        })
        expect(plan.map(row => row['QUERY PLAN']).join('\n')).toContain(spaceIndexName(spaceId))
      })
    })

    test('una consulta de otra dimensión que el espacio activo se rechaza nombrando las dos', async () => {
      await withCorpusStore(testUrl, async store => {
        await seedKnownSet(store)
        await expect(store.searchNearest([1, 2], 1, { candidates: 2 })).rejects.toThrow(/2 dimensions.*4/)
      })
    })
  })
}
