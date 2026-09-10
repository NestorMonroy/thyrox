/**
 * Puerto de `ccnmt: packages/config/remote/syncCache.ts` (45 líneas
 * fuente). Reimplementación fiel VERBATIM.
 *
 * Chequeo de elegibilidad para settings managed remotos.
 *
 * El estado de la caché vive en `syncCacheState.ts` (una hoja, sin import
 * de auth). Este archivo conserva `isRemoteManagedSettingsEligible` — la
 * única función que necesita estado de auth/provider — más
 * `resetSyncCache` envuelto para limpiar el espejo local de elegibilidad
 * junto con el estado de la hoja.
 *
 * config no puede importar de provider/auth (Wave 3). La lógica completa
 * de elegibilidad se inyecta vía
 * `ConfigHostBindings.checkRemoteSettingsEligibility`, instalada por el
 * app-host en tiempo de composición. config sólo la llama y cachea el
 * resultado.
 */

import { getConfigHostBindings } from '../host.ts'
import {
  resetSyncCache as resetLeafCache,
  setEligibility,
} from './syncCacheState.ts'

let cached: boolean | undefined

export function resetSyncCache(): void {
  cached = undefined
  resetLeafCache()
}

/**
 * Comprueba si el usuario actual es elegible para settings managed
 * remotos.
 *
 * Delega en el binding del host (que comprueba tokens OAuth, API key, tipo
 * de proveedor, URL base, entrypoint) y cachea el resultado.
 */
export function isRemoteManagedSettingsEligible(): boolean {
  if (cached !== undefined) return cached

  const check = getConfigHostBindings().checkRemoteSettingsEligibility
  if (!check) {
    // El binding del host no está instalado (bootstrap temprano, tests, o
    // corridas headless que se saltan settings remotos). Conservador: no
    // elegible.
    return (cached = setEligibility(false))
  }

  return (cached = setEligibility(check()))
}
