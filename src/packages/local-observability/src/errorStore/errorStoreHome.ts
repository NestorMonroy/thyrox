/**
 * El hogar de la base de errores y su apertura. Cuelga del hogar de
 * configuración de thyrox (`resolveConfigHomeDir`); `THYROX_OBSERVABILITY_DATA_DIR`
 * lo declara aparte y vacía no cuenta. El directorio es sólo del dueño: los
 * errores llevan rutas, URLs y mensajes del trabajo del usuario.
 */
import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import { resolveConfigHomeDir } from '@thyrox/config/env/configHome'

import { createErrorStore, type ErrorStore } from './errorStore.ts'

export const OBSERVABILITY_DATA_SUBDIR = 'observability'
export const ERRORS_DB_FILE = 'errors.sqlite3'
const OWNER_ONLY = 0o700

export function resolveObservabilityDataDir(env: Record<string, string | undefined> = process.env): string {
  const declared = env.THYROX_OBSERVABILITY_DATA_DIR?.trim()
  if (declared) return resolve(declared)
  return join(resolveConfigHomeDir({ env, home: homedir(), exists: fs.existsSync }), OBSERVABILITY_DATA_SUBDIR)
}

export function openErrorStore(options: { env?: Record<string, string | undefined> } = {}): { store: ErrorStore; close(): void } {
  const dir = resolveObservabilityDataDir(options.env ?? process.env)
  fs.mkdirSync(dir, { recursive: true, mode: OWNER_ONLY })
  fs.chmodSync(dir, OWNER_ONLY)
  const db = new Database(join(dir, ERRORS_DB_FILE), { create: true })
  return { store: createErrorStore(db), close: () => db.close() }
}

/**
 * La base que se abre al primer uso. El arranque la pide para habilitar el
 * registro sin crear archivos ni pagar la apertura en una sesión sin errores.
 */
export function openLazyErrorStore(options: { env?: Record<string, string | undefined> } = {}): ErrorStore {
  let opened: ErrorStore | undefined
  const store = () => (opened ??= openErrorStore(options).store)
  return {
    record: entry => store().record(entry),
    list: query => store().list(query),
  }
}
