/**
 * La mitad por reglas de la decisión de permiso: denegaciones de la
 * herramienta entera y por campo, reglas de consulta (con la excepción del
 * sandbox para Bash), el verificador propio de la herramienta, las dos
 * pasadas de auto mode y el techo de permiso de un servidor MCP.
 *
 * Reimplementación del contrato de 2.1.275 (`chunk-q2gh92k2.js`), no copia:
 * `checkRuleBasedPermissions` ≙ `oT`, con `ule`, `bjn`, `Xrt`, `Alt`, `Bft`,
 * `jds`, `mz`, `BIn`, `ZEe`, `eke`, `zb`, `Xg`, `Mvt`, `LCe` y `$Q`.
 *
 * Divergencias declaradas:
 *
 * - La decisión de sandbox de una orden de Bash (`Xg`) se delega en
 *   `shouldUseSandbox` de tool-registry, que no lee el aislamiento del
 *   entorno de subprocesos (`CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`) del binario.
 * - La revisión de `allowed_domains` (`Alt`) exige que el sandbox ofrezca
 *   `registerCommandNetworkLists` (`$Q`); el de este árbol no lo ofrece, y
 *   la pasada no se dispara — igual que en el binario sin esa capacidad.
 */
import { isClassifierRouted } from './circuitBreakers.js'
import { createPermissionRequestMessage } from './permissions.js'
import { resolveToolPermissionContext } from './permissionContext.js'
import type { PermissionCallContext, PermissionContextShape } from './permissionContext.js'
import type { PermissionRule } from './permissionTypes.js'
import { getAskRuleForToolCall, getDenyRuleForToolCall, matchingFieldRule } from './toolRuleMatching.js'
import type { RuleTool } from './toolRuleMatching.js'

const BASH_TOOL_NAME = 'Bash'
const PERMISSION_CHECK_CRASHED = 'permission_check_crashed'
const ORGANIZATION_REQUIRES_APPROVAL = 'Your organization requires approval for this tool'
/** Fuentes cuyas denegaciones una herramienta de clasificador con `onBlock: flag` no salta (≙ `Bzo`). */
const CLASSIFIER_FLAG_BINDING_SOURCES = new Set(['userSettings', 'projectSettings', 'localSettings', 'session'])

type DecisionReason = {
  type: string
  reason?: string
  rule?: PermissionRule
  classifierApprovable?: boolean
  circuitBreaker?: string
  reasons?: Map<string, { behavior: string; decisionReason?: DecisionReason }>
  [key: string]: unknown
}

export type PermissionDecision = {
  behavior: 'allow' | 'deny' | 'ask' | 'passthrough'
  message?: string
  decisionReason?: DecisionReason
  matchedAskRule?: PermissionRule
  updatedInput?: unknown
  suggestions?: unknown
  [key: string]: unknown
}

/** Lo que el motor lee de una herramienta, además de lo que leen las reglas. */
export type EngineTool = RuleTool & {
  inputSchema: { parse: (input: unknown) => unknown }
  checkPermissions: (input: never, context: never) => Promise<PermissionDecision>
  isReadOnly?: (input: never) => boolean
  requiresUserInteraction?: () => boolean
  classifierOnly?: () => { onBlock?: string } | undefined
  sandboxNetworkLists?: (input: unknown) => unknown
  permissionCheckFailureDecision?: (input: unknown, context: unknown) => PermissionDecision
  isMcp?: boolean
  mcpInfo?: { serverName: string; toolName: string; effectiveMaxPermission?: string }
}

export type EngineCallContext = PermissionCallContext & {
  abortController: AbortController
  forRemoteExecution?: boolean
}

export type RuleCheckOptions = { crashIsObjection?: boolean; hookUpdatedInput?: unknown }

// ---- Errores de aborto (≙ `qe`, `Au`, `pt`) ----

/** El error con que una decisión abortada se propaga. */
export class PermissionCheckAbortError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'AbortError'
  }
}

function isAbortError(error: unknown): boolean {
  try {
    return (
      error instanceof PermissionCheckAbortError ||
      (error instanceof Error && (error.name === 'AbortError' || ('__CANCEL__' in error && Boolean((error as { __CANCEL__?: unknown }).__CANCEL__))))
    )
  } catch {
    return false
  }
}

function logError(error: unknown): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ;(require('./host.js') as { getPermissionHostBindings: () => { logDebug?: (m: string, meta?: unknown) => void } })
      .getPermissionHostBindings()
      .logDebug?.(`permission check failed: ${error instanceof Error ? error.message : String(error)}`, { level: 'error' })
  } catch {
    // sin anfitrión no hay a quién avisar
  }
}

// ---- Estado de auto mode (≙ `Yy`, `LCe`) ----

