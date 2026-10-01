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
  /** El nombre registrado por versión, tal como quedó en el ledger. */
  controlNames(table: string): Promise<Record<number, string>>
  /** Las etiquetas de la tabla `seq` que las migraciones de la suite escriben, en orden de inserción. */
  seqLabels(): Promise<string[]>
  /**
   * Corre `run` con una única migración cuyo chequeo de adopción usa el motor
   * concreto (sync o async, según corresponda) para ver si `probeTable` ya
   * existe. Sus sentencias crean esa misma tabla SIN `IF NOT EXISTS`: si el
   * runner las ejecutara pese a la adopción, la llamada fallaría.
   */
  runWithAdoptionProbe(options: { table: string; probeVersion: number; probeName: string; probeTable: string }): Promise<number[]>
  /** Crea `name` directamente, fuera de cualquier runner — para simular una base ya adoptada. */
  createTableDirectly(name: string): Promise<void>
  /** Deja `table` en su forma heredada (sin columna `name`), con las filas dadas ya registradas. */
  seedLegacyLedger(table: string, rows: readonly { version: number; appliedAt: string }[]): Promise<void>
  /** El validador de sólo lectura — `validateMigrationLedger`/`validateMigrationLedgerSync` según el motor. */
  validateLedger(options: { table: string; migrations: readonly Migration[] }): Promise<void>
}

export type MigrationRunnerAdapter = {
  name: string
  /** Abre un motor fresco, corre `body` y lo libera — también si `body` lanza. */
  withEngine(body: (engine: MigrationRunnerEngine) => Promise<void>): Promise<void>
  /**
   * Aplica `options.migrations` sobre una base real (no en memoria), toma el
   * lock de escritura desde OTRA conexión y lo mantiene abierto mientras
   * corre `duringLock` — para probar que una llamada sin nada pendiente no
   * intenta escribir. Opcional: no todos los motores lo implementan (ver la
   * nota en el bloque que lo consume).
   */
  withConcurrentWriteLock?(
    options: { table: string; migrations: readonly Migration[] },
    duringLock: (engine: MigrationRunnerEngine) => Promise<void>,
  ): Promise<void>
}

const SEQ_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'create_seq_table',
    statements: {
      sqlite: ['CREATE TABLE seq (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT)', `INSERT INTO seq (label) VALUES ('v1')`],
      postgres: ['CREATE TABLE seq (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, label TEXT)', `INSERT INTO seq (label) VALUES ('v1')`],
    },
  },
  {
    version: 2,
    name: 'seq_insert_v2',
    // depende de que 'seq' ya exista: si el runner aplicara fuera de orden esto fallaría.
    statements: { sqlite: [`INSERT INTO seq (label) VALUES ('v2')`], postgres: [`INSERT INTO seq (label) VALUES ('v2')`] },
  },
]

/**
 * Fixture propio para el escenario de ledger heredado: su versión 1 crea la
 * MISMA tabla que `engine.createTableDirectly('seq')` — para poder simular
 * que esa versión ya corrió físicamente antes de que el ledger tuviera
 * columna `name`, sin depender del esquema más rico de `SEQ_MIGRATIONS`.
 */
const LEGACY_LEDGER_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'create_seq_table',
    statements: {
      sqlite: ['CREATE TABLE seq (id INTEGER PRIMARY KEY)'],
      postgres: ['CREATE TABLE seq (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY)'],
    },
  },
  {
    version: 2,
    name: 'seq_insert_v2',
    // depende de que 'seq' ya exista: si el runner re-ejecutara la versión 1
    // adoptada, la CREATE TABLE sin IF NOT EXISTS fallaría antes de llegar aquí.
    statements: { sqlite: [`INSERT INTO seq (id) VALUES (2)`], postgres: [`INSERT INTO seq (id) OVERRIDING SYSTEM VALUE VALUES (2)`] },
  },
]

