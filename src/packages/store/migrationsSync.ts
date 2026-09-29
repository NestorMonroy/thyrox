/**
 * Runner de migraciones sync, para los stores de nivel B que abren
 * `bun:sqlite` en vez de `Bun.SQL` (mitm, task, provider, observability).
 * Mismo contrato observable que `runMigrations`: versiones ascendentes, sin
 * duplicados, migración + fila de control en la misma transacción,
 * re-ejecución idempotente y rechazo de una base más nueva que el código —
 * la validación de la lista y el DDL de control vienen de
 * `migrationContract.ts`, y la lectura del ledger de `migrationLedger.ts`, no
 * de una copia local.
 *
 * `bun:sqlite` sólo abre SQLite, así que aquí no hay parámetro `dialect`: las
 * migraciones usan siempre `statements.sqlite`.
 */
import type { Database } from 'bun:sqlite'

import {
  ADD_NAME_COLUMN_DDL,
  assertNoNewerDatabase,
  assertProvenance,
  assertValidTable,
  assertValidVersions,
  CONTROL_TABLE_DDL,
  migrationFailedError,
  type Migration as BaseMigration,
} from './migrationContract.ts'
import { readLedgerSync, type LedgerRow } from './migrationLedger.ts'

export type Migration = BaseMigration & {
  /**
   * Chequeo opcional de adopción: si da verdadero, la versión se registra sin
   * ejecutar sus sentencias — para adoptar un cambio que ya existe
   * físicamente por fuera de este runner. Si da falso (o no se declara), se
   * ejecuta como cualquier otra versión.
   */
  alreadyApplied?: (db: Database) => boolean
}

/**
 * Añade la columna `name` a un ledger heredado (creado antes de esta versión
 * del contrato, como `error_store_migrations`) y fija el nombre de cada fila
 * ya registrada con el que el código declara hoy para esa versión — una
 * versión registrada que el código no declara queda sin nombre, y
 * `assertNoNewerDatabase` la rechaza antes de que eso importe.
 */
function adoptLegacyLedger(db: Database, table: string, rows: readonly LedgerRow[], migrations: readonly Migration[]): Map<number, string> {
  db.run(ADD_NAME_COLUMN_DDL(table))
  const applied = new Map<number, string>()
  for (const row of rows) {
    const known = migrations.find(migration => migration.version === row.version)
    if (known) db.run(`UPDATE ${table} SET name = ? WHERE version = ?`, [known.name, row.version])
    applied.set(row.version, known?.name ?? '')
  }
  return applied
}

function applyPending(db: Database, table: string, pending: readonly Migration[]): number[] {
  const appliedNow: number[] = []
  for (const migration of pending) {
    try {
      const adopted = migration.alreadyApplied ? migration.alreadyApplied(db) : false
      const applyMigration = db.transaction(() => {
        if (!adopted) {
          for (const statement of migration.statements.sqlite) db.run(statement)
        }
        db.run(`INSERT INTO ${table} (version, name, applied_at) VALUES (?, ?, ?)`, [migration.version, migration.name, new Date().toISOString()])
      })
      applyMigration()
    } catch (e) {
      throw migrationFailedError(migration.version, e)
    }
    appliedNow.push(migration.version)
  }
  return appliedNow
}

/**
 * Aplica las versiones que falten, en orden ascendente, cada una en su
 * propia transacción junto con su fila de control. Devuelve las versiones
 * aplicadas EN ESTA LLAMADA — una segunda llamada, sin nada nuevo que
 * aplicar, devuelve `[]` sin abrir ninguna transacción de escritura.
 */
export function runMigrationsSync(db: Database, options: { table: string; migrations: readonly Migration[] }): number[] {
  const { table, migrations } = options
  assertValidTable(table)
  assertValidVersions(migrations)

  const ledger = readLedgerSync(db, table)

  if (!ledger.exists) {
    db.run(CONTROL_TABLE_DDL(table))
    return applyPending(db, table, migrations)
  }

  const applied = ledger.hasNameColumn
    ? new Map(ledger.rows.map(row => [row.version, row.name ?? '']))
    : adoptLegacyLedger(db, table, ledger.rows, migrations)

  assertNoNewerDatabase(table, new Set(applied.keys()), migrations)
  assertProvenance(table, applied, migrations)

  const pending = migrations.filter(migration => !applied.has(migration.version))
  if (pending.length === 0) return []

  return applyPending(db, table, pending)
}
