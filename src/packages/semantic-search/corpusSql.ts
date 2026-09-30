/**
 * El SQL del corpus durable (ADR-THYROX-008 1.2.0): el DDL de su migración y
 * las consultas que no dependen de ningún espacio de embeddings. El texto
 * vive en `document_chunks`; nada aquí lee `source_identity` como ruta.
 *
 * La migración es la versión 2 del ledger del store. La versión 1 era la
 * tabla única `semantic_embeddings` de la superficie anterior, sin texto ni
 * modelo: ya no se declara, así que un ledger que la tenga rehúsa por
 * `assertNoNewerDatabase` en vez de convivir con un esquema que no cumple el
 * requisito de durabilidad.
 */
export const MIGRATIONS_TABLE = 'semantic_search_migrations'
export const CORPUS_MIGRATION_VERSION = 2
export const CORPUS_MIGRATION_NAME = 'create_durable_corpus'

/**
 * La condición que deja sólo la versión vigente de cada documento, sobre los
 * alias `c` (chunk) y `d` (documento). La comparten la búsqueda y el censo de
 * chunks por embeber: una versión reemplazada ni se busca ni se re-embebe.
 */
export const CURRENT_VERSION_CONDITION = 'c.version = d.version'

export const CORPUS_STATEMENTS: readonly string[] = [
  `CREATE TABLE documents (
     document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     scope TEXT NOT NULL,
     source_identity TEXT NOT NULL,
     version INTEGER NOT NULL CHECK (version > 0),
     content_hash TEXT NOT NULL,
     metadata JSONB NOT NULL,
     ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (scope, source_identity)
   )`,
  `CREATE TABLE document_chunks (
     chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     document_id UUID NOT NULL REFERENCES documents (document_id),
     version INTEGER NOT NULL CHECK (version > 0),
     position INTEGER NOT NULL CHECK (position >= 0),
     text TEXT NOT NULL,
     content_hash TEXT NOT NULL,
     UNIQUE (document_id, version, position)
   )`,
  `CREATE TABLE embedding_spaces (
     space_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     model TEXT NOT NULL,
     dimensions INTEGER NOT NULL CHECK (dimensions > 0),
     representation TEXT NOT NULL CHECK (representation IN ('vector', 'halfvec')),
     state TEXT NOT NULL CHECK (state IN ('building', 'active', 'retired')),
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     dropped_at TIMESTAMPTZ
   )`,
  `CREATE UNIQUE INDEX embedding_spaces_single_active ON embedding_spaces (state) WHERE state = 'active'`,
  `CREATE TABLE analysis_runs (
     analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     input TEXT NOT NULL,
     space_id INTEGER NOT NULL REFERENCES embedding_spaces (space_id),
     corpus_versions JSONB NOT NULL,
     reranker TEXT,
     output JSONB NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE analysis_candidates (
     analysis_id UUID NOT NULL REFERENCES analysis_runs (analysis_id),
     rank INTEGER NOT NULL CHECK (rank >= 0),
     chunk_id UUID NOT NULL REFERENCES document_chunks (chunk_id) ON DELETE RESTRICT,
     score DOUBLE PRECISION NOT NULL,
     PRIMARY KEY (analysis_id, rank)
   )`,
]

/** El documento de una identidad de origen, bloqueado hasta el fin de la transacción: `$1` scope, `$2` identidad. */
export const LOCK_DOCUMENT_QUERY = `SELECT document_id, version, content_hash FROM documents
   WHERE scope = $1 AND source_identity = $2 FOR UPDATE`

/** `$1` scope, `$2` identidad, `$3` hash, `$4` metadata JSON. */
export const INSERT_DOCUMENT_QUERY = `INSERT INTO documents (scope, source_identity, version, content_hash, metadata)
   VALUES ($1, $2, 1, $3, $4::jsonb) RETURNING document_id`

