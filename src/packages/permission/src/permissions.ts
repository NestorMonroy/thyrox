/**
 * Porte de `ccnmt: packages/permission/src/permissions.ts`
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
 * PORTADAS DESPUÉS (las 4 que faltaban): `hasPermissionsToUseTool`
 * (permissions.ts:480-1107, con `hasPermissionsToUseToolInner`,
 * `persistDenialState`, `handleDenialLimitExceeded` y los hooks
 * `PermissionRequest` para agentes sin prompt), `deletePermissionRule`,
 * `applyPermissionRulesToPermissionContext` y `syncPermissionRulesFromDisk`.
 * Lo que las bloqueaba —`PermissionUpdate.ts`, `classifierDecision.ts`,
 * `autoModeState.ts`, `denialTracking.ts`— ya está en el paquete. Su contrato
 * es el de 2.1.88 porque es el que llaman sus ocho consumidores
 * (`CanUseToolFn` de cinco argumentos); la versión de 2.1.281 (`eMo`, ocho
 * argumentos, con la frontera de Chrome y el piso de hooks) es la deriva que
 * mide la tarea #18. `checkRuleBasedPermissions`, el export 17, vive en
 * `ruleBasedPermissions.ts` (porte de `BC` de 2.1.281) y se reexporta aquí,
 * donde la fuente lo declara: 17 de 17, medido con `comm` sobre las
 * declaraciones y el reexport.
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
import { feature } from 'bun:bundle'
import { APIUserAbortError } from '@anthropic-ai/sdk'
import type { AssistantMessage } from '@thyrox/agent/messageShapes'
import { executePermissionRequestHooks } from '@thyrox/agent/hooks.js'
import { sanitizeToolNameForAnalytics } from '@thyrox/agent/eventMetadata.js'
import {
  AUTO_REJECT_MESSAGE,
  DONT_ASK_REJECT_MESSAGE,
  buildClassifierUnavailableMessage,
  buildYoloRejectionMessage,
} from '@thyrox/agent/messages.js'
import {
  addToTurnClassifierDuration,
  getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens,
  getTotalInputTokens,
  getTotalOutputTokens,
} from '@thyrox/app-host/bootstrap/state.js'
import { isInProtectedNamespace } from '@thyrox/config/env/utils'
import { getFeatureValue_CACHED_WITH_REFRESH } from '@thyrox/config/feature-flags'
import { logEvent } from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { logError } from '@thyrox/local-observability/logging'
import { calculateCostFromTokens } from '@thyrox/provider/modelCost.js'
import type { Tool as RegistryTool, ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import { isAutoModeActive } from './autoModeState.js'
import { computeAutoModeFallback, isAutoModeAllowlistedTool } from './classifierDecision.js'
import { clearClassifierChecking, setClassifierChecking } from './classifierApprovals.js'
import {
  DENIAL_LIMITS,
  createDenialTrackingState,
  recordDenial,
  recordSuccess,
  shouldFallbackToPrompting,
  type DenialTrackingState,
} from './denialTracking.js'
import { AbortError, ContextError } from './errors.js'
import { applyPermissionUpdate, applyPermissionUpdates, persistPermissionUpdates } from './PermissionUpdate.js'
import type {
  PermissionDecision,
  PermissionMode,
  PermissionResult,
  PermissionUpdate,
  PermissionUpdateDestination,
  YoloClassifierResult,
} from './permissionTypes.js'
import { deletePermissionRuleFromSettings, shouldAllowManagedPermissionRulesOnly } from './permissionsLoader.js'
import { canSandboxAutoAllowBash } from './ruleBasedPermissions.js'
import { classifyYoloAction, formatActionForClassifier } from './yoloClassifier.js'

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

// La mitad por reglas de la decisión (`oT` de 2.1.275) vive en su propio
// módulo; los consumidores la importan desde aquí, como en la fuente.
export { checkRuleBasedPermissions } from './ruleBasedPermissions.js'

// ---- El motor de decisión (≙ `hasPermissionsToUseTool`, ccnmt v2.1.88) ----

type EngineContext = ToolUseContext
type EngineDecision = PermissionDecision

const AGENT_TOOL_NAME = 'Agent'
const REPL_TOOL_NAME = 'REPL'
const POWERSHELL_TOOL_NAME = 'PowerShell'
/** Plazo con que se refresca la bandera de cierre del clasificador caído. */
const CLASSIFIER_FAIL_CLOSED_REFRESH_MS = 30 * 60 * 1000

