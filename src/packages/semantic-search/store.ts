/**
 * `SemanticSearchStore` (ADR-THYROX-008 1.2.0): el corpus durable y su
 * búsqueda semántica sobre PostgreSQL + pgvector. Guarda el contenido
 * ingerido (documentos y chunks versionados por hash), sus representaciones
 * derivadas (un espacio de embeddings por modelo · forma) y los análisis
 * hechos sobre él. Buscar y recuperar texto no vuelven a ninguna fuente.
 *
 * Abre, migra, lee y escribe; no tiene ciclo de vida de servidor ni de worker,
 * su único contrato de conexión es una URL, y no borra nada por caducidad:
 * qué se ingiere y qué retención aplica no lo decide el store.
 *
 * Nunca degrada: una URL que no es de PostgreSQL rehúsa al abrir, y sin
 * pgvector utilizable rehúsa cada operación con el error de su estado —no
 * cae a SQLite ni a búsqueda lineal—.
 *
 * La conexión fija el esquema del store como `search_path` en el arranque de
 * cada conexión del pool, no con un `SET` suelto: `Bun.SQL` es un pool y un
 * `SET` llega a una sola conexión (medido en `@thyrox/store`,
 * `testing/postgresTestSchema.ts`).
 */
import { SQL } from 'bun'

import { runMigrations, type Migration } from '@thyrox/store/migrations.ts'

import { type SchemaConfig, validateEmbedding, validateSchemaConfig, validateStoreUrl } from './config.ts'
import { type DocumentInput, type IngestResult, ingestDocument } from './corpus.ts'
import { CORPUS_MIGRATION_NAME, CORPUS_MIGRATION_VERSION, CORPUS_STATEMENTS, MIGRATIONS_TABLE } from './corpusSql.ts'
import { type AnalysisRun, type AnalysisRunInput, getAnalysisRun, recordAnalysisRun } from './analysisRuns.ts'
import { NoActiveEmbeddingSpaceError } from './errors.ts'
import {
  assertVectorExtensionUsable,
  readVectorExtensionState,
  type UsableVectorExtension,
  type VectorExtensionProbe,
} from './extension.ts'
import { rerankByCosine } from './rerank.ts'
import {
  type Activation,
  activateSpace,
  activeEmbeddingSpace,
  type ChunkEmbedding,
  chunksWithoutEmbedding,
  createEmbeddingSpace,
  dropSpace,
  type EmbeddingSpace,
  getEmbeddingSpace,
  type PendingChunk,
  putEmbeddings,
  type SpaceDeclaration,
} from './spaces.ts'
import { binaryCandidatesQuery } from './vectorSql.ts'

/** Un candidato de la búsqueda binaria, con su distancia de Hamming. */
export type BinaryCandidate = { chunkId: string; hammingDistance: number }

/** Un resultado de `searchNearest`, reordenado por coseno exacto, con el texto persistido. */
export type NearestResult = {
  chunkId: string
  text: string
  documentId: string
  sourceIdentity: string
  version: number
  similarity: number
}

export type SemanticSearchStoreOptions = { url: string; schema: SchemaConfig }

export type SemanticSearchStoreDeps = {
  /** Sustituye la lectura del estado de pgvector — para probar rechazos sin degradar el servidor. */
  probeExtension?: VectorExtensionProbe
}

export type SemanticSearchStore = {
  /** Comprueba pgvector y aplica la migración del corpus si falta; devuelve las versiones aplicadas ahora. */
  migrate(): Promise<number[]>
  ingestDocument(input: DocumentInput): Promise<IngestResult>
  createEmbeddingSpace(declaration: SpaceDeclaration): Promise<EmbeddingSpace>
  getEmbeddingSpace(spaceId: number): Promise<EmbeddingSpace | null>
  activeEmbeddingSpace(): Promise<EmbeddingSpace | null>
  chunksWithoutEmbedding(spaceId: number, limit: number): Promise<PendingChunk[]>
  putEmbeddings(spaceId: number, embeddings: readonly ChunkEmbedding[]): Promise<void>
  activateSpace(spaceId: number): Promise<Activation>
  dropSpace(spaceId: number): Promise<void>
  /** Candidatos vigentes del espacio activo por distancia de Hamming de la cuantización binaria. */
  searchBinaryCandidates(query: readonly number[], limit: number): Promise<BinaryCandidate[]>
  /** Los `k` chunks vigentes más cercanos en el espacio activo; sin espacio activo rehúsa. */
  searchNearest(query: readonly number[], k: number, options: { candidates: number }): Promise<NearestResult[]>
  recordAnalysisRun(run: AnalysisRunInput): Promise<string>
  getAnalysisRun(analysisId: string): Promise<AnalysisRun | null>
  /** La extensión utilizable (versión y esquema), comprobada una vez por store. */
  vectorExtension(): Promise<UsableVectorExtension>
  close(): Promise<void>
}

