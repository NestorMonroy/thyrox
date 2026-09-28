/**
 * El esquema de la base de errores, en migraciones versionadas por motor.
 *
 * Mismo mecanismo que OmniRoute (`migrationRunner.ts`: cada versión en su
 * transacción, registrada en una tabla), con una variante por motor porque el
 * DDL no es portable: identidad (`INTEGER PRIMARY KEY` frente a
 * `BIGINT GENERATED ALWAYS AS IDENTITY`), tiempos (`TEXT` frente a
 * `TIMESTAMPTZ`) y JSON (`TEXT` frente a `JSONB`, como CLIProxyAPI en
 * `internal/store/postgresstore.go`).
 */
import type { SQL } from 'bun'

import type { Dialect } from './dialect.ts'
import { ERROR_TYPES } from './errorType.ts'

export const ERROR_SOURCES = ['log_error', 'component_boundary'] as const
export type ErrorSource = (typeof ERROR_SOURCES)[number]

const inList = (values: readonly string[]) => values.map(value => `'${value}'`).join(',')

type Migration = { version: number; statements: Record<Dialect, string[]> }

const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    statements: {
      sqlite: [
        `CREATE TABLE errors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          occurred_at TEXT NOT NULL,
          session_id TEXT,
          version TEXT,
          source TEXT NOT NULL CHECK (source IN (${inList(ERROR_SOURCES)})),
          error_type TEXT NOT NULL CHECK (error_type IN (${inList(ERROR_TYPES)})),
          name TEXT NOT NULL,
          message TEXT NOT NULL,
          stack TEXT,
          context TEXT NOT NULL DEFAULT '{}'
        )`,
        `CREATE TABLE error_actions (
          error_id INTEGER NOT NULL REFERENCES errors(id),
          position INTEGER NOT NULL,
          occurred_at TEXT NOT NULL,
          name TEXT NOT NULL,
          metadata TEXT NOT NULL DEFAULT '{}',
          PRIMARY KEY (error_id, position)
        )`,
        'CREATE INDEX idx_errors_occurred_at ON errors(occurred_at)',
        'CREATE INDEX idx_errors_session ON errors(session_id)',
      ],
      postgres: [
        `CREATE TABLE errors (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          occurred_at TIMESTAMPTZ NOT NULL,
          session_id TEXT,
          version TEXT,
          source TEXT NOT NULL CHECK (source IN (${inList(ERROR_SOURCES)})),
          error_type TEXT NOT NULL CHECK (error_type IN (${inList(ERROR_TYPES)})),
          name TEXT NOT NULL,
          message TEXT NOT NULL,
          stack TEXT,
          context JSONB NOT NULL DEFAULT '{}'::jsonb
        )`,
        `CREATE TABLE error_actions (
          error_id BIGINT NOT NULL REFERENCES errors(id),
          position INTEGER NOT NULL,
          occurred_at TIMESTAMPTZ NOT NULL,
          name TEXT NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          PRIMARY KEY (error_id, position)
        )`,
        'CREATE INDEX idx_errors_occurred_at ON errors(occurred_at)',
        'CREATE INDEX idx_errors_session ON errors(session_id)',
      ],
    },
  },
]

const MIGRATIONS_TABLE = 'error_store_migrations'

/** Aplica las versiones que falten, cada una en su transacción. Idempotente. */
export async function migrate(sql: SQL, dialect: Dialect): Promise<void> {
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`)
  const applied = new Set(
    ((await sql.unsafe(`SELECT version FROM ${MIGRATIONS_TABLE}`)) as { version: number | string }[]).map(row => Number(row.version)),
  )
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue
    await sql.begin(async tx => {
      for (const statement of migration.statements[dialect]) await tx.unsafe(statement)
      await tx`INSERT INTO error_store_migrations (version, applied_at) VALUES (${migration.version}, ${new Date().toISOString()})`
    })
  }
}
