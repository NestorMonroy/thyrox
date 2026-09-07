/**
 * Puerto de `ccnmt: packages/teleport/src/index.ts` (8 líneas fuente,
 * 100% portado). Barrel del paquete: re-exporta el contrato y los
 * errores, y ofrece el constructor por defecto del handle de runtime.
 */

import type { RuntimeHandle } from './contracts.js'

export type { RuntimeHandle, RuntimeStatus } from './contracts.js'
export * from './errors.js'

export function createRuntimeHandle(): RuntimeHandle {
  return { status: 'inactive' }
}
