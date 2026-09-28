/**
 * La base local de errores: cada error capturado, con su tipo, su contexto y
 * las acciones que lo precedieron. La misma implementación sirve a SQLite y a
 * PostgreSQL sobre `Bun.SQL`; lo que difiere entre motores vive en
 * `dialect.ts` (tipos) y `migrations.ts` (DDL).
 *
 * Las claves `authorization`, `x-api-key`, `cookie` y `set-cookie` se redactan
 * a cualquier profundidad del contexto y de las acciones antes de escribir.
 */
import type { SQL } from 'bun'

import type { RecordedAction } from './actionTrail.ts'
import { type Dialect, jsonParam, readId, readJson, readTimestamp } from './dialect.ts'
import { classifyError, type ErrorType } from './errorType.ts'
import { ERROR_SOURCES, type ErrorSource, migrate } from './migrations.ts'

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
  errorType: ErrorType
  name: string
  message: string
  stack: string | null
  context: Record<string, unknown>
  actions: RecordedAction[]
}

export type ErrorStore = {
  record(entry: ErrorEntry): Promise<number>
  list(options: { limit: number }): Promise<StoredError[]>
  /** Borra los errores anteriores a `cutoff` (ISO 8601) y sus acciones; devuelve cuántos. */
  purgeOlderThan(cutoff: string): Promise<number>
  /** Aplica las migraciones que falten. Abrir la base ya lo hace. */
  migrate(): Promise<void>
}

type ErrorRow = {
  id: unknown
  occurred_at: unknown
  session_id: string | null
  version: string | null
  source: ErrorSource
  error_type: ErrorType
  name: string
  message: string
  stack: string | null
  context: unknown
}

type ActionRow = { error_id: unknown; occurred_at: unknown; name: string; metadata: unknown }

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

/** La base sobre una conexión ya abierta; no aplica migraciones (ver `openErrorStoreOn`). */
export function createErrorStore(sql: SQL, dialect: Dialect): ErrorStore {
  const json = (value: unknown) => jsonParam(dialect, redact(value))

  async function actionsOf(ids: number[]): Promise<Map<number, RecordedAction[]>> {
    const byError = new Map<number, RecordedAction[]>()
    if (ids.length === 0) return byError
    const rows = (await sql`
      SELECT error_id, occurred_at, name, metadata FROM error_actions
      WHERE error_id IN ${sql(ids)} ORDER BY error_id, position`) as ActionRow[]
    for (const row of rows) {
      const id = readId(row.error_id)
      const list = byError.get(id) ?? []
      list.push({ name: row.name, metadata: readJson(row.metadata), occurredAt: readTimestamp(row.occurred_at) })
      byError.set(id, list)
    }
    return byError
  }

  return {
    async record(entry) {
      if (!(ERROR_SOURCES as readonly string[]).includes(entry.source)) throw new Error(`unknown error source '${entry.source}'`)
      const { name, message, stack } = describeError(entry.error)
      const context = entry.context ?? {}
      const errorType = classifyError(entry.source, entry.error, context)
      return sql.begin(async tx => {
        const [row] = (await tx`
          INSERT INTO errors (occurred_at, session_id, version, source, error_type, name, message, stack, context)
          VALUES (${entry.occurredAt}, ${entry.sessionId}, ${entry.version}, ${entry.source}, ${errorType},
                  ${name}, ${message}, ${stack}, ${json(context)})
          RETURNING id`) as { id: unknown }[]
        const id = readId(row!.id)
        for (const [position, action] of entry.actions.entries()) {
          await tx`
            INSERT INTO error_actions (error_id, position, occurred_at, name, metadata)
            VALUES (${id}, ${position}, ${action.occurredAt}, ${action.name}, ${json(action.metadata)})`
        }
        return id
      })
    },

    async list({ limit }) {
      const rows = (await sql`SELECT * FROM errors ORDER BY id DESC LIMIT ${limit}`) as ErrorRow[]
      const actions = await actionsOf(rows.map(row => readId(row.id)))
      return rows.map(row => {
        const id = readId(row.id)
        return {
          id,
          occurredAt: readTimestamp(row.occurred_at),
          sessionId: row.session_id,
          version: row.version,
          source: row.source,
          errorType: row.error_type,
          name: row.name,
          message: row.message,
          stack: row.stack,
          context: readJson(row.context),
          actions: actions.get(id) ?? [],
        }
      })
    },

    async purgeOlderThan(cutoff) {
      return sql.begin(async tx => {
        await tx`DELETE FROM error_actions WHERE error_id IN (SELECT id FROM errors WHERE occurred_at < ${cutoff})`
        const deleted = (await tx`DELETE FROM errors WHERE occurred_at < ${cutoff} RETURNING id`) as unknown[]
        return deleted.length
      })
    },

    migrate: () => migrate(sql, dialect),
  }
}
