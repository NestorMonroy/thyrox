/**
 * El ledger de migraciones de `provider_connections`
 * (`connectionSchema.ts`): una base nueva aplica la versión 1, una base
 * creada con el DDL de antes del ledger se adopta sin perder filas ni
 * re-ejecutar su DDL, una segunda llamada es no-op, y una base más nueva que
 * el código se rehúsa — el mismo contrato que `@thyrox/store/migrationsSync.ts`
 * ya prueba en general, aplicado a este esquema concreto.
 */
import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { ensureProviderConnectionsSchema, PROVIDER_CONNECTIONS_COLUMNS } from '../../src/accounts/connectionSchema.ts'

const MIGRATIONS_TABLE = 'provider_connections_migrations'

/**
 * El DDL exacto que `connectionSchema.ts` usaba antes de tener ledger
 * (`git show HEAD:.../connectionSchema.ts`, previo a este cambio) — construye
 * la base "heredada" que la prueba de adopción migra.
 */
const LEGACY_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS provider_connections (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  auth_type TEXT,
  name TEXT,
  email TEXT,
  priority INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  token_expires_at TEXT,
  scope TEXT,
  project_id TEXT,
  test_status TEXT,
  error_code TEXT,
  last_error TEXT,
  last_error_at TEXT,
  last_error_type TEXT,
  last_error_source TEXT,
  backoff_level INTEGER DEFAULT 0,
  rate_limited_until TEXT,
  health_check_interval INTEGER,
  last_health_check_at TEXT,
  last_tested TEXT,
  api_key TEXT,
  id_token TEXT,
  provider_specific_data TEXT,
  expires_in INTEGER,
  display_name TEXT,
  global_priority INTEGER,
  default_model TEXT,
  token_type TEXT,
  consecutive_use_count INTEGER DEFAULT 0,
  rate_limit_protection INTEGER DEFAULT 0,
  last_used_at TEXT,
  "group" TEXT,
  max_concurrent INTEGER,
  proxy_enabled INTEGER NOT NULL DEFAULT 1,
  per_key_proxy_enabled INTEGER NOT NULL DEFAULT 0,
  quota_visible INTEGER NOT NULL DEFAULT 1,
  quota_window_thresholds_json TEXT,
  rate_limit_overrides_json TEXT,
  last_ping_at TEXT,
  last_pinged_reset_key TEXT,
  synced_models_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pc_provider ON provider_connections(provider);
CREATE INDEX IF NOT EXISTS idx_pc_active ON provider_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_pc_priority ON provider_connections(provider, priority);
`

/** Valores que imitan lo que `fieldCipher.ts` guarda: `enc:v1:<iv>:<cifrado>:<tag>`. */
const ENCRYPTED_ACCESS_TOKEN = 'enc:v1:0102030405060708090a0b0c0d0e0f10:aabbccddeeff:112233445566778899aabbccddeeff00'
const ENCRYPTED_REFRESH_TOKEN = 'enc:v1:100f0e0d0c0b0a090807060504030201:ffeeddccbbaa:00ffeeddccbbaa99887766554433221100'

function tableNames(db: Database): string[] {
  return (db.query(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[]).map(row => row.name)
}

function ledgerVersions(db: Database): number[] {
  return (db.query(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`).all() as { version: number }[]).map(row => row.version)
}

let db: Database
beforeEach(() => {
  db = new Database(':memory:')
})
afterEach(() => db.close())

describe('ensureProviderConnectionsSchema — base nueva', () => {
  test('crea la tabla, sus tres índices y registra la versión 1 en el ledger', () => {
    ensureProviderConnectionsSchema(db)

    expect(tableNames(db)).toContain('provider_connections')
    expect(tableNames(db)).toContain(MIGRATIONS_TABLE)
    const indexes = (db.query(`SELECT name FROM sqlite_master WHERE type='index'`).all() as { name: string }[]).map(row => row.name)
    expect(indexes).toEqual(expect.arrayContaining(['idx_pc_provider', 'idx_pc_active', 'idx_pc_priority']))
    expect(ledgerVersions(db)).toEqual([1])
  })

  test('la firma pública sigue siendo (db: Database) => void', () => {
    const result = ensureProviderConnectionsSchema(db)
    expect(result).toBeUndefined()
  })
})

