/**
 * La base local de errores: cada error capturado, con su contexto y las
 * acciones que lo precedieron. Reemplaza lo que Sentry recibía, sin salir de
 * la máquina.
 *
 * Las claves que el `beforeSend` de Sentry quitaba (`authorization`,
 * `x-api-key`, `cookie`, `set-cookie`) se redactan a cualquier profundidad del
 * contexto antes de escribir.
 */
import type { Database } from 'bun:sqlite'

import type { RecordedAction } from './actionTrail.ts'
import { applyErrorSchema, type ErrorSource } from './schema.ts'

export const REDACTED = '[redacted]'
const SENSITIVE_KEYS = new Set(['authorization', 'x-api-key', 'cookie', 'set-cookie'])

export type ErrorEntry = {
  occurredAt: string
  sessionId: string | null
  version: string | null
  source: ErrorSource
  error: unknown
  context?: Record<string, unknown>
  actions: RecordedAction[]
}

export type StoredError = {
  id: number
  occurredAt: string
  sessionId: string | null
  version: string | null
  source: ErrorSource
  name: string
  message: string
  stack: string | null
  context: Record<string, unknown>
  actions: RecordedAction[]
}

export type ErrorStore = {
  record(entry: ErrorEntry): number
  list(options: { limit: number }): StoredError[]
}

type ErrorRow = {
  id: number
  occurred_at: string
  session_id: string | null
  version: string | null
  source: ErrorSource
  name: string
  message: string
  stack: string | null
  context: string
}

type ActionRow = { occurred_at: string; name: string; metadata: string }

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redact(inner)]),
  )
}

function describeError(error: unknown): { name: string; message: string; stack: string | null } {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack ?? null }
  return { name: 'Error', message: String(error), stack: null }
}

export function createErrorStore(db: Database): ErrorStore {
  applyErrorSchema(db)
  const insertError = db.prepare(
    'INSERT INTO errors (occurred_at, session_id, version, source, name, message, stack, context) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
  const insertAction = db.prepare(
    'INSERT INTO error_actions (error_id, position, occurred_at, name, metadata) VALUES (?, ?, ?, ?, ?)',
  )
  const selectErrors = db.prepare('SELECT * FROM errors ORDER BY id DESC LIMIT ?')
  const selectActions = db.prepare('SELECT occurred_at, name, metadata FROM error_actions WHERE error_id = ? ORDER BY position')

  const recordInTransaction = db.transaction((entry: ErrorEntry): number => {
    const { name, message, stack } = describeError(entry.error)
    const context = JSON.stringify(redact(entry.context ?? {}))
    const result = insertError.run(entry.occurredAt, entry.sessionId, entry.version, entry.source, name, message, stack, context)
    const id = Number(result.lastInsertRowid)
    entry.actions.forEach((action, position) => {
      insertAction.run(id, position, action.occurredAt, action.name, JSON.stringify(redact(action.metadata)))
    })
    return id
  })

  return {
    record: entry => recordInTransaction(entry),
    list: ({ limit }) =>
      (selectErrors.all(limit) as ErrorRow[]).map(row => ({
        id: row.id,
        occurredAt: row.occurred_at,
        sessionId: row.session_id,
        version: row.version,
        source: row.source,
        name: row.name,
        message: row.message,
        stack: row.stack,
        context: JSON.parse(row.context) as Record<string, unknown>,
        actions: (selectActions.all(row.id) as ActionRow[]).map(action => ({
          name: action.name,
          metadata: JSON.parse(action.metadata) as Record<string, unknown>,
          occurredAt: action.occurred_at,
        })),
      })),
  }
}
