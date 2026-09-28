/**
 * Esquema del estado del AgentBridge. Idempotente: se aplica al abrir el
 * store, sin tabla de migraciones, porque la base es propia del MITM y nace
 * con este esquema.
 *
 * Porte de `omniroute: src/lib/db/migrations/080_agent_bridge.sql` y
 * `081_inspector_custom_hosts.sql` (MIT). La referencia guarda los alias en
 * la tabla genérica `key_value` con `namespace = 'mitmAlias'`; aquí, sin esa
 * tabla compartida, tienen la suya (`mitm_alias`).
 */
import type { Database } from 'bun:sqlite'

const AGENT_BRIDGE_SCHEMA = `
CREATE TABLE IF NOT EXISTS agent_bridge_state (
  agent_id TEXT PRIMARY KEY,
  dns_enabled INTEGER NOT NULL DEFAULT 0,
  cert_trusted INTEGER NOT NULL DEFAULT 0,
  setup_completed INTEGER NOT NULL DEFAULT 0,
  last_started_at TEXT,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS agent_bridge_mappings (
  agent_id TEXT NOT NULL,
  source_model TEXT NOT NULL,
  target_model TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_id, source_model)
);

CREATE TABLE IF NOT EXISTS agent_bridge_bypass (
  pattern TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('default','user')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_bridge_mappings_agent ON agent_bridge_mappings(agent_id);

CREATE TABLE IF NOT EXISTS inspector_custom_hosts (
  host TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  label TEXT,
  kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('llm','app','custom')),
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_inspector_custom_hosts_enabled ON inspector_custom_hosts(enabled);

CREATE TABLE IF NOT EXISTS mitm_alias (
  agent_id TEXT PRIMARY KEY,
  mappings TEXT NOT NULL
);
`

export function ensureAgentBridgeSchema(db: Database): void {
  db.exec(AGENT_BRIDGE_SCHEMA)
}
