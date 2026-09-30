/**
 * La elegibilidad para los ajustes remotos — porte de `_x` de 2.1.283
 * (`chunk-95c18fpr.js`) sobre el estado de carga remota (`./loadState.ts`):
 *
 * 1. si el estado ya memoizó una respuesta (`Ine`), ésa;
 * 2. si no, el host la decide (`checkRemoteSettingsEligibility`, instalado
 *    por el app-host en la composición: OAuth, API key, proveedor, URL base,
 *    punto de entrada — config no importa de provider/auth, V7 §8.6);
 * 3. un hijo de evaluación confinado (`THYROX_CODE_EVAL_CONFINED`) que no es
 *    elegible pasa a servir sólo la instantánea de política
 *    (`evalPolicySnapshotOnly`, `q1r`) y cuenta como elegible;
 * 4. se registra y memoiza (`V1r`), con su razón cuando es negativa.
 *
 * La memoización vive en el estado y no en este módulo: `W1r` (el reset de
 * un login/logout) la vacía junto con lo demás. La razón de inelegibilidad es
 * la fija de `syncCacheState.ts`: `f()` en la fuente devuelve
 * `{eligible, ineligibleReason}`, y el binding de este árbol devuelve sólo el
 * booleano — su razón se declara aquí en vez de inventarse por rama.
 *
 * `resetSyncCache` se reexporta de la hoja para quien lo importaba de aquí.
 */

import { isEnvTruthy, readEnv } from '../env/utils.js'
import { getConfigHostBindings } from '../host.js'
import { getRemoteEligibilityMemo, setEvalPolicySnapshotOnly } from './loadState.js'
import { setEligibility } from './syncCacheState.js'

export { resetSyncCache } from './syncCacheState.js'

/** `_x`. */
export function isRemoteManagedSettingsEligible(): boolean {
  const memo = getRemoteEligibilityMemo()
  if (memo !== undefined) return memo

  const check = getConfigHostBindings().checkRemoteSettingsEligibility
  // Sin binding (arranque temprano, pruebas, ejecuciones headless que saltan
  // los ajustes remotos) se responde de forma conservadora: no elegible.
  const eligible = check ? check() : false
  const snapshotOnly = !eligible && isEnvTruthy(readEnv('THYROX_CODE_EVAL_CONFINED'))
  setEvalPolicySnapshotOnly(snapshotOnly)
  return setEligibility(eligible || snapshotOnly)
}
