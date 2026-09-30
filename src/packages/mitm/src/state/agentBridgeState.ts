/**
 * Estado por agente del AgentBridge: DNS activado, certificado de confianza,
 * configuración completa, último arranque y último error.
 *
 * Porte de `omniroute: src/lib/db/agentBridgeState.ts` (MIT). La base se
 * recibe como argumento en vez de salir de un singleton global.
 */
import type { Database } from 'bun:sqlite'

import type { AgentBridgeStateRow } from './rows.ts'

interface AgentBridgeStateDbRow {
  agent_id: string
  dns_enabled: number
  cert_trusted: number
  setup_completed: number
  last_started_at: string | null
  last_error: string | null
}

function mapRow(row: AgentBridgeStateDbRow): AgentBridgeStateRow {
  return {
    agent_id: row.agent_id,
    dns_enabled: row.dns_enabled === 1,
    cert_trusted: row.cert_trusted === 1,
    setup_completed: row.setup_completed === 1,
    last_started_at: row.last_started_at,
    last_error: row.last_error,
  }
}

export function getAllAgentBridgeStates(db: Database): AgentBridgeStateRow[] {
  const rows = db
    .query('SELECT * FROM agent_bridge_state ORDER BY agent_id ASC')
    .all() as AgentBridgeStateDbRow[]
  return rows.map(mapRow)
}

export function getAgentBridgeState(db: Database, agentId: string): AgentBridgeStateRow | null {
  const row = db.query('SELECT * FROM agent_bridge_state WHERE agent_id = ?').get(agentId) as
    | AgentBridgeStateDbRow
    | null
  return row ? mapRow(row) : null
}

const BOOLEAN_FIELDS = ['dns_enabled', 'cert_trusted', 'setup_completed'] as const
const TEXT_FIELDS = ['last_started_at', 'last_error'] as const

/**
 * Crea la fila con los booleanos en falso si no existe; si existe, cambia
 * sólo los campos presentes en `row`.
 */
export function upsertAgentBridgeState(
  db: Database,
  row: Partial<AgentBridgeStateRow> & { agent_id: string },
): void {
  if (!getAgentBridgeState(db, row.agent_id)) {
    db.query(
      `INSERT INTO agent_bridge_state
         (agent_id, dns_enabled, cert_trusted, setup_completed, last_started_at, last_error)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      row.agent_id,
      row.dns_enabled ? 1 : 0,
      row.cert_trusted ? 1 : 0,
      row.setup_completed ? 1 : 0,
      row.last_started_at ?? null,
      row.last_error ?? null,
    )
    return
  }
  const fields: string[] = []
  const values: (string | number | null)[] = []
  for (const field of BOOLEAN_FIELDS) {
    if (row[field] === undefined) continue
    fields.push(`${field} = ?`)
    values.push(row[field] ? 1 : 0)
  }
  for (const field of TEXT_FIELDS) {
    if (row[field] === undefined) continue
    fields.push(`${field} = ?`)
    values.push(row[field])
  }
  if (fields.length === 0) return
  values.push(row.agent_id)
  db.query(`UPDATE agent_bridge_state SET ${fields.join(', ')} WHERE agent_id = ?`).run(...values)
}

export function setLastStarted(db: Database, agentId: string, timestamp: string): void {
  db.query(
    `INSERT INTO agent_bridge_state (agent_id, last_started_at)
     VALUES (?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET last_started_at = excluded.last_started_at`,
  ).run(agentId, timestamp)
}

export function setLastError(db: Database, agentId: string, error: string | null): void {
  db.query(
    `INSERT INTO agent_bridge_state (agent_id, last_error)
     VALUES (?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET last_error = excluded.last_error`,
  ).run(agentId, error)
}
