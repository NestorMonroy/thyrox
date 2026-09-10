/**
 * Puerto de `ccnmt: packages/teleport/src/contracts.ts` (5 líneas fuente,
 * 100% portado). Contrato mínimo del handle de runtime de teleport.
 */

export type RuntimeStatus = 'inactive' | 'active'

export type RuntimeHandle = {
  status: RuntimeStatus
}
