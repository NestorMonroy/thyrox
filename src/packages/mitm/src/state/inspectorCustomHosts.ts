/**
 * Hosts que el usuario añade al inspector además de los de los agentes
 * conocidos. `isCustomHost` separa en el inspector el tráfico de estos hosts
 * del de un agente.
 *
 * Porte de `omniroute: src/lib/db/inspectorCustomHosts.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

import type { CustomHostKind, InspectorCustomHostRow } from './rows.ts'

interface InspectorCustomHostDbRow {
  host: string
  enabled: number
  label: string | null
  kind: string
  added_at: string
  last_seen_at: string | null
}

function mapRow(row: InspectorCustomHostDbRow): InspectorCustomHostRow {
  return {
    host: row.host,
    enabled: row.enabled === 1,
    label: row.label,
    kind: row.kind as CustomHostKind,
    added_at: row.added_at,
    last_seen_at: row.last_seen_at,
  }
}

export function listCustomHosts(
  db: Database,
  options?: { enabledOnly?: boolean },
): InspectorCustomHostRow[] {
  const sql =
    options?.enabledOnly === true
      ? 'SELECT * FROM inspector_custom_hosts WHERE enabled = 1 ORDER BY host ASC'
      : 'SELECT * FROM inspector_custom_hosts ORDER BY host ASC'
  return (db.query(sql).all() as InspectorCustomHostDbRow[]).map(mapRow)
}

/**
 * Añade el host activado; si ya existe, lo deja como estaba. Un `kind` fuera
 * del CHECK tampoco se inserta: `OR IGNORE` alcanza a esa restricción.
 */
export function addCustomHost(
  db: Database,
  host: string,
  kind: CustomHostKind = 'custom',
  label?: string,
): void {
  db.query(
    `INSERT OR IGNORE INTO inspector_custom_hosts (host, enabled, label, kind, added_at)
     VALUES (?, 1, ?, ?, ?)`,
  ).run(host, label ?? null, kind, new Date().toISOString())
}

export function removeCustomHost(db: Database, host: string): void {
  db.query('DELETE FROM inspector_custom_hosts WHERE host = ?').run(host)
}

export function toggleCustomHost(db: Database, host: string, enabled: boolean): void {
  db.query('UPDATE inspector_custom_hosts SET enabled = ? WHERE host = ?').run(enabled ? 1 : 0, host)
}

export function touchLastSeen(db: Database, host: string): void {
  db.query('UPDATE inspector_custom_hosts SET last_seen_at = ? WHERE host = ?').run(
    new Date().toISOString(),
    host,
  )
}

export function isCustomHost(db: Database, host: string): boolean {
  return (
    db
      .query('SELECT 1 AS found FROM inspector_custom_hosts WHERE host = ? AND enabled = 1')
      .get(host) !== null
  )
}