/** El contexto de permisos de la sesión, visto con la forma que leen las reglas. */
function permissionContextOf(context: EngineContext): ToolPermissionContext & {
  mode?: string
  isBypassPermissionsModeAvailable?: boolean
  shouldAvoidPermissionPrompts?: boolean
} {
  return context.getAppState().toolPermissionContext as never
}

function isAbort(error: unknown): boolean {
  return error instanceof AbortError || error instanceof APIUserAbortError
}

/** `updatedInput` de un resultado si lo trae; si no, la entrada original. */
function updatedInputOrFallback(
  result: EngineDecision | PermissionResult,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  return (('updatedInput' in result ? result.updatedInput : undefined) as Record<string, unknown> | undefined) ?? fallback
}

/**
 * Los pasos de la cadena que no dependen del modo auto: denegaciones, reglas
 * `ask`, la decisión propia de la herramienta, las comprobaciones inmunes al
 * bypass, el modo bypass y las reglas `allow` de herramienta entera. Lo que
 * queda sin decidir sale como `ask`.
 */
async function hasPermissionsToUseToolInner(
  tool: RegistryTool,
  input: Record<string, unknown>,
  context: EngineContext,
): Promise<EngineDecision> {
  if (context.abortController.signal.aborted) throw new AbortError()

  const rules = permissionContextOf(context)
  // 1a. La herramienta entera está denegada.
  const denyRule = getDenyRuleForTool(rules, tool)
  if (denyRule) {
    return {
      behavior: 'deny',
      decisionReason: { type: 'rule', rule: denyRule },
      message: `Permission to use ${tool.name} has been denied.`,
    }
  }
  // 1b. La herramienta entera pregunta, salvo Bash en sandbox con auto-permiso:
  // ahí decide el `checkPermissions` de Bash con sus reglas por comando.
  const askRule = getAskRuleForTool(rules, tool)
  if (askRule && !canSandboxAutoAllowBash(tool.name, input)) {
    return {
      behavior: 'ask',
      decisionReason: { type: 'rule', rule: askRule },
      message: createPermissionRequestMessage(tool.name),
    }
  }

  // 1c. La decisión propia de la herramienta; una entrada que no valida deja
  // el `passthrough` por defecto.
  let toolResult: PermissionResult = {
    behavior: 'passthrough',
    message: createPermissionRequestMessage(tool.name),
  }
  try {
    const parsedInput = tool.inputSchema.parse(input)
    toolResult = await tool.checkPermissions(parsedInput as never, context)
  } catch (error) {
    if (isAbort(error)) throw error
    logError(error)
  }

  // 1d. La herramienta deniega.
  if (toolResult.behavior === 'deny') return toolResult
  if (toolResult.behavior === 'ask') {
    // 1e. Exige interacción del usuario incluso en bypass.
    if (tool.requiresUserInteraction?.()) return toolResult
    // 1f. Una regla `ask` por contenido pesa más que el modo bypass.
    const reason = toolResult.decisionReason
    if (reason?.type === 'rule' && reason.rule.ruleBehavior === 'ask') return toolResult
    // 1g. Las comprobaciones de seguridad (.git/, .claude/, configuración de
    // shell) son inmunes al bypass.
    if (reason?.type === 'safetyCheck') return toolResult
  }

  // 2a. El modo bypass, directo o desde plan cuando la sesión arrancó en bypass.
  const current = permissionContextOf(context)
  const bypass =
    current.mode === 'bypassPermissions' ||
    (current.mode === 'plan' && current.isBypassPermissionsModeAvailable === true)
  if (bypass) {
    return {
      behavior: 'allow',
      updatedInput: updatedInputOrFallback(toolResult, input),
      decisionReason: { type: 'mode', mode: current.mode as PermissionMode },
    }
  }
  // 2b. La herramienta entera está permitida.
  const allowRule = toolAlwaysAllowedRule(current, tool)
  if (allowRule) {
    return {
      behavior: 'allow',
      updatedInput: updatedInputOrFallback(toolResult, input),
      decisionReason: { type: 'rule', rule: allowRule },
    }
  }

  // 3. Lo que nadie decidió se pregunta.
  const result: EngineDecision =
    toolResult.behavior === 'passthrough'
      ? {
          ...toolResult,
          behavior: 'ask',
          message: createPermissionRequestMessage(tool.name, toolResult.decisionReason as never),
        }
      : toolResult
  if (result.behavior === 'ask' && result.suggestions) {
    logForDebugging(`Permission suggestions for ${tool.name}: ${JSON.stringify(result.suggestions, null, 2)}`)
  }
  return result
}