function isAutoModeActive(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./autoModeState.js') as { isAutoModeActive: () => boolean }).isAutoModeActive()
  } catch {
    return false
  }
}

/** ¿Decide el clasificador de auto mode en este contexto? (≙ `LCe`). */
export function isAutoModeContext(context: PermissionContextShape): boolean {
  return context.mode === 'auto' || (context.mode === 'plan' && isAutoModeActive() && !context.isBypassPermissionsModeAvailable)
}

// ---- Razones (≙ `zb`, `ZEe`, `eke`, `BIn`) ----

/** El primer corte de seguridad de la razón, también dentro de subcomandos (≙ `zb`). */
export function findSafetyCheck(reason: DecisionReason | undefined): DecisionReason | undefined {
  if (!reason) return undefined
  if (reason.type === 'safetyCheck') return reason
  if (reason.type === 'subcommandResults') {
    for (const result of reason.reasons?.values() ?? []) {
      const found = findSafetyCheck(result.decisionReason)
      if (found) return found
    }
  }
  return undefined
}

/** ¿Viene la consulta de una regla de consulta? (≙ `ZEe`). */
function isAskRuleReason(reason: DecisionReason | undefined): boolean {
  if (reason?.type === 'rule' && reason.rule?.ruleBehavior === 'ask') return true
  if (reason?.type === 'subcommandResults') {
    for (const result of reason.reasons?.values() ?? []) {
      if (result.behavior === 'ask' && isAskRuleReason(result.decisionReason)) return true
    }
  }
  return false
}

/** ¿Es una consulta que una regla de consulta exige? (≙ `eke`). */
function isAskRuleDecision(decision: PermissionDecision): boolean {
  return isAskRuleReason(decision.decisionReason) || decision.matchedAskRule?.ruleBehavior === 'ask'
}

/** ¿Sólo una persona puede responder esta razón? (≙ `BIn`). */
function needsPersonToAnswer(reason: DecisionReason | undefined): boolean {
  switch (reason?.type) {
    case 'safetyCheck':
      return !reason.classifierApprovable && !isClassifierRouted(reason)
    case 'rule':
      return reason.rule?.ruleBehavior === 'ask'
    case 'subcommandResults':
      return [...(reason.reasons?.values() ?? [])].some(result => needsPersonToAnswer(result.decisionReason))
    default:
      return false
  }
}

// ---- Herramientas de clasificador (≙ `OU`, `ule`, `mz`, `Xrt`) ----

function classifierOnlyPolicy(tool: EngineTool): { onBlock?: string } | undefined {
  return tool.classifierOnly?.()
}

/**
 * Una herramienta de clasificador con `onBlock: flag`, en auto mode, no
 * hereda las denegaciones que no vienen de settings ni de la sesión: si
 * sólo esas la cubren, la denegación se salta (≙ `ule`).
 */
function isDenyExemptForClassifierFlag(
  tool: EngineTool,
  input: Record<string, unknown>,
  call: EngineCallContext,
): boolean {
  const context = resolveToolPermissionContext(call)
  if (classifierOnlyPolicy(tool)?.onBlock !== 'flag' || !isAutoModeContext(context)) return false
  const bindingOnly = {
    ...context,
    alwaysDenyRules: Object.fromEntries(
      Object.entries(context.alwaysDenyRules).filter(([source]) => CLASSIFIER_FLAG_BINDING_SOURCES.has(source)),
    ),
  } as PermissionContextShape
  return getDenyRuleForToolCall(bindingOnly as never, tool) === null && matchingFieldRule(bindingOnly as never, tool, input, 'deny') === null
}

function classifierOnlyDenied(tool: EngineTool, why: string): PermissionDecision {
  return {
    behavior: 'deny',
    message: `Only the auto-mode classifier can allow ${tool.name}: ${why}`,
    decisionReason: { type: 'other', reason: `classifierOnly: ${why}` },
  }
}

/** Toda llamada a una herramienta de clasificador pasa por él (≙ `Xrt`). */
function classifierOnlyReview(
  tool: EngineTool,
  input: unknown,
  call: EngineCallContext,
  decision: PermissionDecision | undefined,
): PermissionDecision | undefined {
  if (classifierOnlyPolicy(tool) === undefined || decision?.behavior === 'deny') return undefined
  if (!isAutoModeContext(resolveToolPermissionContext(call))) return classifierOnlyDenied(tool, 'the session is not in auto mode')
  if (decision?.behavior === 'ask' && (needsPersonToAnswer(decision.decisionReason) || decision.matchedAskRule?.ruleBehavior === 'ask')) {
    return classifierOnlyDenied(tool, "this call trips a check only a person may answer, and nobody is asked about this tool's calls")
  }
  return {
    behavior: 'ask',
    message: decision !== undefined && 'message' in decision ? decision.message : `${tool.name} requires auto-mode classifier review.`,
    updatedInput: decision !== undefined && 'updatedInput' in decision ? (decision.updatedInput ?? input) : input,
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: 'safetyCheck',
      reason: `Every ${tool.name} call is reviewed by the auto-mode classifier; saved allow rules and hook allows do not apply.`,
      classifierApprovable: true,
    },
  }
}

