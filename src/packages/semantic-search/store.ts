/**
 * `SemanticSearchStore` (ADR-THYROX-008): el store de dominio vectorial sobre
 * PostgreSQL + pgvector. Abre, migra, lee y escribe; no tiene ciclo de vida
 * de servidor ni de worker, y su único contrato de conexión es una URL.
 *
 * Nunca degrada: una URL que no es de PostgreSQL rehúsa al abrir, y sin
 * pgvector utilizable rehúsa cada operación con el error de su estado —no
 * cae a SQLite ni a búsqueda lineal—.
 *
 * La conexión fija el esquema del store como `search_path` en el arranque de
 * cada conexión del pool, no con un `SET` suelto: `Bun.SQL` es un pool y un
 * `SET` llega a una sola conexión (medido en `@thyrox/store`,
 * `testing/postgresTestSchema.ts`). `openByUrl` de `@thyrox/store` no acepta
 * opciones de conexión, por eso la URL se valida con su `dialectOf` y la
 * conexión se construye aquí.
 */
import { SQL } from 'bun'

import { runMigrations, type Migration } from '@thyrox/store/migrations.ts'
import { readJson } from '@thyrox/store/sql.ts'

import { type SchemaConfig, validateEmbedding, validateSchemaConfig, validateStoreUrl } from './config.ts'
import {
  assertVectorExtensionUsable,
  readVectorExtensionState,
  type UsableVectorExtension,
  type VectorExtensionProbe,
} from './extension.ts'
import { rerankByCosine } from './rerank.ts'
import {
  binaryCandidatesQuery,
  createEmbeddingsStatements,
  getEmbeddingQuery,
  migrationName,
  MIGRATIONS_TABLE,
  upsertQuery,
} from './vectorSql.ts'

export type Metadata = Record<string, unknown>

/** Un embedding guardado. */
export type StoredEmbedding = { id: string; embedding: number[]; metadata: Metadata }

/** Un candidato de la búsqueda binaria, con su distancia de Hamming. */
export type BinaryCandidate = { id: string; hammingDistance: number }

/** Un resultado de `searchNearest`, reordenado por coseno exacto. */
export type NearestResult = { id: string; similarity: number; metadata: Metadata }

export type SemanticSearchStoreOptions = { url: string; schema: SchemaConfig }

export type SemanticSearchStoreDeps = {
  /** Sustituye la lectura del estado de pgvector — para probar rechazos sin degradar el servidor. */
  probeExtension?: VectorExtensionProbe
}

export type SemanticSearchStore = {
  /** Comprueba pgvector y aplica la migración del esquema si falta; devuelve las versiones aplicadas ahora. */
  migrateVectorSchema(): Promise<number[]>
  upsertEmbedding(id: string, embedding: readonly number[], metadata: Metadata): Promise<void>
  getEmbedding(id: string): Promise<StoredEmbedding | null>
  searchBinaryCandidates(query: readonly number[], limit: number): Promise<BinaryCandidate[]>
  searchNearest(query: readonly number[], k: number, options: { candidates: number }): Promise<NearestResult[]>
  /** La extensión utilizable (versión y esquema), comprobada una vez por store. */
  vectorExtension(): Promise<UsableVectorExtension>
  close(): Promise<void>
}

type CandidateRow = { id: string; embedding: string; metadata: unknown; hamming_distance: number }
type EmbeddingRow = { id: string; embedding: string; metadata: unknown }

const SCHEMA_VERSION = 1

function parseVectorText(text: string): number[] {
  return JSON.parse(text) as number[]
}

function vectorLiteral(embedding: readonly number[]): string {
  return JSON.stringify(embedding)
}

function assertPositiveCount(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive integer, got ${value}`)
}

function vectorMigration(extension: UsableVectorExtension, config: SchemaConfig): Migration {
  const statements = createEmbeddingsStatements(extension.schema, config)
  return { version: SCHEMA_VERSION, name: migrationName(config), statements: { postgres: statements, sqlite: [] } }
}

/**
 * Abre el store sobre la URL declarada. No conecta todavía: la primera
 * operación comprueba pgvector y conecta.
 */
export function openSemanticSearchStore(options: SemanticSearchStoreOptions, deps: SemanticSearchStoreDeps = {}): SemanticSearchStore {
  const url = validateStoreUrl(options.url)
  const config = validateSchemaConfig(options.schema)
  const probeExtension = deps.probeExtension ?? readVectorExtensionState
  const sql = new SQL({ url, connection: { search_path: config.name } })
  let extensionCheck: Promise<UsableVectorExtension> | undefined

  function vectorExtension(): Promise<UsableVectorExtension> {
    extensionCheck ??= probeExtension(sql).then(assertVectorExtensionUsable)
    return extensionCheck
  }

  async function fetchCandidates(query: readonly number[], limit: number): Promise<CandidateRow[]> {
    validateEmbedding(query, config.dimensions)
    assertPositiveCount('limit', limit)
    const extension = await vectorExtension()
    return (await sql.unsafe(binaryCandidatesQuery(extension.schema, config), [vectorLiteral(query), limit])) as CandidateRow[]
  }

  return {
    vectorExtension,

    async migrateVectorSchema() {
      const extension = await vectorExtension()
      await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${config.name}`)
      return runMigrations(sql, 'postgres', { table: MIGRATIONS_TABLE, migrations: [vectorMigration(extension, config)] })
    },

    async upsertEmbedding(id, embedding, metadata) {
      validateEmbedding(embedding, config.dimensions)
      const extension = await vectorExtension()
      await sql.unsafe(upsertQuery(extension.schema, config), [id, vectorLiteral(embedding), JSON.stringify(metadata)])
    },

    async getEmbedding(id) {
      await vectorExtension()
      const [row] = (await sql.unsafe(getEmbeddingQuery(), [id])) as EmbeddingRow[]
      if (!row) return null
      return { id: row.id, embedding: parseVectorText(row.embedding), metadata: readJson(row.metadata) }
    },

    async searchBinaryCandidates(query, limit) {
      const rows = await fetchCandidates(query, limit)
      return rows.map(row => ({ id: row.id, hammingDistance: Number(row.hamming_distance) }))
    },

    async searchNearest(query, k, { candidates }) {
      assertPositiveCount('k', k)
      const rows = await fetchCandidates(query, candidates)
      const ranked = rerankByCosine(
        query,
        rows.map(row => ({ embedding: parseVectorText(row.embedding), item: row })),
        k,
      )
      return ranked.map(({ item, similarity }) => ({ id: item.id, similarity, metadata: readJson(item.metadata) }))
    },

    async close() {
      await sql.close()
    },
  }
}
