/**
 * Runner de migraciones común, para cualquier store de thyrox sobre
 * `Bun.SQL`. Misma forma que `local-observability/errorStore/migrations.ts`
 * (una versión por transacción, con su fila de control) generalizada: la
 * tabla de control y la lista de migraciones las declara el llamador en vez
 * de vivir fijas en el módulo — así deja de ser un mecanismo por dominio.
 */
import type { SQL } from 'bun'

import type { Dialect } from './sql.ts'

/** Una versión de esquema, con su DDL propio por motor (no es portable). */
export type Migration = { version: number; statements: Record<Dialect, string[]> }

/**
 * El nombre de la tabla de control va interpolado en el DDL (`CREATE TABLE
 * IF NOT EXISTS <table>`): sólo se acepta si es un identificador simple, para
 * no abrir una inyección por ese nombre.
 */
const TABLE_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/

function assertValidTable(table: string): void {
  if (!TABLE_NAME_PATTERN.test(table)) {
    throw new Error(`invalid migrations table name '${table}': expected a simple identifier matching ${TABLE_NAME_PATTERN}`)
  }
}

/**
 * Enteros positivos, sin repetir y en orden ascendente — el orden en que se
 * aplican es el orden de la lista, así que una lista desordenada aplicaría
 * fuera de secuencia sin decirlo.
 */
function assertValidVersions(migrations: readonly Migration[]): void {
  const seen = new Set<number>()
  for (const { version } of migrations) {
    if (!Number.isInteger(version) || version <= 0) {
      throw new Error(`invalid migration version ${version}: expected a positive integer`)
    }
    if (seen.has(version)) throw new Error(`duplicate migration version ${version}`)
    seen.add(version)
  }
  for (let i = 1; i < migrations.length; i++) {
    const previous = migrations[i - 1]!.version
    const current = migrations[i]!.version
    if (current < previous) {
      throw new Error(`migrations out of order: version ${current} follows version ${previous}, expected ascending order`)
    }
  }
}

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

  await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`)
  const rows = (await sql.unsafe(`SELECT version FROM ${table}`)) as { version: number | string }[]
  const applied = new Set(rows.map(row => Number(row.version)))

  const declared = new Set(migrations.map(migration => migration.version))
  for (const version of applied) {
    if (!declared.has(version)) {
      throw new Error(
        `migrations table '${table}' has version ${version} applied, which is no longer declared in this migration list (database is newer than code)`,
      )
    }
  }

  const appliedNow: number[] = []
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue
    try {
      await sql.begin(async tx => {
        for (const statement of migration.statements[dialect]) await tx.unsafe(statement)
        await tx.unsafe(`INSERT INTO ${table} (version, applied_at) VALUES ($1, $2)`, [migration.version, new Date().toISOString()])
      })
    } catch (e) {
      throw new Error(`migration version ${migration.version} failed: ${e instanceof Error ? e.message : String(e)}`, { cause: e })
    }
    appliedNow.push(migration.version)
  }
  return appliedNow
}