/**
 * Guarda el estado de denegaciones. Un subagente asíncrono tiene su propio
 * contador, porque su `setAppState` no escribe; el resto va al estado global.
 */
function persistDenialState(context: EngineContext, next: DenialTrackingState): void {
  if (context.localDenialTracking) {
    Object.assign(context.localDenialTracking, next)
    return
  }
  context.setAppState(prev => {
    // `recordSuccess` devuelve la misma referencia si no hubo cambio: devolver
    // `prev` deja que el store se salte a sus suscriptores.
    if (prev.denialTracking === next) return prev
    return { ...prev, denialTracking: next }
  })
}

/**
 * Si el clasificador acumuló demasiadas denegaciones, devuelve un `ask` para
 * que el usuario revise; sin el límite alcanzado, null. En headless no hay a
 * quién preguntar: se aborta el agente.
 */
function handleDenialLimitExceeded(
  denialState: DenialTrackingState,
  isHeadless: boolean,
  classifierReason: string,
  assistantMessage: AssistantMessage,
  tool: RegistryTool,
  result: EngineDecision,
  context: EngineContext,
): EngineDecision | null {
  if (!shouldFallbackToPrompting(denialState)) return null

  const hitTotalLimit = denialState.totalDenials >= DENIAL_LIMITS.maxTotal
  // Las cifras se leen antes de persistir: con contador local, persistir muta
  // el mismo objeto.
  const totalCount = denialState.totalDenials
  const consecutiveCount = denialState.consecutiveDenials
  const warning = hitTotalLimit
    ? `${totalCount} actions were blocked this session. Please review the transcript before continuing.`
    : `${consecutiveCount} consecutive actions were blocked. Please review the transcript before continuing.`

  logEvent('tengu_auto_mode_denial_limit_exceeded', {
    limit: hitTotalLimit ? 'total' : 'consecutive',
    mode: isHeadless ? 'headless' : 'cli',
    messageID: assistantMessage.message.id,
    consecutiveDenials: consecutiveCount,
    totalDenials: totalCount,
    toolName: sanitizeToolNameForAnalytics(tool.name),
  })
  if (isHeadless) throw new AbortError('Agent aborted: too many classifier denials in headless mode')

  logForDebugging(`Classifier denial limit exceeded, falling back to prompting: ${warning}`, { level: 'warn' })
  if (hitTotalLimit) persistDenialState(context, { ...denialState, totalDenials: 0, consecutiveDenials: 0 })

  // Se conserva el clasificador original para que el registro de la anulación
  // del usuario nombre el correcto.
  const originalClassifier = result.decisionReason?.type === 'classifier' ? result.decisionReason.classifier : 'auto-mode'
  return {
    ...result,
    decisionReason: {
      type: 'classifier',
      classifier: originalClassifier,
      reason: `${warning}\n\nLatest blocked action: ${classifierReason}`,
    },
  } as EngineDecision
}

/**
 * Hooks `PermissionRequest` para agentes sin prompt: un hook puede permitir o
 * denegar antes de la denegación automática. Sin decisión de ningún hook,
 * null. Un hook que falla no tumba la llamada: cae a la denegación.
 */
