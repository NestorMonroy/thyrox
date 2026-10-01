/**
 * El hogar del store de conexiones de proveedor y su apertura. Cuelga del
 * hogar de configuración de thyrox (`resolveDataDir`) en vez de componer
 * uno propio por plataforma, como hace OmniRoute con `DATA_DIR`;
 * `THYROX_PROVIDERS_DATA_DIR` lo declara aparte y vacía no cuenta.
 *
 * El directorio se crea sólo para el dueño: la base guarda credenciales, y las
 * cifra con la clave que el entorno declare (`fieldCipherFromEnv`).
 *
 * La conexión se abre con `openLocal` (`@thyrox/store`, ADR-THYROX-006 regla
 * 3): el proxy la lee en cada petición mientras la CLI escribe, y sin
 * `busy_timeout` esa contención fallaba al instante en vez de esperar.
 *
 * Porte de `omniroute: bin/cli/data-dir.mjs` y `bin/cli/sqlite.mjs` (MIT).
 */
import type { Database } from 'bun:sqlite'
import fs from 'node:fs'
import { join } from 'node:path'

import { resolveDataDir } from '@thyrox/config/env/configHome'
import { openLocal } from '@thyrox/store/db.ts'

import { createConnectionStore, type ConnectionStore } from './connectionStore.ts'

export type { ConnectionStore }
import { envValue } from '@thyrox/paths/reach.ts'
import { fieldCipherFromEnv, STORAGE_KEY_VARIABLE } from './fieldCipher.ts'

export const PROVIDERS_DATA_SUBDIR = 'providers'
export const CONNECTIONS_DB_FILE = 'connections.sqlite3'
const OWNER_ONLY = 0o700

export function resolveProvidersDataDir(env: Record<string, string | undefined> = process.env): string {
  return resolveDataDir('THYROX_PROVIDERS_DATA_DIR', PROVIDERS_DATA_SUBDIR, env)
}

export interface OpenedConnectionStore {
  store: ConnectionStore
  /** La conexión subyacente; expuesta para inspeccionar su `PRAGMA` en pruebas. */
  db: Database
  close(): void
}

type Env = Record<string, string | undefined>
/** Lee una clave declarada en el `.env` del árbol (`envValue` de `@thyrox/paths`). */
type DeclaredValue = (name: string) => string | null

export interface ConnectionStoreOptions {
  env?: Env
  report?: (message: string) => void
  declared?: DeclaredValue
}

/**
 * La clave de cifrado del store: la del proceso o, si no está, la que el `.env`
 * declara. El generador (`bin/generateStorageKey.ts`) la escribe en el `.env` y
 * no en el entorno, así que sin la segunda fuente la clave recién generada no
 * la leía nadie y las credenciales se guardaban en claro.
 */
export function declaredStorageKey(env: Env = process.env, declared: DeclaredValue = (name) => envValue(name)): string | undefined {
  const value = env[STORAGE_KEY_VARIABLE]?.trim() || declared(STORAGE_KEY_VARIABLE)?.trim()
  return value || undefined
}

function storeOver(db: Database, env: Env, options: ConnectionStoreOptions): OpenedConnectionStore {
  const key = declaredStorageKey(env, options.declared)
  const cipher = fieldCipherFromEnv({ ...env, [STORAGE_KEY_VARIABLE]: key }, options.report)
  const store = createConnectionStore({ db, cipher })
  return { store, db, close: () => db.close() }
}

/** Abre (y crea si falta) el store del hogar de proveedores; quien lo abre lo cierra. */
export function openConnectionStore(options: ConnectionStoreOptions = {}): OpenedConnectionStore {
  const env = options.env ?? process.env
  const dir = resolveProvidersDataDir(env)
  fs.mkdirSync(dir, { recursive: true, mode: OWNER_ONLY })
  fs.chmodSync(dir, OWNER_ONLY)
  return storeOver(openLocal(join(dir, CONNECTIONS_DB_FILE), { create: true }), env, options)
}

/**
 * Abre el store sólo si ya existe; sin él devuelve `undefined` y no crea nada.
 * Es la forma de quien sólo LEE una credencial —la decisión de `thyrox -p`, el
 * proxy—: abrir para preguntar no debe dejar un hogar vacío.
 */
export function openExistingConnectionStore(options: ConnectionStoreOptions = {}): OpenedConnectionStore | undefined {
  const env = options.env ?? process.env
  const file = join(resolveProvidersDataDir(env), CONNECTIONS_DB_FILE)
  if (!fs.existsSync(file)) return undefined
  return storeOver(openLocal(file, { readwrite: true, create: false }), env, options)
}
