/**
 * Esquema de la base de errores. Idempotente: se aplica al abrir, sin tabla de
 * migraciones, porque la base nace con este esquema.
 */
import type { Database } from 'bun:sqlite'

export const ERROR_SOURCES = ['log_error', 'component_boundary'] as const
export type ErrorSource = (typeof ERROR_SOURCES)[number]

const ERROR_SCHEMA = `
CREATE TABLE IF NOT EXISTS errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_at TEXT NOT NULL,
  session_id TEXT,
  version TEXT,
  source TEXT NOT NULL CHECK (source IN (${ERROR_SOURCES.map(source => `'${source}'`).join(',')})),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  context TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS error_actions (
  error_id INTEGER NOT NULL REFERENCES errors(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  name TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (error_id, position)
);

CREATE INDEX IF NOT EXISTS idx_errors_occurred_at ON errors(occurred_at);
CREATE INDEX IF NOT EXISTS idx_errors_session ON errors(session_id);
`

export function applyErrorSchema(db: Database): void {
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(ERROR_SCHEMA)
}