describe('ensureProviderConnectionsSchema — adopción de una base heredada', () => {
  test('las filas cifradas quedan BYTE A BYTE idénticas y el ledger adopta la versión 1 sin re-ejecutar el DDL', () => {
    db.exec(LEGACY_SCHEMA_DDL)
    db.run(
      `INSERT INTO provider_connections (id, provider, access_token, refresh_token, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['conn-1', 'anthropic', ENCRYPTED_ACCESS_TOKEN, ENCRYPTED_REFRESH_TOKEN, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
    )
    const before = db.query(`SELECT access_token, refresh_token FROM provider_connections WHERE id = ?`).get('conn-1') as {
      access_token: string
      refresh_token: string
    }

    ensureProviderConnectionsSchema(db)

    const after = db.query(`SELECT access_token, refresh_token FROM provider_connections WHERE id = ?`).get('conn-1') as {
      access_token: string
      refresh_token: string
    }
    expect(after.access_token).toBe(before.access_token)
    expect(after.refresh_token).toBe(before.refresh_token)
    expect(after.access_token).toBe(ENCRYPTED_ACCESS_TOKEN)
    expect(after.refresh_token).toBe(ENCRYPTED_REFRESH_TOKEN)

    // El ledger adopta la versión 1 sin re-ejecutar su DDL: una sola fila, y
    // sigue habiendo exactamente una fila de datos (el DDL de la versión 1
    // usa `CREATE TABLE IF NOT EXISTS`; si se re-ejecutara no duplicaría
    // filas, así que lo que prueba "sin re-ejecutar" es el conteo del
    // ledger, no el de la tabla de datos).
    expect(ledgerVersions(db)).toEqual([1])
    expect((db.query(`SELECT COUNT(*) AS n FROM provider_connections`).get() as { n: number }).n).toBe(1)
  })
})

describe('ensureProviderConnectionsSchema — re-ejecución', () => {
  test('es idempotente: una segunda llamada no cambia el ledger ni falla', () => {
    ensureProviderConnectionsSchema(db)
    expect(() => ensureProviderConnectionsSchema(db)).not.toThrow()
    expect(ledgerVersions(db)).toEqual([1])
  })
})

describe('ensureProviderConnectionsSchema — base más nueva que el código', () => {
  test('rehúsa si el ledger ya trae una versión que el código no declara', () => {
    ensureProviderConnectionsSchema(db)
    db.run(`INSERT INTO ${MIGRATIONS_TABLE} (version, name, applied_at) VALUES (?, ?, ?)`, [2, 'from_the_future', '2026-01-01T00:00:00.000Z'])
    expect(() => ensureProviderConnectionsSchema(db)).toThrow(/newer than code|is no longer declared/)
  })
})

// CONTROL DE ANULACIÓN, ejecutado y restaurado (no queda en la suite): con
// `alreadyApplied` retirado de la migración 1, la prueba de adopción de
// arriba cae con "table provider_connections already exists" (el DDL de la
// versión 1 ya NO lleva `IF NOT EXISTS` — el ledger es quien garantiza una
// sola ejecución, no el DDL) y las otras cinco pruebas de este archivo
// siguen en verde. Restaurado `alreadyApplied`, las seis vuelven a pasar.

test('PROVIDER_CONNECTIONS_COLUMNS sigue exportado igual que antes', () => {
  expect(PROVIDER_CONNECTIONS_COLUMNS.has('access_token')).toBe(true)
  expect(PROVIDER_CONNECTIONS_COLUMNS.has('created_at')).toBe(true)
})
