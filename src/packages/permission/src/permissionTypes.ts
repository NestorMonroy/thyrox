/**
 * Subconjunto ESTRUCTURAL de `ccnmt: packages/permission/src/permissionTypes.ts`
 * (paquete `permission`, licencia UNLICENSED — 434 líneas medidas con
 * `wc -l`). NO es un porte de ese archivo: es una porción local con sólo
 * los cuatro alias de tipo que el resto de este paquete consume —
 * `PermissionBehavior`, `PermissionRuleSource`, `PermissionRuleValue` y
 * `PermissionRule` —, copiados verbatim de sus definiciones en la fuente
 * (líneas 42, 52-60, 65-68, 73-77).
 *
 * Por qué un archivo local y no un `import type` colgante hacia un
 * `./permissionTypes.js` inexistente: la fuente ES un archivo hermano real,
 * así que un `import type` apuntándole no "cuelga" (Bun lo borra en
 * tiempo de ejecución, es invisible para `bun test`) pero SÍ rompe el
 * script `typecheck` (`tsc --noEmit -p tsconfig.json`) de este paquete de
 * forma permanente — a diferencia de un paquete npm externo, un archivo
 * hermano ausente nunca se autosana con `bun install`.
 *
 * El resto del sistema de tipos de la fuente (`PermissionUpdate`,
 * `PermissionUpdateDestination`, los schemas Zod que respaldan cada uno,
 * y las ~20 formas más que declara) NO se porta — nada en el subconjunto
 * de símbolos que este paquete expone hoy los consume. Se deja para
 * cuando un consumidor real lo pida.
 */

/** `permissionTypes.ts:42`. */
export type PermissionBehavior = 'allow' | 'deny' | 'ask'

/** `permissionTypes.ts:52-60`. Todos los `SettingSource` más los propios de regla. */
export type PermissionRuleSource =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'flagSettings'
  | 'policySettings'
  | 'cliArg'
  | 'command'
  | 'session'

/** `permissionTypes.ts:65-68`. */
export type PermissionRuleValue = {
  toolName: string
  ruleContent?: string
}

/** `permissionTypes.ts:73-77`. */
export type PermissionRule = {
  source: PermissionRuleSource
  ruleBehavior: PermissionBehavior
  ruleValue: PermissionRuleValue
}
