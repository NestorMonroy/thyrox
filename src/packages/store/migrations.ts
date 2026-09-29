/**
 * Runner de migraciones común, para cualquier store de thyrox sobre
 * `Bun.SQL`. Misma forma que `local-observability/errorStore/migrations.ts`
 * (una versión por transacción, con su fila de control) generalizada: la
 * tabla de control y la lista de migraciones las declara el llamador en vez
 * de vivir fijas en el módulo — así deja de ser un mecanismo por dominio.
 *
 * La validación de la lista y el DDL de control viven en
 * `migrationContract.ts`, compartidos con `runMigrationsSync` — la misma
 * regla no se escribe dos veces para los dos motores.
 */
import type { SQL } from 'bun'

import type { Dialect } from './sql.ts'
import { assertNoNewerDatabase, assertValidTable, assertValidVersions, CONTROL_TABLE_DDL, migrationFailedError, type Migration } from './migrationContract.ts'

export type { Migration }

/**
 * Aplica las versiones que falten, en orden ascendente, cada una en su
 * propia transacción junto con su fila de control. Devuelve las versiones
 * aplicadas EN ESTA LLAMADA — una segunda llamada, sin nada nuevo que
 * aplicar, devuelve `[]`.
 *
 * Rehúsa antes de tocar la base si la lista o el nombre de tabla están mal
 * formados (`assertValidTable`, `assertValidVersions`); rehúsa después de
 * leer la tabla de control si ésta declara una versión que la lista ya no
 * trae, porque eso es una base más nueva que el código que la abre.
 */
export async function runMigrations(
  sql: SQL,
  dialect: Dialect,
  options: { table: string; migrations: readonly Migration[] },
): Promise<number[]> {
  const { table, migrations } = options
  assertValidTable(table)
  assertValidVersions(migrations)

  await sql.unsafe(CONTROL_TABLE_DDL(table))
  const rows = (await sql.unsafe(`SELECT version FROM ${table}`)) as { version: number | string }[]
  const applied = new Set(rows.map(row => Number(row.version)))
  assertNoNewerDatabase(table, applied, migrations)

  const appliedNow: number[] = []
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue
    try {
      await sql.begin(async tx => {
        for (const statement of migration.statements[dialect]) await tx.unsafe(statement)
        await tx.unsafe(`INSERT INTO ${table} (version, applied_at) VALUES ($1, $2)`, [migration.version, new Date().toISOString()])
      })
    } catch (e) {
      throw migrationFailedError(migration.version, e)
    }
    appliedNow.push(migration.version)
  }
  return appliedNow
}