async function runPermissionRequestHooksForHeadlessAgent(
  tool: RegistryTool,
  input: Record<string, unknown>,
  toolUseID: string,
  context: EngineContext,
  permissionMode: string | undefined,
  suggestions: PermissionUpdate[] | undefined,
): Promise<EngineDecision | null> {
  try {
    for await (const hookResult of executePermissionRequestHooks(
      tool.name,
      toolUseID,
      input,
      context,
      permissionMode,
      suggestions,
      context.abortController.signal,
    )) {
      const decision = hookResult.permissionRequestResult
      if (!decision) continue
      if (decision.behavior === 'allow') {
        const updates = decision.updatedPermissions as PermissionUpdate[] | undefined
        if (updates?.length) {
          persistPermissionUpdates(updates)
          context.setAppState(prev => ({
            ...prev,
            toolPermissionContext: applyPermissionUpdates(prev.toolPermissionContext, updates),
          }))
        }
        return {
          behavior: 'allow',
          updatedInput: (decision.updatedInput as Record<string, unknown> | undefined) ?? input,
          decisionReason: { type: 'hook', hookName: 'PermissionRequest' },
        }
      }
      if (decision.behavior === 'deny') {
        if (decision.interrupt) {
          logForDebugging(`Hook interrupt: tool=${tool.name} hookMessage=${decision.message}`)
          context.abortController.abort()
        }
        return {
          behavior: 'deny',
          message: decision.message || 'Permission denied by hook',
          decisionReason: { type: 'hook', hookName: 'PermissionRequest', reason: decision.message },
        }
      }
    }
  } catch (error) {
    logError(new Error('PermissionRequest hook failed for headless agent', { cause: toError(error) }))
  }
  return null
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

/** Telemetría de la decisión del clasificador, con su costo y el de la sesión. */
function logClassifierDecision(
  tool: RegistryTool,
  assistantMessage: AssistantMessage,
  denialState: DenialTrackingState,
  result: YoloClassifierResult,
): void {
  const costOf = (usage: YoloClassifierResult['usage']) =>
    usage && result.model ? calculateCostFromTokens(result.model, usage) : undefined
  logEvent('tengu_auto_mode_decision', {
    decision: result.unavailable ? 'unavailable' : result.shouldBlock ? 'blocked' : 'allowed',
    toolName: sanitizeToolNameForAnalytics(tool.name),
    inProtectedNamespace: isInProtectedNamespace(),
    // El msg_id de la respuesta del agente que produjo el tool_use: une la
    // decisión con la respuesta de la API del agente principal.
    agentMsgId: assistantMessage.message.id,
    classifierModel: result.model,
    consecutiveDenials: result.shouldBlock ? denialState.consecutiveDenials + 1 : 0,
    totalDenials: result.shouldBlock ? denialState.totalDenials + 1 : denialState.totalDenials,
    classifierInputTokens: result.usage?.inputTokens,
    classifierOutputTokens: result.usage?.outputTokens,
    classifierCacheReadInputTokens: result.usage?.cacheReadInputTokens,
    classifierCacheCreationInputTokens: result.usage?.cacheCreationInputTokens,
    classifierDurationMs: result.durationMs,
    classifierSystemPromptLength: result.promptLengths?.systemPrompt,
    classifierToolCallsLength: result.promptLengths?.toolCalls,
    classifierUserPromptsLength: result.promptLengths?.userPrompts,
    // Totales del transcript principal: la llamada del clasificador no suma
    // al costo de la sesión, así que estos excluyen sus tokens.
    sessionInputTokens: getTotalInputTokens(),
    sessionOutputTokens: getTotalOutputTokens(),
    sessionCacheReadInputTokens: getTotalCacheReadInputTokens(),
    sessionCacheCreationInputTokens: getTotalCacheCreationInputTokens(),
    classifierCostUSD: costOf(result.usage),
    classifierStage: result.stage,
    classifierStage1InputTokens: result.stage1Usage?.inputTokens,
    classifierStage1OutputTokens: result.stage1Usage?.outputTokens,
    classifierStage1CacheReadInputTokens: result.stage1Usage?.cacheReadInputTokens,
    classifierStage1CacheCreationInputTokens: result.stage1Usage?.cacheCreationInputTokens,
    classifierStage1DurationMs: result.stage1DurationMs,
    classifierStage1RequestId: result.stage1RequestId,
    classifierStage1MsgId: result.stage1MsgId,
    classifierStage1CostUSD: costOf(result.stage1Usage),
    classifierStage2InputTokens: result.stage2Usage?.inputTokens,
    classifierStage2OutputTokens: result.stage2Usage?.outputTokens,
    classifierStage2CacheReadInputTokens: result.stage2Usage?.cacheReadInputTokens,
    classifierStage2CacheCreationInputTokens: result.stage2Usage?.cacheCreationInputTokens,
    classifierStage2DurationMs: result.stage2DurationMs,
    classifierStage2RequestId: result.stage2RequestId,
    classifierStage2MsgId: result.stage2MsgId,
    classifierStage2CostUSD: costOf(result.stage2Usage),
  })
}

function logFastPathAllow(tool: RegistryTool, assistantMessage: AssistantMessage, fastPath: 'acceptEdits' | 'allowlist'): void {
  logEvent('tengu_auto_mode_decision', {
    decision: 'allowed',
    toolName: sanitizeToolNameForAnalytics(tool.name),
    inProtectedNamespace: isInProtectedNamespace(),
    agentMsgId: assistantMessage.message.id,
    confidence: 'high',
    fastPath,
  })
}

/**
 * El modo auto: el clasificador decide en lugar del usuario, salvo lo que no
 * le corresponde (comprobaciones no aprobables, reglas `ask` explícitas, el
 * piso de plan) y lo que un atajo ya resuelve sin llamarlo.
 */
async function decideInAutoMode(
  tool: RegistryTool,
  input: Record<string, unknown>,
  context: EngineContext,
  assistantMessage: AssistantMessage,
  toolUseID: string,
  result: EngineDecision,
): Promise<EngineDecision> {
  const appState = context.getAppState()
  const permissionContext = permissionContextOf(context)
  const isHeadless = permissionContext.shouldAvoidPermissionPrompts ?? false

  const fallback = computeAutoModeFallback(result.decisionReason, isHeadless)
  if (fallback === 'deny-headless') {
    return {
      behavior: 'deny',
      message: result.behavior === 'ask' ? result.message : createPermissionRequestMessage(tool.name),
      decisionReason: {
        type: 'asyncAgent',
        reason: 'Action requires interactive approval and permission prompts are not available in this context',
      },
    }
  }
  if (fallback) {
    logEvent('tengu_auto_mode_fallback_to_ask', { reason: fallback.reason, toolName: sanitizeToolNameForAnalytics(tool.name) })
    return result
  }
  if (tool.requiresUserInteraction?.()) {
    logEvent('tengu_auto_mode_fallback_to_ask', {
      reason: 'requires_user_interaction',
      toolName: sanitizeToolNameForAnalytics(tool.name),
    })
    return result
  }

  const denialState = context.localDenialTracking ?? appState.denialTracking ?? createDenialTrackingState()

  // PowerShell exige permiso explícito en modo auto salvo con la bandera de
  // compilación que lo manda al clasificador como a Bash.
  if (tool.name === POWERSHELL_TOOL_NAME && !feature('POWERSHELL_AUTO_MODE')) {
    if (isHeadless) {
      return {
        behavior: 'deny',
        message: 'PowerShell tool requires interactive approval',
        decisionReason: {
          type: 'asyncAgent',
          reason: 'PowerShell tool requires interactive approval and permission prompts are not available in this context',
        },
      }
    }
    logForDebugging(`Skipping auto mode classifier for ${tool.name}: tool requires explicit user permission`)
    return result
  }

  // Atajo: lo que acceptEdits permitiría no paga una llamada al clasificador.
  // Agent y REPL quedan fuera: su checkPermissions permite en acceptEdits, y
  // el clasificador tiene que ver el código que une sus llamadas internas.
  if (tool.name !== AGENT_TOOL_NAME && tool.name !== REPL_TOOL_NAME) {
    try {
      const parsedInput = tool.inputSchema.parse(input)
      const acceptEdits = await tool.checkPermissions(parsedInput as never, {
        ...context,
        getAppState: () => {
          const state = context.getAppState()
          return { ...state, toolPermissionContext: { ...state.toolPermissionContext, mode: 'acceptEdits' as const } }
        },
      })
      if (acceptEdits.behavior === 'allow') {
        persistDenialState(context, recordSuccess(denialState))
        logForDebugging(`Skipping auto mode classifier for ${tool.name}: would be allowed in acceptEdits mode`)
        logFastPathAllow(tool, assistantMessage, 'acceptEdits')
        return {
          behavior: 'allow',
          updatedInput: (acceptEdits.updatedInput as Record<string, unknown> | undefined) ?? input,
          decisionReason: { type: 'mode', mode: 'auto' },
        }
      }
    } catch (error) {
      if (isAbort(error)) throw error
      // Si la comprobación en acceptEdits falla, decide el clasificador.
    }
  }

  // Las herramientas de la lista segura no necesitan clasificador.
  if (isAutoModeAllowlistedTool(tool.name)) {
    persistDenialState(context, recordSuccess(denialState))
    logForDebugging(`Skipping auto mode classifier for ${tool.name}: tool is on the safe allowlist`)
    logFastPathAllow(tool, assistantMessage, 'allowlist')
    return { behavior: 'allow', updatedInput: input, decisionReason: { type: 'mode', mode: 'auto' } }
  }

  const action = formatActionForClassifier(tool.name, input)
  setClassifierChecking(toolUseID)
  let classifierResult: YoloClassifierResult
  try {
    classifierResult = await classifyYoloAction(
      context.messages as never,
      action,
      context.options.tools as never,
      permissionContext as never,
      context.abortController.signal,
    )
  } finally {
    clearClassifierChecking(toolUseID)
  }

  if (process.env.USER_TYPE === 'ant' && classifierResult.errorDumpPath && context.addNotification) {
    context.addNotification({
      key: 'auto-mode-error-dump',
      text: `Auto mode classifier error — prompts dumped to ${classifierResult.errorDumpPath} (included in /share)`,
      priority: 'immediate',
      color: 'error',
    } as never)
  }
  logClassifierDecision(tool, assistantMessage, denialState, classifierResult)
  if (classifierResult.durationMs !== undefined) addToTurnClassifierDuration(classifierResult.durationMs)

  if (!classifierResult.shouldBlock) {
    persistDenialState(context, recordSuccess(denialState))
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'classifier', classifier: 'auto-mode', reason: classifierResult.reason },
    }
  }

  // El transcript excede la ventana del clasificador: error determinista que
  // no se recupera reintentando, así que se vuelve a la aprobación manual.
  if (classifierResult.transcriptTooLong) {
    // REPL pasa: sus llamadas internas se clasifican una a una.
    if (tool.name === REPL_TOOL_NAME) {
      return { behavior: 'allow', updatedInput: input, decisionReason: { type: 'mode', mode: 'auto' } }
    }
    // En headless la condición es permanente (el transcript sólo crece):
    // denegar y reintentar gastaría tokens sin llegar nunca al límite.
    if (isHeadless) {
      throw new AbortError('Agent aborted: auto mode classifier transcript exceeded context window in headless mode')
    }
    logForDebugging('Auto mode classifier transcript too long, falling back to normal permission handling', { level: 'warn' })
    logEvent('tengu_auto_mode_fallback_to_ask', {
      reason: 'transcript_too_long',
      toolName: sanitizeToolNameForAnalytics(tool.name),
    })
    return {
      ...result,
      decisionReason: {
        type: 'other',
        reason:
          'Auto mode classifier transcript exceeded context window — falling back to manual approval (try /compact to reduce conversation size)',
      },
    } as EngineDecision
  }

  // Clasificador caído (error de API): la bandera decide cerrar o abrir.
  if (classifierResult.unavailable) {
    if (getFeatureValue_CACHED_WITH_REFRESH('tengu_iron_gate_closed', true, CLASSIFIER_FAIL_CLOSED_REFRESH_MS)) {
      logForDebugging('Auto mode classifier unavailable, denying with retry guidance (fail closed)', { level: 'warn' })
      return {
        behavior: 'deny',
        decisionReason: { type: 'classifier', classifier: 'auto-mode', reason: 'Classifier unavailable' },
        message: buildClassifierUnavailableMessage(tool.name, classifierResult.model),
      }
    }
    logForDebugging('Auto mode classifier unavailable, falling back to normal permission handling (fail open)', {
      level: 'warn',
    })
    logEvent('tengu_auto_mode_fallback_to_ask', {
      reason: 'classifier_unavailable_fail_open',
      toolName: sanitizeToolNameForAnalytics(tool.name),
    })
    return result
  }

  const deniedState = recordDenial(denialState)
  persistDenialState(context, deniedState)
  logForDebugging(`Auto mode classifier blocked action: ${classifierResult.reason}`, { level: 'warn' })
  // El límite se mira después del clasificador para incluir su razón.
  const limited = handleDenialLimitExceeded(
    deniedState,
    isHeadless,
    classifierResult.reason,
    assistantMessage,
    tool,
    result,
    context,
  )
  if (limited) return limited
  return {
    behavior: 'deny',
    decisionReason: { type: 'classifier', classifier: 'auto-mode', reason: classifierResult.reason },
    message: buildYoloRejectionMessage(classifierResult.reason),
  }
}