/** `$1` documento, `$2` versión nueva, `$3` hash, `$4` metadata JSON. */
export const UPDATE_DOCUMENT_QUERY = `UPDATE documents SET version = $2, content_hash = $3, metadata = $4::jsonb, ingested_at = now()
   WHERE document_id = $1`

/** `$1` documento, `$2` versión, `$3` posición, `$4` texto, `$5` hash. */
export const INSERT_CHUNK_QUERY = `INSERT INTO document_chunks (document_id, version, position, text, content_hash)
   VALUES ($1, $2, $3, $4, $5)`

const SPACE_COLUMNS = 'space_id, model, dimensions, representation, state, created_at, dropped_at'

export const SELECT_SPACE_QUERY = `SELECT ${SPACE_COLUMNS} FROM embedding_spaces WHERE space_id = $1`
export const LOCK_SPACE_QUERY = `${SELECT_SPACE_QUERY} FOR UPDATE`
export const SELECT_ACTIVE_SPACE_QUERY = `SELECT ${SPACE_COLUMNS} FROM embedding_spaces WHERE state = 'active'`

/** `$1` modelo, `$2` dimensión, `$3` representación. */
export const INSERT_SPACE_QUERY = `INSERT INTO embedding_spaces (model, dimensions, representation, state)
   VALUES ($1, $2, $3, 'building') RETURNING ${SPACE_COLUMNS}`

export const RETIRE_ACTIVE_SPACE_QUERY = `UPDATE embedding_spaces SET state = 'retired' WHERE state = 'active' RETURNING space_id`
export const ACTIVATE_SPACE_QUERY = `UPDATE embedding_spaces SET state = 'active' WHERE space_id = $1`
export const MARK_SPACE_DROPPED_QUERY = `UPDATE embedding_spaces SET dropped_at = now() WHERE space_id = $1`

/** `$1` consulta, `$2` espacio, `$3` reranker o NULL, `$4` output JSON. */
export const INSERT_ANALYSIS_RUN_QUERY = `INSERT INTO analysis_runs (input, space_id, corpus_versions, reranker, output)
   VALUES ($1, $2, '[]'::jsonb, $3, $4::jsonb) RETURNING analysis_id`

/** `$1` análisis, `$2` rango, `$3` chunk, `$4` score. */
export const INSERT_ANALYSIS_CANDIDATE_QUERY = `INSERT INTO analysis_candidates (analysis_id, rank, chunk_id, score) VALUES ($1, $2, $3, $4)`

/**
 * Fija las versiones del corpus que usó el análisis a partir de sus
 * candidatos ya insertados: `$1` análisis. Los chunks no cambian después de
 * escribirse, así que el par documento · versión es el de ese momento.
 */
export const FIX_CORPUS_VERSIONS_QUERY = `UPDATE analysis_runs SET corpus_versions = COALESCE((
     SELECT jsonb_agg(jsonb_build_object('documentId', used.document_id, 'version', used.version) ORDER BY used.document_id, used.version)
       FROM (SELECT DISTINCT c.document_id, c.version FROM analysis_candidates a
               JOIN document_chunks c ON c.chunk_id = a.chunk_id WHERE a.analysis_id = $1) AS used
   ), '[]'::jsonb)
   WHERE analysis_id = $1`

export const SELECT_ANALYSIS_RUN_QUERY = `SELECT r.analysis_id, r.input, r.corpus_versions, r.reranker, r.output, r.created_at,
          s.space_id, s.model, s.dimensions, s.representation
     FROM analysis_runs r JOIN embedding_spaces s ON s.space_id = r.space_id
    WHERE r.analysis_id = $1`

export const SELECT_ANALYSIS_CANDIDATES_QUERY = `SELECT a.rank, a.chunk_id, a.score, c.document_id, c.version, c.position, c.text, d.source_identity
     FROM analysis_candidates a
     JOIN document_chunks c ON c.chunk_id = a.chunk_id
     JOIN documents d ON d.document_id = c.document_id
    WHERE a.analysis_id = $1
    ORDER BY a.rank`
