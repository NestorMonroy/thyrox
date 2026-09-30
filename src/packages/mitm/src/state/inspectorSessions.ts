/**
 * Sesiones del inspector: una grabación con nombre de las peticiones
 * capturadas mientras dura, con su secuencia por sesión.
 *
 * Porte de `omniroute: src/lib/db/inspectorSessions.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'
import { randomUUID } from 'node:crypto'

import { InterceptedRequestSchema, type InterceptedRequest } from '../inspector/types.ts'
import type { InspectorSessionProfile, InspectorSessionRow } from './rows.ts'

export function createSession(
  db: Database,
  opts: { name?: string; profile?: InspectorSessionProfile } = {},
): { id: string; started_at: string } {
  const id = randomUUID()
  const started_at = new Date().toISOString()
  db.query('INSERT INTO inspector_sessions (id, name, started_at, profile) VALUES (?, ?, ?, ?)').run(
    id,
    opts.name ?? null,
    started_at,
    opts.profile ?? null,
  )
  return { id, started_at }
}

export function stopSession(db: Database, id: string): void {
  db.query('UPDATE inspector_sessions SET ended_at = ? WHERE id = ?').run(new Date().toISOString(), id)
}

export function renameSession(db: Database, id: string, name: string): void {
  db.query('UPDATE inspector_sessions SET name = ? WHERE id = ?').run(name, id)
}

/** La más reciente primero. */
export function listSessions(db: Database): InspectorSessionRow[] {
  return db.query('SELECT * FROM inspector_sessions ORDER BY started_at DESC').all() as InspectorSessionRow[]
}

export function getSession(db: Database, id: string): InspectorSessionRow | null {
  return (db.query('SELECT * FROM inspector_sessions WHERE id = ?').get(id) as InspectorSessionRow | null) ?? null
}

/**
 * Añade una petición con la secuencia siguiente de su sesión y sube el
 * contador, todo en una transacción: dos anexos seguidos no comparten número.
 */
export function appendSessionRequest(db: Database, sessionId: string, payload: string): number {
  const nextSeq = db.query(
    'SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM inspector_session_requests WHERE session_id = ?',
  )
  const insert = db.query('INSERT INTO inspector_session_requests (session_id, seq, payload) VALUES (?, ?, ?)')
  const count = db.query('UPDATE inspector_sessions SET request_count = request_count + 1 WHERE id = ?')
  return db.transaction(() => {
    const seq = (nextSeq.get(sessionId) as { next_seq: number }).next_seq
    insert.run(sessionId, seq, payload)
    count.run(sessionId)
    return seq
  })()
}

export function getSessionRequests(db: Database, sessionId: string): Array<{ seq: number; payload: string }> {
  return db
    .query('SELECT seq, payload FROM inspector_session_requests WHERE session_id = ? ORDER BY seq ASC')
    .all(sessionId) as Array<{ seq: number; payload: string }>
}

/**
 * Borra la sesión y sus peticiones. La referencia confía en `ON DELETE
 * CASCADE`, que SQLite sólo aplica con `PRAGMA foreign_keys = ON`; aquí el
 * borrado de las peticiones es explícito para no depender de esa pragma.
 */
export function deleteSession(db: Database, id: string): void {
  db.transaction(() => {
    db.query('DELETE FROM inspector_session_requests WHERE session_id = ?').run(id)
    db.query('DELETE FROM inspector_sessions WHERE id = ?').run(id)
  })()
}

/**
 * Las peticiones de la sesión, leídas y validadas, en orden de secuencia;
 * `null` si la sesión no existe. Una fila corrupta o que no pasa el esquema
 * se omite: la instantánea es de lectura y no debe romperse por una fila.
 */
export function snapshotSession(db: Database, sessionId: string): InterceptedRequest[] | null {
  if (getSession(db, sessionId) === null) return null
  const results: InterceptedRequest[] = []
  for (const row of getSessionRequests(db, sessionId)) {
    let parsed: unknown
    try {
      parsed = JSON.parse(row.payload)
    } catch {
      continue
    }
    const result = InterceptedRequestSchema.safeParse(parsed)
    if (result.success) results.push(result.data as InterceptedRequest)
  }
  return results
}
