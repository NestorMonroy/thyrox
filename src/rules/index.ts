/**
 * El registro de reglas que THYROX produce.
 *
 * Se llena por tramos, no de golpe: cada regla que entra aqui se retira de
 * los consumidores y pasa a emitirse. El orden lo fija
 * `verify/check_rule_divergence.py` — primero las SUBSUMIDAS, que son las
 * copias que se quedaron atras y cuyo arreglo no exige juicio.
 */
import type { RuleDefinition } from './types.ts'
import { gitAuthorIdentity } from './definitions/gitAuthorIdentity.ts'

export const RULES: RuleDefinition[] = [gitAuthorIdentity]

export type { RuleDefinition } from './types.ts'
export { rulesDir, RULES_DIR_VAR, RULES_DIR_DEFAULT } from './paths.ts'
export { toMarkdown, render, resolveParameters, UnresolvedParameterError } from './emit/markdown.ts'
