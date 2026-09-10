/**
 * Puerto de `ccnmt: packages/teleport/testing/index.ts` (5 líneas fuente,
 * 100% portado). Helper de testing: handle inactivo listo para usar en
 * fixtures de consumidores.
 */

import type { RuntimeHandle } from '../src/contracts.js'

export function createInactiveTeleportHandle(): RuntimeHandle {
  return { status: 'inactive' }
}