/**
 * La decisión de permiso de una llamada a herramienta: la cadena de reglas,
 * y sobre su `ask` las transformaciones de modo — dontAsk deniega, auto
 * consulta al clasificador, y sin prompt disponible deciden los hooks o se
 * deniega. Las transformaciones van al final para que ningún retorno
 * temprano de la cadena las salte.
 */
export async function hasPermissionsToUseTool(
  tool: RegistryTool,
  input: Record<string, unknown>,
  context: EngineContext,
  assistantMessage: AssistantMessage,
  toolUseID: string,
): Promise<EngineDecision> {
  const result = await hasPermissionsToUseToolInner(tool, input, context)

  if (result.behavior === 'allow') {
    // Cualquier uso permitido en modo auto, aunque lo permita una regla, corta
    // la racha de denegaciones consecutivas.
    if (feature('TRANSCRIPT_CLASSIFIER')) {
      const appState = context.getAppState()
      const denialState = context.localDenialTracking ?? appState.denialTracking
      if (permissionContextOf(context).mode === 'auto' && denialState && denialState.consecutiveDenials > 0) {
        persistDenialState(context, recordSuccess(denialState))
      }
    }
    return result
  }
  if (result.behavior !== 'ask') return result

  const permissionContext = permissionContextOf(context)
  if (permissionContext.mode === 'dontAsk') {
    return {
      behavior: 'deny',
      decisionReason: { type: 'mode', mode: 'dontAsk' },
      message: DONT_ASK_REJECT_MESSAGE(tool.name),
    }
  }
  // El clasificador va antes que la ausencia de prompt: así funciona también
  // en headless.
  const autoActive =
    permissionContext.mode === 'auto' || (permissionContext.mode === 'plan' && isAutoModeActive())
  if (feature('TRANSCRIPT_CLASSIFIER') && autoActive) {
    return decideInAutoMode(tool, input, context, assistantMessage, toolUseID, result)
  }
  if (permissionContext.shouldAvoidPermissionPrompts) {
    const hookDecision = await runPermissionRequestHooksForHeadlessAgent(
      tool,
      input,
      toolUseID,
      context,
      permissionContext.mode,
      result.suggestions as PermissionUpdate[] | undefined,
    )
    if (hookDecision) return hookDecision
    return {
      behavior: 'deny',
      decisionReason: { type: 'asyncAgent', reason: 'Permission prompts are not available in this context' },
      message: AUTO_REJECT_MESSAGE(tool.name),
    }
  }
  return result
}

