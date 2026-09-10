/**
 * Puerto de `ccnmt: packages/output/src/targets/silent.ts` (verbatim).
 */
import type { OutputEvent, OutputTarget } from '../contracts.js'

export class SilentOutputTarget implements OutputTarget {
  emit(_event: OutputEvent): void {}
}
