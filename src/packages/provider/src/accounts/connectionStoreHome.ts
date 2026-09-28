/**
 * El hogar del store de conexiones de proveedor y su apertura. Cuelga del
 * hogar de configuración de thyrox (`resolveConfigHomeDir`) en vez de componer
 * uno propio por plataforma, como hace OmniRoute con `DATA_DIR`;
 * `THYROX_PROVIDERS_DATA_DIR` lo declara aparte y vacía no cuenta.
 *
 * El directorio se crea sólo para el dueño: la base guarda credenciales, y las
 * cifra con la clave que el entorno declare (`fieldCipherFromEnv`).
 *
 * Porte de `omniroute: bin/cli/data-dir.mjs` y `bin/cli/sqlite.mjs` (MIT).
 */
import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import { resolveConfigHomeDir } from '@thyrox/config/env/configHome'

import { createConnectionStore, type ConnectionStore } from './connectionStore.ts'
import { fieldCipherFromEnv } from './fieldCipher.ts'

export const PROVIDERS_DATA_SUBDIR = 'providers'
export const CONNECTIONS_DB_FILE = 'connections.sqlite3'
const OWNER_ONLY = 0o700

export function resolveProvidersDataDir(env: Record<string, string | undefined> = process.env): string {
  const declared = env.THYROX_PROVIDERS_DATA_DIR?.trim()
  if (declared) return resolve(declared)
  return join(resolveConfigHomeDir({ env, home: homedir(), exists: fs.existsSync }), PROVIDERS_DATA_SUBDIR)
}

export interface OpenedConnectionStore {
  store: ConnectionStore
  close(): void
}

/** Abre (y crea si falta) el store del hogar de proveedores; quien lo abre lo cierra. */
export function openConnectionStore(options: { env?: Record<string, string | undefined>; report?: (message: string) => void } = {}): OpenedConnectionStore {
  const env = options.env ?? process.env
  const dir = resolveProvidersDataDir(env)
  fs.mkdirSync(dir, { recursive: true, mode: OWNER_ONLY })
  fs.chmodSync(dir, OWNER_ONLY)
  const db = new Database(join(dir, CONNECTIONS_DB_FILE), { create: true })
  const store = createConnectionStore({ db, cipher: fieldCipherFromEnv(env, options.report) })
  return { store, close: () => db.close() }
}
