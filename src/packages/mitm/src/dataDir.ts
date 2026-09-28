/**
 * El hogar de datos del MITM: certificados y estado del puente. Cuelga del
 * hogar de configuración de thyrox (`getConfigHomeDir`, que ya resuelve
 * `THYROX_CONFIG_DIR` y su respaldo heredado) en vez de componer uno propio
 * por plataforma, como hace OmniRoute con `DATA_DIR`/`APPDATA`/`XDG_CONFIG_HOME`.
 *
 * `THYROX_MITM_DATA_DIR` lo declara aparte; vacía no cuenta como declarada.
 *
 * Porte de `omniroute: src/mitm/dataDir.ts` (MIT).
 */
import { join, resolve } from 'node:path'
import { getConfigHomeDir } from '@thyrox/config/env/utils'

export const MITM_DATA_SUBDIR = 'mitm'

export function resolveMitmDataDir(): string {
  const declared = process.env.THYROX_MITM_DATA_DIR?.trim()
  if (declared) return resolve(declared)
  return join(getConfigHomeDir(), MITM_DATA_SUBDIR)
}
