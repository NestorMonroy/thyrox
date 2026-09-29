/**
 * El contrato de `migrationRunnerContract.ts`, aplicado a las dos
 * implementaciones que `@thyrox/store` ofrece hoy: `runMigrationsSync`
 * (sync, `bun:sqlite`) y `runMigrations` (async, `Bun.SQL`) sobre SQLite y,
 * si `THYROX_TEST_POSTGRES_URL` está declarada, sobre PostgreSQL — misma
 * forma de tres ramas que `contract.test.ts` ya usa para `sql.ts`.
 */
import { Database } from 'bun:sqlite'
import type { SQL } from 'bun'
import { describe, test } from 'bun:test'

import { openByUrl } from '../sql.ts'
import { runMigrations } from '../migrations.ts'
import { runMigrationsSync } from '../migrationsSync.ts'
import { resolvePostgresTestUrl, withDisposableSchema } from '../testing/postgresTestSchema.ts'
import { defineMigrationRunnerContract, type MigrationRunnerEngine } from './migrationRunnerContract.ts'

function syncSqliteEngine(db: Database): MigrationRunnerEngine {
  return {
    async run(options) {
      return runMigrationsSync(db, options)
    },
    async tableExists(name) {
      return (db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).all(name) as { name: string }[]).length > 0
    },
    async controlColumns(table) {
      return db.query(`PRAGMA table_info(${table})`).all() as { name: string; notnull: number; pk: number }[]
    },
    async controlVersions(table) {
      return (db.query(`SELECT version FROM ${table} ORDER BY version`).all() as { version: number }[]).map(row => Number(row.version))
    },
    async seqLabels() {
      return (db.query(`SELECT label FROM seq ORDER BY id`).all() as { label: string }[]).map(row => row.label)
    },
  }
}

function asyncSqliteEngine(sql: SQL): MigrationRunnerEngine {
  return {
    async run(options) {
      return runMigrations(sql, 'sqlite', options)
    },
    async tableExists(name) {
      const rows = (await sql.unsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name = $1`, [name])) as { name: string }[]
      return rows.length > 0
    },
    async controlColumns(table) {
      return (await sql.unsafe(`PRAGMA table_info(${table})`)) as { name: string; notnull: number; pk: number }[]
    },
    async controlVersions(table) {
      const rows = (await sql.unsafe(`SELECT version FROM ${table} ORDER BY version`)) as { version: number }[]
      return rows.map(row => Number(row.version))
    },
    async seqLabels() {
      const rows = (await sql.unsafe(`SELECT label FROM seq ORDER BY id`)) as { label: string }[]
      return rows.map(row => row.label)
    },
  }
}

/**
 * `information_schema.columns` no filtra por `search_path`: sin
 * `table_schema = current_schema()` vería también las tablas homónimas de
 * otro esquema de prueba desechable.
 */
function asyncPostgresEngine(sql: SQL): MigrationRunnerEngine {
  return {
    async run(options) {
      return runMigrations(sql, 'postgres', options)
    },
    async tableExists(name) {
      const [row] = (await sql`SELECT to_regclass(${name}) IS NOT NULL AS found`) as { found: boolean }[]
      return Boolean(row?.found)
    },
    async controlColumns(table) {
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
    },
    async controlVersions(table) {
      const rows = (await sql.unsafe(`SELECT version FROM ${table} ORDER BY version`)) as { version: number | string }[]
      return rows.map(row => Number(row.version))
    },
    async seqLabels() {
      const rows = (await sql`SELECT label FROM seq ORDER BY id`) as { label: string }[]
      return rows.map(row => row.label)
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
})

defineMigrationRunnerContract({
  name: 'async — sqlite vía Bun.SQL (runMigrations)',
  async withEngine(body) {
    const { sql } = openByUrl('sqlite://:memory:')
    try {
      await body(asyncSqliteEngine(sql))
    } finally {
      await sql.close()
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
      await withDisposableSchema(url, async sql => body(asyncPostgresEngine(sql)))
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
