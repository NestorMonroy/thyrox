/**
 * Alias de modelo que el servidor MITM lee al interceptar: un objeto JSON
 * por agente, `{ modeloOrigen: modeloDestino }`.
 *
 * Porte de `omniroute: src/lib/db/models/mitmAlias.ts` (MIT). La referencia
 * los guarda en `key_value` con `namespace = 'mitmAlias'` y hace una copia
 * de seguridad del archivo antes de escribir; aquí tienen tabla propia y la
 * copia no se porta: la base es del MITM y se regenera desde las
 * asignaciones.
 */
import type { Database } from 'bun:sqlite'

export function getMitmAlias(db: Database, agentId: string): Record<string, unknown> {
  const row = db.query('SELECT mappings FROM mitm_alias WHERE agent_id = ?').get(agentId) as {
    mappings: string
  } | null
  return row ? (JSON.parse(row.mappings) as Record<string, unknown>) : {}
}

export function getAllMitmAliases(db: Database): Record<string, Record<string, unknown>> {
  const rows = db.query('SELECT agent_id, mappings FROM mitm_alias ORDER BY agent_id ASC').all() as Array<{
    agent_id: string
    mappings: string
  }>
  const result: Record<string, Record<string, unknown>> = {}
  for (const row of rows) result[row.agent_id] = JSON.parse(row.mappings) as Record<string, unknown>
  return result
}

export function setMitmAliasAll(db: Database, agentId: string, mappings: unknown): void {
  db.query('INSERT OR REPLACE INTO mitm_alias (agent_id, mappings) VALUES (?, ?)').run(
    agentId,
    JSON.stringify(mappings || {}),
  )
}
