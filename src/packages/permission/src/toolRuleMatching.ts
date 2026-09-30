/**
 * Cómo una regla de permiso nombra una herramienta en 2.1.275: por nombre
 * exacto, por la familia del padre, por servidor MCP (entero, con `*` o con
 * comodín en el nombre), por comodín en el nombre y por alias; y cómo una
 * regla `campo:valor` casa una llamada concreta.
 *
 * Reimplementación del contrato, no copia: `permissionToolName` ≙ `ag`
 * (`chunk-0ahj7yw0.js`, con `ma`, `Si` y `fn`) · `toolMatchesRuleName` ≙
 * `$r` · `matchesWholeToolRule` ≙ `Rs`/`mG` · `getDenyRuleForToolCall` ≙
 * `ws` · `getAskRuleForToolCall` ≙ `ld` · `getRulesByContentForToolName` ≙
 * `Zb` · `matchingFieldRule` ≙ `Ah` (todas en `chunk-9apg35nm.js` salvo
 * donde se dice).
 *
 * Divergencia declarada: las fuentes de reglas son las que
 * `getAllowRules`/`getDenyRules`/`getAskRules` de `./permissions.ts`
 * recorren; el binario suma `toolsNarrowing`, `mcpServerPolicy` y
 * `hostCredential`, que este árbol no emite.
 */
import { getAllowRules, getAskRules, getDenyRules } from './permissions.js'
import type { ToolPermissionContext } from './permissions.js'
import type { PermissionBehavior, PermissionRule } from './permissionTypes.js'

/** Lo que las reglas leen de una herramienta. */
export type RuleTool = {
  name: string
  mcpInfo?: { serverName: string; toolName: string }
  familyParentToolName?: string
  toFamilyParentInput?: (input: Record<string, unknown>) => Record<string, unknown>
  aliasSkillToolNames?: readonly string[]
  ruleContentField?: string
}

export type ToolAliases = Readonly<Record<string, string>>

type RuleContext = ToolPermissionContext & { toolAliases?: ToolAliases }

const END_CONVERSATION_TOOL_NAME = 'EndConversation'
/** El campo `device` de una regla lee `_host` cuando la llamada no trae `device`. */
const DEVICE_FIELD = 'device'
const HOST_FIELD = '_host'

// ---- Nombre (≙ `fn`, `Si`, `ma`, `ag`) ----

/** Un nombre en la forma que admite un identificador MCP (≙ `fn`). */
export function normalizeNameForMcp(name: string): string {
  let normalized = name.replace(/[^a-zA-Z0-9_-]/g, '_')
  if (name.startsWith('claude.ai ')) normalized = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '')
  return normalized
}

/** El nombre con que las reglas ven una herramienta (≙ `ag`). */
export function permissionToolName(tool: Pick<RuleTool, 'name' | 'mcpInfo'>): string {
  return tool.mcpInfo
    ? `mcp__${normalizeNameForMcp(tool.mcpInfo.serverName)}__${normalizeNameForMcp(tool.mcpInfo.toolName)}`
    : tool.name
}

/** Servidor y herramienta de un nombre `mcp__servidor__herramienta` (≙ `Os`). */
function parseMcpName(name: string): { serverName: string; toolName: string | undefined } | null {
  const [prefix, server, ...rest] = name.split('__')
  if (prefix !== 'mcp' || !server) return null
  return { serverName: server, toolName: rest.length > 0 ? rest.join('__') : undefined }
}