type CandidateRow = {
  chunk_id: string
  embedding: string
  text: string
  document_id: string
  version: number
  source_identity: string
  hamming_distance: number
}

const CORPUS_MIGRATION: Migration = {
  version: CORPUS_MIGRATION_VERSION,
  name: CORPUS_MIGRATION_NAME,
  statements: { postgres: [...CORPUS_STATEMENTS], sqlite: [] },
}

function parseVectorText(text: string): number[] {
  return JSON.parse(text) as number[]
}

function assertPositiveCount(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive integer, got ${value}`)
}

function toNearest(row: CandidateRow, similarity: number): NearestResult {
  return {
    chunkId: row.chunk_id,
    text: row.text,
    documentId: row.document_id,
    sourceIdentity: row.source_identity,
    version: row.version,
    similarity,
  }
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

  async function requireActiveSpace(): Promise<EmbeddingSpace> {
    const space = await activeEmbeddingSpace(sql)
    if (!space) throw new NoActiveEmbeddingSpaceError()
    return space
  }

  async function fetchCandidates(query: readonly number[], limit: number): Promise<CandidateRow[]> {
    assertPositiveCount('limit', limit)
    const extension = await vectorExtension()
    const space = await requireActiveSpace()
    validateEmbedding(query, space.dimensions)
    return (await sql.unsafe(binaryCandidatesQuery(extension.schema, space.spaceId, space), [JSON.stringify(query), limit])) as CandidateRow[]
  }

  return {
    vectorExtension,

    async migrate() {
      await vectorExtension()
      await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${config.name}`)
      return runMigrations(sql, 'postgres', { table: MIGRATIONS_TABLE, migrations: [CORPUS_MIGRATION] })
    },

    async ingestDocument(input) {
      await vectorExtension()
      return ingestDocument(sql, input)
    },

    async createEmbeddingSpace(declaration) {
      const extension = await vectorExtension()
      return createEmbeddingSpace(sql, extension.schema, declaration)
    },

    async getEmbeddingSpace(spaceId) {
      await vectorExtension()
      return getEmbeddingSpace(sql, spaceId)
    },

    async activeEmbeddingSpace() {
      await vectorExtension()
      return activeEmbeddingSpace(sql)
    },

    async chunksWithoutEmbedding(spaceId, limit) {
      assertPositiveCount('limit', limit)
      await vectorExtension()
      return chunksWithoutEmbedding(sql, spaceId, limit)
    },

    async putEmbeddings(spaceId, embeddings) {
      const extension = await vectorExtension()
      await putEmbeddings(sql, extension.schema, spaceId, embeddings)
    },

    async activateSpace(spaceId) {
      await vectorExtension()
      return activateSpace(sql, spaceId)
    },

    async dropSpace(spaceId) {
      await vectorExtension()
      await dropSpace(sql, spaceId)
    },

    async searchBinaryCandidates(query, limit) {
      const rows = await fetchCandidates(query, limit)
      return rows.map(row => ({ chunkId: row.chunk_id, hammingDistance: Number(row.hamming_distance) }))
    },

    async searchNearest(query, k, { candidates }) {
      assertPositiveCount('k', k)
      const rows = await fetchCandidates(query, candidates)
      const ranked = rerankByCosine(
        query,
        rows.map(row => ({ embedding: parseVectorText(row.embedding), item: row })),
        k,
      )
      return ranked.map(({ item, similarity }) => toNearest(item, similarity))
    },

    async recordAnalysisRun(run) {
      await vectorExtension()
      return recordAnalysisRun(sql, run)
    },

    async getAnalysisRun(analysisId) {
      await vectorExtension()
      return getAnalysisRun(sql, analysisId)
    },

    async close() {
      await sql.close()
    },
  }
}
