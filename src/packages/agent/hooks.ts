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

import { getHooksConfigFromSnapshot, shouldDisableAllHooksIncludingManaged } from './hooksConfigSnapshot.js'
import { createAttachmentMessage } from './internal/queryRuntime.js'
import { getSessionId as runtimeSessionId, getCwdState } from './internal/sessionRuntime.js'
import { execHttpHook } from './hooks/execHttpHook.js'
import type { AgentMessage } from './internalTypes.js'
import { buildHookProgressMessage, type HookDisplaySource, type HookProgressMessage } from './hooks/hookProgress.js'
import { isHookEvent } from './types/hooks.js'
import type { PermissionUpdate } from '@thyrox/permission/permissionTypes.js'
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
