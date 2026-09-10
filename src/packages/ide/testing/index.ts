/** Puerto de `ccnmt: packages/ide/testing/index.ts`. */
import type { RuntimeHandle } from '../src/contracts.js'

export function createInactiveIdeHandle(): RuntimeHandle {
  return { status: 'inactive' }
}
