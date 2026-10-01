/**
 * Ledger de VRAM en el proceso, con capacidad declarada por dispositivo y
 * fencing por generación de residencia.
 */
import type { FencedVramLedger } from './vramLedger.ts'

export interface MemoryVramLedgerOptions {
  /** MiB admisibles por UUID de dispositivo. */
  readonly capacityMib: Readonly<Record<string, number>>
}

export function createMemoryVramLedger(_options: MemoryVramLedgerOptions): FencedVramLedger {
  throw new Error('createMemoryVramLedger: por implementar')
}
