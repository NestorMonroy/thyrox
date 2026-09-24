/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/permission/src/permissions.ts`
 * (1523 líneas, 17 exports, licencia UNLICENSED — reimplementación, no
 * copia). El objetivo pedido para este pase es `getDenyRuleForTool`,
 * consumidor real confirmado en `@thyrox/app-host/src/runtime/toolRegistryRuntime.ts:80`
 * (`import { getDenyRuleForTool } from '@thyrox/permission/permissions'`).
 *
 * PORTADAS (11 de 17) — el bloque completo de "reglas puras" de la fuente
 * (líneas ~123-395), todas construidas sobre las mismas tres piezas
 * (`getPermissionRuleSources`, `toolMatchesRule`, `getToolNameForPermissionCheck`):
 *
 *   `getAllowRules` · `getDenyRules` · `getAskRules` · `toolAlwaysAllowedRule`
 *   · `getDenyRuleForTool` (el objetivo) · `getAskRuleForTool` ·
 *   `getDenyRuleForAgent` · `filterDeniedAgents` · `getRuleByContentsForTool`
 *   · `getRuleByContentsForToolName` · `permissionRuleSourceDisplayString`
 *   (agregada en el pase del porte de `shadowedRuleDetection.ts` — ver
 *   abajo; antes OMITIDA por falta de consumidor)
 *
 * OMITIDAS (5 de 17), declaradas por nombre, línea y bloqueo — ninguna
 * tiene consumidor confirmado en este pase:
 *
 *   - `hasPermissionsToUseTool` (permissions.ts:480-1107, ~627 líneas) —
 *     bloqueada por el subsistema clasificador ML (`./classifierDecision.js`,
 *     `./autoModeState.js`, tras `feature('TRANSCRIPT_CLASSIFIER')`) y por
 *     `./PermissionUpdate.js` (330 líneas, no portado).
 *   - `checkRuleBasedPermissions` (permissions.ts:1107-1366, ~259 líneas) —
 *     mismo bloqueo que la anterior.
 *   - `deletePermissionRule` (permissions.ts:1366-1445) — bloqueada por
 *     `deletePermissionRuleFromSettings` (host binding sin implementación
 *     de referencia en este árbol) y `./PermissionUpdate.js`.
 *   - `applyPermissionRulesToPermissionContext` (permissions.ts:1445-1456) —
 *     bloqueada por `applyPermissionUpdate`/`./PermissionUpdate.js`.
 *   - `syncPermissionRulesFromDisk` (permissions.ts:1456-1523) — bloqueada
 *     por `applyPermissionUpdates`/`./PermissionUpdate.js`.
 *
 * Divergencias medidas en lo portado:
 *
 * - `getPermissionRuleSources` usa `SETTING_SOURCES` de
 *   `@claude-code-how-works/config`; se repunta a `@thyrox/config`, que
 *   declara el mismo array de 5 elementos (mismos nombres — verificado
 *   leyendo `config/settings/constants.ts`). El especificador `@thyrox/*`
 *   no resuelve todavía en este árbol (falta `"workspaces"` en la raíz,
 *   medido con `Bun.resolveSync`), así que se usa `require()` diferido con
 *   respaldo — el mismo array escrito localmente si el require falla.
 * - `ToolPermissionContext` es un tipo inline (igual que en la fuente,
 *   comentario "V7 §11.4 — inlined types" en el original), pero MÁS
 *   PRECISO que el de la fuente: la fuente lo declara como
 *   `{ permissionRules: unknown; [key: string]: unknown }`, que bajo
 *   `strict`/`noUncheckedIndexedAccess` no tipa las tres propiedades que
 *   este archivo realmente indexa (`alwaysAllowRules`/`alwaysDenyRules`/
 *   `alwaysAskRules`). Es una declaración de tipo local, no cambia
 *   comportamiento en tiempo de ejecución.
 * - `Tool` es el mismo tipo inline de la fuente
 *   (`{ name: string; [key: string]: unknown }`).
 * - `permissionRuleSourceDisplayString` llama en la fuente a
 *   `getSettingSourceDisplayNameLowercase` de `@claude-code-how-works/config`
 *   (paquete no linkeado aquí). Se INLINEA el mismo `switch` de ocho casos
 *   verbatim (leído de `ccnmt: packages/config/settings/constants.ts:73-93`,
 *   sólo lectura), en vez de un `require()` diferido con respaldo — a
 *   diferencia de `SETTING_SOURCES` arriba, esta función SÍ tiene forma de
 *   `@thyrox/config` real que citar y copiar, así que no hace falta el
 *   patrón try/require.
 *
 * `ToolPermissionContext` se EXPORTA en este pase (no lo estaba) para que
 * `shadowedRuleDetection.ts` — mismo paquete, mismo pase — pueda pasarle
 * su propio contexto sin declarar un cuarto tipo duplicado.
 */
