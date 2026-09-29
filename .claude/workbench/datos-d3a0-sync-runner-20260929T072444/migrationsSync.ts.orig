/**
 * Runner de migraciones sync, para los stores de nivel B que abren
 * `bun:sqlite` en vez de `Bun.SQL` (mitm, task, provider, observability).
 * Mismo contrato observable que `runMigrations`: versiones ascendentes, sin
 * duplicados, migración + fila de control en la misma transacción,
 * re-ejecución idempotente y rechazo de una base más nueva que el código —
 * la validación de la lista y el DDL de control vienen de
 * `migrationContract.ts`, no de una copia local.
 *
 * `bun:sqlite` sólo abre SQLite, así que aquí no hay parámetro `dialect`: las
 * migraciones usan siempre `statements.sqlite`.
 */
import type { Database } from 'bun:sqlite'

import { assertNoNewerDatabase, assertValidTable, assertValidVersions, CONTROL_TABLE_DDL, migrationFailedError, type Migration } from './migrationContract.ts'

export type { Migration }

/**
 * Aplica las versiones que falten, en orden ascendente, cada una en su
 * propia transacción junto con su fila de control. Devuelve las versiones
 * aplicadas EN ESTA LLAMADA — una segunda llamada, sin nada nuevo que
 * aplicar, devuelve `[]`.
 */
export function runMigrationsSync(db: Database, options: { table: string; migrations: readonly Migration[] }): number[] {
  const { table, migrations } = options
  assertValidTable(table)
  assertValidVersions(migrations)

  db.run(CONTROL_TABLE_DDL(table))
  const rows = db.query(`SELECT version FROM ${table}`).all() as { version: number | string }[]
  const applied = new Set(rows.map(row => Number(row.version)))
  assertNoNewerDatabase(table, applied, migrations)

  const appliedNow: number[] = []
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue
    try {
      const applyMigration = db.transaction(() => {
        for (const statement of migration.statements.sqlite) db.run(statement)
        db.run(`INSERT INTO ${table} (version, applied_at) VALUES (?, ?)`, [migration.version, new Date().toISOString()])
      })
      applyMigration()
    } catch (e) {
      throw migrationFailedError(migration.version, e)
    }
    appliedNow.push(migration.version)
  }
  return appliedNow
}
