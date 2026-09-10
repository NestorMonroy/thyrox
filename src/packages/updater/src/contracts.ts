/**
 * Puerto de `ccnmt: packages/updater/src/contracts.ts` (5 líneas fuente,
 * 100% portado). Contrato mínimo del handle de runtime del updater.
 */

export type RuntimeStatus = 'inactive' | 'active'

export type RuntimeHandle = {
  status: RuntimeStatus
}