export function defineMigrationRunnerContract(adapter: MigrationRunnerAdapter): void {
  const { name, withEngine, withConcurrentWriteLock } = adapter

  describe(`contrato del runner de migraciones — ${name}`, () => {
    test('con una lista vacía, la tabla de control nace con version, name y applied_at', async () => {
      await withEngine(async engine => {
        const applied = await engine.run({ table: 'schema_migrations', migrations: [] })
        expect(applied).toEqual([])
        expect(await engine.tableExists('schema_migrations')).toBe(true)
        const byName = Object.fromEntries((await engine.controlColumns('schema_migrations')).map(c => [c.name, c]))
        expect(byName.version?.pk).toBe(1)
        expect(byName.name?.notnull).toBe(1)
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
          expect(await engine.controlNames('schema_migrations')).toEqual({ 1: 'create_seq_table', 2: 'seq_insert_v2' })
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
            {
              version: 3,
              name: 'seq_insert_v3',
              statements: { sqlite: [`INSERT INTO seq (label) VALUES ('v3')`], postgres: [`INSERT INTO seq (label) VALUES ('v3')`] },
            },
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
              name: 'rollback_check',
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
            { version: 1, name: 'first', statements: { sqlite: [], postgres: [] } },
            { version: 1, name: 'second', statements: { sqlite: [], postgres: [] } },
          ]
          await expect(engine.run({ table: 'schema_migrations', migrations })).rejects.toThrow(/duplicate.*1/i)
          expect(await engine.tableExists('schema_migrations')).toBe(false)
        })
      })

      test('una versión no entera o no positiva (cero, negativa, fraccionaria)', async () => {
        await withEngine(async engine => {
          for (const bad of [0, -1, 1.5]) {
            const migrations: readonly Migration[] = [{ version: bad, name: 'bad_version', statements: { sqlite: [], postgres: [] } }]
            await expect(engine.run({ table: 'schema_migrations', migrations })).rejects.toThrow(/positive integer/)
          }
          expect(await engine.tableExists('schema_migrations')).toBe(false)
        })
      })

      test('versiones desordenadas', async () => {
        await withEngine(async engine => {
          const migrations: readonly Migration[] = [
            { version: 2, name: 'second', statements: { sqlite: [], postgres: [] } },
            { version: 1, name: 'first', statements: { sqlite: [], postgres: [] } },
          ]
          await expect(engine.run({ table: 'schema_migrations', migrations })).rejects.toThrow(/order/i)
          expect(await engine.tableExists('schema_migrations')).toBe(false)
        })
      })

      test('un nombre de versión vacío o duplicado', async () => {
        await withEngine(async engine => {
          const empty: readonly Migration[] = [{ version: 1, name: '', statements: { sqlite: [], postgres: [] } }]
          await expect(engine.run({ table: 'schema_migrations', migrations: empty })).rejects.toThrow(/non-empty identifier/)

          const duplicated: readonly Migration[] = [
            { version: 1, name: 'same_name', statements: { sqlite: [], postgres: [] } },
            { version: 2, name: 'same_name', statements: { sqlite: [], postgres: [] } },
          ]
          await expect(engine.run({ table: 'schema_migrations', migrations: duplicated })).rejects.toThrow(/duplicate migration name/)
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
            { version: 1, name: 'first', statements: { sqlite: [], postgres: [] } },
            { version: 2, name: 'second', statements: { sqlite: [], postgres: [] } },
          ]
          await engine.run({ table: 'schema_migrations', migrations })
          const olderCode: readonly Migration[] = [migrations[0]!]
          await expect(engine.run({ table: 'schema_migrations', migrations: olderCode })).rejects.toThrow(/version 2/)
        })
      })
    })

    describe('provenance: una versión registrada con otro nombre se rechaza antes de aplicar nada', () => {
      test('el error nombra la versión, el nombre registrado y el nombre del código', async () => {
        await withEngine(async engine => {
          await engine.run({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })
          const renamed: readonly Migration[] = [{ ...SEQ_MIGRATIONS[0]!, name: 'renamed_in_code' }, SEQ_MIGRATIONS[1]!]
          await expect(engine.run({ table: 'schema_migrations', migrations: renamed })).rejects.toThrow(
            /version 1.*create_seq_table.*renamed_in_code/s,
          )
          // CONTROL: nada se aplicó de más — sigue habiendo sólo dos filas.
          expect(await engine.controlVersions('schema_migrations')).toEqual([1, 2])
        })
      })
    })

    describe('adopción: una migración físicamente ya aplicada se registra sin ejecutar sus sentencias', () => {
      test('el chequeo da verdadero: se registra la versión y no se re-ejecutan las sentencias', async () => {
        await withEngine(async engine => {
          await engine.createTableDirectly('adopted_marker')
          const applied = await engine.runWithAdoptionProbe({
            table: 'schema_migrations',
            probeVersion: 5,
            probeName: 'adopt_marker',
            probeTable: 'adopted_marker',
          })
          // CONTROL: 'adopted_marker' ya existe y la sentencia no lleva IF NOT
          // EXISTS — si la guarda de adopción se retira, esto lanza en vez de
          // devolver [5].
          expect(applied).toEqual([5])
          expect(await engine.controlVersions('schema_migrations')).toEqual([5])
        })
      })

      test('el chequeo da falso: se ejecutan las sentencias como cualquier otra versión', async () => {
        await withEngine(async engine => {
          const applied = await engine.runWithAdoptionProbe({
            table: 'schema_migrations',
            probeVersion: 5,
            probeName: 'adopt_marker',
            probeTable: 'adopted_marker',
          })
          expect(applied).toEqual([5])
          expect(await engine.tableExists('adopted_marker')).toBe(true)
        })
      })
    })

    describe('ledger heredado sin columna name (p. ej. error_store_migrations)', () => {
      test('se adopta: gana la columna, las versiones conocidas quedan nombradas y sólo se aplica lo pendiente', async () => {
        await withEngine(async engine => {
          // Simula que la versión 1 ya corrió físicamente, antes de que el
          // ledger tuviera columna `name`.
          await engine.createTableDirectly('seq')
          await engine.seedLegacyLedger('schema_migrations', [{ version: 1, appliedAt: '2020-01-01T00:00:00.000Z' }])
          const applied = await engine.run({ table: 'schema_migrations', migrations: LEGACY_LEDGER_MIGRATIONS })
          // CONTROL: la versión 1 crea 'seq' sin IF NOT EXISTS. Si se re-ejecutara
          // en vez de adoptarse, esto lanzaría en lugar de devolver [2].
          expect(applied).toEqual([2])
          expect(await engine.controlNames('schema_migrations')).toEqual({ 1: 'create_seq_table', 2: 'seq_insert_v2' })
        })
      })

      test('una versión heredada que el código no declara sigue siendo base más nueva', async () => {
        await withEngine(async engine => {
          await engine.seedLegacyLedger('schema_migrations', [{ version: 99, appliedAt: '2020-01-01T00:00:00.000Z' }])
          await expect(engine.run({ table: 'schema_migrations', migrations: LEGACY_LEDGER_MIGRATIONS })).rejects.toThrow(/version 99/)
        })
      })
    })

    describe('validateMigrationLedger: de sólo lectura, para quien no ejecuta migraciones', () => {
      test('ledger ausente: rechaza sin crear la tabla', async () => {
        await withEngine(async engine => {
          await expect(engine.validateLedger({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })).rejects.toThrow(
            /store requires initialization or migration/,
          )
          expect(await engine.tableExists('schema_migrations')).toBe(false)
        })
      })

      test('todo aplicado y con provenance correcta: no rechaza', async () => {
        await withEngine(async engine => {
          await engine.run({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })
          await expect(engine.validateLedger({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })).resolves.toBeUndefined()
        })
      })

      test('falta una versión que el consumidor exige: rechaza nombrándola', async () => {
        await withEngine(async engine => {
          await engine.run({ table: 'schema_migrations', migrations: [SEQ_MIGRATIONS[0]!] })
          await expect(engine.validateLedger({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })).rejects.toThrow(/version 2/)
        })
      })

      test('nombre registrado distinto del código: rechaza', async () => {
        await withEngine(async engine => {
          await engine.run({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })
          const renamed: readonly Migration[] = [{ ...SEQ_MIGRATIONS[0]!, name: 'renamed_in_code' }, SEQ_MIGRATIONS[1]!]
          await expect(engine.validateLedger({ table: 'schema_migrations', migrations: renamed })).rejects.toThrow(/provenance mismatch/)
        })
      })
    })

    if (withConcurrentWriteLock) {
      test('sin nada pendiente, no abre transacción de escritura: otra conexión con un lock de escritura abierto no la bloquea', async () => {
        await withConcurrentWriteLock({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS }, async engine => {
          const result = await engine.run({ table: 'schema_migrations', migrations: SEQ_MIGRATIONS })
          expect(result).toEqual([])
        })
      })
    } else {
      // NO MEDIDO aquí: este adaptador no implementa `withConcurrentWriteLock`.
      // Los tres motores del paquete sí lo implementan —en SQLite con
      // `BEGIN IMMEDIATE`, en PostgreSQL con `LOCK TABLE … IN EXCLUSIVE MODE`
      // desde una conexión fuera del pool—; un adaptador nuevo queda declarado
      // aquí hasta que aporte el suyo.
      test.todo(`${name}: lock de escritura concurrente NO MEDIDO — ver la nota junto a withConcurrentWriteLock`, () => {})
    }
  })
}