// ---- Edición de reglas en el contexto ----

type EditPermissionRuleArgs = {
  initialContext: ToolPermissionContext
  setToolPermissionContext: (updatedContext: ToolPermissionContext) => void
}

/** Borra una regla de su destino; las fuentes de sólo lectura lo rehúsan. */
export async function deletePermissionRule({
  rule,
  initialContext,
  setToolPermissionContext,
}: EditPermissionRuleArgs & { rule: PermissionRule }): Promise<void> {
  if (rule.source === 'policySettings' || rule.source === 'flagSettings' || rule.source === 'command') {
    throw new ContextError('Cannot delete permission rules from read-only settings')
  }
  const updatedContext = applyPermissionUpdate(initialContext as never, {
    type: 'removeRules',
    rules: [rule.ruleValue],
    behavior: rule.ruleBehavior,
    destination: rule.source as PermissionUpdateDestination,
  })
  switch (rule.source) {
    case 'localSettings':
    case 'userSettings':
    case 'projectSettings':
      deletePermissionRuleFromSettings(rule as never)
      break
    case 'cliArg':
    case 'session':
      // Fuentes en memoria: no hay nada que borrar del disco.
      break
  }
  setToolPermissionContext(updatedContext as never)
}

/** Agrupa reglas por fuente y comportamiento en actualizaciones de contexto. */
function convertRulesToUpdates(rules: PermissionRule[], type: 'addRules' | 'replaceRules'): PermissionUpdate[] {
  const grouped = new Map<string, { source: PermissionRuleSource; behavior: PermissionBehavior; values: PermissionRule['ruleValue'][] }>()
  for (const rule of rules) {
    const key = `${rule.source}:${rule.ruleBehavior}`
    const group = grouped.get(key) ?? { source: rule.source, behavior: rule.ruleBehavior, values: [] }
    group.values.push(rule.ruleValue)
    grouped.set(key, group)
  }
  return [...grouped.values()].map(group => ({
    type,
    rules: group.values,
    behavior: group.behavior,
    destination: group.source as PermissionUpdateDestination,
  }))
}

