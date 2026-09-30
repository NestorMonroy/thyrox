/**
 * `ensureAgentBridgeSchema` sobre `runMigrationsSync`: base nueva, adopción
 * de una base creada con el `CREATE TABLE IF NOT EXISTS` anterior (sin
 * ledger) y con filas, re-ejecución idempotente, y rechazo de una base más
 * nueva que el código.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'

let db: Database
afterEach(() => db.close())

test('schema — base nueva registra la versión 1 en el ledger propio', () => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)

  const row = db.query(`SELECT version, name FROM agent_bridge_migrations`).get() as { version: number; name: string }
  expect(row.version).toBe(1)
  expect(row.name).toBe('initial_schema')

  const tables = db
    .query(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all()
    .map(r => (r as { name: string }).name)
  expect(tables).toContain('agent_bridge_state')
  expect(tables).toContain('inspector_session_requests')
})

test('schema — adopta una base creada con el DDL anterior (sin ledger) sin perder filas', () => {
  db = new Database(':memory:')
  // Recrea a mano el esquema PRE-migración, tal como lo dejaba el antiguo `db.exec` sin ledger.
  db.exec(`
    CREATE TABLE agent_bridge_state (
      agent_id TEXT PRIMARY KEY,
      dns_enabled INTEGER NOT NULL DEFAULT 0,
      cert_trusted INTEGER NOT NULL DEFAULT 0,
      setup_completed INTEGER NOT NULL DEFAULT 0,
      last_started_at TEXT,
      last_error TEXT
    );
    CREATE TABLE agent_bridge_mappings (
      agent_id TEXT NOT NULL,
      source_model TEXT NOT NULL,
      target_model TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (agent_id, source_model)
    );
  `)
  db.run(`INSERT INTO agent_bridge_state (agent_id, dns_enabled) VALUES ('legacy-agent', 1)`)

  ensureAgentBridgeSchema(db)

  const row = db.query(`SELECT agent_id, dns_enabled FROM agent_bridge_state WHERE agent_id = 'legacy-agent'`).get() as {
    agent_id: string
    dns_enabled: number
  }
  expect(row.agent_id).toBe('legacy-agent')
  expect(row.dns_enabled).toBe(1)

  const ledgerRow = db.query(`SELECT version, name FROM agent_bridge_migrations`).get() as { version: number; name: string }
  expect(ledgerRow.version).toBe(1)
  expect(ledgerRow.name).toBe('initial_schema')
})

test('schema — re-ejecutar es idempotente', () => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  ensureAgentBridgeSchema(db)

  const count = (db.query(`SELECT COUNT(*) AS n FROM agent_bridge_migrations`).get() as { n: number }).n
  expect(count).toBe(1)
})

test('schema — rechaza una base más nueva que el código', () => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  db.run(`INSERT INTO agent_bridge_migrations (version, name, applied_at) VALUES (2, 'future_migration', ?)`, [new Date().toISOString()])

  expect(() => ensureAgentBridgeSchema(db)).toThrow(/newer than code|no longer declared/)
})
