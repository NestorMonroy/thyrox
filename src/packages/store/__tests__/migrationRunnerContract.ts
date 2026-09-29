/**
 * El contrato de un runner de migraciones, el mismo para cada implementación:
 * `runMigrations` (async, `Bun.SQL`) y `runMigrationsSync` (sync,
 * `bun:sqlite`). Cada motor (`migrations.test.ts`) corre esta suite contra un
 * `MigrationRunnerAdapter` propio — misma forma que
 * `errorStoreContract.ts::defineErrorStoreContract` un nivel más abajo.
 */
import { describe, expect, test } from 'bun:test'

import type { Migration } from '../migrationContract.ts'

/** Lo que la suite necesita de un motor concreto, sin saber si es sync o async por debajo. */
export type MigrationRunnerEngine = {
  run(options: { table: string; migrations: readonly Migration[] }): Promise<number[]>
  tableExists(name: string): Promise<boolean>
  controlColumns(table: string): Promise<{ name: string; notnull: number; pk: number }[]>
  controlVersions(table: string): Promise<number[]>
  /** Las etiquetas de la tabla `seq` que las migraciones de la suite escriben, en orden de inserción. */
  seqLabels(): Promise<string[]>
}

export type MigrationRunnerAdapter = {
  name: string
  /** Abre un motor fresco, corre `body` y lo libera — también si `body` lanza. */
  withEngine(body: (engine: MigrationRunnerEngine) => Promise<void>): Promise<void>
}

const SEQ_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    statements: {
      sqlite: ['CREATE TABLE seq (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT)', `INSERT INTO seq (label) VALUES ('v1')`],
      postgres: ['CREATE TABLE seq (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, label TEXT)', `INSERT INTO seq (label) VALUES ('v1')`],
    },
  },
  {
    version: 2,
    // depende de que 'seq' ya exista: si el runner aplicara fuera de orden esto fallaría.
    statements: { sqlite: [`INSERT INTO seq (label) VALUES ('v2')`], postgres: [`INSERT INTO seq (label) VALUES ('v2')`] },
  },
]

export function defineMigrationRunnerContract(adapter: MigrationRunnerAdapter): void {
  const { name, withEngine } = adapter

  describe(`contrato del runner de migraciones — ${name}`, () => {
    test('con una lista vacía, la tabla de control nace con version y applied_at', async () => {
      await withEngine(async engine => {
        const applied = await engine.run({ table: 'schema_migrations', migrations: [] })
        expect(applied).toEqual([])
        expect(await engine.tableExists('schema_migrations')).toBe(true)
        const byName = Object.fromEntries((await engine.controlColumns('schema_migrations')).map(c => [c.name, c]))
        expect(byName.version?.pk).toBe(1)
        expect(byName.applied_at?.notnull).toBe(1)
      })
    })

    describe('aplica sólo las versiones que faltan, en orden ascendente', () => {
      test('la primera llamada aplica las dos versiones, en orden, y las devuelve', async () => {
        await withEngine(async engine => {
          const applied = await engine.run({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })
          expect(applied).toEqual([1, 2])
          expect(await engine.seqLabels()).toEqual(['v1', 'v2'])
          expect(await engine.controlVersions('schema_migrations')).toEqual([1, 2])
        })
      })

      test('una segunda llamada con la misma lista es idempotente: no aplica nada y devuelve []', async () => {
        await withEngine(async engine => {
          await engine.run({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })
          const second = await engine.run({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })
          expect(second).toEqual([])
          // CONTROL: la versión 1 crea 'seq' sin IF NOT EXISTS. Si la guarda de
          // "ya aplicada" se retira, esta segunda llamada intenta recrearla y lanza.
        })
      })

      test('una lista extendida sólo aplica la versión nueva', async () => {
        await withEngine(async engine => {
          await engine.run({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })
          const extended: readonly Migration[] = [
            ...SEQ_MIGRATIONS,
            { version: 3, statements: { sqlite: [`INSERT INTO seq (label) VALUES ('v3')`], postgres: [`INSERT INTO seq (label) VALUES ('v3')`] } },
          ]
          const third = await engine.run({ table: 'schema_migrations', migrations: extended })
          expect(third).toEqual([3])
          expect(await engine.controlVersions('schema_migrations')).toEqual([1, 2, 3])
        })
      })
    })

    describe('es transaccional: una sentencia que falla no deja rastro', () => {
      test('el error nombra la versión y ni la tabla de control ni el DDL previo de esa versión quedan', async () => {
        await withEngine(async engine => {
          const migrations: readonly Migration[] = [
            {
              version: 7,
              statements: { sqlite: ['CREATE TABLE rollback_check (x INTEGER)', 'THIS IS NOT VALID SQL'], postgres: ['CREATE TABLE rollback_check (x INTEGER)', 'THIS IS NOT VALID SQL'] },
            },
          ]
          await expect(engine.run({ table: 'schema_migrations', migrations })).rejects.toThrow(/version 7/)
          expect(await engine.tableExists('rollback_check')).toBe(false)
          expect(await engine.controlVersions('schema_migrations')).toEqual([])
        })
      })
    })

    describe('rehúsa una lista mal formada ANTES de tocar la base', () => {
      test('versiones duplicadas', async () => {
        await withEngine(async engine => {
          const migrations: readonly Migration[] = [
            { version: 1, statements: { sqlite: [], postgres: [] } },
            { version: 1, statements: { sqlite: [], postgres: [] } },
          ]
          await expect(engine.run({ table: 'schema_migrations', migrations })).rejects.toThrow(/duplicate.*1/i)
          expect(await engine.tableExists('schema_migrations')).toBe(false)
        })
      })

      test('una versión no entera o no positiva (cero, negativa, fraccionaria)', async () => {
        await withEngine(async engine => {
          for (const bad of [0, -1, 1.5]) {
            const migrations: readonly Migration[] = [{ version: bad, statements: { sqlite: [], postgres: [] } }]
            await expect(engine.run({ table: 'schema_migrations', migrations })).rejects.toThrow(/positive integer/)
          }
          expect(await engine.tableExists('schema_migrations')).toBe(false)
        })
      })

      test('versiones desordenadas', async () => {
        await withEngine(async engine => {
          const migrations: readonly Migration[] = [
            { version: 2, statements: { sqlite: [], postgres: [] } },
            { version: 1, statements: { sqlite: [], postgres: [] } },
          ]
          await expect(engine.run({ table: 'schema_migrations', migrations })).rejects.toThrow(/order/i)
          expect(await engine.tableExists('schema_migrations')).toBe(false)
        })
      })

      test('un nombre de tabla de control que no es un identificador simple', async () => {
        await withEngine(async engine => {
          for (const badTable of ['schema-migrations', 'Schema_Migrations', '1schema', 'schema; DROP TABLE t; --', '']) {
            await expect(engine.run({ table: badTable, migrations: [] })).rejects.toThrow(/identifier/)
          }
        })
      })
    })

    describe('rehúsa una base más nueva que el código', () => {
      test('una versión registrada que ya no está en la lista se nombra en el error', async () => {
        await withEngine(async engine => {
          const migrations: readonly Migration[] = [
            { version: 1, statements: { sqlite: [], postgres: [] } },
            { version: 2, statements: { sqlite: [], postgres: [] } },
          ]
          await engine.run({ table: 'schema_migrations', migrations })
          const olderCode: readonly Migration[] = [migrations[0]!]
          await expect(engine.run({ table: 'schema_migrations', migrations: olderCode })).rejects.toThrow(/version 2/)
        })
      })
    })
  })
}
