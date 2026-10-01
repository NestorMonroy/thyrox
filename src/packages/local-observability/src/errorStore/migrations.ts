/**
 * El esquema de la base de errores, en migraciones versionadas por motor.
 *
 * Corre sobre el runner compartido de `@thyrox/store/migrations.ts` — misma
 * forma que OmniRoute (`migrationRunner.ts`: cada versión en su transacción,
 * registrada en una tabla), con una variante por motor porque el DDL no es
 * portable: identidad (`INTEGER PRIMARY KEY` frente a
 * `BIGINT GENERATED ALWAYS AS IDENTITY`), tiempos (`TEXT` frente a
 * `TIMESTAMPTZ`) y JSON (`TEXT` frente a `JSONB`, como CLIProxyAPI en
 * `internal/store/postgresstore.go`). La tabla de control,
 * `error_store_migrations`, existía antes de que el runner común tuviera
 * columna `name`: el runner adopta ese ledger heredado solo, dándole nombre a
 * la versión ya registrada.
 */
import type { SQL } from 'bun'

import type { Dialect } from '@thyrox/store/sql.ts'
import { runMigrations, type Migration } from '@thyrox/store/migrations.ts'
import { ERROR_TYPES } from './errorType.ts'

export const ERROR_SOURCES = ['log_error', 'component_boundary'] as const
export type ErrorSource = (typeof ERROR_SOURCES)[number]

const inList = (values: readonly string[]) => values.map(value => `'${value}'`).join(',')

const MIGRATIONS_TABLE = 'error_store_migrations'

const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'create_errors_and_actions',
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

/** Aplica las versiones que falten, cada una en su transacción. Idempotente. */
export async function migrate(sql: SQL, dialect: Dialect): Promise<void> {
  await runMigrations(sql, dialect, { table: MIGRATIONS_TABLE, migrations: MIGRATIONS })
}