// ---- allowed_domains (≙ `$Q`, `Alt`) ----

function sandboxManager(): Record<string, unknown> | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@thyrox/shell/sandbox.js') as { SandboxManager: Record<string, unknown> }).SandboxManager
  } catch {
    return undefined
  }
}

function callSandbox(name: string): boolean {
  const fn = sandboxManager()?.[name]
  try {
    return typeof fn === 'function' && Boolean((fn as () => unknown)())
  } catch {
    return false
  }
}

/** ¿Ofrece el sandbox listas de red por orden? (≙ `$Q`). */
function commandNetworkListsOffered(): boolean {
  return callSandbox('isSandboxingEnabled') && typeof sandboxManager()?.registerCommandNetworkLists === 'function'
}

/** Una llamada con `allowed_domains`, en auto mode, la revisa el clasificador (≙ `Alt`). */
function allowedDomainsReview(
  tool: EngineTool,
  input: unknown,
  call: EngineCallContext,
  decision: PermissionDecision | undefined,
): PermissionDecision | undefined {
  if (decision?.behavior === 'ask' || decision?.behavior === 'deny') return undefined
  if (tool.sandboxNetworkLists?.(input) === undefined || !commandNetworkListsOffered()) return undefined
  if (!isAutoModeContext(resolveToolPermissionContext(call))) return undefined
  return {
    behavior: 'ask',
    message: `${tool.name} carries allowed_domains, which the auto-mode classifier reviews together with the command.`,
    ...(decision?.behavior === 'allow' && decision.updatedInput !== undefined && { updatedInput: decision.updatedInput }),
    decisionReason: {
      type: 'safetyCheck',
      reason: `A ${tool.name} call that carries allowed_domains is reviewed by the auto-mode classifier; allow rules and hook allows approve the command, not the hosts.`,
      classifierApprovable: true,
    },
  }
}

// ---- El verificador propio (≙ `Bft`, `jds`) ----

/**
 * Qué hacer cuando el verificador de la herramienta revienta: un aborto se
 * propaga; lo demás se registra y decide la postura que la herramienta
 * declare (≙ `Bft` con `jds`).
 */
function onPermissionCheckCrash(
  error: unknown,
  tool: EngineTool,
  input: unknown,
  call: EngineCallContext,
): PermissionDecision | undefined {
  if (error instanceof PermissionCheckAbortError) throw error
  if (isAbortError(error) && call.abortController.signal.aborted) throw new PermissionCheckAbortError()
  if (!isAbortError(error)) logError(error)
  if (tool.permissionCheckFailureDecision === undefined) return undefined
  try {
    return tool.permissionCheckFailureDecision(input, call)
  } catch (inner) {
    if (!isAbortError(inner)) logError(inner)
    return {
      behavior: 'deny',
      message: `The ${tool.name} permission check failed and its fail-closed posture could not be determined. The call is denied.`,
      decisionReason: { type: 'other', reason: 'permission check crashed; tool declares a fail-closed posture' },
    }
  }
}

// ---- Regla de consulta (≙ `bjn`) ----

async function decideWithAskRule(
  tool: EngineTool,
  input: unknown,
  call: EngineCallContext,
  rule: PermissionRule,
  options?: RuleCheckOptions,
): Promise<PermissionDecision> {
  const fallback: PermissionDecision = {
    behavior: 'ask',
    decisionReason: { type: 'rule', rule },
    message: createPermissionRequestMessage(tool.name),
  }
  try {
    const parsed = tool.inputSchema.parse(input)
    const own = await tool.checkPermissions(parsed as never, call as never)
    if (own?.behavior === 'deny') return own
    if (own?.behavior === 'ask') {
      const { suggestions: _dropped, ...rest } = own
      return { ...rest, matchedAskRule: rule } as PermissionDecision
    }
  } catch (error) {
    const crash = onPermissionCheckCrash(error, tool, input, call)
    if (crash !== undefined && crash.behavior === 'deny') return crash
    if (crash === undefined && options?.crashIsObjection === true) {
      const reason = { type: 'other', reason: PERMISSION_CHECK_CRASHED }
      return { behavior: 'ask', message: createPermissionRequestMessage(tool.name, reason), decisionReason: reason }
    }
  }
  return fallback
}

// ---- Bash en sandbox (≙ `Xg`, `Mvt`) ----