import type {
  PermissionBehavior,
  PermissionRule,
  PermissionRuleSource,
} from './permissionTypes.js'
import {
  permissionRuleValueFromString,
  permissionRuleValueToString,
} from './permissionRuleParser.js'

export type ToolPermissionContext = {
  alwaysAllowRules: Partial<Record<PermissionRuleSource, string[]>>
  alwaysDenyRules: Partial<Record<PermissionRuleSource, string[]>>
  alwaysAskRules: Partial<Record<PermissionRuleSource, string[]>>
  [key: string]: unknown
}

type Tool = { name: string; [key: string]: unknown }

const FALLBACK_SETTING_SOURCES = [
  'userSettings',
  'projectSettings',
  'localSettings',
  'flagSettings',
  'policySettings',
] as const

function requireConfigSettingSources(): { SETTING_SOURCES: readonly string[] } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/config')
}

function getPermissionRuleSources(): readonly PermissionRuleSource[] {
  let base: readonly string[]
  try {
    base = requireConfigSettingSources().SETTING_SOURCES
  } catch {
    base = FALLBACK_SETTING_SOURCES
  }
  return [...base, 'cliArg', 'command', 'session'] as readonly PermissionRuleSource[]
}

export function getAllowRules(context: ToolPermissionContext): PermissionRule[] {
  return getPermissionRuleSources().flatMap(source =>
    (context.alwaysAllowRules[source] || []).map(ruleString => ({
      source,
      ruleBehavior: 'allow' as const,
      ruleValue: permissionRuleValueFromString(ruleString),
    })),
  )
}

export function getDenyRules(context: ToolPermissionContext): PermissionRule[] {
  return getPermissionRuleSources().flatMap(source =>
    (context.alwaysDenyRules[source] || []).map(ruleString => ({
      source,
      ruleBehavior: 'deny' as const,
      ruleValue: permissionRuleValueFromString(ruleString),
    })),
  )
}

export function getAskRules(context: ToolPermissionContext): PermissionRule[] {
  return getPermissionRuleSources().flatMap(source =>
    (context.alwaysAskRules[source] || []).map(ruleString => ({
      source,
      ruleBehavior: 'ask' as const,
      ruleValue: permissionRuleValueFromString(ruleString),
    })),
  )
}

/**
 * Nombre de fuente en minúsculas para mensajes de advertencia/prompt —
 * `permissions.ts:123-131` en la fuente, que delega en
 * `getSettingSourceDisplayNameLowercase` de `@claude-code-how-works/config`.
 * Ver la divergencia declarada en el docstring del módulo: el `switch` se
 * inlinea aquí verbatim (leído de
 * `ccnmt: packages/config/settings/constants.ts:73-93`).
 */
export function permissionRuleSourceDisplayString(
  source: PermissionRuleSource,
): string {
  switch (source) {
    case 'userSettings':
      return 'user settings'
    case 'projectSettings':
      return 'shared project settings'
    case 'localSettings':
      return 'project local settings'
    case 'flagSettings':
      return 'command line arguments'
    case 'policySettings':
      return 'enterprise managed settings'
    case 'cliArg':
      return 'CLI argument'
    case 'command':
      return 'command configuration'
    case 'session':
      return 'current session'
  }
}

