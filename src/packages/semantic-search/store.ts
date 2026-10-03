/**
 * `SemanticSearchStore` (ADR-THYROX-008 1.6.0): el corpus durable y su
 * búsqueda semántica sobre PostgreSQL + pgvector. Guarda el contenido
 * ingerido (documentos y chunks versionados por hash), sus representaciones
 * derivadas (un espacio de embeddings por modelo · forma) y los análisis
 * hechos sobre él. Buscar y recuperar texto no vuelven a ninguna fuente.
 *
 * Abre, migra, lee y escribe; no tiene ciclo de vida de servidor ni de worker,
 * su único contrato de conexión es una URL, y no borra nada por caducidad.
 * Qué se ingiere y con qué visibilidad lo decide la política que recibe al
 * abrirse (`corpusPolicy.ts`, D5): un archivo no entra por existir, y lo
 * privado sólo aparece en la búsqueda de su dueño.
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

import { runMigrations } from '@thyrox/store/migrations.ts'

import { type SchemaConfig, validateEmbedding, validateSchemaConfig, validateStoreUrl } from './config.ts'
import { type DocumentIdentity, type DocumentInput, findDocument, type IngestResult, ingestDocument, type StoredDocument } from './corpus.ts'
import { admitDocument, type CorpusPolicy, INITIAL_CORPUS_POLICY } from './corpusPolicy.ts'
import { CORPUS_MIGRATIONS, MIGRATIONS_TABLE } from './corpusSql.ts'
import { type LegacyIdentityResolver, type ReconciliationResult, reconcileLegacyIdentities } from './legacyIdentity.ts'
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
  domain: string
  domainId: string
  sourceRef: string
  sourceRevision: string | null
  version: number
  similarity: number
}

export type SemanticSearchStoreOptions = {
  url: string
  schema: SchemaConfig
  /** Qué orígenes entran y con qué visibilidad; sin ella, la primera versión de D5. */
  corpusPolicy?: CorpusPolicy
}

/** Quién busca: sin `owner`, sólo lo compartido; con él, también lo privado de ese dueño. */
export type SearchVisibility = { owner?: string }

export type SemanticSearchStoreDeps = {
  /** Sustituye la lectura del estado de pgvector — para probar rechazos sin degradar el servidor. */
  probeExtension?: VectorExtensionProbe
}

export type SemanticSearchStore = {
  /** Comprueba pgvector y aplica las migraciones del corpus que falten; devuelve las versiones aplicadas ahora. */
  migrate(): Promise<number[]>
  ingestDocument(input: DocumentInput): Promise<IngestResult>
  /** El documento ingerido con esa identidad, con su versión y hash vigentes; una fila sin mapear nunca se devuelve. */
  findDocument(identity: DocumentIdentity): Promise<StoredDocument | null>
  /** Asigna la identidad de dominio a las filas de la migración 2 y converge las que coinciden. */
  reconcileLegacyIdentities(resolve: LegacyIdentityResolver): Promise<ReconciliationResult>
  createEmbeddingSpace(declaration: SpaceDeclaration): Promise<EmbeddingSpace>
  getEmbeddingSpace(spaceId: number): Promise<EmbeddingSpace | null>
  activeEmbeddingSpace(): Promise<EmbeddingSpace | null>
  chunksWithoutEmbedding(spaceId: number, limit: number): Promise<PendingChunk[]>
  putEmbeddings(spaceId: number, embeddings: readonly ChunkEmbedding[]): Promise<void>
  activateSpace(spaceId: number): Promise<Activation>
  dropSpace(spaceId: number): Promise<void>
  /** Candidatos vigentes y visibles del espacio activo por distancia de Hamming de la cuantización binaria. */
  searchBinaryCandidates(query: readonly number[], limit: number, visibility?: SearchVisibility): Promise<BinaryCandidate[]>
  /** Los `k` chunks vigentes y visibles más cercanos en el espacio activo; sin espacio activo rehúsa. */
  searchNearest(query: readonly number[], k: number, options: { candidates: number } & SearchVisibility): Promise<NearestResult[]>
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
  domain: string
  domain_id: string
  source_ref: string
  source_revision: string | null
  hamming_distance: number
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
    domain: row.domain,
    domainId: row.domain_id,
    sourceRef: row.source_ref,
    sourceRevision: row.source_revision,
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
  const corpusPolicy = options.corpusPolicy ?? INITIAL_CORPUS_POLICY
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

  async function fetchCandidates(query: readonly number[], limit: number, visibility: SearchVisibility): Promise<CandidateRow[]> {
    assertPositiveCount('limit', limit)
    const extension = await vectorExtension()
    const space = await requireActiveSpace()
    validateEmbedding(query, space.dimensions)
    const parameters = [JSON.stringify(query), limit, visibility.owner ?? null]
    return (await sql.unsafe(binaryCandidatesQuery(extension.schema, space.spaceId, space), parameters)) as CandidateRow[]
  }

  return {
    vectorExtension,

    async migrate() {
      await vectorExtension()
      await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${config.name}`)
      return runMigrations(sql, 'postgres', { table: MIGRATIONS_TABLE, migrations: CORPUS_MIGRATIONS })
    },

    async ingestDocument(input) {
      const { visibility } = admitDocument(corpusPolicy, input)
      await vectorExtension()
      return ingestDocument(sql, input, visibility)
    },

    async findDocument(identity) {
      await vectorExtension()
      return findDocument(sql, identity)
    },

    async reconcileLegacyIdentities(resolve) {
      await vectorExtension()
      return reconcileLegacyIdentities(sql, resolve)
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

    async searchBinaryCandidates(query, limit, visibility = {}) {
      const rows = await fetchCandidates(query, limit, visibility)
      return rows.map(row => ({ chunkId: row.chunk_id, hammingDistance: Number(row.hamming_distance) }))
    },

    async searchNearest(query, k, { candidates, owner }) {
      assertPositiveCount('k', k)
      const rows = await fetchCandidates(query, candidates, { owner })
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
