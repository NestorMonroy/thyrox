/**
 * Los análisis persistidos: el resultado de una ejecución concreta queda
 * guardado, no sólo reproducible. Un análisis cita chunks con su versión, y
 * esos chunks no se borran (la clave foránea lo impone), así que leerlo
 * después de reingerir o de retirar su espacio devuelve el mismo texto.
 *
 * El store no reordena por modelo: `reranker` y `output` los aporta quien
 * llama y se guardan tal cual.
 */
import type { SQL } from 'bun'

import { readJson } from '@thyrox/store/sql.ts'

import type { EmbeddingShape, Representation } from './config.ts'
import type { Metadata } from './corpus.ts'
import {
  FIX_CORPUS_VERSIONS_QUERY,
  INSERT_ANALYSIS_CANDIDATE_QUERY,
  INSERT_ANALYSIS_RUN_QUERY,
  SELECT_ANALYSIS_CANDIDATES_QUERY,
  SELECT_ANALYSIS_RUN_QUERY,
} from './corpusSql.ts'
import { InvalidCorpusInputError } from './errors.ts'

export type AnalysisCandidateInput = { chunkId: string; score: number }

export type AnalysisRunInput = {
  input: string
  spaceId: number
  candidates: readonly AnalysisCandidateInput[]
  reranker?: string
  output: Metadata
}

export type AnalysisCandidate = {
  rank: number
  chunkId: string
  score: number
  documentId: string
  domain: string | null
  domainId: string | null
  sourceRef: string
  sourceRevision: string | null
  version: number
  position: number
  text: string
}

export type CorpusVersion = { documentId: string; version: number }

export type AnalysisRun = {
  analysisId: string
  input: string
  space: EmbeddingShape & { spaceId: number; model: string }
  corpusVersions: CorpusVersion[]
  candidates: AnalysisCandidate[]
  reranker: string | null
  output: Metadata
  createdAt: string
}

type RunRow = {
  analysis_id: string
  input: string
  corpus_versions: unknown
  reranker: string | null
  output: unknown
  created_at: Date
  space_id: number
  model: string
  dimensions: number
  representation: Representation
}

type CandidateRow = {
  rank: number
  chunk_id: string
  score: number
  document_id: string
  version: number
  position: number
  text: string
  domain: string | null
  domain_id: string | null
  source_ref: string
  source_revision: string | null
}

function assertFiniteScores(candidates: readonly AnalysisCandidateInput[]): void {
  const invalid = candidates.find(candidate => !Number.isFinite(candidate.score))
  if (invalid) throw new InvalidCorpusInputError(`analysis candidate ${invalid.chunkId} has a non-finite score`)
}

function toCandidate(row: CandidateRow): AnalysisCandidate {
  return {
    rank: row.rank,
    chunkId: row.chunk_id,
    score: row.score,
    documentId: row.document_id,
    domain: row.domain,
    domainId: row.domain_id,
    sourceRef: row.source_ref,
    sourceRevision: row.source_revision,
    version: row.version,
    position: row.position,
    text: row.text,
  }
}

/** Guarda el análisis con sus candidatos en orden y las versiones del corpus que usaron; devuelve su id. */
export async function recordAnalysisRun(sql: SQL, run: AnalysisRunInput): Promise<string> {
  assertFiniteScores(run.candidates)
  return sql.begin(async tx => {
    const [row] = (await tx.unsafe(INSERT_ANALYSIS_RUN_QUERY, [run.input, run.spaceId, run.reranker ?? null, JSON.stringify(run.output)])) as {
      analysis_id: string
    }[]
    if (!row) throw new Error('inserting analysis run returned no row')
    for (const [rank, candidate] of run.candidates.entries()) {
      await tx.unsafe(INSERT_ANALYSIS_CANDIDATE_QUERY, [row.analysis_id, rank, candidate.chunkId, candidate.score])
    }
    await tx.unsafe(FIX_CORPUS_VERSIONS_QUERY, [row.analysis_id])
    return row.analysis_id
  })
}

/** El análisis guardado con el texto de sus candidatos, o `null` si el id no existe. */
export async function getAnalysisRun(sql: SQL, analysisId: string): Promise<AnalysisRun | null> {
  const [run] = (await sql.unsafe(SELECT_ANALYSIS_RUN_QUERY, [analysisId])) as RunRow[]
  if (!run) return null
  const candidates = (await sql.unsafe(SELECT_ANALYSIS_CANDIDATES_QUERY, [analysisId])) as CandidateRow[]
  return {
    analysisId: run.analysis_id,
    input: run.input,
    space: { spaceId: run.space_id, model: run.model, dimensions: run.dimensions, representation: run.representation },
    corpusVersions: readJson(run.corpus_versions) as unknown as CorpusVersion[],
    candidates: candidates.map(toCandidate),
    reranker: run.reranker,
    output: readJson(run.output),
    createdAt: run.created_at.toISOString(),
  }
}
