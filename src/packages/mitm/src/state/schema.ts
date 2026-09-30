/**
 * Esquema del estado del AgentBridge, versionado con `runMigrationsSync`
 * (`@thyrox/store`) y su propia tabla de control (`agent_bridge_migrations`).
 * La versión 1 es el DDL idéntico que este archivo aplicaba antes con un
 * único `db.exec`, y su `alreadyApplied` adopta una base creada con esa
 * forma anterior (sin ledger) registrando la versión sin re-ejecutar el DDL.
 *
 * Porte de `omniroute: src/lib/db/migrations/080_agent_bridge.sql`,
 * `081_inspector_custom_hosts.sql` y `082_inspector_sessions.sql` (MIT). La referencia guarda los alias en
 * la tabla genérica `key_value` con `namespace = 'mitmAlias'`; aquí, sin esa
 * tabla compartida, tienen la suya (`mitm_alias`).
 */
import type { Database } from 'bun:sqlite'

import { runMigrationsSync, type Migration } from '@thyrox/store/migrationsSync.ts'

const MIGRATIONS_TABLE = 'agent_bridge_migrations'

function anchorTableExists(db: Database): boolean {
  return db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name = 'agent_bridge_state'`).get() !== null
}

const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    alreadyApplied: anchorTableExists,
    statements: {
      sqlite: [
        `CREATE TABLE IF NOT EXISTS agent_bridge_state (
  agent_id TEXT PRIMARY KEY,
  dns_enabled INTEGER NOT NULL DEFAULT 0,
  cert_trusted INTEGER NOT NULL DEFAULT 0,
  setup_completed INTEGER NOT NULL DEFAULT 0,
  last_started_at TEXT,
  last_error TEXT
)`,
        `CREATE TABLE IF NOT EXISTS agent_bridge_mappings (
  agent_id TEXT NOT NULL,
  source_model TEXT NOT NULL,
  target_model TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_id, source_model)
)`,
        `CREATE TABLE IF NOT EXISTS agent_bridge_bypass (
  pattern TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('default','user')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
        'CREATE INDEX IF NOT EXISTS idx_agent_bridge_mappings_agent ON agent_bridge_mappings(agent_id)',
        `CREATE TABLE IF NOT EXISTS inspector_custom_hosts (
  host TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  label TEXT,
  kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('llm','app','custom')),
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT
)`,
        'CREATE INDEX IF NOT EXISTS idx_inspector_custom_hosts_enabled ON inspector_custom_hosts(enabled)',
        `CREATE TABLE IF NOT EXISTS mitm_alias (
  agent_id TEXT PRIMARY KEY,
  mappings TEXT NOT NULL
)`,
        `CREATE TABLE IF NOT EXISTS inspector_sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  request_count INTEGER NOT NULL DEFAULT 0,
  profile TEXT CHECK (profile IN ('llm','custom','all'))
)`,
        `CREATE TABLE IF NOT EXISTS inspector_session_requests (
  session_id TEXT NOT NULL REFERENCES inspector_sessions(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (session_id, seq)
)`,
        'CREATE INDEX IF NOT EXISTS idx_inspector_session_requests_sid ON inspector_session_requests(session_id)',
      ],
      postgres: [],
    },
  },
]

export function ensureAgentBridgeSchema(db: Database): void {
  runMigrationsSync(db, { table: MIGRATIONS_TABLE, migrations: MIGRATIONS })
}
