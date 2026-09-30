/**
 * La ingesta del corpus durable: un documento es su identidad de dominio
 * (`domain` · `scope` · `domainId`) y una secuencia de versiones de chunks. El
 * hash del contenido decide si una reingesta es la misma versión; todo
 * ocurre en una transacción con el documento bloqueado.
 *
 * `sourceRef` y `sourceRevision` son procedencia (ruta de un clon, commit,
 * URL, …): se guardan y se actualizan, pero no deciden identidad ni versión,
 * y nunca se abren: el contenido llega entero en `chunks`. No hay edición de
 * chunks: una corrección llega por reingesta, como versión nueva.
 */
import type { SQL } from 'bun'

import { readJson } from '@thyrox/store/sql.ts'

import { chunkHash, documentHash } from './contentHash.ts'
import {
  INSERT_CHUNK_QUERY,
  INSERT_DOCUMENT_QUERY,
  LOCK_DOCUMENT_QUERY,
  SELECT_DOCUMENT_QUERY,
  UPDATE_DOCUMENT_QUERY,
  UPDATE_PROVENANCE_QUERY,
} from './corpusSql.ts'
import { InvalidCorpusInputError } from './errors.ts'

export type Metadata = Record<string, unknown>

/** El scope de un dominio cuyos ids son únicos en todo el dominio (findings: `H-<PREFIJO>-NNN`). */
export const DOMAIN_WIDE_SCOPE = ''

/** La identidad de un documento; sin `scope`, la del dominio entero. */
export type DocumentIdentity = { domain: string; scope?: string; domainId: string }

export type DocumentInput = DocumentIdentity & {
  sourceRef: string
  sourceRevision: string | null
  metadata: Metadata
  chunks: readonly string[]
}

/** `created`: primera versión · `new-version`: el hash cambió · `unchanged`: mismo contenido, a lo sumo procedencia nueva. */
export type IngestStatus = 'created' | 'new-version' | 'unchanged'

export type IngestResult = { status: IngestStatus; documentId: string; version: number }

/** Un documento ingerido con su versión y hash vigentes. */
export type StoredDocument = {
  documentId: string
  domain: string
  scope: string
  domainId: string
  version: number
  contentHash: string
  sourceRef: string
  sourceRevision: string | null
  metadata: Metadata
}

type DocumentRow = {
  document_id: string
  domain: string
  scope: string
  domain_id: string
  version: number
  content_hash: string
  source_ref: string
  source_revision: string | null
  metadata: unknown
}

type Transaction = Pick<SQL, 'unsafe'>

function isBlank(value: string): boolean {
  return value.trim() === ''
}

/** `DOMAIN_WIDE_SCOPE` o un scope con contenido; nunca sólo espacios. */
function isValidScope(scope: string): boolean {
  return scope === DOMAIN_WIDE_SCOPE || !isBlank(scope)
}

export function scopeOf(identity: DocumentIdentity): string {
  return identity.scope ?? DOMAIN_WIDE_SCOPE
}

export function assertValidIdentity(identity: DocumentIdentity): void {
  if (isBlank(identity.domain)) throw new InvalidCorpusInputError('document domain must be a non-empty string')
  if (isBlank(identity.domainId)) throw new InvalidCorpusInputError('document domainId must be a non-empty string')
  if (!isValidScope(scopeOf(identity))) throw new InvalidCorpusInputError(`document scope must be '' or a non-blank string, got '${identity.scope}'`)
}

function assertValidDocument(input: DocumentInput): void {
  assertValidIdentity(input)
  if (isBlank(input.sourceRef)) throw new InvalidCorpusInputError(`document '${input.domainId}' needs a non-empty sourceRef`)
  if (input.chunks.length === 0) throw new InvalidCorpusInputError(`document '${input.domainId}' has no chunks`)
}

function identityParameters(identity: DocumentIdentity): string[] {
  return [identity.domain, scopeOf(identity), identity.domainId]
}

function isSameContent(existing: DocumentRow, contentHash: string): boolean {
  return existing.content_hash === contentHash
}

function toStoredDocument(row: DocumentRow): StoredDocument {
  return {
    documentId: row.document_id,
    domain: row.domain,
    scope: row.scope,
    domainId: row.domain_id,
    version: row.version,
    contentHash: row.content_hash,
    sourceRef: row.source_ref,
    sourceRevision: row.source_revision,
    metadata: readJson(row.metadata),
  }
}

async function insertChunks(tx: Transaction, documentId: string, version: number, chunks: readonly string[]): Promise<void> {
  for (const [position, text] of chunks.entries()) {
    await tx.unsafe(INSERT_CHUNK_QUERY, [documentId, version, position, text, chunkHash(text)])
  }
}

async function createDocument(tx: Transaction, input: DocumentInput, contentHash: string): Promise<IngestResult> {
  const parameters = [...identityParameters(input), input.sourceRef, input.sourceRevision, contentHash, JSON.stringify(input.metadata)]
  const [row] = (await tx.unsafe(INSERT_DOCUMENT_QUERY, parameters)) as { document_id: string }[]
  if (!row) throw new Error(`inserting document '${input.domain}:${input.domainId}' returned no row`)
  await insertChunks(tx, row.document_id, 1, input.chunks)
  return { status: 'created', documentId: row.document_id, version: 1 }
}

async function addVersion(tx: Transaction, existing: DocumentRow, input: DocumentInput, contentHash: string): Promise<IngestResult> {
  const version = existing.version + 1
  await tx.unsafe(UPDATE_DOCUMENT_QUERY, [existing.document_id, version, contentHash, JSON.stringify(input.metadata), input.sourceRef, input.sourceRevision])
  await insertChunks(tx, existing.document_id, version, input.chunks)
  return { status: 'new-version', documentId: existing.document_id, version }
}

async function keepVersion(tx: Transaction, existing: DocumentRow, input: DocumentInput): Promise<IngestResult> {
  await tx.unsafe(UPDATE_PROVENANCE_QUERY, [existing.document_id, input.sourceRef, input.sourceRevision])
  return { status: 'unchanged', documentId: existing.document_id, version: existing.version }
}

/**
 * Ingiere un documento. Misma identidad y mismo hash: `unchanged`, sin
 * versión ni chunks nuevos —sólo la procedencia, si cambió—. Hash distinto:
 * versión nueva con sus chunks, y la anterior deja de ser buscable (su texto
 * se conserva para los análisis).
 */
export async function ingestDocument(sql: SQL, input: DocumentInput): Promise<IngestResult> {
  assertValidDocument(input)
  const contentHash = documentHash(input.chunks)
  return sql.begin(async tx => {
    const [existing] = (await tx.unsafe(LOCK_DOCUMENT_QUERY, identityParameters(input))) as DocumentRow[]
    if (!existing) return createDocument(tx, input, contentHash)
    if (isSameContent(existing, contentHash)) return keepVersion(tx, existing, input)
    return addVersion(tx, existing, input, contentHash)
  })
}

/** El documento ingerido con esa identidad, o `null`: una fila sin mapear nunca se devuelve. */
export async function findDocument(sql: SQL, identity: DocumentIdentity): Promise<StoredDocument | null> {
  assertValidIdentity(identity)
  const [row] = (await sql.unsafe(SELECT_DOCUMENT_QUERY, identityParameters(identity))) as DocumentRow[]
  return row ? toStoredDocument(row) : null
}