/** Un patrón con `*` como comodín, anclado en los dos extremos (≙ `o_e`). */
export function matchesWildcard(pattern: string, value: string): boolean {
  const source = pattern
    .split('*')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${source}$`, 's').test(value)
}

/** La regla nombra este servidor MCP, o una de sus herramientas por comodín (≙ `t5t`). */
function matchesMcpServerRule(ruleToolName: string, toolName: string): boolean {
  const ruleName = parseMcpName(ruleToolName)
  const called = parseMcpName(toolName)
  return (
    ruleName !== null &&
    called !== null &&
    ruleName.serverName === called.serverName &&
    (ruleName.toolName === undefined ||
      ruleName.toolName === '*' ||
      (called.toolName !== undefined && ruleName.toolName.includes('*') && matchesWildcard(ruleName.toolName, called.toolName)))
  )
}

/** El nombre de la regla y, si es alias de otro, ese otro (≙ `r_e`). */
function expandAlias(ruleToolName: string, toolAliases?: ToolAliases): string[] {
  const target = toolAliases && Object.hasOwn(toolAliases, ruleToolName) ? toolAliases[ruleToolName] : undefined
  return target !== undefined && target !== ruleToolName ? [ruleToolName, target] : [ruleToolName]
}

/** Los alias que apuntan a un nombre (≙ `$te`). */
function aliasesOf(toolName: string, toolAliases?: ToolAliases): string[] {
  if (!toolAliases) return []
  return Object.entries(toolAliases)
    .filter(([, target]) => target === toolName)
    .map(([alias]) => alias)
}

export type MatchOptions = { proxyExpansion?: boolean; globMatching?: boolean; toolAliases?: ToolAliases }

/** ¿Nombra la regla a esta herramienta? No mira el contenido (≙ `$r`). */
export function toolMatchesRuleName(
  tool: RuleTool,
  rule: PermissionRule,
  { proxyExpansion = false, globMatching = false, toolAliases }: MatchOptions = {},
): boolean {
  const name = permissionToolName(tool)
  const ruleToolName = rule.ruleValue.toolName
  if (ruleToolName === name) return true
  if (tool.familyParentToolName !== undefined && tool.mcpInfo === undefined && ruleToolName === tool.familyParentToolName) {
    return true
  }
  if (proxyExpansion && expandAlias(ruleToolName, toolAliases).includes(name)) return true
  if (globMatching && ruleToolName.includes('*') && matchesWildcard(ruleToolName, name)) return true
  return matchesMcpServerRule(ruleToolName, name)
}

/** Una regla que no viene de la línea de órdenes ni de un recorte de herramientas (≙ `Fr`). */
function isSettingsRule(rule: PermissionRule): boolean {
  return rule.source !== 'cliArg' && (rule.source as string) !== 'toolsNarrowing'
}

/**
 * ¿Gobierna la regla la herramienta entera? Sin contenido, con comodín en el
 * nombre, alias sólo desde settings y los alias de skill de la herramienta
 * (≙ `Rs` con `mG`).
 */
export function matchesWholeToolRule(context: RuleContext, tool: RuleTool, rule: PermissionRule): boolean {
  if (rule.ruleValue.ruleContent !== undefined) return false
  const options: MatchOptions = { proxyExpansion: isSettingsRule(rule), globMatching: true, toolAliases: context.toolAliases }
  if (toolMatchesRuleName(tool, rule, options)) return true
  return tool.aliasSkillToolNames?.some(alias => toolMatchesRuleName({ name: alias }, rule, options)) ?? false
}

/** La herramienta de fin de conversación queda fuera de las reglas (≙ `jge`). */
function isUngovernedTool(tool: RuleTool): boolean {
  return !tool.mcpInfo && tool.name === END_CONVERSATION_TOOL_NAME
}

/** La regla de denegación de la herramienta entera, si la hay (≙ `ws`). */
export function getDenyRuleForToolCall(
  context: RuleContext,
  tool: RuleTool,
  rules: PermissionRule[] = getDenyRules(context),
): PermissionRule | null {
  if (isUngovernedTool(tool)) return null
  return rules.find(rule => matchesWholeToolRule(context, tool, rule)) ?? null
}

/** La regla de consulta de la herramienta entera, si la hay (≙ `ld`). */
export function getAskRuleForToolCall(
  context: RuleContext,
  tool: RuleTool,
  rules: PermissionRule[] = getAskRules(context),
): PermissionRule | null {
  if (isUngovernedTool(tool)) return null
  return rules.find(rule => matchesWholeToolRule(context, tool, rule)) ?? null
}

function rulesForBehavior(context: RuleContext, behavior: PermissionBehavior): PermissionRule[] {
  switch (behavior) {
    case 'allow':
      return getAllowRules(context)
    case 'deny':
      return getDenyRules(context)
    case 'ask':
      return getAskRules(context)
    default:
      return []
  }
}

/** Las reglas con contenido de un nombre de herramienta, por contenido (≙ `Zb`). */
export function getRulesByContentForToolName(
  context: RuleContext,
  toolName: string,
  behavior: PermissionBehavior,
): Map<string, PermissionRule> {
  const byContent = new Map<string, PermissionRule>()
  for (const rule of rulesForBehavior(context, behavior)) {
    if (rule.ruleValue.toolName !== toolName || rule.ruleValue.ruleContent === undefined) continue
    if (rule.ruleBehavior !== behavior) continue
    byContent.set(rule.ruleValue.ruleContent, rule)
  }
  return byContent
}

/** El valor escalar de un campo, en texto; null si falta o es un objeto (≙ `gu`). */
function scalarText(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object') return String(value)
  return null
}

/**
 * La regla `campo:valor` de `behavior` que casa esta llamada (≙ `Ah`). Se
 * prueban el nombre de la herramienta, sus alias de skill y los alias que
 * apuntan a ella (éstos sólo con reglas de settings). El campo de contenido
 * propio de la herramienta no se lee así; lo lee su propio verificador. Una
 * herramienta de una familia prueba también las reglas del padre con la
 * entrada traducida.
 */
export function matchingFieldRule(
  context: RuleContext,
  tool: RuleTool,
  input: Record<string, unknown>,
  behavior: PermissionBehavior,
): PermissionRule | null {
  const name = permissionToolName(tool)
  const candidates: Array<[string, boolean]> = [
    [name, false],
    ...(tool.aliasSkillToolNames ?? []).map((alias): [string, boolean] => [alias, false]),
    ...aliasesOf(name, context.toolAliases).map((alias): [string, boolean] => [alias, true]),
  ]
  for (const [toolName, viaAlias] of candidates) {
    for (const [content, rule] of getRulesByContentForToolName(context, toolName, behavior)) {
      if (viaAlias && !isSettingsRule(rule)) continue
      const colon = content.indexOf(':')
      if (colon <= 0) continue
      const field = content.slice(0, colon).trim()
      const pattern = content.slice(colon + 1).trim()
      if (field === '' || pattern === '') continue
      if (field === tool.ruleContentField) continue
      const key =
        field === DEVICE_FIELD && !Object.hasOwn(input, field) && Object.hasOwn(input, HOST_FIELD) ? HOST_FIELD : field
      if (!Object.hasOwn(input, key)) continue
      const value = scalarText(input[key])
      if (value === null) continue
      if (matchesWildcard(pattern, value.trim())) return rule
    }
  }
  const parent = tool.familyParentToolName
  if (parent !== undefined && tool.mcpInfo === undefined && tool.toFamilyParentInput !== undefined) {
    return matchingFieldRule(context, { name: parent, ruleContentField: tool.ruleContentField }, tool.toFamilyParentInput(input), behavior)
  }
  return null
}
