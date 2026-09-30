/**
 * El contrato de `sql.ts`, el mismo conjunto de casos contra cada motor: lo
 * que `jsonParam`/`readJson`, `readTimestamp`, `readId`, una transacción y
 * `openByUrl` prometen que viaja igual en SQLite y en PostgreSQL. La misma
 * forma que `errorStoreContract.ts` ya usa para la base de errores, un nivel
 * más abajo — aquí es `sql.ts`, no un store completo, lo que se mide.
 *
 * SQLite corre siempre, en memoria. PostgreSQL corre si
 * `THYROX_TEST_POSTGRES_URL` está declarada; si no, la suite lo dice en
 * vez de pasar en verde sin haber tocado PostgreSQL — y falla de verdad sólo
 * si `THYROX_TEST_REQUIRE_POSTGRES=1` exige que corra.
 */
import { SQL } from 'bun'
import { describe, expect, test } from 'bun:test'

import { type Dialect, jsonParam, openByUrl, readId, readJson, readTimestamp } from '../sql.ts'
import { resolvePostgresTestUrl, withDisposableSchema } from '../testing/postgresTestSchema.ts'

const AT = '2026-09-28T17:40:00.000Z'
const PAYLOAD: Record<string, unknown> = { a: 1, nested: { list: [1, 'x'] } }

type Engine = { sql: SQL; dialect: Dialect }

/** El DDL de la tabla de prueba, una variante por motor — como `migrations.ts`. */
function probeTableDdl(dialect: Dialect): string {
  return dialect === 'postgres'
    ? `CREATE TABLE contract_probe (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        payload JSONB NOT NULL,
        at TIMESTAMPTZ NOT NULL
      )`
    : `CREATE TABLE contract_probe (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT NOT NULL,
        at TEXT NOT NULL
      )`
}

/** Los mismos casos, registrados una vez por motor vía `withEngine`. */
function defineStoreContract(name: string, withEngine: (body: (engine: Engine) => Promise<void>) => void): void {
  describe(`contrato de sql.ts — ${name}`, () => {
    test('jsonParam/readJson e id autoincremental (readId) hacen ida y vuelta', async () => {
      await withEngine(async ({ sql, dialect }) => {
        await sql.unsafe(probeTableDdl(dialect))
        const [row] = (await sql`
          INSERT INTO contract_probe (payload, at) VALUES (${jsonParam(dialect, PAYLOAD)}, ${AT})
          RETURNING id, payload`) as { id: unknown; payload: unknown }[]
        expect(readId(row!.id)).toBeGreaterThan(0)
        expect(readJson(row!.payload)).toEqual(PAYLOAD)
      })
    })

    test('readTimestamp normaliza lo que el motor devuelve', async () => {
      await withEngine(async ({ sql, dialect }) => {
        await sql.unsafe(probeTableDdl(dialect))
        await sql`INSERT INTO contract_probe (payload, at) VALUES (${jsonParam(dialect, PAYLOAD)}, ${AT})`
        const [row] = (await sql`SELECT at FROM contract_probe`) as { at: unknown }[]
        expect(readTimestamp(row!.at)).toBe(AT)
      })
    })

    test('una transacción que lanza no deja fila — rollback', async () => {
      await withEngine(async ({ sql, dialect }) => {
        await sql.unsafe(probeTableDdl(dialect))
        await expect(
          sql.begin(async tx => {
            await tx`INSERT INTO contract_probe (payload, at) VALUES (${jsonParam(dialect, PAYLOAD)}, ${AT})`
            throw new Error('rollback me')
          }),
        ).rejects.toThrow('rollback me')
        const rows = (await sql`SELECT * FROM contract_probe`) as unknown[]
        expect(rows).toHaveLength(0)
      })
    })

    test('una transacción que no lanza persiste — commit', async () => {
      await withEngine(async ({ sql, dialect }) => {
        await sql.unsafe(probeTableDdl(dialect))
        await sql.begin(async tx => {
          await tx`INSERT INTO contract_probe (payload, at) VALUES (${jsonParam(dialect, PAYLOAD)}, ${AT})`
        })
        const rows = (await sql`SELECT * FROM contract_probe`) as unknown[]
        expect(rows).toHaveLength(1)
      })
    })

    test('capabilities de openByUrl: extensionsLoadable sólo en postgres (H-THYROX-238)', async () => {
      await withEngine(async ({ dialect }) => {
        const url = dialect === 'postgres' ? 'postgres://u@h/db' : 'sqlite://:memory:'
        expect(openByUrl(url).capabilities).toEqual({ dialect, extensionsLoadable: dialect === 'postgres' })
      })
    })
  })
}

defineStoreContract('sqlite', async body => {
  const sql = new SQL('sqlite://:memory:')
  try {
    await body({ sql, dialect: 'sqlite' })
  } finally {
    await sql.close()
  }
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
  describe('contrato de sql.ts — postgres', () => {
    test(`THYROX_TEST_POSTGRES_URL inválida: ${error.message}`, () => {
      throw error
    })
  })
} else if (postgresUrl) {
  const url = postgresUrl
  defineStoreContract('postgres', async body => {
    await withDisposableSchema(url, async sql => body({ sql, dialect: 'postgres' }))
  })
} else if (process.env.THYROX_TEST_REQUIRE_POSTGRES === '1') {
  describe('contrato de sql.ts — postgres', () => {
    test('THYROX_TEST_REQUIRE_POSTGRES=1 exige el contrato en postgres, y THYROX_TEST_POSTGRES_URL no está declarada', () => {
      throw new Error('THYROX_TEST_REQUIRE_POSTGRES=1 exige THYROX_TEST_POSTGRES_URL, que no está declarada')
    })
  })
} else {
  describe('contrato de sql.ts — postgres', () => {
    test.todo('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correr el contrato en postgres', () => {})
  })
}
