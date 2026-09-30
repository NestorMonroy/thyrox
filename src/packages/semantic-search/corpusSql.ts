/**
 * El SQL del corpus durable (ADR-THYROX-008 1.5.0): el DDL de sus migraciones
 * y las consultas que no dependen de ningún espacio de embeddings. El texto
 * vive en `document_chunks`; nada aquí lee `source_ref` como ruta.
 *
 * La migración 2 creó el corpus con la identidad `scope` · `source_identity`,
 * que llevaba una ruta: dos clones del mismo documento eran dos documentos.
 * La 3 la sustituye por la identidad de dominio `domain` · `scope` ·
 * `domain_id`; la ruta y la revisión pasan a procedencia (`source_ref`,
 * `source_revision`) y no deciden nada. Las filas de la 2 quedan sin mapear
 * (`domain` NULL) con su identidad vieja en `legacy_source_identity` hasta
 * que `reconcileLegacyIdentities` las asigne.
 *
 * La versión 1 era la tabla única `semantic_embeddings` de la superficie
 * anterior, sin texto ni modelo: ya no se declara, así que un ledger que la
 * tenga rehúsa por `assertNoNewerDatabase` en vez de convivir con un esquema
 * que no cumple el requisito de durabilidad.
 */
import type { Migration } from '@thyrox/store/migrations.ts'

export const MIGRATIONS_TABLE = 'semantic_search_migrations'
export const CORPUS_MIGRATION_VERSION = 2
export const CORPUS_MIGRATION_NAME = 'create_durable_corpus'
export const DOMAIN_IDENTITY_MIGRATION_VERSION = 3
export const DOMAIN_IDENTITY_MIGRATION_NAME = 'domain_document_identity'

/**
 * La condición que deja sólo los chunks buscables, sobre los alias `c` (chunk)
 * y `d` (documento): de la versión vigente, canónicos (un duplicado colapsado
 * por la reconciliación conserva su fila, pero no se busca) y de un documento
 * con identidad de dominio. La comparten la búsqueda y el censo de chunks por
 * embeber: lo reemplazado, lo duplicado y lo sin mapear ni se busca ni se
 * re-embebe.
 */
export const SEARCHABLE_CHUNK_CONDITION = 'c.version = d.version AND c.canonical_chunk_id IS NULL AND d.domain IS NOT NULL'

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

/**
 * Pasa `documents` a la identidad de dominio y `document_chunks` a admitir
 * duplicados colapsados. Los nombres de las restricciones que se retiran son
 * los que PostgreSQL derivó de la migración 2.
 */
export const DOMAIN_IDENTITY_STATEMENTS: readonly string[] = [
  `ALTER TABLE documents RENAME COLUMN source_identity TO legacy_source_identity`,
  `ALTER TABLE documents ALTER COLUMN legacy_source_identity DROP NOT NULL`,
  `ALTER TABLE documents DROP CONSTRAINT documents_scope_source_identity_key`,
  `ALTER TABLE documents ADD COLUMN domain TEXT, ADD COLUMN domain_id TEXT, ADD COLUMN source_ref TEXT, ADD COLUMN source_revision TEXT`,
  `UPDATE documents SET source_ref = legacy_source_identity`,
  `ALTER TABLE documents ALTER COLUMN source_ref SET NOT NULL`,
  `ALTER TABLE documents ADD CONSTRAINT documents_domain_identity_complete CHECK ((domain IS NULL) = (domain_id IS NULL))`,
  `ALTER TABLE documents ADD CONSTRAINT documents_unmapped_keeps_legacy_identity CHECK (domain IS NOT NULL OR legacy_source_identity IS NOT NULL)`,
  `ALTER TABLE documents ADD CONSTRAINT documents_domain_identity_key UNIQUE (domain, scope, domain_id)`,
  `ALTER TABLE document_chunks ADD COLUMN canonical_chunk_id UUID REFERENCES document_chunks (chunk_id)`,
  `ALTER TABLE document_chunks DROP CONSTRAINT document_chunks_document_id_version_position_key`,
  `CREATE UNIQUE INDEX document_chunks_canonical_position ON document_chunks (document_id, version, position) WHERE canonical_chunk_id IS NULL`,
]

