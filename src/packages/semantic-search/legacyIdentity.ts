/**
 * La reconciliación de las filas escritas con la identidad vieja
 * (`scope` · `source_identity`, migración 2) hacia la identidad de dominio.
 * Quien llama aporta el resolver: el store no sabe qué dominio es cada ruta.
 *
 * Lo que el resolver no mapea sigue sin mapear (ni se busca ni cuenta como
 * ingerido) y se cuenta. Los documentos que mapean a la misma identidad
 * —incluido uno ya ingerido con la API nueva— convergen en uno: sus versiones
 * se encadenan en orden de `ingested_at`, y una versión con el mismo hash que
 * la inmediatamente anterior colapsa en ella (sus chunks quedan como
 * duplicados de los canónicos). Ningún `chunk_id` cambia, así que ningún
 * análisis pierde su chunk; las versiones de corpus que citan los análisis se
 * recalculan en la misma transacción.
 */
import type { SQL } from 'bun'

import { assertValidIdentity } from './corpus.ts'
import { documentHash } from './contentHash.ts'
import {
  CONVERGE_DOCUMENT_QUERY,
  DELETE_DOCUMENT_QUERY,
  LOCK_MAPPED_MEMBER_QUERY,
  LOCK_UNMAPPED_DOCUMENTS_QUERY,
  MOVE_CHUNK_QUERY,
  REFRESH_CORPUS_VERSIONS_QUERY,
  SELECT_DOCUMENT_CHUNKS_QUERY,
  SHIFT_VERSIONS_DOWN_QUERY,
} from './corpusSql.ts'

/** La identidad de dominio completa, con el scope explícito. */
export type DomainIdentity = { domain: string; scope: string; domainId: string }

/** Traduce una identidad vieja a la de dominio, o `null` si no la reconoce. */
export type LegacyIdentityResolver = (scope: string, sourceIdentity: string) => DomainIdentity | null | Promise<DomainIdentity | null>

/** `mapped`: filas viejas asignadas · `unmapped`: las que siguen sin mapear · `documents`: identidades resultantes. */
export type ReconciliationResult = { mapped: number; unmapped: number; documents: number }

type Transaction = Pick<SQL, 'unsafe'>

type UnmappedRow = { document_id: string; scope: string; legacy_source_identity: string; ingested_at: Date }

type Member = { documentId: string; ingestedAt: Date }

type ChunkRow = { chunk_id: string; version: number; position: number; text: string; canonical_chunk_id: string | null }

/** Una versión guardada de un miembro: todas sus filas, duplicados incluidos. */
type StoredVersion = { rows: ChunkRow[]; hash: string }

/** Una versión del documento convergido: su número, su hash y sus chunks canónicos por posición. */
type ConvergedVersion = { number: number; hash: string; canonicalIds: string[] }

type ChunkMove = { chunkId: string; version: number; canonicalChunkId: string | null }

type ConvergencePlan = { moves: ChunkMove[]; current: ConvergedVersion }

function identityKey(identity: DomainIdentity): string {
  return JSON.stringify([identity.domain, identity.scope, identity.domainId])
}

function isCanonical(row: ChunkRow): boolean {
  return row.canonical_chunk_id === null
}

function byIngestion(left: Member, right: Member): number {
  return left.ingestedAt.getTime() - right.ingestedAt.getTime() || left.documentId.localeCompare(right.documentId)
}

/** Agrupa las filas de un documento por versión, en orden, con el hash de sus chunks canónicos. */
function groupVersions(rows: readonly ChunkRow[]): StoredVersion[] {
  const byVersion = new Map<number, ChunkRow[]>()
  for (const row of rows) byVersion.set(row.version, [...(byVersion.get(row.version) ?? []), row])
  return [...byVersion.values()].map(versionRows => ({
    rows: versionRows,
    hash: documentHash(versionRows.filter(isCanonical).map(row => row.text)),
  }))
}

/** Una versión que repite el hash de la anterior se vuelve duplicado de sus chunks canónicos. */
function collapseInto(previous: ConvergedVersion, stored: StoredVersion): ChunkMove[] {
  return stored.rows.map(row => ({ chunkId: row.chunk_id, version: previous.number, canonicalChunkId: previous.canonicalIds[row.position] ?? null }))
}

function appendVersion(number: number, stored: StoredVersion): { moves: ChunkMove[]; version: ConvergedVersion } {
  const moves = stored.rows.map(row => ({ chunkId: row.chunk_id, version: number, canonicalChunkId: row.canonical_chunk_id }))
  const canonicalIds = stored.rows.filter(isCanonical).map(row => row.chunk_id)
  return { moves, version: { number, hash: stored.hash, canonicalIds } }
}

