/**
 * Lo que `runMigrations` (async, `Bun.SQL`) y `runMigrationsSync` (sync,
 * `bun:sqlite`) comparten sin diferencia entre motores: la forma de una
 * migración, la validación de la lista antes de tocar la base y el DDL de la
 * tabla de control. Vive aparte para que la validación sea UNA función, no
 * dos copias que puedan divergir entre los dos runners.
 */
import type { Dialect } from './sql.ts'

/** Una versión de esquema, con su DDL propio por motor (no es portable). */
export type Migration = { version: number; name: string; statements: Record<Dialect, string[]> }

/** El esquema de la tabla de control, común a los dos runners. */
export const CONTROL_TABLE_DDL = (table: string): string =>
  `CREATE TABLE IF NOT EXISTS ${table} (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`

/**
 * Adopta un ledger heredado (creado antes de la columna `name`, como
 * `error_store_migrations`): añade la columna, sin fijar aún ningún valor —
 * el llamador la rellena por versión, porque sólo él sabe qué nombre le
 * corresponde a cada una en el código de hoy.
 */
export const ADD_NAME_COLUMN_DDL = (table: string): string => `ALTER TABLE ${table} ADD COLUMN name TEXT`

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
 * fuera de secuencia sin decirlo. El nombre es el identificador estable de
 * provenance: no puede faltar ni repetirse, porque dos versiones con el
 * mismo nombre dejarían de poder distinguirse en el ledger.
 */
export function assertValidVersions(migrations: readonly Migration[]): void {
  const seenVersions = new Set<number>()
  const seenNames = new Set<string>()
  for (const { version, name } of migrations) {
    if (!Number.isInteger(version) || version <= 0) {
      throw new Error(`invalid migration version ${version}: expected a positive integer`)
    }
    if (seenVersions.has(version)) throw new Error(`duplicate migration version ${version}`)
    seenVersions.add(version)

    if (!name || name.trim() === '') {
      throw new Error(`invalid migration name for version ${version}: expected a non-empty identifier`)
    }
    if (seenNames.has(name)) throw new Error(`duplicate migration name '${name}'`)
    seenNames.add(name)
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

/**
 * Rehúsa si el ledger registra una versión bajo un nombre distinto del que
 * declara el código — llamar DESPUÉS de `assertNoNewerDatabase`, que ya
 * garantiza que toda versión de `ledger` está en `migrations`.
 */
export function assertProvenance(table: string, ledger: ReadonlyMap<number, string>, migrations: readonly Migration[]): void {
  const codeNameByVersion = new Map(migrations.map(migration => [migration.version, migration.name]))
  for (const [version, registeredName] of ledger) {
    const codeName = codeNameByVersion.get(version)
    if (codeName !== undefined && codeName !== registeredName) {
      throw new Error(
        `migrations table '${table}' has version ${version} registered as '${registeredName}', but the code declares it as '${codeName}' (provenance mismatch)`,
      )
    }
  }
}

/** El mensaje de una migración que falla, con su versión y causa — igual en los dos runners. */
export function migrationFailedError(version: number, cause: unknown): Error {
  return new Error(`migration version ${version} failed: ${cause instanceof Error ? cause.message : String(cause)}`, { cause })
}
