/**
 * La ingesta del corpus durable: un documento es su identidad de origen
 * (`scope` · `sourceIdentity`) y una secuencia de versiones de chunks. El
 * hash del contenido decide si una reingesta es la misma versión; todo
 * ocurre en una transacción con el documento bloqueado.
 *
 * `sourceIdentity` es texto para trazar (repo@commit:ruta, URL, …) y nunca se
 * abre: el contenido llega entero en `chunks`. No hay edición de chunks: una
 * corrección llega por reingesta, como versión nueva.
 */
import type { SQL } from 'bun'

import { chunkHash, documentHash } from './contentHash.ts'
import { INSERT_CHUNK_QUERY, INSERT_DOCUMENT_QUERY, LOCK_DOCUMENT_QUERY, UPDATE_DOCUMENT_QUERY } from './corpusSql.ts'
import { InvalidCorpusInputError } from './errors.ts'

export type Metadata = Record<string, unknown>

export type DocumentInput = { scope: string; sourceIdentity: string; metadata: Metadata; chunks: readonly string[] }

/** `created`: primera versión · `new-version`: el hash cambió · `unchanged`: no se escribió nada. */
export type IngestStatus = 'created' | 'new-version' | 'unchanged'

export type IngestResult = { status: IngestStatus; documentId: string; version: number }

type LockedDocument = { document_id: string; version: number; content_hash: string }

type Transaction = Pick<SQL, 'unsafe'>

function assertValidDocument(input: DocumentInput): void {
  if (!input.scope.trim()) throw new InvalidCorpusInputError('document scope must be a non-empty string')
  if (!input.sourceIdentity.trim()) throw new InvalidCorpusInputError('document sourceIdentity must be a non-empty string')
  if (input.chunks.length === 0) throw new InvalidCorpusInputError(`document '${input.sourceIdentity}' has no chunks`)
}

function isSameContent(existing: LockedDocument, contentHash: string): boolean {
  return existing.content_hash === contentHash
}

async function insertChunks(tx: Transaction, documentId: string, version: number, chunks: readonly string[]): Promise<void> {
  for (const [position, text] of chunks.entries()) {
    await tx.unsafe(INSERT_CHUNK_QUERY, [documentId, version, position, text, chunkHash(text)])
  }
}

async function createDocument(tx: Transaction, input: DocumentInput, contentHash: string): Promise<IngestResult> {
  const [row] = (await tx.unsafe(INSERT_DOCUMENT_QUERY, [input.scope, input.sourceIdentity, contentHash, JSON.stringify(input.metadata)])) as {
    document_id: string
  }[]
  if (!row) throw new Error(`inserting document '${input.sourceIdentity}' returned no row`)
  await insertChunks(tx, row.document_id, 1, input.chunks)
  return { status: 'created', documentId: row.document_id, version: 1 }
}

async function addVersion(tx: Transaction, existing: LockedDocument, input: DocumentInput, contentHash: string): Promise<IngestResult> {
  const version = existing.version + 1
  await tx.unsafe(UPDATE_DOCUMENT_QUERY, [existing.document_id, version, contentHash, JSON.stringify(input.metadata)])
  await insertChunks(tx, existing.document_id, version, input.chunks)
  return { status: 'new-version', documentId: existing.document_id, version }
}

/**
 * Ingiere un documento. Mismo origen y mismo hash: `unchanged`, sin escribir
 * nada —tampoco la metadata—. Hash distinto: versión nueva con sus chunks, y
 * la anterior deja de ser buscable (su texto se conserva para los análisis).
 */
export async function ingestDocument(sql: SQL, input: DocumentInput): Promise<IngestResult> {
  assertValidDocument(input)
  const contentHash = documentHash(input.chunks)
  return sql.begin(async tx => {
    const [existing] = (await tx.unsafe(LOCK_DOCUMENT_QUERY, [input.scope, input.sourceIdentity])) as LockedDocument[]
    if (!existing) return createDocument(tx, input, contentHash)
    if (isSameContent(existing, contentHash)) return { status: 'unchanged', documentId: existing.document_id, version: existing.version }
    return addVersion(tx, existing, input, contentHash)
  })
}
