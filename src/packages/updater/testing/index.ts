/**
 * Puerto de `ccnmt: packages/updater/testing/index.ts` (5 líneas
 * fuente, 100% portado). Helper de testing: handle inactivo listo
 * para fixtures de consumidores.
 */

import type { RuntimeHandle } from '../src/contracts.js'

export function createInactiveUpdaterHandle(): RuntimeHandle {
  return { status: 'inactive' }
}
