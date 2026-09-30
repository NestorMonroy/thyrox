/**
 * Esquema de `provider_connections`: una fila por cuenta de un upstream.
 * Versión 1 del ledger de migraciones (`@thyrox/store/migrationsSync.ts`),
 * con `alreadyApplied` que adopta una base creada antes de que este ledger
 * existiera (la tabla ya está ahí, y se registra la versión sin re-ejecutar
 * su DDL).
 *
 * Porte de `omniroute: src/lib/db/core.ts` (la tabla y sus tres índices) con
 * las columnas que sus migraciones 123, 125 y 177 añadieron después (MIT).
 */
import type { Database } from 'bun:sqlite'
import { runMigrationsSync, type Migration } from '@thyrox/store/migrationsSync.ts'

const PROVIDER_CONNECTIONS_MIGRATIONS_TABLE = 'provider_connections_migrations'

const CREATE_PROVIDER_CONNECTIONS_TABLE = `
CREATE TABLE provider_connections (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  auth_type TEXT,
  name TEXT,
  email TEXT,
  priority INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  token_expires_at TEXT,
  scope TEXT,
  project_id TEXT,
  test_status TEXT,
  error_code TEXT,
  last_error TEXT,
  last_error_at TEXT,
  last_error_type TEXT,
  last_error_source TEXT,
  backoff_level INTEGER DEFAULT 0,
  rate_limited_until TEXT,
  health_check_interval INTEGER,
  last_health_check_at TEXT,
  last_tested TEXT,
  api_key TEXT,
  id_token TEXT,
  provider_specific_data TEXT,
  expires_in INTEGER,
  display_name TEXT,
  global_priority INTEGER,
  default_model TEXT,
  token_type TEXT,
  consecutive_use_count INTEGER DEFAULT 0,
  rate_limit_protection INTEGER DEFAULT 0,
  last_used_at TEXT,
  "group" TEXT,
  max_concurrent INTEGER,
  proxy_enabled INTEGER NOT NULL DEFAULT 1,
  per_key_proxy_enabled INTEGER NOT NULL DEFAULT 0,
  quota_visible INTEGER NOT NULL DEFAULT 1,
  quota_window_thresholds_json TEXT,
  rate_limit_overrides_json TEXT,
  last_ping_at TEXT,
  last_pinged_reset_key TEXT,
  synced_models_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`

const CREATE_INDEX_PROVIDER = 'CREATE INDEX idx_pc_provider ON provider_connections(provider)'
const CREATE_INDEX_ACTIVE = 'CREATE INDEX idx_pc_active ON provider_connections(is_active)'
const CREATE_INDEX_PRIORITY = 'CREATE INDEX idx_pc_priority ON provider_connections(provider, priority)'

function providerConnectionsTableExists(db: Database): boolean {
  return db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name = 'provider_connections'`).get() !== null
}

/**
 * Sólo `bun:sqlite`: este store nunca se abre sobre `Bun.SQL`/PostgreSQL, así
 * que `statements.postgres` queda vacío a propósito — `runMigrationsSync`
 * únicamente lee `statements.sqlite`.
 */
const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'create_provider_connections',
    statements: {
      sqlite: [CREATE_PROVIDER_CONNECTIONS_TABLE, CREATE_INDEX_PROVIDER, CREATE_INDEX_ACTIVE, CREATE_INDEX_PRIORITY],
      postgres: [],
    },
    alreadyApplied: providerConnectionsTableExists,
  },
]

/**
 * Las columnas reales de la tabla. Una proyección se interpola en el SELECT,
 * así que cada nombre pedido se valida contra este conjunto.
 */
export const PROVIDER_CONNECTIONS_COLUMNS: ReadonlySet<string> = new Set([
  'id', 'provider', 'auth_type', 'name', 'email', 'priority', 'is_active',
  'access_token', 'refresh_token', 'expires_at', 'token_expires_at', 'scope',
  'project_id', 'test_status', 'error_code', 'last_error', 'last_error_at',
  'last_error_type', 'last_error_source', 'backoff_level', 'rate_limited_until',
  'health_check_interval', 'last_health_check_at', 'last_tested', 'api_key',
  'id_token', 'provider_specific_data', 'expires_in', 'display_name',
  'global_priority', 'default_model', 'token_type', 'consecutive_use_count',
  'rate_limit_protection', 'last_used_at', 'group', 'max_concurrent',
  'proxy_enabled', 'per_key_proxy_enabled', 'quota_visible',
  'quota_window_thresholds_json', 'rate_limit_overrides_json', 'last_ping_at',
  'last_pinged_reset_key', 'synced_models_at', 'created_at', 'updated_at',
])

export function ensureProviderConnectionsSchema(db: Database): void {
  runMigrationsSync(db, { table: PROVIDER_CONNECTIONS_MIGRATIONS_TABLE, migrations: MIGRATIONS })
}