/** Suma reglas al contexto (arranque). */
export function applyPermissionRulesToPermissionContext(
  toolPermissionContext: ToolPermissionContext,
  rules: PermissionRule[],
): ToolPermissionContext {
  return applyPermissionUpdates(toolPermissionContext as never, convertRulesToUpdates(rules, 'addRules')) as never
}

const RULE_BEHAVIORS: PermissionBehavior[] = ['allow', 'deny', 'ask']

/** Vacía las reglas de un conjunto de fuentes, para los tres comportamientos. */
function clearSources(context: ToolPermissionContext, sources: PermissionUpdateDestination[]): ToolPermissionContext {
  let next = context
  for (const destination of sources) {
    for (const behavior of RULE_BEHAVIORS) {
      next = applyPermissionUpdate(next as never, { type: 'replaceRules', rules: [], behavior, destination }) as never
    }
  }
  return next
}

/**
 * Sincroniza las reglas leídas del disco (cambio de settings): reemplaza, no
 * suma. Las fuentes de disco se vacían antes, porque una fuente que se quedó
 * sin reglas no genera actualización y sus reglas viejas sobrevivirían.
 */
export function syncPermissionRulesFromDisk(
  toolPermissionContext: ToolPermissionContext,
  rules: PermissionRule[],
): ToolPermissionContext {
  let context = toolPermissionContext
  if (shouldAllowManagedPermissionRulesOnly()) {
    context = clearSources(context, ['userSettings', 'projectSettings', 'localSettings', 'cliArg', 'session'])
  }
  context = clearSources(context, ['userSettings', 'projectSettings', 'localSettings'])
  return applyPermissionUpdates(context as never, convertRulesToUpdates(rules, 'replaceRules')) as never
}
