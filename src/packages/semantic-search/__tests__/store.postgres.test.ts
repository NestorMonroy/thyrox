/**
 * El store contra un PostgreSQL real con pgvector: migraciones, idempotencia,
 * otra URL hacia la misma base, reapertura tras cerrar, y las dos búsquedas.
 *
 * Corre contra `THYROX_TEST_POSTGRES_URL`, cada caso en un esquema de usar y
 * tirar (`withDisposableSchema`) cuyo nombre se lee de la conexión y se pasa
 * al store como su esquema: el store abre su propia conexión por URL, como en
 * uso real. Sin la variable, la suite se declara NO MEDIDA en vez de pasar.
 */
import type { SQL } from 'bun'
import { describe, expect, test } from 'bun:test'

import { resolvePostgresTestUrl, withDisposableSchema } from '@thyrox/store/testing/postgresTestSchema.ts'

import type { SchemaConfig } from '../config.ts'
import { MINIMUM_PGVECTOR_VERSION, VectorExtensionVersionError } from '../extension.ts'
import { openSemanticSearchStore, type SemanticSearchStore } from '../store.ts'
import { binaryCandidatesQuery, BINARY_INDEX_NAME, EMBEDDINGS_TABLE, MIGRATIONS_TABLE } from '../vectorSql.ts'

const url = resolvePostgresTestUrl()
const DIMENSIONS = 4

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

async function currentSchema(sql: SQL): Promise<string> {
  const [row] = (await sql.unsafe('SELECT current_schema() AS name')) as { name: string }[]
  if (!row) throw new Error('current_schema() returned no row')
  return row.name
}

function schemaConfig(name: string, representation: SchemaConfig['representation'] = 'vector'): SchemaConfig {
  return { name, dimensions: DIMENSIONS, representation }
}

async function withStore(storeUrl: string, body: (store: SemanticSearchStore, sql: SQL, schema: string) => Promise<void>): Promise<void> {
  await withDisposableSchema(storeUrl, async sql => {
    const schema = await currentSchema(sql)
    const store = openSemanticSearchStore({ url: storeUrl, schema: schemaConfig(schema) })
    try {
      await body(store, sql, schema)
    } finally {
      await store.close()
    }
  })
}

async function seedKnownSet(store: SemanticSearchStore): Promise<void> {
  for (const [id, embedding] of Object.entries(KNOWN_SET)) await store.upsertEmbedding(id, embedding, { label: id })
}

