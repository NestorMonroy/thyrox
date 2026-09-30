/**
 * El hogar de datos del MITM: certificados y estado del puente. Cuelga del
 * hogar de configuración de thyrox (`resolveDataDir`, que ya resuelve
 * `THYROX_CONFIG_DIR` y su respaldo heredado) en vez de componer uno propio
 * por plataforma, como hace OmniRoute con `DATA_DIR`/`APPDATA`/`XDG_CONFIG_HOME`.
 *
 * `THYROX_MITM_DATA_DIR` lo declara aparte; vacía no cuenta como declarada.
 *
 * Porte de `omniroute: src/mitm/dataDir.ts` (MIT).
 */
import { resolveDataDir } from '@thyrox/config/env/configHome'

export const MITM_DATA_SUBDIR = 'mitm'

export function resolveMitmDataDir(env: Record<string, string | undefined> = process.env): string {
  return resolveDataDir('THYROX_MITM_DATA_DIR', MITM_DATA_SUBDIR, env)
}
