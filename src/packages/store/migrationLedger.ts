/**
 * Lectura del ledger de migraciones, de sólo lectura y sin diferencia entre
 * motores más allá del dialecto — compartida por `runMigrations`,
 * `runMigrationsSync` y por `validateMigrationLedger`/`validateMigrationLedgerSync`,
 * que la usan para decidir sin escribir nada.
 */
import type { SQL } from 'bun'
import type { Database } from 'bun:sqlite'

import type { Dialect } from './sql.ts'
import { assertNoNewerDatabase, assertProvenance, assertValidTable, assertValidVersions, type Migration } from './migrationContract.ts'

export type LedgerRow = { version: number; name: string | null }

/**
 * `exists` dice si la tabla de control ya existe; `hasNameColumn`, si trae la
 * columna `name` (un ledger heredado, como `error_store_migrations`, no la
 * trae, y `name` viene `null` en cada fila); `rows`, lo que hay registrado.
 */
export type LedgerState = { exists: boolean; hasNameColumn: boolean; rows: LedgerRow[] }

async function tableExistsAsync(sql: SQL, dialect: Dialect, table: string): Promise<boolean> {
  if (dialect === 'postgres') {
    const [row] = (await sql.unsafe('SELECT to_regclass($1) IS NOT NULL AS found', [table])) as { found: boolean }[]
    return Boolean(row?.found)
  }
  const rows = (await sql.unsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name = $1`, [table])) as { name: string }[]
  return rows.length > 0
}

async function hasNameColumnAsync(sql: SQL, dialect: Dialect, table: string): Promise<boolean> {
  if (dialect === 'postgres') {
    const rows = (await sql.unsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema() AND column_name = 'name'`,
      [table],
    )) as { column_name: string }[]
    return rows.length > 0
  }
  const rows = (await sql.unsafe(`PRAGMA table_info(${table})`)) as { name: string }[]
  return rows.some(row => row.name === 'name')
}

/** Lee el estado del ledger sin escribir nada — usado por el runner async y por `validateMigrationLedger`. */
export async function readLedgerAsync(sql: SQL, dialect: Dialect, table: string): Promise<LedgerState> {
  const exists = await tableExistsAsync(sql, dialect, table)
  if (!exists) return { exists: false, hasNameColumn: false, rows: [] }

  if (!(await hasNameColumnAsync(sql, dialect, table))) {
    const rows = (await sql.unsafe(`SELECT version FROM ${table}`)) as { version: number | string }[]
    return { exists: true, hasNameColumn: false, rows: rows.map(row => ({ version: Number(row.version), name: null })) }
  }
  const rows = (await sql.unsafe(`SELECT version, name FROM ${table}`)) as { version: number | string; name: string | null }[]
  return { exists: true, hasNameColumn: true, rows: rows.map(row => ({ version: Number(row.version), name: row.name })) }
}

function tableExistsSync(db: Database, table: string): boolean {
  return db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(table) !== null
}

function hasNameColumnSync(db: Database, table: string): boolean {
  const columns = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return columns.some(column => column.name === 'name')
}

/** Lee el estado del ledger sin escribir nada — usado por el runner sync y por `validateMigrationLedgerSync`. */
export function readLedgerSync(db: Database, table: string): LedgerState {
  if (!tableExistsSync(db, table)) return { exists: false, hasNameColumn: false, rows: [] }

  if (!hasNameColumnSync(db, table)) {
    const rows = db.query(`SELECT version FROM ${table}`).all() as { version: number }[]
    return { exists: true, hasNameColumn: false, rows: rows.map(row => ({ version: Number(row.version), name: null })) }
  }
  const rows = db.query(`SELECT version, name FROM ${table}`).all() as { version: number; name: string | null }[]
  return { exists: true, hasNameColumn: true, rows: rows.map(row => ({ version: Number(row.version), name: row.name })) }
}

const LEDGER_MISSING_PREFIX = 'store requires initialization or migration'

function assertFullyApplied(table: string, applied: ReadonlyMap<number, string>, migrations: readonly Migration[]): void {
  for (const migration of migrations) {
    if (!applied.has(migration.version)) {
      throw new Error(`${LEDGER_MISSING_PREFIX}: version ${migration.version} ('${migration.name}') is not applied in table '${table}'`)
    }
  }
}

/**
 * Confirma, sin escribir nada, que `table` tiene aplicadas exactamente las
 * versiones que `migrations` declara, con el nombre que el código espera —
 * para un consumidor que abre la base y no corre migraciones él mismo.
 * Rehúsa si el ledger no existe, si trae una versión desconocida o con
 * nombre distinto, o si falta alguna versión que `migrations` exige.
 */
export async function validateMigrationLedger(sql: SQL, dialect: Dialect, options: { table: string; migrations: readonly Migration[] }): Promise<void> {
  const { table, migrations } = options
  assertValidTable(table)
  assertValidVersions(migrations)

  const ledger = await readLedgerAsync(sql, dialect, table)
  if (!ledger.exists) {
    throw new Error(`${LEDGER_MISSING_PREFIX}: migrations table '${table}' does not exist`)
  }
  const applied = new Map(ledger.rows.map(row => [row.version, row.name ?? '']))
  assertNoNewerDatabase(table, new Set(applied.keys()), migrations)
  assertProvenance(table, applied, migrations)
  assertFullyApplied(table, applied, migrations)
}

/** Igual que `validateMigrationLedger`, sync, para quien abre la base con `bun:sqlite`. */
export function validateMigrationLedgerSync(db: Database, options: { table: string; migrations: readonly Migration[] }): void {
  const { table, migrations } = options
  assertValidTable(table)
  assertValidVersions(migrations)

  const ledger = readLedgerSync(db, table)
  if (!ledger.exists) {
    throw new Error(`${LEDGER_MISSING_PREFIX}: migrations table '${table}' does not exist`)
  }
  const applied = new Map(ledger.rows.map(row => [row.version, row.name ?? '']))
  assertNoNewerDatabase(table, new Set(applied.keys()), migrations)
  assertProvenance(table, applied, migrations)
  assertFullyApplied(table, applied, migrations)
}
