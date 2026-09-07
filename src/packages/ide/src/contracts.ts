/**
 * Puerto de `ccnmt: packages/ide/src/contracts.ts` (verbatim — sin
 * dependencias).
 */
export type RuntimeStatus = 'inactive' | 'active'

export type RuntimeHandle = {
  status: RuntimeStatus
}