/** Las migraciones del corpus en el ledger de `@thyrox/store`, en orden; sólo PostgreSQL. */
export const CORPUS_MIGRATIONS: readonly Migration[] = [
  { version: CORPUS_MIGRATION_VERSION, name: CORPUS_MIGRATION_NAME, statements: { postgres: [...CORPUS_STATEMENTS], sqlite: [] } },
  { version: DOMAIN_IDENTITY_MIGRATION_VERSION, name: DOMAIN_IDENTITY_MIGRATION_NAME, statements: { postgres: [...DOMAIN_IDENTITY_STATEMENTS], sqlite: [] } },
]

const DOCUMENT_COLUMNS = 'document_id, domain, scope, domain_id, version, content_hash, source_ref, source_revision, metadata'

/** El documento de una identidad de dominio: `$1` dominio, `$2` scope, `$3` id de dominio. */
export const SELECT_DOCUMENT_QUERY = `SELECT ${DOCUMENT_COLUMNS} FROM documents
   WHERE domain = $1 AND scope = $2 AND domain_id = $3`

/** El mismo documento, bloqueado hasta el fin de la transacción. */
export const LOCK_DOCUMENT_QUERY = `${SELECT_DOCUMENT_QUERY} FOR UPDATE`

/** `$1` dominio, `$2` scope, `$3` id de dominio, `$4` ref, `$5` revisión, `$6` hash, `$7` metadata JSON. */
export const INSERT_DOCUMENT_QUERY = `INSERT INTO documents (domain, scope, domain_id, source_ref, source_revision, version, content_hash, metadata)
   VALUES ($1, $2, $3, $4, $5, 1, $6, $7::jsonb) RETURNING document_id`

/** `$1` documento, `$2` versión nueva, `$3` hash, `$4` metadata JSON, `$5` ref, `$6` revisión. */
export const UPDATE_DOCUMENT_QUERY = `UPDATE documents SET version = $2, content_hash = $3, metadata = $4::jsonb, source_ref = $5, source_revision = $6, ingested_at = now()
   WHERE document_id = $1`

/** Actualiza sólo la procedencia, si cambió: `$1` documento, `$2` ref, `$3` revisión. */
export const UPDATE_PROVENANCE_QUERY = `UPDATE documents SET source_ref = $2, source_revision = $3
   WHERE document_id = $1 AND (source_ref IS DISTINCT FROM $2 OR source_revision IS DISTINCT FROM $3)`

/** El documento ya mapeado a una identidad, como miembro de una convergencia: `$1` dominio, `$2` scope, `$3` id. */
export const LOCK_MAPPED_MEMBER_QUERY = `SELECT document_id, ingested_at FROM documents
   WHERE domain = $1 AND scope = $2 AND domain_id = $3 FOR UPDATE`

/** Los documentos sin identidad de dominio, bloqueados, en orden de ingesta. */
export const LOCK_UNMAPPED_DOCUMENTS_QUERY = `SELECT document_id, scope, legacy_source_identity, ingested_at FROM documents
   WHERE domain IS NULL ORDER BY ingested_at, document_id FOR UPDATE`

/** Las filas de chunk de un documento, duplicados incluidos, en orden de versión y posición: `$1` documento. */
export const SELECT_DOCUMENT_CHUNKS_QUERY = `SELECT chunk_id, version, position, text, canonical_chunk_id FROM document_chunks
   WHERE document_id = $1 ORDER BY version, position, canonical_chunk_id NULLS FIRST`

