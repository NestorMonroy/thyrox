/**
 * Dónde vive la base de errores y cómo se abre.
 *
 * El motor lo elige la URL, como CLIProxyAPI elige su almacén por DSN
 * (`cmd/server/main.go:277`, `PGSTORE_DSN`): `THYROX_OBSERVABILITY_DATABASE_URL`
 * con `sqlite://…` o `postgres://…`. Sin ella, un SQLite en
 * `<hogar de config>/observability/errors.sqlite3` —`THYROX_OBSERVABILITY_DATA_DIR`
 * cambia el directorio—, sólo del dueño: los errores llevan rutas, URLs y
 * mensajes del trabajo del usuario.
 */
import { SQL } from 'bun'
import fs from 'node:fs'
import { join } from 'node:path'

import { resolveDataDir } from '@thyrox/config/env/configHome'

import { type Dialect, dialectOf } from './dialect.ts'
import { createErrorStore, type ErrorStore } from './errorStore.ts'

export const OBSERVABILITY_DATA_SUBDIR = 'observability'
export const ERRORS_DB_FILE = 'errors.sqlite3'
const OWNER_ONLY = 0o700

type Env = Record<string, string | undefined>

export function resolveObservabilityDataDir(env: Env = process.env): string {
  return resolveDataDir('THYROX_OBSERVABILITY_DATA_DIR', OBSERVABILITY_DATA_SUBDIR, env)
}

/** La URL de la base: la declarada, o el SQLite del hogar de datos. */
export function resolveErrorStoreUrl(env: Env = process.env): string {
  return env.THYROX_OBSERVABILITY_DATABASE_URL?.trim() || `sqlite://${join(resolveObservabilityDataDir(env), ERRORS_DB_FILE)}`
}

/** La base sobre una conexión dada, con las migraciones aplicadas. */
export async function openErrorStoreOn(sql: SQL, dialect: Dialect): Promise<ErrorStore> {
  const store = createErrorStore(sql, dialect)
  await store.migrate()
  return store
}

export async function openErrorStore(options: { env?: Env } = {}): Promise<{ store: ErrorStore; close(): Promise<void> }> {
  const url = resolveErrorStoreUrl(options.env ?? process.env)
  const dialect = dialectOf(url)
  if (!dialect) throw new Error(`unsupported error store URL '${url.replace(/\/\/[^@/]*@/, '//***@')}': expected sqlite:// or postgres://`)
  if (dialect === 'sqlite') {
    const dir = resolveObservabilityDataDir(options.env ?? process.env)
    if (url.includes(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: OWNER_ONLY })
      fs.chmodSync(dir, OWNER_ONLY)
    }
  }
  const sql = new SQL(url)
  return { store: await openErrorStoreOn(sql, dialect), close: () => sql.close() }
}

/**
 * La base que se abre al primer uso. El arranque la pide para habilitar el
 * registro sin crear archivos ni conexiones en una sesión sin errores.
 */
export function openLazyErrorStore(options: { env?: Env } = {}): ErrorStore {
  let opened: Promise<ErrorStore> | undefined
  const store = () => (opened ??= openErrorStore(options).then(result => result.store))
  return {
    record: async entry => (await store()).record(entry),
    list: async query => (await store()).list(query),
    purgeOlderThan: async cutoff => (await store()).purgeOlderThan(cutoff),
    migrate: async () => (await store()).migrate(),
  }
}
