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
import { fieldCipherFromEnv } from './fieldCipher.ts'

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

/** Abre (y crea si falta) el store del hogar de proveedores; quien lo abre lo cierra. */
export function openConnectionStore(options: { env?: Record<string, string | undefined>; report?: (message: string) => void } = {}): OpenedConnectionStore {
  const env = options.env ?? process.env
  const dir = resolveProvidersDataDir(env)
  fs.mkdirSync(dir, { recursive: true, mode: OWNER_ONLY })
  fs.chmodSync(dir, OWNER_ONLY)
  const db = openLocal(join(dir, CONNECTIONS_DB_FILE), { create: true })
  const store = createConnectionStore({ db, cipher: fieldCipherFromEnv(env, options.report) })
  return { store, db, close: () => db.close() }
}
