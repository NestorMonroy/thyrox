/**
 * El contrato de `migrationRunnerContract.ts`, aplicado a las dos
 * implementaciones que `@thyrox/store` ofrece hoy: `runMigrationsSync`
 * (sync, `bun:sqlite`) y `runMigrations` (async, `Bun.SQL`) sobre SQLite y,
 * si `THYROX_TEST_POSTGRES_URL` está declarada, sobre PostgreSQL — misma
 * forma de tres ramas que `contract.test.ts` ya usa para `sql.ts`.
 */
import { Database } from 'bun:sqlite'
import { SQL } from 'bun'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, test } from 'bun:test'

import { openByUrl } from '../sql.ts'
import { runMigrations, type Migration as AsyncMigration } from '../migrations.ts'
import { runMigrationsSync, type Migration as SyncMigration } from '../migrationsSync.ts'
import { validateMigrationLedger, validateMigrationLedgerSync } from '../migrationLedger.ts'
import { resolvePostgresTestUrl, withDisposableSchema } from '../testing/postgresTestSchema.ts'
import { defineMigrationRunnerContract, type MigrationRunnerEngine } from './migrationRunnerContract.ts'

/** El DDL heredado (sin `name`), portable entre sqlite y postgres. */
const LEGACY_LEDGER_DDL = (table: string): string => `CREATE TABLE ${table} (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`

