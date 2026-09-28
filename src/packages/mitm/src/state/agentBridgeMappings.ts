/**
 * Asignaciones de modelo por agente que configura la interfaz, y su copia a
 * los alias que lee el servidor MITM.
 *
 * Porte de `omniroute: src/lib/db/agentBridgeMappings.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import type { AgentId } from '../types.ts'
import { setMitmAliasAll } from './mitmAlias.ts'
import type { AgentBridgeMappingRow } from './rows.ts'

/** Agentes con clave de alias propia en el enrutado del servidor MITM. */
const MITM_ALIAS_AGENTS: ReadonlySet<string> = new Set<AgentId>(['antigravity', 'claude-code', 'kiro'])

export function getMappingsForAgent(db: Database, agentId: string): AgentBridgeMappingRow[] {
  return db
    .query(
      'SELECT agent_id, source_model, target_model, updated_at FROM agent_bridge_mappings WHERE agent_id = ? ORDER BY source_model ASC',
    )
    .all(agentId) as AgentBridgeMappingRow[]
}

/** Sustituye todas las asignaciones del agente en una transacción. */
export function setMappings(
  db: Database,
  agentId: string,
  mappings: Array<{ source: string; target: string }>,
): void {
  const now = new Date().toISOString()
  const deleteAgent = db.query('DELETE FROM agent_bridge_mappings WHERE agent_id = ?')
  const insert = db.query(
    `INSERT INTO agent_bridge_mappings (agent_id, source_model, target_model, updated_at)
     VALUES (?, ?, ?, ?)`,
  )
  db.transaction(() => {
    deleteAgent.run(agentId)
    for (const mapping of mappings) insert.run(agentId, mapping.source, mapping.target, now)
  })()
}

export function deleteMapping(db: Database, agentId: string, source: string): void {
  db.query('DELETE FROM agent_bridge_mappings WHERE agent_id = ? AND source_model = ?').run(
    agentId,
    source,
  )
}

/**
 * Copia las asignaciones del agente a sus alias, que es lo que el servidor
 * MITM lee. Los agentes sin clave de alias propia usan la configuración de
 * `antigravity` y no se copian.
 */
export function syncAgentBridgeMappingsToMitmAlias(db: Database, agentId: string): void {
  if (!MITM_ALIAS_AGENTS.has(agentId)) return
  const mappings: Record<string, string> = {}
  for (const row of getMappingsForAgent(db, agentId)) mappings[row.source_model] = row.target_model
  setMitmAliasAll(db, agentId, mappings)
}
