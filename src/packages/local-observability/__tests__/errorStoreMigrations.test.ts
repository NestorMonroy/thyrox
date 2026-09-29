/**
 * El runner compartido de migraciones (`@thyrox/store/migrations.ts`)
 * sustituye el bucle privado de `errorStore/migrations.ts`. Una base creada
 * con el esquema legado —el ledger `error_store_migrations` sin columna
 * `name`, tal como el bucle privado lo dejaba hasta hoy— se abre con el
 * runner nuevo sin perder errores ni re-ejecutar el DDL.
 */
import { SQL } from 'bun'
import { describe, expect, test } from 'bun:test'

import { openErrorStoreOn } from '../src/errorStore/errorStoreHome.ts'
import { ERROR_SOURCES } from '../src/errorStore/migrations.ts'
import { ERROR_TYPES } from '../src/errorStore/errorType.ts'

const LEGACY_APPLIED_AT = '2020-01-01T00:00:00.000Z'
const inList = (values: readonly string[]) => values.map(value => `'${value}'`).join(',')

/**
 * Deja una base en el estado exacto en que el bucle privado de hoy la
 * dejaba: las tablas `errors`/`error_actions` de la versión 1, y el ledger
 * legado — sólo `version`/`applied_at`, sin columna `name` — con esa versión
 * ya registrada. No pasa por `migrate()`: simula la base física, no el
 * código que la creó.
 */
async function seedLegacyDatabase(sql: SQL): Promise<void> {
  await sql.unsafe(`CREATE TABLE errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at TEXT NOT NULL,
    session_id TEXT,
    version TEXT,
    source TEXT NOT NULL CHECK (source IN (${inList(ERROR_SOURCES)})),
    error_type TEXT NOT NULL CHECK (error_type IN (${inList(ERROR_TYPES)})),
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    context TEXT NOT NULL DEFAULT '{}'
  )`)
  await sql.unsafe(`CREATE TABLE error_actions (
    error_id INTEGER NOT NULL REFERENCES errors(id),
    position INTEGER NOT NULL,
    occurred_at TEXT NOT NULL,
    name TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY (error_id, position)
  )`)
  await sql.unsafe('CREATE INDEX idx_errors_occurred_at ON errors(occurred_at)')
  await sql.unsafe('CREATE INDEX idx_errors_session ON errors(session_id)')
  await sql.unsafe(
    `CREATE TABLE error_store_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`,
  )
  await sql`INSERT INTO error_store_migrations (version, applied_at) VALUES (1, ${LEGACY_APPLIED_AT})`

  await sql`INSERT INTO errors (occurred_at, session_id, version, source, error_type, name, message, stack, context)
    VALUES ('2026-09-01T00:00:00.000Z', 's-legacy', '0.9.0', 'log_error', 'server', 'Error', 'boom', NULL, '{}')`
  await sql`INSERT INTO error_actions (error_id, position, occurred_at, name, metadata) VALUES (1, 0, '2026-09-01T00:00:00.000Z', 'tengu_query', '{}')`
}

describe('errorStore/migrations.ts — adopción del ledger heredado', () => {
  test('una base con el ledger legado (sin columna name) se abre sin perder errores, y el ledger gana nombre', async () => {
    const sql = new SQL('sqlite://:memory:')
    try {
      await seedLegacyDatabase(sql)

      // CONTROL: la versión 1 crea 'errors'/'error_actions' sin IF NOT
      // EXISTS. Si el runner las re-ejecutara en vez de adoptar la fila ya
      // registrada, esta llamada lanzaría en vez de abrir la base.
      const store = await openErrorStoreOn(sql, 'sqlite')

      const rows = await store.list({ limit: 10 })
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ sessionId: 's-legacy', message: 'boom' })
      expect(rows[0]!.actions.map(action => action.name)).toEqual(['tengu_query'])

      const ledgerRows = (await sql.unsafe('SELECT version, name, applied_at FROM error_store_migrations')) as {
        version: number
        name: string | null
        applied_at: string
      }[]
      expect(ledgerRows).toHaveLength(1)
      expect(ledgerRows[0]!.name).toBeTruthy()
      // El adoptado no reescribe cuándo se aplicó de verdad.
      expect(ledgerRows[0]!.applied_at).toBe(LEGACY_APPLIED_AT)
    } finally {
      sql.close()
    }
  })

  test('una segunda apertura es idempotente: no aplica nada más', async () => {
    const sql = new SQL('sqlite://:memory:')
    try {
      await seedLegacyDatabase(sql)
      await openErrorStoreOn(sql, 'sqlite')
      const store = await openErrorStoreOn(sql, 'sqlite')
      await store.migrate()
      const ledgerRows = (await sql.unsafe('SELECT version FROM error_store_migrations')) as { version: number }[]
      expect(ledgerRows).toHaveLength(1)
    } finally {
      sql.close()
    }
  })
})
