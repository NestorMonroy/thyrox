/**
 * Las sesiones del inspector: creación con nombre y perfil, secuencia por
 * sesión con su contador, cierre, renombre, borrado con sus peticiones, e
 * instantánea validada que omite las filas que no pasan el esquema.
 *
 * Porte de `omniroute: tests/unit/db-inspector-sessions.test.ts` (MIT), sobre
 * una base en memoria.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { randomUUID } from 'node:crypto'

import {
  appendSessionRequest,
  createSession,
  deleteSession,
  getSession,
  getSessionRequests,
  listSessions,
  renameSession,
  snapshotSession,
  stopSession,
} from '../../src/state/inspectorSessions.ts'
import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'
let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
})
afterEach(() => db.close())

function validPayload(path: string): string {
  return JSON.stringify({
    id: randomUUID(),
    source: 'agent-bridge',
    timestamp: new Date().toISOString(),
    method: 'POST',
    host: 'api.example.com',
    path,
    requestHeaders: { 'content-type': 'application/json' },
    requestBody: null,
    requestSize: 0,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    status: 200,
  })
}

test('a new session has a v4 id and a start time', () => {
  const { id, started_at } = createSession(db)
  expect(id).toMatch(UUID_V4)
  expect(Date.parse(started_at)).toBeGreaterThan(0)
})

test('name and profile are stored, and a new session is open and empty', () => {
  const { id } = createSession(db, { name: 'My Session', profile: 'llm' })
  expect(getSession(db, id)).toMatchObject({ name: 'My Session', profile: 'llm', ended_at: null, request_count: 0 })
})

test('every created session is listed', () => {
  const a = createSession(db, { name: 'First' }).id
  const b = createSession(db, { name: 'Second' }).id
  expect(listSessions(db).map(s => s.id)).toEqual(expect.arrayContaining([a, b]))
})

test('appending numbers the requests 1, 2, 3 in order and counts them', () => {
  const { id } = createSession(db)
  expect(['payload-A', 'payload-B', 'payload-C'].map(p => appendSessionRequest(db, id, p))).toEqual([1, 2, 3])
  expect(getSession(db, id)?.request_count).toBe(3)
  expect(getSessionRequests(db, id)).toEqual([
    { seq: 1, payload: 'payload-A' },
    { seq: 2, payload: 'payload-B' },
    { seq: 3, payload: 'payload-C' },
  ])
})

test('each session numbers its requests on its own', () => {
  const a = createSession(db).id
  const b = createSession(db).id
  appendSessionRequest(db, a, 'x')
  expect(appendSessionRequest(db, b, 'y')).toBe(1)
})

test('stopping stamps the end, renaming changes the name', () => {
  const { id } = createSession(db, { name: 'Old Name' })
  stopSession(db, id)
  renameSession(db, id, 'New Name')
  const row = getSession(db, id)!
  expect(Date.parse(row.ended_at!)).toBeGreaterThan(0)
  expect(row.name).toBe('New Name')
})

test('deleting a session also deletes its requests', () => {
  const { id } = createSession(db)
  appendSessionRequest(db, id, 'payload-1')
  appendSessionRequest(db, id, 'payload-2')
  deleteSession(db, id)
  expect(getSession(db, id)).toBeNull()
  expect(getSessionRequests(db, id)).toEqual([])
})

test('an unknown session is null, and a session without requests has none', () => {
  expect(getSession(db, UNKNOWN_ID)).toBeNull()
  expect(getSessionRequests(db, createSession(db).id)).toEqual([])
})

test('the snapshot parses the requests in order', () => {
  const { id } = createSession(db)
  for (const path of ['/req-1', '/req-2', '/req-3']) appendSessionRequest(db, id, validPayload(path))
  expect(snapshotSession(db, id)!.map(r => r.path)).toEqual(['/req-1', '/req-2', '/req-3'])
})

test('the snapshot of an unknown session is null', () => {
  expect(snapshotSession(db, UNKNOWN_ID)).toBeNull()
})

test('the snapshot skips rows that are not JSON or fail the schema', () => {
  const { id } = createSession(db)
  appendSessionRequest(db, id, validPayload('/good'))
  appendSessionRequest(db, id, JSON.stringify({ malformed: true }))
  appendSessionRequest(db, id, 'not json')
  appendSessionRequest(db, id, validPayload('/good-2'))
  expect(snapshotSession(db, id)!.map(r => r.path)).toEqual(['/good', '/good-2'])
})
