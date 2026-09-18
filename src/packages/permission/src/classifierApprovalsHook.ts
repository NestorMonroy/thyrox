/**
 * Copia de `ccnmt: packages/permission/src/classifierApprovalsHook.ts` con los
 * comentarios traducidos; el cuerpo es el de la fuente.
 *
 * El hook de React del store de classifierApprovals. Se separo de
 * classifierApprovals.ts para que quien importa solo estado puro —
 * permissions.ts, toolExecution.ts, postCompactCleanup.ts — no arrastre React
 * hasta print.ts.
 */

import { useSyncExternalStore } from 'react'
import {
  isClassifierChecking,
  subscribeClassifierChecking,
} from './classifierApprovals.js'

export function useIsClassifierChecking(toolUseID: string): boolean {
  return useSyncExternalStore(subscribeClassifierChecking, () =>
    isClassifierChecking(toolUseID),
  )
}
