/**
 * La composición de `Ty` (`chunk-379zyrv7.js`, ejecutable 2.1.283; extracción
 * en `.claude/workbench/policy-settings-port-20260927T083804/`,
 * `symbol-UP-level3.txt`) que `./policyFieldRescue.ts` no cubre todavía: la
 * lista `removed` que `Ty` devuelve junto al rescate campo a campo (`os`).
 *
 * `os` (`./policyFieldRescue.ts: rescuePolicyDocument`) descarta o sustituye
 * un campo inválido, cada uno con su aviso. `removed` cubre el caso
 * complementario: una clave cuyo valor original YA contaba como un intento
 * de no-op — un `null` para retirarla, o un `false` en una puerta
 * `"disable"` — y desapareció del rescate sin que NINGÚN aviso ya lo
 * explique. `Ed` (`./policyFieldRescue.ts: isPolicyNoOp`) es el validador que
 * decide esa condición; un aviso `statusOnly` en la misma ruta NO excluye la
 * clave, porque un `statusOnly` es una nota, no la explicación de por qué la
 * clave falta.
 *
 * `At` (el filtrado de entradas de servidor MCP que 2.1.283 antepone a este
 * cálculo, con `{ skipMcpServerEntryFilter: true, policySource: true }`) no
 * se porta: sus nueve validadores (`Rne`, `ay`, `dy`, `Sy`, `by`, `Ey`, `Oy`,
 * `Ry`, `py`) no están en la extracción, y el concepto de entrada de servidor
 * MCP con salvamento parcial no existe en `SettingsSchema`. Con esos flags,
 * `At` sólo aporta avisos de sus nueve validadores ausentes: no contribuye
 * ninguno aquí, así que `removedPolicyKeys` recibe únicamente los avisos de
 * `os` (y, en `policySources.ts`, los de `sanitizeCrossSessionInbound`) donde
 * el binario habría sumado también los de `At`.
 */
import { isPolicyNoOp, type RestrictiveGate } from './policyFieldRescue.ts'

/** Lo mínimo de un aviso que `removedPolicyKeys` necesita para excluir una clave. */
export type PriorRescueIssue = { path: string; statusOnly?: boolean }

/** Un aviso previo en `path` explica la clave `key` si es la misma ruta o una anidada bajo ella. */
function explainsKey(issue: PriorRescueIssue, key: string): boolean {
  return issue.path === key || issue.path.startsWith(`${key}.`)
}

/**
 * `Ty`, la porción `removed`: las claves de nivel superior de `document` que
 * `isPolicyNoOp` (`Ed`) cuenta como no-op, que faltan en `rescued` y que
 * ningún aviso NO `statusOnly` de `priorIssues` ya explica.
 */
export function removedPolicyKeys(
  document: Record<string, unknown>,
  rescued: Record<string, unknown>,
  priorIssues: readonly PriorRescueIssue[],
  gates?: readonly RestrictiveGate[],
): string[] {
  return Object.keys(document).filter(key =>
    isPolicyNoOp(key, document[key], gates)
    && rescued[key] === undefined
    && priorIssues.every(issue => issue.statusOnly === true || !explainsKey(issue, key)))
}