if (!url) {
  describe('SemanticSearchStore — postgres', () => {
    test.skip('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correrlo', () => {})
  })
} else {
  const testUrl = url

  describe('SemanticSearchStore — migraciones', () => {
    test('con pgvector compatible crea la tabla, la columna vectorial, el índice binario y el ledger', async () => {
      await withStore(testUrl, async (store, sql, schema) => {
        expect(await store.migrateVectorSchema()).toEqual([1])
        const [column] = (await sql.unsafe(
          `SELECT format_type(a.atttypid, a.atttypmod) AS type FROM pg_attribute a
             JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = $1 AND c.relname = $2 AND a.attname = 'embedding'`,
          [schema, EMBEDDINGS_TABLE],
        )) as { type: string }[]
        const extension = await store.vectorExtension()
        expect(column?.type).toBe(`${extension.schema}.vector(${DIMENSIONS})`)
        const indexes = (await sql.unsafe('SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename = $2', [
          schema,
          EMBEDDINGS_TABLE,
        ])) as { indexname: string; indexdef: string }[]
        const binaryIndex = indexes.find(index => index.indexname === BINARY_INDEX_NAME)
        expect(binaryIndex?.indexdef).toContain('USING hnsw')
        expect(binaryIndex?.indexdef).toContain('bit_hamming_ops')
        expect(binaryIndex?.indexdef).toContain(`binary_quantize(embedding))::bit(${DIMENSIONS})`)
        const ledger = (await sql.unsafe(`SELECT version FROM ${MIGRATIONS_TABLE}`)) as { version: number }[]
        expect(ledger.map(row => row.version)).toEqual([1])
      })
    })

    test('la segunda ejecución es idempotente: no aplica nada ni duplica índices', async () => {
      await withStore(testUrl, async (store, sql, schema) => {
        await store.migrateVectorSchema()
        expect(await store.migrateVectorSchema()).toEqual([])
        const [count] = (await sql.unsafe('SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname = $1 AND tablename = $2', [
          schema,
          EMBEDDINGS_TABLE,
        ])) as { n: number }[]
        expect(count?.n).toBe(2)
      })
    })

    test('con halfvec la columna es halfvec(N) y el embedding vuelve igual', async () => {
      await withDisposableSchema(testUrl, async sql => {
        const schema = await currentSchema(sql)
        const store = openSemanticSearchStore({ url: testUrl, schema: schemaConfig(schema, 'halfvec') })
        try {
          await store.migrateVectorSchema()
          await store.upsertEmbedding('h', [0.5, -1, 2, 0.25], {})
          expect((await store.getEmbedding('h'))?.embedding).toEqual([0.5, -1, 2, 0.25])
          const [column] = (await sql.unsafe(
            `SELECT format_type(atttypid, atttypmod) AS type FROM pg_attribute WHERE attrelid = to_regclass($1) AND attname = 'embedding'`,
            [EMBEDDINGS_TABLE],
          )) as { type: string }[]
          const extension = await store.vectorExtension()
          expect(column?.type).toBe(`${extension.schema}.halfvec(${DIMENSIONS})`)
        } finally {
          await store.close()
        }
      })
    })

    test('otra dimensión sobre un esquema ya migrado rehúsa por procedencia, no altera la tabla', async () => {
      await withStore(testUrl, async (store, _sql, schema) => {
        await store.migrateVectorSchema()
        const wider = openSemanticSearchStore({ url: testUrl, schema: { name: schema, dimensions: DIMENSIONS + 1, representation: 'vector' } })
        try {
          await expect(wider.migrateVectorSchema()).rejects.toThrow(/vector\(4\)|vector\(5\)/)
        } finally {
          await wider.close()
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
        const store = openSemanticSearchStore({ url: testUrl, schema: schemaConfig(schema) }, { probeExtension })
        try {
          const rejection = store.migrateVectorSchema()
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

  describe('SemanticSearchStore — conexión y persistencia', () => {
    test('otra URL hacia la misma base abre el mismo store sin cambiar código', async () => {
      const otherUrl = alternateUrl(testUrl)
      expect(otherUrl).not.toBe(testUrl)
      await withStore(testUrl, async (store, _sql, schema) => {
        await store.migrateVectorSchema()
        await store.upsertEmbedding('a', [1, 2, 3, 4], { origin: 'first-url' })
        const other = openSemanticSearchStore({ url: otherUrl, schema: schemaConfig(schema) })
        try {
          expect(await other.migrateVectorSchema()).toEqual([])
          expect(await other.getEmbedding('a')).toEqual({ id: 'a', embedding: [1, 2, 3, 4], metadata: { origin: 'first-url' } })
        } finally {
          await other.close()
        }
      })
    })

    test('cerrar el store y abrir uno nuevo con la misma URL conserva lo escrito', async () => {
      await withDisposableSchema(testUrl, async sql => {
        const schema = await currentSchema(sql)
        const first = openSemanticSearchStore({ url: testUrl, schema: schemaConfig(schema) })
        await first.migrateVectorSchema()
        await first.upsertEmbedding('kept', [0, 1, 0, 1], { note: 'survives' })
        await first.close()
        const recreated = openSemanticSearchStore({ url: testUrl, schema: schemaConfig(schema) })
        try {
          expect(await recreated.getEmbedding('kept')).toEqual({ id: 'kept', embedding: [0, 1, 0, 1], metadata: { note: 'survives' } })
          expect(await recreated.getEmbedding('missing')).toBeNull()
        } finally {
          await recreated.close()
        }
      })
    })

    test('upsert sobre el mismo id reemplaza embedding y metadata', async () => {
      await withStore(testUrl, async store => {
        await store.migrateVectorSchema()
        await store.upsertEmbedding('u', [1, 0, 0, 0], { v: 1 })
        await store.upsertEmbedding('u', [0, 0, 0, 1], { v: 2 })
        expect(await store.getEmbedding('u')).toEqual({ id: 'u', embedding: [0, 0, 0, 1], metadata: { v: 2 } })
      })
    })
  })

  describe('SemanticSearchStore — búsqueda', () => {
    test('searchBinaryCandidates ordena por distancia de Hamming de la cuantización binaria', async () => {
      await withStore(testUrl, async store => {
        await store.migrateVectorSchema()
        await seedKnownSet(store)
        expect(await store.searchBinaryCandidates(QUERY, 4)).toEqual([
          { id: 'y', hammingDistance: 0 },
          { id: 'x', hammingDistance: 1 },
          { id: 'w', hammingDistance: 2 },
          { id: 'z', hammingDistance: 4 },
        ])
      })
    })

    // CONTROL: sin el reranking exacto, el orden sería el de Hamming: [y, x].
    test('searchNearest reordena los candidatos por coseno exacto', async () => {
      await withStore(testUrl, async store => {
        await store.migrateVectorSchema()
        await seedKnownSet(store)
        const nearest = await store.searchNearest(QUERY, 2, { candidates: 4 })
        expect(nearest.map(result => result.id)).toEqual(['x', 'y'])
        expect(nearest[0]?.similarity).toBeCloseTo(cosine(QUERY, KNOWN_SET.x ?? []), 5)
        expect(nearest[0]?.metadata).toEqual({ label: 'x' })
      })
    })

    test('searchBinaryCandidates usa el índice HNSW binario (EXPLAIN)', async () => {
      await withStore(testUrl, async (store, sql) => {
        await store.migrateVectorSchema()
        await seedKnownSet(store)
        const extension = await store.vectorExtension()
        const plan = await sql.begin(async tx => {
          await tx.unsafe('SET LOCAL enable_seqscan = off')
          return (await tx.unsafe(`EXPLAIN ${binaryCandidatesQuery(extension.schema, schemaConfig('unused'))}`, [
            JSON.stringify(QUERY),
            4,
          ])) as { 'QUERY PLAN': string }[]
        })
        expect(plan.map(row => row['QUERY PLAN']).join('\n')).toContain(BINARY_INDEX_NAME)
      })
    })

    test('una consulta de otra dimensión se rechaza nombrando las dos', async () => {
      await withStore(testUrl, async store => {
        await store.migrateVectorSchema()
        await expect(store.searchNearest([1, 2], 1, { candidates: 2 })).rejects.toThrow(/2 dimensions.*4/)
        await expect(store.upsertEmbedding('bad', [1, 2, 3], {})).rejects.toThrow(/3 dimensions.*4/)
      })
    })
  })
}