function bashRunsSandboxed(input: unknown): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { shouldUseSandbox } = require('@thyrox/tool-registry/tools/BashTool/shouldUseSandbox.js') as {
      shouldUseSandbox: (input: unknown) => boolean
    }
    return shouldUseSandbox(input)
  } catch {
    return false
  }
}

/** ¿Está suspendido el auto-permiso del sandbox? En plan, o por capa (≙ `Mvt`). */
function isSandboxAutoAllowSuspended(context: PermissionContextShape): boolean {
  return context.mode === 'plan' || context.sandboxAutoAllowSuspended === true
}

function isMcpTool(tool: EngineTool): boolean {
  return tool.name?.startsWith('mcp__') || tool.isMcp === true
}

// ---- La decisión por reglas (≙ `oT`) ----

/**
 * La decisión que las reglas y el verificador de la herramienta toman sin
 * clasificador ni pregunta: una denegación, una consulta que no se puede
 * saltar, o null si la decisión queda para el resto de la cadena.
 */
export async function checkRuleBasedPermissions(
  tool: EngineTool,
  input: Record<string, unknown>,
  call: EngineCallContext,
  options?: RuleCheckOptions,
): Promise<PermissionDecision | null> {
  const context = resolveToolPermissionContext(call)
  const wholeToolDeny = getDenyRuleForToolCall(context as never, tool)
  if (wholeToolDeny && !isDenyExemptForClassifierFlag(tool, input, call)) {
    return { behavior: 'deny', decisionReason: { type: 'rule', rule: wholeToolDeny }, message: `Permission to use ${tool.name} has been denied.` }
  }
  const fieldDeny = matchingFieldRule(context as never, tool, input, 'deny')
  if (fieldDeny && !isDenyExemptForClassifierFlag(tool, input, call)) {
    return {
      behavior: 'deny',
      decisionReason: { type: 'rule', rule: fieldDeny },
      message: `Permission to use ${tool.name} with ${fieldDeny.ruleValue.ruleContent} has been denied.`,
    }
  }
  const askRule = getAskRuleForToolCall(context as never, tool)
  if (askRule) {
    const sandboxAutoAllow =
      tool.name === BASH_TOOL_NAME &&
      call.forRemoteExecution !== true &&
      callSandbox('isSandboxingEnabled') &&
      callSandbox('isAutoAllowBashIfSandboxedEnabled') &&
      bashRunsSandboxed(input)
    const suspended = sandboxAutoAllow && isSandboxAutoAllowSuspended(context)
    if (!(sandboxAutoAllow && !suspended)) return decideWithAskRule(tool, input, call, askRule, options)
  }

  let decision: PermissionDecision = { behavior: 'passthrough', message: createPermissionRequestMessage(tool.name) }
  try {
    const parsed = tool.inputSchema.parse(input)
    decision = await tool.checkPermissions(parsed as never, call as never)
  } catch (error) {
    const crash = onPermissionCheckCrash(error, tool, input, call)
    if (crash !== undefined) decision = crash
    else if (options?.crashIsObjection === true && classifierOnlyPolicy(tool) === undefined) {
      const reason = { type: 'other', reason: PERMISSION_CHECK_CRASHED }
      return { behavior: 'ask', message: createPermissionRequestMessage(tool.name, reason), decisionReason: reason }
    }
  }
  decision = classifierOnlyReview(tool, input, call, decision) ?? decision
  decision = allowedDomainsReview(tool, input, call, decision) ?? decision
  if (decision?.behavior === 'deny') return decision

  const fieldAsk = matchingFieldRule(context as never, tool, input, 'ask')
  if (fieldAsk) {
    return decision?.behavior === 'ask'
      ? { ...decision, matchedAskRule: fieldAsk }
      : { behavior: 'ask', decisionReason: { type: 'rule', rule: fieldAsk }, message: createPermissionRequestMessage(tool.name) }
  }
  const hookRewroteInput = options?.hookUpdatedInput !== undefined && !isMcpTool(tool)
  if (!hookRewroteInput && tool.requiresUserInteraction?.()) {
    return decision?.behavior === 'ask'
      ? decision
      : { behavior: 'ask', message: createPermissionRequestMessage(tool.name), decisionReason: { type: 'other', reason: 'requiresUserInteraction' } }
  }
  if (decision?.behavior === 'ask' && isAskRuleDecision(decision)) return decision
  if (tool.mcpInfo?.effectiveMaxPermission === 'ask') {
    const reason = { type: 'other', reason: ORGANIZATION_REQUIRES_APPROVAL }
    return { behavior: 'ask', message: createPermissionRequestMessage(tool.name, reason), decisionReason: reason }
  }
  if (decision?.behavior === 'ask' && (findSafetyCheck(decision.decisionReason) || decision.decisionReason?.type === 'sandboxOverride')) {
    return decision
  }
  return null
}
