/**
 * Puerto de `ccnmt: packages/memory/src/host.ts` (verbatim).
 */
import type { MemoryHostBindings } from './contracts.js'
import { HostBindingsError } from './errors.js'

let memoryHostBindings: MemoryHostBindings | null = null

export function installMemoryHostBindings(bindings: MemoryHostBindings): void {
  memoryHostBindings = bindings
}

export function getMemoryHostBindings(): MemoryHostBindings {
  if (!memoryHostBindings) {
    throw new HostBindingsError(
      'Memory host bindings have not been installed. Install host bindings before using @thyrox/memory runtime APIs.',
    )
  }
  return memoryHostBindings
}