function syncSqliteEngine(db: Database): MigrationRunnerEngine {
  return {
    async run(options) {
      return runMigrationsSync(db, options)
    },
    async tableExists(name) {
      return db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(name) !== null
    },
    async controlColumns(table) {
      return db.query(`PRAGMA table_info(${table})`).all() as { name: string; notnull: number; pk: number }[]
    },
    async controlVersions(table) {
      return (db.query(`SELECT version FROM ${table} ORDER BY version`).all() as { version: number }[]).map(row => Number(row.version))
    },
    async controlNames(table) {
      const rows = db.query(`SELECT version, name FROM ${table} ORDER BY version`).all() as { version: number; name: string }[]
      return Object.fromEntries(rows.map(row => [Number(row.version), row.name]))
    },
    async seqLabels() {
      return (db.query(`SELECT label FROM seq ORDER BY id`).all() as { label: string }[]).map(row => row.label)
    },
    async runWithAdoptionProbe({ table, probeVersion, probeName, probeTable }) {
      const migrations: readonly SyncMigration[] = [
        {
          version: probeVersion,
          name: probeName,
          statements: { sqlite: [`CREATE TABLE ${probeTable} (id INTEGER PRIMARY KEY)`], postgres: [] },
          alreadyApplied: probeDb => probeDb.query(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(probeTable) !== null,
        },
      ]
      return runMigrationsSync(db, { table, migrations })
    },
    async createTableDirectly(tableName) {
      db.run(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY)`)
    },
    async seedLegacyLedger(table, rows) {
      db.run(LEGACY_LEDGER_DDL(table))
      for (const row of rows) db.run(`INSERT INTO ${table} (version, applied_at) VALUES (?, ?)`, [row.version, row.appliedAt])
    },
    async validateLedger(options) {
      validateMigrationLedgerSync(db, options)
    },
  }
}

function asyncEngine(sql: SQL, dialect: 'sqlite' | 'postgres'): MigrationRunnerEngine {
  return {
    async run(options) {
      return runMigrations(sql, dialect, options)
    },
    async tableExists(name) {
      if (dialect === 'postgres') {
        const [row] = (await sql`SELECT to_regclass(${name}) IS NOT NULL AS found`) as { found: boolean }[]
        return Boolean(row?.found)
      }
      const rows = (await sql.unsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name = $1`, [name])) as { name: string }[]
      return rows.length > 0
    },
    async controlColumns(table) {
      if (dialect === 'postgres') {
        // `information_schema.columns` no filtra por `search_path`: sin
        // `table_schema = current_schema()` vería también las tablas
        // homónimas de otro esquema de prueba desechable.
        const rows = (await sql`
          SELECT c.column_name AS name,
                 (c.is_nullable = 'NO')::int AS notnull,
                 (pk.column_name IS NOT NULL)::int AS pk
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name
            WHERE tc.table_name = ${table} AND tc.constraint_type = 'PRIMARY KEY'
          ) pk ON pk.column_name = c.column_name
          WHERE c.table_name = ${table} AND c.table_schema = current_schema()
        `) as { name: string; notnull: number; pk: number }[]
        return rows.map(row => ({ name: row.name, notnull: Number(row.notnull), pk: Number(row.pk) }))
      }
      return (await sql.unsafe(`PRAGMA table_info(${table})`)) as { name: string; notnull: number; pk: number }[]
    },
    async controlVersions(table) {
      const rows = (await sql.unsafe(`SELECT version FROM ${table} ORDER BY version`)) as { version: number | string }[]
      return rows.map(row => Number(row.version))
    },
    async controlNames(table) {
      const rows = (await sql.unsafe(`SELECT version, name FROM ${table} ORDER BY version`)) as { version: number | string; name: string }[]
      return Object.fromEntries(rows.map(row => [Number(row.version), row.name]))
    },
    async seqLabels() {
      const rows = (await sql.unsafe(`SELECT label FROM seq ORDER BY id`)) as { label: string }[]
      return rows.map(row => row.label)
    },
    async runWithAdoptionProbe({ table, probeVersion, probeName, probeTable }) {
      const createProbeTable =
        dialect === 'postgres' ? `CREATE TABLE ${probeTable} (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY)` : `CREATE TABLE ${probeTable} (id INTEGER PRIMARY KEY)`
      const migrations: readonly AsyncMigration[] = [
        {
          version: probeVersion,
          name: probeName,
          statements: { sqlite: dialect === 'sqlite' ? [createProbeTable] : [], postgres: dialect === 'postgres' ? [createProbeTable] : [] },
          alreadyApplied: async probeSql => {
            if (dialect === 'postgres') {
              const [row] = (await probeSql.unsafe('SELECT to_regclass($1) IS NOT NULL AS found', [probeTable])) as { found: boolean }[]
              return Boolean(row?.found)
            }
            const rows = (await probeSql.unsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name = $1`, [probeTable])) as { name: string }[]
            return rows.length > 0
          },
        },
      ]
      return runMigrations(sql, dialect, { table, migrations })
    },
    async createTableDirectly(tableName) {
      const ddl = dialect === 'postgres' ? `CREATE TABLE ${tableName} (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY)` : `CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY)`
      await sql.unsafe(ddl)
    },
    async seedLegacyLedger(table, rows) {
      await sql.unsafe(LEGACY_LEDGER_DDL(table))
      for (const row of rows) await sql.unsafe(`INSERT INTO ${table} (version, applied_at) VALUES ($1, $2)`, [row.version, row.appliedAt])
    },
    async validateLedger(options) {
      await validateMigrationLedger(sql, dialect, options)
    },
  }
}

defineMigrationRunnerContract({
  name: 'sync — bun:sqlite (runMigrationsSync)',
  async withEngine(body) {
    const db = new Database(':memory:')
    try {
      await body(syncSqliteEngine(db))
    } finally {
      db.close()
    }
  },
  async withConcurrentWriteLock(options, duringLock) {
    const dir = mkdtempSync(join(tmpdir(), 'thyrox-migrations-sync-'))
    const file = join(dir, 'db.sqlite')
    try {
      const db = new Database(file)
      try {
        runMigrationsSync(db, options)
        const holder = new Database(file)
        try {
          holder.run('BEGIN IMMEDIATE')
          await duringLock(syncSqliteEngine(db))
        } finally {
          holder.run('COMMIT')
          holder.close()
        }
      } finally {
        db.close()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  },
})

defineMigrationRunnerContract({
  name: 'async — sqlite vía Bun.SQL (runMigrations)',
  async withEngine(body) {
    const { sql } = openByUrl('sqlite://:memory:')
    try {
      await body(asyncEngine(sql, 'sqlite'))
    } finally {
      await sql.close()
    }
  },
  async withConcurrentWriteLock(options, duringLock) {
    const dir = mkdtempSync(join(tmpdir(), 'thyrox-migrations-async-sqlite-'))
    const file = join(dir, 'db.sqlite')
    try {
      const sql = new SQL(`sqlite://${file}`)
      try {
        await runMigrations(sql, 'sqlite', options)
        const holder = new Database(file)
        try {
          holder.run('BEGIN IMMEDIATE')
          await duringLock(asyncEngine(sql, 'sqlite'))
        } finally {
          holder.run('COMMIT')
          holder.close()
        }
      } finally {
        await sql.close()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  },
})

let postgresUrl: string | null = null
let postgresUrlError: Error | null = null
try {
  postgresUrl = resolvePostgresTestUrl(process.env)
} catch (e) {
  postgresUrlError = e instanceof Error ? e : new Error(String(e))
}

if (postgresUrlError) {
  // La variable está declarada pero mal escrita: eso no es "no medido", es un
  // dato roto, y se dice en rojo en vez de tratarlo como ausencia silenciosa.
  const error = postgresUrlError
  describe('contrato del runner de migraciones — async — postgres', () => {
    test(`THYROX_TEST_POSTGRES_URL inválida: ${error.message}`, () => {
      throw error
    })
  })
} else if (postgresUrl) {
  const url = postgresUrl
  defineMigrationRunnerContract({
    name: 'async — postgres vía Bun.SQL (runMigrations)',
    async withEngine(body) {
      await withDisposableSchema(url, async sql => body(asyncEngine(sql, 'postgres')))
    },
    // El equivalente del `BEGIN IMMEDIATE` de SQLite: otra conexión, fuera del
    // pool, retiene `LOCK TABLE … IN EXCLUSIVE MODE` sobre la tabla de control.
    // Ese modo choca con el ROW EXCLUSIVE de una escritura y no con el ACCESS
    // SHARE de una lectura. El runner corre sobre un pool con `lock_timeout`
    // propio: una escritura que no debiera abrirse falla en segundos en vez de
    // esperar para siempre.
    async withConcurrentWriteLock(options, duringLock) {
      await withDisposableSchema(url, async sql => {
        await runMigrations(sql, 'postgres', options)
        const [{ schema }] = await sql.unsafe('SELECT current_schema() AS schema')
        const holder = new SQL({ url, max: 1, connection: { search_path: schema } })
        const runner = new SQL({ url, connection: { search_path: schema, lock_timeout: '2000' } })
        try {
          await holder.begin(async tx => {
            await tx.unsafe(`LOCK TABLE ${options.table} IN EXCLUSIVE MODE`)
            await duringLock(asyncEngine(runner, 'postgres'))
          })
        } finally {
          await runner.close()
          await holder.close()
        }
      })
    },
  })
} else if (process.env.THYROX_TEST_REQUIRE_POSTGRES === '1') {
  describe('contrato del runner de migraciones — async — postgres', () => {
    test('THYROX_TEST_REQUIRE_POSTGRES=1 exige el contrato en postgres, y THYROX_TEST_POSTGRES_URL no está declarada', () => {
      throw new Error('THYROX_TEST_REQUIRE_POSTGRES=1 exige THYROX_TEST_POSTGRES_URL, que no está declarada')
    })
  })
} else {
  describe('contrato del runner de migraciones — async — postgres', () => {
    test.todo('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correr el contrato en postgres', () => {})
  })
}
