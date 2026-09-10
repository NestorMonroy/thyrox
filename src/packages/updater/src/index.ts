/**
 * Puerto de `ccnmt: packages/updater/src/index.ts` (9 líneas fuente,
 * 100% portado). Barrel del paquete: re-exporta el contrato, los
 * errores, `getExternalLauncherPath` (usado por consumidores externos
 * para saber si hay un lanzador gestionado por otro medio), y el
 * constructor por defecto del handle de runtime.
 */

import type { RuntimeHandle } from './contracts.js'

export type { RuntimeHandle, RuntimeStatus } from './contracts.js'
export * from './errors.js'
export { getExternalLauncherPath } from './nativeInstaller/launcherOwnership.js'

export function createRuntimeHandle(): RuntimeHandle {
  return { status: 'inactive' }
}
