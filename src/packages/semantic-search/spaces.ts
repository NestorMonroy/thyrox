/**
 * Los espacios de embeddings: cada par modelo · forma es un espacio con su
 * tabla e índice. Se crea en `building`, se embebe desde los chunks
 * persistidos, se activa (el activo anterior pasa a `retired` en la misma
 * transacción) y sólo retirado puede borrarse su tabla. Borrar un espacio no
 * toca documentos, chunks ni análisis: su fila se conserva, marcada con
 * `dropped_at`, porque los análisis la citan.
 */
import type { SQL } from 'bun'

import { type EmbeddingShape, type Representation, type SpaceState, validateEmbedding, validateEmbeddingShape } from './config.ts'
import {
  ACTIVATE_SPACE_QUERY,
  INSERT_SPACE_QUERY,
  LOCK_SPACE_QUERY,
  MARK_SPACE_DROPPED_QUERY,
  RETIRE_ACTIVE_SPACE_QUERY,
  SELECT_ACTIVE_SPACE_QUERY,
  SELECT_SPACE_QUERY,
} from './corpusSql.ts'
import { EmbeddingSpaceStateError, InvalidCorpusInputError, UnknownEmbeddingSpaceError } from './errors.ts'
import { chunksWithoutEmbeddingQuery, createSpaceTableStatements, dropSpaceTableStatement, putEmbeddingQuery } from './vectorSql.ts'

export type EmbeddingSpace = EmbeddingShape & {
  spaceId: number
  model: string
  state: SpaceState
  createdAt: string
  droppedAt: string | null
}

export type SpaceDeclaration = EmbeddingShape & { model: string }

/** Un chunk vigente sin vector en un espacio, con el texto persistido que hay que embeber. */
export type PendingChunk = { chunkId: string; documentId: string; version: number; position: number; text: string }

export type ChunkEmbedding = { chunkId: string; embedding: readonly number[] }

/** El espacio activado y el que retiró, si había uno. */
export type Activation = { activated: number; retired: number | null }

type Transaction = Pick<SQL, 'unsafe'>

type SpaceRow = {
  space_id: number
  model: string
  dimensions: number
  representation: Representation
  state: SpaceState
  created_at: Date
  dropped_at: Date | null
}

type PendingRow = { chunk_id: string; document_id: string; version: number; position: number; text: string }

function toSpace(row: SpaceRow): EmbeddingSpace {
  return {
    spaceId: row.space_id,
    model: row.model,
    dimensions: row.dimensions,
    representation: row.representation,
    state: row.state,
    createdAt: row.created_at.toISOString(),
    droppedAt: row.dropped_at?.toISOString() ?? null,
  }
}

function isDropped(space: EmbeddingSpace): boolean {
  return space.droppedAt !== null
}

function isWritable(space: EmbeddingSpace): boolean {
  return space.state !== 'retired'
}

function isDroppable(space: EmbeddingSpace): boolean {
  return space.state === 'retired' && !isDropped(space)
}

function vectorLiteral(embedding: readonly number[]): string {
  return JSON.stringify(embedding)
}

async function readSpace(tx: Transaction, query: string, spaceId: number): Promise<EmbeddingSpace> {
  const [row] = (await tx.unsafe(query, [spaceId])) as SpaceRow[]
  if (!row) throw new UnknownEmbeddingSpaceError(spaceId)
  return toSpace(row)
}

export async function getEmbeddingSpace(sql: SQL, spaceId: number): Promise<EmbeddingSpace | null> {
  const [row] = (await sql.unsafe(SELECT_SPACE_QUERY, [spaceId])) as SpaceRow[]
  return row ? toSpace(row) : null
}

export async function activeEmbeddingSpace(sql: SQL): Promise<EmbeddingSpace | null> {
  const [row] = (await sql.unsafe(SELECT_ACTIVE_SPACE_QUERY)) as SpaceRow[]
  return row ? toSpace(row) : null
}

/** Crea el espacio en `building` con su tabla e índice, en una transacción. */
export async function createEmbeddingSpace(sql: SQL, extensionSchema: string, declaration: SpaceDeclaration): Promise<EmbeddingSpace> {
  if (!declaration.model.trim()) throw new InvalidCorpusInputError('embedding space model must be a non-empty string')
  const shape = validateEmbeddingShape({ dimensions: declaration.dimensions, representation: declaration.representation })
  return sql.begin(async tx => {
    const [row] = (await tx.unsafe(INSERT_SPACE_QUERY, [declaration.model, shape.dimensions, shape.representation])) as SpaceRow[]
    if (!row) throw new Error(`creating embedding space for model '${declaration.model}' returned no row`)
    for (const statement of createSpaceTableStatements(extensionSchema, row.space_id, shape)) await tx.unsafe(statement)
    return toSpace(row)
  })
}

/** Los chunks vigentes que aún no tienen vector en el espacio. */
export async function chunksWithoutEmbedding(sql: SQL, spaceId: number, limit: number): Promise<PendingChunk[]> {
  const space = await readSpace(sql, SELECT_SPACE_QUERY, spaceId)
  if (isDropped(space)) throw new EmbeddingSpaceStateError(spaceId, 'dropped', 'list chunks without embedding')
  const rows = (await sql.unsafe(chunksWithoutEmbeddingQuery(spaceId), [limit])) as PendingRow[]
  return rows.map(row => ({ chunkId: row.chunk_id, documentId: row.document_id, version: row.version, position: row.position, text: row.text }))
}

/** Escribe vectores en un espacio no retirado, validando cada uno contra su dimensión, en una transacción. */
export async function putEmbeddings(sql: SQL, extensionSchema: string, spaceId: number, embeddings: readonly ChunkEmbedding[]): Promise<void> {
  await sql.begin(async tx => {
    const space = await readSpace(tx, `${SELECT_SPACE_QUERY} FOR SHARE`, spaceId)
    if (!isWritable(space)) throw new EmbeddingSpaceStateError(spaceId, space.state, 'write embeddings')
    for (const { embedding } of embeddings) validateEmbedding(embedding, space.dimensions)
    const query = putEmbeddingQuery(extensionSchema, spaceId, space)
    for (const { chunkId, embedding } of embeddings) await tx.unsafe(query, [chunkId, vectorLiteral(embedding)])
  })
}

/** Activa el espacio; el activo anterior pasa a `retired` en la misma transacción. */
export async function activateSpace(sql: SQL, spaceId: number): Promise<Activation> {
  return sql.begin(async tx => {
    const space = await readSpace(tx, LOCK_SPACE_QUERY, spaceId)
    if (space.state === 'active') return { activated: spaceId, retired: null }
    if (!isWritable(space)) throw new EmbeddingSpaceStateError(spaceId, space.state, 'activate')
    const [retired] = (await tx.unsafe(RETIRE_ACTIVE_SPACE_QUERY)) as { space_id: number }[]
    await tx.unsafe(ACTIVATE_SPACE_QUERY, [spaceId])
    return { activated: spaceId, retired: retired?.space_id ?? null }
  })
}

/** Borra la tabla de un espacio retirado; conserva su fila y todo el corpus. */
export async function dropSpace(sql: SQL, spaceId: number): Promise<void> {
  await sql.begin(async tx => {
    const space = await readSpace(tx, LOCK_SPACE_QUERY, spaceId)
    if (!isDroppable(space)) throw new EmbeddingSpaceStateError(spaceId, isDropped(space) ? 'dropped' : space.state, 'drop')
    await tx.unsafe(dropSpaceTableStatement(spaceId))
    await tx.unsafe(MARK_SPACE_DROPPED_QUERY, [spaceId])
  })
}