function mcpInfoFromString(s: string): { serverName: string; toolName: string | undefined } | null {
  const parts = s.split('__')
  const [mcp, server, ...rest] = parts
  if (mcp !== 'mcp' || !server) return null
  return { serverName: server, toolName: rest.length > 0 ? rest.join('__') : undefined }
}

function getToolNameForPermissionCheck(tool: {
  name: string
  mcpInfo?: { serverName: string; toolName: string }
}): string {
  if (tool.mcpInfo) return `mcp__${tool.mcpInfo.serverName}__${tool.mcpInfo.toolName}`
  return tool.name
}

/**
 * ¿Esta regla casa esta llamada entera? Casa "Bash" pero no
 * "Bash(prefix:*)" para BashTool. También casa herramientas MCP por
 * servidor: la regla "mcp__server1" casa "mcp__server1__tool1".
 */
function toolMatchesRule(
  tool: Pick<Tool, 'name'> & { mcpInfo?: { serverName: string; toolName: string } },
  rule: PermissionRule,
): boolean {
  if (rule.ruleValue.ruleContent !== undefined) {
    return false
  }

  const nameForRuleMatch = getToolNameForPermissionCheck(tool)

  if (rule.ruleValue.toolName === nameForRuleMatch) {
    return true
  }

  const ruleInfo = mcpInfoFromString(rule.ruleValue.toolName)
  const toolInfo = mcpInfoFromString(nameForRuleMatch)

  return (
    ruleInfo !== null &&
    toolInfo !== null &&
    (ruleInfo.toolName === undefined || ruleInfo.toolName === '*') &&
    ruleInfo.serverName === toolInfo.serverName
  )
}

export function toolAlwaysAllowedRule(
  context: ToolPermissionContext,
  tool: Pick<Tool, 'name'> & { mcpInfo?: { serverName: string; toolName: string } },
): PermissionRule | null {
  return getAllowRules(context).find(rule => toolMatchesRule(tool, rule)) || null
}

/**
 * ¿La herramienta está en las reglas de denegación permanente? Es el
 * objetivo de este pase — consumido por
 * `@thyrox/app-host/src/runtime/toolRegistryRuntime.ts`.
 */
export function getDenyRuleForTool(
  context: ToolPermissionContext,
  tool: Pick<Tool, 'name'> & { mcpInfo?: { serverName: string; toolName: string } },
): PermissionRule | null {
  return getDenyRules(context).find(rule => toolMatchesRule(tool, rule)) || null
}

export function getAskRuleForTool(
  context: ToolPermissionContext,
  tool: Pick<Tool, 'name'> & { mcpInfo?: { serverName: string; toolName: string } },
): PermissionRule | null {
  return getAskRules(context).find(rule => toolMatchesRule(tool, rule)) || null
}

export function getDenyRuleForAgent(
  context: ToolPermissionContext,
  agentToolName: string,
  agentType: string,
): PermissionRule | null {
  return (
    getDenyRules(context).find(
      rule =>
        rule.ruleValue.toolName === agentToolName &&
        rule.ruleValue.ruleContent === agentType,
    ) || null
  )
}

export function filterDeniedAgents<T extends { agentType: string }>(
  agents: T[],
  context: ToolPermissionContext,
  agentToolName: string,
): T[] {
  const deniedAgentTypes = new Set<string>()
  for (const rule of getDenyRules(context)) {
    if (
      rule.ruleValue.toolName === agentToolName &&
      rule.ruleValue.ruleContent !== undefined
    ) {
      deniedAgentTypes.add(rule.ruleValue.ruleContent)
    }
  }
  return agents.filter(agent => !deniedAgentTypes.has(agent.agentType))
}

export function getRuleByContentsForTool(
  context: ToolPermissionContext,
  tool: Tool & { mcpInfo?: { serverName: string; toolName: string } },
  behavior: PermissionBehavior,
): Map<string, PermissionRule> {
  return getRuleByContentsForToolName(context, getToolNameForPermissionCheck(tool), behavior)
}