/** Mueve un chunk a su lugar en el documento convergido: `$1` chunk, `$2` documento, `$3` versión, `$4` canónico o NULL. */
export const MOVE_CHUNK_QUERY = `UPDATE document_chunks SET document_id = $2, version = $3, canonical_chunk_id = $4 WHERE chunk_id = $1`

/** Quita el desplazamiento temporal de las versiones del documento: `$1` documento, `$2` desplazamiento. */
export const SHIFT_VERSIONS_DOWN_QUERY = `UPDATE document_chunks SET version = version - $2 WHERE document_id = $1 AND version > $2`

/**
 * Asigna la identidad de dominio al documento que sobrevive a la convergencia,
 * con la procedencia, la metadata y la fecha del miembro más reciente:
 * `$1` documento, `$2` dominio, `$3` scope, `$4` id, `$5` versión, `$6` hash, `$7` miembro más reciente.
 */
export const CONVERGE_DOCUMENT_QUERY = `UPDATE documents AS t
      SET domain = $2, scope = $3, domain_id = $4, version = $5, content_hash = $6, metadata = s.metadata,
          ingested_at = s.ingested_at, source_ref = s.source_ref, source_revision = s.source_revision, legacy_source_identity = NULL
     FROM documents AS s
    WHERE t.document_id = $1 AND s.document_id = $7`

/** `$1` documento absorbido, ya sin chunks. */
export const DELETE_DOCUMENT_QUERY = `DELETE FROM documents WHERE document_id = $1`

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
 * Las versiones del corpus que citan los candidatos del análisis `analysisId`
 * (una expresión SQL): el par documento · versión de cada chunk citado.
 */
function corpusVersionsOf(analysisId: string): string {
  return `COALESCE((
     SELECT jsonb_agg(jsonb_build_object('documentId', used.document_id, 'version', used.version) ORDER BY used.document_id, used.version)
       FROM (SELECT DISTINCT c.document_id, c.version FROM analysis_candidates a
               JOIN document_chunks c ON c.chunk_id = a.chunk_id WHERE a.analysis_id = ${analysisId}) AS used
   ), '[]'::jsonb)`
}

/**
 * Fija las versiones del corpus que usó el análisis a partir de sus
 * candidatos ya insertados: `$1` análisis. Los chunks no cambian de texto
 * después de escribirse, así que el par documento · versión es el de ese momento.
 */
export const FIX_CORPUS_VERSIONS_QUERY = `UPDATE analysis_runs SET corpus_versions = ${corpusVersionsOf('$1')}
   WHERE analysis_id = $1`

/**
 * Recalcula las versiones de corpus de todo análisis que cite un chunk del
 * documento `$1`: la convergencia renumera versiones y absorbe documentos,
 * y un análisis no puede quedar citando un par que ya no existe.
 */
export const REFRESH_CORPUS_VERSIONS_QUERY = `UPDATE analysis_runs AS r SET corpus_versions = ${corpusVersionsOf('r.analysis_id')}
   WHERE r.analysis_id IN (SELECT a.analysis_id FROM analysis_candidates a
                             JOIN document_chunks c ON c.chunk_id = a.chunk_id WHERE c.document_id = $1)`

export const SELECT_ANALYSIS_RUN_QUERY = `SELECT r.analysis_id, r.input, r.corpus_versions, r.reranker, r.output, r.created_at,
          s.space_id, s.model, s.dimensions, s.representation
     FROM analysis_runs r JOIN embedding_spaces s ON s.space_id = r.space_id
    WHERE r.analysis_id = $1`

export const SELECT_ANALYSIS_CANDIDATES_QUERY = `SELECT a.rank, a.chunk_id, a.score, c.document_id, c.version, c.position, c.text,
          d.domain, d.domain_id, d.source_ref, d.source_revision
     FROM analysis_candidates a
     JOIN document_chunks c ON c.chunk_id = a.chunk_id
     JOIN documents d ON d.document_id = c.document_id
    WHERE a.analysis_id = $1
    ORDER BY a.rank`
