/**
 * Escribe un corpus con la forma de la migración 2 —identidad `scope` ·
 * `source_identity`— directamente en SQL, como lo dejó la implementación
 * anterior: la migración 3 y la reconciliación se prueban sobre esas filas,
 * no sobre filas fabricadas con la API nueva.
 */
import type { SQL } from 'bun'

import { runMigrations } from '@thyrox/store/migrations.ts'

import { chunkHash, documentHash } from '../../contentHash.ts'
import { CORPUS_MIGRATIONS, MIGRATIONS_TABLE } from '../../corpusSql.ts'

const LEGACY_MIGRATION_COUNT = 1

export type LegacyDocument = { scope: string; sourceIdentity: string; versions: readonly (readonly string[])[]; ingestedAt: string }

/** Chunks escritos por versión: `chunkIds[v - 1][posición]`. */
export type LegacyRows = { documentId: string; chunkIds: string[][] }

/** Aplica sólo la migración 2 del corpus: el esquema tal como estaba antes de la identidad de dominio. */
export async function migrateToLegacySchema(sql: SQL): Promise<void> {
  await runMigrations(sql, 'postgres', { table: MIGRATIONS_TABLE, migrations: CORPUS_MIGRATIONS.slice(0, LEGACY_MIGRATION_COUNT) })
}

/** Inserta un documento con la identidad vieja y todas sus versiones de chunks. */
export async function insertLegacyDocument(sql: SQL, document: LegacyDocument): Promise<LegacyRows> {
  const current = document.versions.at(-1) ?? []
  const [row] = (await sql.unsafe(
    `INSERT INTO documents (scope, source_identity, version, content_hash, metadata, ingested_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz) RETURNING document_id`,
    [document.scope, document.sourceIdentity, document.versions.length, documentHash(current), JSON.stringify({ origin: document.sourceIdentity }), document.ingestedAt],
  )) as { document_id: string }[]
  if (!row) throw new Error(`inserting legacy document '${document.sourceIdentity}' returned no row`)
  const chunkIds: string[][] = []
  for (const [index, chunks] of document.versions.entries()) {
    const ids: string[] = []
    for (const [position, text] of chunks.entries()) {
      const [chunk] = (await sql.unsafe(
        `INSERT INTO document_chunks (document_id, version, position, text, content_hash) VALUES ($1, $2, $3, $4, $5) RETURNING chunk_id`,
        [row.document_id, index + 1, position, text, chunkHash(text)],
      )) as { chunk_id: string }[]
      if (!chunk) throw new Error(`inserting legacy chunk of '${document.sourceIdentity}' returned no row`)
      ids.push(chunk.chunk_id)
    }
    chunkIds.push(ids)
  }
  return { documentId: row.document_id, chunkIds }
}

/** Un análisis de la forma v2 que cita `chunkIds` en orden, con sus versiones de corpus fijadas por SQL. */
export async function insertLegacyAnalysisRun(sql: SQL, chunkIds: readonly string[]): Promise<string> {
  const [space] = (await sql.unsafe(
    `INSERT INTO embedding_spaces (model, dimensions, representation, state) VALUES ('legacy', 4, 'vector', 'retired') RETURNING space_id`,
  )) as { space_id: number }[]
  const [run] = (await sql.unsafe(
    `INSERT INTO analysis_runs (input, space_id, corpus_versions, output) VALUES ('legacy query', $1, '[]'::jsonb, '{}'::jsonb) RETURNING analysis_id`,
    [space?.space_id],
  )) as { analysis_id: string }[]
  if (!run) throw new Error('inserting legacy analysis run returned no row')
  for (const [rank, chunkId] of chunkIds.entries()) {
    await sql.unsafe(`INSERT INTO analysis_candidates (analysis_id, rank, chunk_id, score) VALUES ($1, $2, $3, 1)`, [run.analysis_id, rank, chunkId])
  }
  await sql.unsafe(
    `UPDATE analysis_runs SET corpus_versions = (
       SELECT jsonb_agg(jsonb_build_object('documentId', used.document_id, 'version', used.version) ORDER BY used.document_id, used.version)
         FROM (SELECT DISTINCT c.document_id, c.version FROM analysis_candidates a
                 JOIN document_chunks c ON c.chunk_id = a.chunk_id WHERE a.analysis_id = $1) AS used)
     WHERE analysis_id = $1`,
    [run.analysis_id],
  )
  return run.analysis_id
}

/** El texto de los candidatos de un análisis en orden de rango, leído por SQL (válido en v2 y en v3). */
export async function candidateTexts(sql: SQL, analysisId: string): Promise<string[]> {
  const rows = (await sql.unsafe(
    `SELECT c.text FROM analysis_candidates a JOIN document_chunks c ON c.chunk_id = a.chunk_id WHERE a.analysis_id = $1 ORDER BY a.rank`,
    [analysisId],
  )) as { text: string }[]
  return rows.map(row => row.text)
}

export async function allChunkIds(sql: SQL): Promise<string[]> {
  const rows = (await sql.unsafe('SELECT chunk_id FROM document_chunks ORDER BY chunk_id')) as { chunk_id: string }[]
  return rows.map(row => row.chunk_id)
}
