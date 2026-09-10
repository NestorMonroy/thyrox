/**
 * Porte fiel de `ccnmt: packages/permission/src/PermissionResult.ts`
 * (32 líneas, 8 exports, licencia UNLICENSED — reimplementación, no copia).
 * Porte COMPLETO: los 7 tipos re-exportados y la única función,
 * `getRuleBehaviorDescription`, están presentes con el mismo cuerpo.
 *
 * Sin divergencias.
 */
export type {
  PermissionAllowDecision,
  PermissionAskDecision,
  PermissionDecision,
  PermissionDecisionReason,
  PermissionDenyDecision,
  PermissionMetadata,
  PermissionResult,
} from './permissionTypes.js'

import type { PermissionResult } from './permissionTypes.js'

export function getRuleBehaviorDescription(
  permissionResult: PermissionResult['behavior'],
): string {
  switch (permissionResult) {
    case 'allow':
      return 'allowed'
    case 'deny':
      return 'denied'
    default:
      return 'asked for confirmation for'
  }
}
