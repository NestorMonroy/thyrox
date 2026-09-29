/**
 * El runner de migraciones común (`runMigrations`), sobre sqlite en memoria.
 * La cobertura de postgres vive en el ítem de contrato — aquí sólo sqlite.
 */
import { describe, expect, test } from 'bun:test'
import type { SQL } from 'bun'
import { openByUrl } from '../sql.ts'
import { runMigrations, type Migration } from '../migrations.ts'

function memory() {
  return openByUrl('sqlite://:memory:')
}

async function tableExists(sql: SQL, name: string): Promise<boolean> {
  const rows = (await sql.unsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name = $1`, [name])) as { name: string }[]
  return rows.length > 0
}

async function controlVersions(sql: SQL, table: string): Promise<number[]> {
  const rows = (await sql.unsafe(`SELECT version FROM ${table} ORDER BY version`)) as { version: number }[]
  return rows.map(row => Number(row.version))
}

describe('runMigrations crea la tabla de control si falta', () => {
  test('con una lista vacía, la tabla nace con version y applied_at', async () => {
    const { sql, dialect } = memory()
    const applied = await runMigrations(sql, dialect, { table: 'schema_migrations', migrations: [] })
    expect(applied).toEqual([])
    expect(await tableExists(sql, 'schema_migrations')).toBe(true)
    const columns = (await sql.unsafe('PRAGMA table_info(schema_migrations)')) as { name: string; notnull: number; pk: number }[]
    const byName = Object.fromEntries(columns.map(c => [c.name, c]))
    expect(byName.version?.pk).toBe(1)
    expect(byName.applied_at?.notnull).toBe(1)
  })
})

describe('runMigrations aplica sólo las versiones que faltan, en orden ascendente', () => {
  const migrations: readonly Migration[] = [
    { version: 1, statements: { sqlite: ['CREATE TABLE seq (label TEXT)', `INSERT INTO seq VALUES ('v1')`], postgres: [] } },
    {
      version: 2,
      // depende de que 'seq' ya exista: si el runner aplicara fuera de orden esto fallaría.
      statements: { sqlite: [`INSERT INTO seq VALUES ('v2')`], postgres: [] },
    },
  ]

  test('la primera llamada aplica las dos versiones, en orden, y las devuelve', async () => {
    const { sql, dialect } = memory()
    const applied = await runMigrations(sql, dialect, { table: 'schema_migrations', migrations })
    expect(applied).toEqual([1, 2])
    const rows = (await sql.unsafe('SELECT label FROM seq ORDER BY rowid')) as { label: string }[]
    expect(rows.map(r => r.label)).toEqual(['v1', 'v2'])
    expect(await controlVersions(sql, 'schema_migrations')).toEqual([1, 2])
  })

  test('una segunda llamada con la misma lista es idempotente: no aplica nada y devuelve []', async () => {
    const { sql, dialect } = memory()
    await runMigrations(sql, dialect, { table: 'schema_migrations', migrations })
    const second = await runMigrations(sql, dialect, { table: 'schema_migrations', migrations })
    expect(second).toEqual([])
    // CONTROL: la versión 1 usa `CREATE TABLE seq` sin IF NOT EXISTS. Si la
    // guarda de "ya aplicada" (`if (applied.has(version)) continue`) se retira,
    // esta segunda llamada intenta recrear 'seq' y lanza en vez de devolver [].
  })

  test('una lista extendida sólo aplica la versión nueva', async () => {
    const { sql, dialect } = memory()
    await runMigrations(sql, dialect, { table: 'schema_migrations', migrations })
    const extended: readonly Migration[] = [
      ...migrations,
      { version: 3, statements: { sqlite: [`INSERT INTO seq VALUES ('v3')`], postgres: [] } },
    ]
    const third = await runMigrations(sql, dialect, { table: 'schema_migrations', migrations: extended })
    expect(third).toEqual([3])
    expect(await controlVersions(sql, 'schema_migrations')).toEqual([1, 2, 3])
  })
})

describe('runMigrations es transaccional: una sentencia que falla no deja rastro', () => {
  test('el error nombra la versión y ni la tabla de control ni el DDL previo de esa versión quedan', async () => {
    const { sql, dialect } = memory()
    const migrations: readonly Migration[] = [
      {
        version: 7,
        statements: {
          sqlite: ['CREATE TABLE rollback_check (x INTEGER)', 'THIS IS NOT VALID SQL'],
          postgres: [],
        },
      },
    ]
    await expect(runMigrations(sql, dialect, { table: 'schema_migrations', migrations })).rejects.toThrow(/version 7/)
    expect(await tableExists(sql, 'rollback_check')).toBe(false)
    expect(await controlVersions(sql, 'schema_migrations')).toEqual([])
  })
})

describe('runMigrations rehúsa una lista mal formada ANTES de tocar la base', () => {
  test('versiones duplicadas', async () => {
    const { sql, dialect } = memory()
    const migrations: readonly Migration[] = [
      { version: 1, statements: { sqlite: [], postgres: [] } },
      { version: 1, statements: { sqlite: [], postgres: [] } },
    ]
    await expect(runMigrations(sql, dialect, { table: 'schema_migrations', migrations })).rejects.toThrow(/duplicate.*1/i)
    expect(await tableExists(sql, 'schema_migrations')).toBe(false)
  })

  test('una versión no entera o no positiva (cero, negativa, fraccionaria)', async () => {
    const { sql, dialect } = memory()
    for (const bad of [0, -1, 1.5]) {
      const migrations: readonly Migration[] = [{ version: bad, statements: { sqlite: [], postgres: [] } }]
      await expect(runMigrations(sql, dialect, { table: 'schema_migrations', migrations })).rejects.toThrow(/positive integer/)
    }
    expect(await tableExists(sql, 'schema_migrations')).toBe(false)
  })

  test('versiones desordenadas', async () => {
    const { sql, dialect } = memory()
    const migrations: readonly Migration[] = [
      { version: 2, statements: { sqlite: [], postgres: [] } },
      { version: 1, statements: { sqlite: [], postgres: [] } },
    ]
    await expect(runMigrations(sql, dialect, { table: 'schema_migrations', migrations })).rejects.toThrow(/order/i)
    expect(await tableExists(sql, 'schema_migrations')).toBe(false)
  })

  test('un nombre de tabla de control que no es un identificador simple', async () => {
    const { sql, dialect } = memory()
    for (const badTable of ['schema-migrations', 'Schema_Migrations', '1schema', 'schema; DROP TABLE t; --', '']) {
      await expect(runMigrations(sql, dialect, { table: badTable, migrations: [] })).rejects.toThrow(/identifier/)
    }
  })
})

describe('runMigrations rehúsa una base más nueva que el código', () => {
  test('una versión registrada que ya no está en la lista se nombra en el error', async () => {
    const { sql, dialect } = memory()
    const migrations: readonly Migration[] = [
      { version: 1, statements: { sqlite: [], postgres: [] } },
      { version: 2, statements: { sqlite: [], postgres: [] } },
    ]
    await runMigrations(sql, dialect, { table: 'schema_migrations', migrations })
    const olderCode: readonly Migration[] = [migrations[0]!]
    await expect(runMigrations(sql, dialect, { table: 'schema_migrations', migrations: olderCode })).rejects.toThrow(/version 2/)
  })
})
