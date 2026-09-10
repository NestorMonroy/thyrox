/**
 * Puerto fiel de
 * `ccnmt: packages/permission/src/toolPermission/permissionSourceTypes.ts`
 * (15 líneas, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO: las dos uniones discriminadas de la fuente están presentes,
 * verbatim.
 *
 * Módulo hoja: guarda las uniones de fuente de aprobación/rechazo
 * compartidas entre `PermissionContext.ts` y `permissionLogging.ts` en la
 * fuente — ninguno de los dos está portado en este árbol (bloqueados por
 * `@claude-code-how-works/tool-registry`, `@claude-code-how-works/shell` y
 * otros paquetes sin linkear en `node_modules` de este paquete), pero el
 * tipo en sí no depende de nada y se porta igual: es el que
 * `PermissionAskDecision`/`PermissionDecisionReason` (`../permissionTypes.js`)
 * referenciarían si esos dos consumidores existieran.
 *
 * Sin divergencias.
 */

export type PermissionApprovalSource =
  | { type: 'hook'; permanent?: boolean }
  | { type: 'user'; permanent: boolean }
  | { type: 'classifier' }

export type PermissionRejectionSource =
  | { type: 'hook' }
  | { type: 'user_abort' }
  | { type: 'user_reject'; hasFeedback: boolean }