/** Encadena las versiones de los miembros, ya en orden de ingesta, en una sola secuencia. */
function planConvergence(versions: readonly StoredVersion[]): ConvergencePlan {
  const moves: ChunkMove[] = []
  let current: ConvergedVersion | undefined
  for (const stored of versions) {
    if (current && current.hash === stored.hash) {
      moves.push(...collapseInto(current, stored))
      continue
    }
    const appended = appendVersion((current?.number ?? 0) + 1, stored)
    moves.push(...appended.moves)
    current = appended.version
  }
  if (!current) throw new Error('converging documents without chunk versions')
  return { moves, current }
}

async function readChunkRows(tx: Transaction, documentId: string): Promise<ChunkRow[]> {
  return (await tx.unsafe(SELECT_DOCUMENT_CHUNKS_QUERY, [documentId])) as ChunkRow[]
}

async function lockMappedMember(tx: Transaction, identity: DomainIdentity): Promise<Member | null> {
  const [row] = (await tx.unsafe(LOCK_MAPPED_MEMBER_QUERY, [identity.domain, identity.scope, identity.domainId])) as { document_id: string; ingested_at: Date }[]
  return row ? { documentId: row.document_id, ingestedAt: row.ingested_at } : null
}

/**
 * Mueve cada chunk a su versión final pasando por un desplazamiento mayor que
 * toda versión existente: la unicidad de posición por versión nunca ve dos
 * canónicos en el mismo sitio a mitad de la renumeración.
 */
async function applyMoves(tx: Transaction, target: string, moves: readonly ChunkMove[], offset: number): Promise<void> {
  for (const move of moves) await tx.unsafe(MOVE_CHUNK_QUERY, [move.chunkId, target, move.version + offset, move.canonicalChunkId])
  await tx.unsafe(SHIFT_VERSIONS_DOWN_QUERY, [target, offset])
}

/** Converge los miembros de una identidad en un documento, el ya mapeado si existe o el más antiguo. */
async function convergeIdentity(tx: Transaction, identity: DomainIdentity, legacyMembers: readonly Member[]): Promise<void> {
  const existing = await lockMappedMember(tx, identity)
  const members = [...legacyMembers, ...(existing ? [existing] : [])].sort(byIngestion)
  const target = existing?.documentId ?? members[0]?.documentId
  const latest = members.at(-1)
  if (!target || !latest) throw new Error(`converging '${identityKey(identity)}' without members`)
  const rows = await Promise.all(members.map(member => readChunkRows(tx, member.documentId)))
  const offset = Math.max(0, ...rows.flat().map(row => row.version))
  const plan = planConvergence(rows.flatMap(groupVersions))
  await applyMoves(tx, target, plan.moves, offset)
  await tx.unsafe(CONVERGE_DOCUMENT_QUERY, [target, identity.domain, identity.scope, identity.domainId, plan.current.number, plan.current.hash, latest.documentId])
  for (const member of members) if (member.documentId !== target) await tx.unsafe(DELETE_DOCUMENT_QUERY, [member.documentId])
  await tx.unsafe(REFRESH_CORPUS_VERSIONS_QUERY, [target])
}

async function resolveIdentity(resolve: LegacyIdentityResolver, row: UnmappedRow): Promise<DomainIdentity | null> {
  const identity = await resolve(row.scope, row.legacy_source_identity)
  if (identity) assertValidIdentity(identity)
  return identity
}

/** Reconcilia todas las filas sin mapear en una transacción; un resolver que lanza la revierte entera. */
export async function reconcileLegacyIdentities(sql: SQL, resolve: LegacyIdentityResolver): Promise<ReconciliationResult> {
  return sql.begin(async tx => {
    const unmapped = (await tx.unsafe(LOCK_UNMAPPED_DOCUMENTS_QUERY)) as UnmappedRow[]
    const groups = new Map<string, { identity: DomainIdentity; members: Member[] }>()
    let unresolved = 0
    for (const row of unmapped) {
      const identity = await resolveIdentity(resolve, row)
      if (!identity) {
        unresolved++
        continue
      }
      const group = groups.get(identityKey(identity)) ?? { identity, members: [] }
      group.members.push({ documentId: row.document_id, ingestedAt: row.ingested_at })
      groups.set(identityKey(identity), group)
    }
    for (const group of groups.values()) await convergeIdentity(tx, group.identity, group.members)
    return { mapped: unmapped.length - unresolved, unmapped: unresolved, documents: groups.size }
  })
}
