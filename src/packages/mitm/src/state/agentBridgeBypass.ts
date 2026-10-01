/**
 * Patrones de host que el MITM deja pasar sin interceptar. Los `default`
 * los siembra el gestor al arrancar; los `user` los reemplaza la interfaz de
 * una vez, en una transacción.
 *
 * Porte de `omniroute: src/lib/db/agentBridgeBypass.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import type { AgentBridgeBypassRow, BypassSource } from './rows.ts'

export function getAllBypassPatterns(db: Database): AgentBridgeBypassRow[] {
  const rows = db
    .query(
      'SELECT pattern, source, created_at FROM agent_bridge_bypass ORDER BY source ASC, pattern ASC',
    )
    .all() as Array<{ pattern: string; source: string; created_at: string }>
  return rows.map(row => ({
    pattern: row.pattern,
    source: row.source as BypassSource,
    created_at: row.created_at,
  }))
}

export function getUserBypassPatterns(db: Database): string[] {
  const rows = db
    .query("SELECT pattern FROM agent_bridge_bypass WHERE source = 'user' ORDER BY pattern ASC")
    .all() as Array<{ pattern: string }>
  return rows.map(row => row.pattern)
}

/** Sustituye todos los patrones del usuario; si uno falla, no cambia ninguno. */
export function replaceUserBypassPatterns(db: Database, patterns: string[]): void {
  const now = new Date().toISOString()
  const deleteUser = db.query("DELETE FROM agent_bridge_bypass WHERE source = 'user'")
  const insert = db.query(
    "INSERT INTO agent_bridge_bypass (pattern, source, created_at) VALUES (?, 'user', ?)",
  )
  db.transaction(() => {
    deleteUser.run()
    for (const pattern of patterns) insert.run(pattern, now)
  })()
}

/** Añade los patrones por defecto que falten; los presentes no se tocan. */
export function seedDefaultBypassPatterns(db: Database, defaults: string[]): void {
  const now = new Date().toISOString()
  const insertIfMissing = db.query(
    "INSERT OR IGNORE INTO agent_bridge_bypass (pattern, source, created_at) VALUES (?, 'default', ?)",
  )
  db.transaction(() => {
    for (const pattern of defaults) insertIfMissing.run(pattern, now)
  })()
}
