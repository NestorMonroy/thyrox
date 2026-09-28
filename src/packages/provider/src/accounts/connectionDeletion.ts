/**
 * Borrado de cuentas y la renumeración de prioridades de un proveedor.
 *
 * Porte de `omniroute: src/lib/db/providers/deletion.ts` (MIT).
 */
import type { Database } from 'bun:sqlite'

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(',')
}

/** Deja las prioridades del proveedor en 1..N, en el orden en que se eligen. */
export function reorderConnections(db: Database, providerId: string): void {
  const rows = db
    .query('SELECT id FROM provider_connections WHERE provider = ? ORDER BY priority ASC, updated_at DESC')
    .all(providerId) as { id: string }[]
  const update = db.query('UPDATE provider_connections SET priority = ? WHERE id = ?')
  rows.forEach((row, index) => update.run(index + 1, row.id))
}

export function deleteConnection(db: Database, id: string): boolean {
  const existing = db.query('SELECT provider FROM provider_connections WHERE id = ?').get(id) as { provider: string } | null
  if (!existing) return false
  db.query('DELETE FROM provider_connections WHERE id = ?').run(id)
  reorderConnections(db, existing.provider)
  return true
}

export function deleteConnections(db: Database, ids: readonly string[]): number {
  if (ids.length === 0) return 0
  return db.query(`DELETE FROM provider_connections WHERE id IN (${placeholders(ids.length)})`).run(...ids).changes
}

export function deleteConnectionsByProvider(db: Database, providerId: string): number {
  return db.query('DELETE FROM provider_connections WHERE provider = ?').run(providerId).changes
}
