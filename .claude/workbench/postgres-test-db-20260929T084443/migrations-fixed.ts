/**
 * Runner de migraciones común, para cualquier store de thyrox sobre
 * `Bun.SQL`. Misma forma que `local-observability/errorStore/migrations.ts`
 * (una versión por transacción, con su fila de control) generalizada: la
 * tabla de control y la lista de migraciones las declara el llamador en vez
 * de vivir fijas en el módulo — así deja de ser un mecanismo por dominio.
 *
 * La validación de la lista y el DDL de control viven en
 * `migrationContract.ts`, compartidos con `runMigrationsSync`; la lectura del
 * ledger, en `migrationLedger.ts`, compartida con `validateMigrationLedger` —
 * la misma regla no se escribe dos veces para los dos motores.
 */
import type { SQL } from 'bun'

import type { Dialect } from './sql.ts'
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
import { readLedgerAsync, type LedgerRow } from './migrationLedger.ts'

export type Migration = BaseMigration & {
  /**
   * Chequeo opcional de adopción: si da verdadero, la versión se registra sin
   * ejecutar sus sentencias — para adoptar un cambio que ya existe
   * físicamente por fuera de este runner. Si da falso (o no se declara), se
   * ejecuta como cualquier otra versión.
   */
  alreadyApplied?: (sql: SQL, dialect: Dialect) => Promise<boolean>
}

/**
 * Añade la columna `name` a un ledger heredado (creado antes de esta versión
 * del contrato, como `error_store_migrations`) y fija el nombre de cada fila
 * ya registrada con el que el código declara hoy para esa versión — una
 * versión registrada que el código no declara queda sin nombre, y
 * `assertNoNewerDatabase` la rechaza antes de que eso importe.
 */
async function adoptLegacyLedger(sql: SQL, table: string, rows: readonly LedgerRow[], migrations: readonly Migration[]): Promise<Map<number, string>> {
  await sql.unsafe(ADD_NAME_COLUMN_DDL(table))
  const applied = new Map<number, string>()
  for (const row of rows) {
    const known = migrations.find(migration => migration.version === row.version)
    if (known) await sql.unsafe(`UPDATE ${table} SET name = $1 WHERE version = $2`, [known.name, row.version])
    applied.set(row.version, known?.name ?? '')
  }
  return applied
}

async function applyPending(sql: SQL, dialect: Dialect, table: string, pending: readonly Migration[]): Promise<number[]> {
  const appliedNow: number[] = []
  for (const migration of pending) {
    try {
      const adopted = migration.alreadyApplied ? await migration.alreadyApplied(sql, dialect) : false
      await sql.begin(async tx => {
        if (!adopted) {
          for (const statement of migration.statements[dialect]) await tx.unsafe(statement)
        }
        await tx.unsafe(`INSERT INTO ${table} (version, name, applied_at) VALUES ($1, $2, $3)`, [migration.version, migration.name, new Date().toISOString()])
      })
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
 *
 * Rehúsa antes de tocar la base si la lista o el nombre de tabla están mal
 * formados (`assertValidTable`, `assertValidVersions`); rehúsa después de
 * leer la tabla de control si ésta declara una versión que la lista ya no
 * trae (`assertNoNewerDatabase`) o una versión con un nombre distinto del que
 * el código declara (`assertProvenance`).
 */
export async function runMigrations(
  sql: SQL,
  dialect: Dialect,
  options: { table: string; migrations: readonly Migration[] },
): Promise<number[]> {
  const { table, migrations } = options
  assertValidTable(table)
  assertValidVersions(migrations)

  const ledger = await readLedgerAsync(sql, dialect, table)

  if (!ledger.exists) {
    await sql.unsafe(CONTROL_TABLE_DDL(table))
    return applyPending(sql, dialect, table, migrations)
  }

  const applied = ledger.hasNameColumn
    ? new Map(ledger.rows.map(row => [row.version, row.name ?? '']))
    : await adoptLegacyLedger(sql, table, ledger.rows, migrations)

  assertNoNewerDatabase(table, new Set(applied.keys()), migrations)
  assertProvenance(table, applied, migrations)

  const pending = migrations.filter(migration => !applied.has(migration.version))
  if (pending.length === 0) return []

  return applyPending(sql, dialect, table, pending)
}
