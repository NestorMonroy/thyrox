/**
 * Lo que `runMigrations` (async, `Bun.SQL`) y `runMigrationsSync` (sync,
 * `bun:sqlite`) comparten sin diferencia entre motores: la forma de una
 * migración, la validación de la lista antes de tocar la base y el DDL de la
 * tabla de control. Vive aparte para que la validación sea UNA función, no
 * dos copias que puedan divergir entre los dos runners.
 */
import type { Dialect } from './sql.ts'

/** Una versión de esquema, con su DDL propio por motor (no es portable). */
export type Migration = { version: number; statements: Record<Dialect, string[]> }

/** El esquema de la tabla de control, común a los dos runners. */
export const CONTROL_TABLE_DDL = (table: string): string =>
  `CREATE TABLE IF NOT EXISTS ${table} (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`

/**
 * El nombre de la tabla de control va interpolado en el DDL (`CREATE TABLE
 * IF NOT EXISTS <table>`): sólo se acepta si es un identificador simple, para
 * no abrir una inyección por ese nombre.
 */
const TABLE_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/

export function assertValidTable(table: string): void {
  if (!TABLE_NAME_PATTERN.test(table)) {
    throw new Error(`invalid migrations table name '${table}': expected a simple identifier matching ${TABLE_NAME_PATTERN}`)
  }
}

/**
 * Enteros positivos, sin repetir y en orden ascendente — el orden en que se
 * aplican es el orden de la lista, así que una lista desordenada aplicaría
 * fuera de secuencia sin decirlo.
 */
export function assertValidVersions(migrations: readonly Migration[]): void {
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
 * Rehúsa si la tabla de control declara una versión que la lista ya no
 * trae — eso es una base más nueva que el código que la abre.
 */
export function assertNoNewerDatabase(table: string, applied: ReadonlySet<number>, migrations: readonly Migration[]): void {
  const declared = new Set(migrations.map(migration => migration.version))
  for (const version of applied) {
    if (!declared.has(version)) {
      throw new Error(
        `migrations table '${table}' has version ${version} applied, which is no longer declared in this migration list (database is newer than code)`,
      )
    }
  }
}

/** El mensaje de una migración que falla, con su versión y causa — igual en los dos runners. */
export function migrationFailedError(version: number, cause: unknown): Error {
  return new Error(`migration version ${version} failed: ${cause instanceof Error ? cause.message : String(cause)}`, { cause })
}