export function getRuleByContentsForToolName(
  context: ToolPermissionContext,
  toolName: string,
  behavior: PermissionBehavior,
): Map<string, PermissionRule> {
  const ruleByContents = new Map<string, PermissionRule>()
  let rules: PermissionRule[] = []
  switch (behavior) {
    case 'allow':
      rules = getAllowRules(context)
      break
    case 'deny':
      rules = getDenyRules(context)
      break
    case 'ask':
      rules = getAskRules(context)
      break
  }
  for (const rule of rules) {
    if (
      rule.ruleValue.toolName === toolName &&
      rule.ruleValue.ruleContent !== undefined &&
      rule.ruleBehavior === behavior
    ) {
      ruleByContents.set(rule.ruleValue.ruleContent, rule)
    }
  }
  return ruleByContents
}

/** Singular o plural por conteo (≙ `P`). */
function pluralize(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm
}

/** El comando sin sus redirecciones de salida, o undefined si no se pudo (≙ `Spe`). */
function commandWithoutOutputRedirections(command: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { extractOutputRedirections } = require('@thyrox/shell/bash/commands.js') as {
      extractOutputRedirections: (cmd: string) => { commandWithoutRedirections: string; redirections: unknown[] }
    }
    const { commandWithoutRedirections, redirections } = extractOutputRedirections(command)
    return redirections.length > 0 ? commandWithoutRedirections : command
  } catch {
    return undefined
  }
}

function permissionModeTitleDeferred(mode: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./PermissionMode.js') as { permissionModeTitle: (m: string) => string }).permissionModeTitle(mode)
  } catch {
    return mode
  }
}

type PermissionRequestReason = {
  type: string
  reason?: string
  classifier?: string
  hookName?: string
  rule?: PermissionRule
  reasons?: Map<string, { behavior: string }>
  permissionPromptToolName?: string
  mode?: string
}

/**
 * El texto con que se pide aprobación para usar `toolName`, según la razón
 * de la decisión (≙ `su` de 2.1.275, `chunk-q2gh92k2.js`). En la forma de
 * subcomandos, sólo cuentan los que piden o pasan de largo; en Bash se
 * muestran sin sus redirecciones de salida.
 */
export function createPermissionRequestMessage(toolName: string, decisionReason?: PermissionRequestReason): string {
  if (decisionReason) {
    if (decisionReason.type === 'classifier') {
      return `Classifier '${decisionReason.classifier}' requires approval for this ${toolName} command: ${decisionReason.reason}`
    }
    switch (decisionReason.type) {
      case 'hook':
        return decisionReason.reason
          ? `Hook '${decisionReason.hookName}' blocked this action: ${decisionReason.reason}`
          : `Hook '${decisionReason.hookName}' requires approval for this ${toolName} command`
      case 'rule': {
        const rule = decisionReason.rule!
        const ruleString = permissionRuleValueToString(rule.ruleValue)
        const source = permissionRuleSourceDisplayString(rule.source)
        return `Permission rule '${ruleString}' from ${source} requires approval for this ${toolName} command`
      }
      case 'subcommandResults': {
        const parts: string[] = []
        for (const [command, result] of decisionReason.reasons ?? new Map()) {
          if (result.behavior !== 'ask' && result.behavior !== 'passthrough') continue
          parts.push(toolName === 'Bash' ? (commandWithoutOutputRedirections(command) ?? command) : command)
        }
        if (parts.length > 0) {
          const n = parts.length
          return `This ${toolName} command contains multiple operations. The following ${pluralize(n, 'part')} ${pluralize(n, 'requires', 'require')} approval: ${parts.join(', ')}`
        }
        return `This ${toolName} command contains multiple operations that require approval`
      }
      case 'permissionPromptTool':
        return `Tool '${decisionReason.permissionPromptToolName}' requires approval for this ${toolName} command`
      case 'sandboxOverride':
        return 'Run outside of the sandbox'
      case 'workingDir':
      case 'safetyCheck':
      case 'other':
      case 'asyncAgent':
        return decisionReason.reason as string
      case 'mode':
        return `Current permission mode (${permissionModeTitleDeferred(decisionReason.mode as string)}) requires approval for this ${toolName} command`
    }
  }
  return `Claude requested permissions to use ${toolName}, but you haven't granted it yet.`
}
