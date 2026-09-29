/**
 * Dónde vive y cómo se abre la base del estado del AgentBridge.
 *
 * La apertura es la de `@thyrox/store` (con su `busy_timeout`): el MITM y la
 * interfaz que lo configura escriben la misma base desde procesos distintos.
 * El archivo va en el directorio de datos del MITM, así que
 * `THYROX_MITM_DATA_DIR` lo desplaza junto con los certificados.
 */
import type { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { openLocal } from '@thyrox/store/db.ts'

import { resolveMitmDataDir } from '../dataDir.ts'
import { ensureAgentBridgeSchema } from './schema.ts'

export const MITM_STATE_STORE_FILE = 'agent-bridge.sqlite3'

export function mitmStateStorePath(): string {
  return join(resolveMitmDataDir(), MITM_STATE_STORE_FILE)
}

/** Abre la base (por defecto la del directorio del MITM) con el esquema aplicado. */
export function openMitmStateStore(path: string = mitmStateStorePath()): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = openLocal(path)
  ensureAgentBridgeSchema(db)
  return db
}
