/**
 * El registro de bindings del host — porte de
 * `ccnmt: packages/agent/host.ts`.
 *
 * El paquete `agent` describe el comportamiento del runtime sin acoplarse a
 * quién lo ejecuta: cada binding (logging, sesión, hooks, red) la instala el
 * proceso host una sola vez con `installAgentHostBindings`, y el resto del
 * paquete la consulta con `getAgentHostBindings()`. Sin bindings instaladas,
 * `getAgentHostBindings()` lanza — un binding individual ausente (todas son
 * opcionales) se resuelve caso por caso con el operador `?.` en el módulo
 * que la consume, nunca aquí.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `AgentHostBindings`
 * de `./contracts.ts` (285 líneas) — no está portado todavía en este
 * árbol. Este archivo declara el tipo **localmente**, acotado a los
 * bindings que los módulos ya portados de `internal/` consumen
 * (`runtimeSignals.ts`, `sdkRuntime.ts`, `sessionRuntime.ts`,
 * `runtimeBridges.ts`, `logging.ts`, `headlessRuntime.ts`, `commandQueue.ts`). Es un
 * subconjunto, no una reinvención: cada campo copia la firma exacta que
 * `contracts.ts` declara para ese binding. Se amplía según se porten más
 * módulos de `internal/` que consuman bindings adicionales — no se
 * completa en un solo pase (mismo criterio que
 * `atributos-de-clase-de-modelo.md` en el proyecto hermano `kaupamex-docs`:
 * lo que la fuente declara para el símbolo que se porta, ni más ni menos).
 *
 * `./internalTypes.ts` SÍ está portado (es autocontenido, sin
 * dependencias externas) — por eso `AgentMessage` se importa de ahí en
 * vez de repetir aquí una forma estructural abierta como
 * `AgentMessageLike` (que sigue existiendo, sin tocar, para los bindings
 * de `runtimeBridges.ts` que ya la usaban antes de este pase).
 */
import { HostBindingsError } from './errors.ts'
import type { AgentMessage } from './internalTypes.ts'

/**
 * Forma mínima de un mensaje de agente para el binding
 * `createCompactBoundaryMessage`. La fuente usa el `AgentMessage` completo
 * de `internalTypes.ts` (147 líneas, sin portar); aquí basta con que el
 * binding pueda devolver una forma estructural abierta — quien la consuma
 * en `runtimeBridges.ts` la castea a `CompactBoundaryMessage`.
 */
export type AgentMessageLike = Record<string, unknown>

/** La firma exacta que `contracts.ts` declara para `createDumpPromptsFetch`. */
export type DumpPromptsFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type AgentHostBindings = {
  // ── Logging (internal/logging.ts) ──────────────────────────────────────
  logEvent?: (
    event: string,
    metadata: Record<string, string | number | boolean>,
  ) => void
  logError?: (error: unknown) => void
  logAntError?: (message: string, error: unknown) => void
  logDebug?: (message: string, metadata?: unknown) => void

  // ── Observabilidad (runtimeSignals.ts) ─────────────────────────────────
  headlessProfilerCheckpoint?: (name: string) => void
  queryCheckpoint?: (name: string) => void
  notifyCommandLifecycle?: (
    uuid: string,
    state: 'started' | 'completed',
  ) => void

  // ── Envelope del SDK (sdkRuntime.ts) ────────────────────────────────────
  getInMemoryErrors?: () => unknown[]
  categorizeRetryableAPIError?: (error: unknown) => unknown
  getTotalAPIDuration?: () => number
  getTotalCost?: () => number
  getModelUsage?: () => Record<string, unknown>
  getFastModeState?: (model: string, fastMode?: boolean) => unknown

  // ── Estado de sesión (sessionRuntime.ts) ────────────────────────────────
  getSessionId?: () => string
  getSdkBetas?: () => string[]
  getCurrentTurnTokenBudget?: () => number
  getTurnOutputTokens?: () => number
  incrementBudgetContinuationCount?: () => void
  getCwdState?: () => string
  setCwdState?: (cwd: string) => void
  getOriginalCwd?: () => string
  isSessionPersistenceDisabled?: () => boolean

  // ── Pipeline de hooks Stop (`internal/stopHooksCore.ts`) ────────────────
  // Las once que `handleStopHooks` conduce. Se declaran juntas porque su
  // ausencia no rompía la compilación —cada llamada es opcional— sino que
  // dejaba al generador conduciendo el vacío: compilaba, corría y no hacía
  // nada. Ése es el defecto que #262 nombra, y el que su anulación atrapa.
  executeStopHooks?: (
    permissionMode: string,
    signal: AbortSignal,
    extra: unknown,
    stopHookActive: boolean,
    agentId: string | undefined,
    toolUseContext: unknown,
    messages: unknown[],
    agentType: string | undefined,
  ) => AsyncGenerator<StopHookExecutionResult, void>
  executeTaskCompletedHooks?: (
    taskId: string,
    subject: string,
    description: string | undefined,
    teammateName: string,
    teamName: string,
    permissionMode: string,
    signal: AbortSignal,
    extra: unknown,
    toolUseContext: unknown,
  ) => AsyncGenerator<StopHookExecutionResult, void>
  executeTeammateIdleHooks?: (
    teammateName: string,
    teamName: string,
    permissionMode: string,
    signal: AbortSignal,
  ) => AsyncGenerator<StopHookExecutionResult, void>
  createAttachmentMessage?: (attachment: unknown) => AgentMessage | undefined
  createStopHookSummaryMessage?: (
    hookCount: number,
    hookInfos: unknown[],
    hookErrors: string[],
    preventedContinuation: boolean,
    stopReason: string,
    hasOutput: boolean,
    kind: string,
    toolUseID: string,
  ) => AgentMessage | undefined
  getStopHookMessage?: (blockingError: unknown) => string
  getTaskCompletedHookMessage?: (blockingError: unknown) => string
  getTeammateIdleHookMessage?: (blockingError: unknown) => string
  classifyJobState?: (
    jobDir: string | undefined,
    assistantMessages: unknown[],
  ) => Promise<void> | undefined
  executePromptSuggestion?: (context: unknown) => Promise<void> | void
  cleanupComputerUseAfterTurn?: (
    toolUseContext: unknown,
  ) => Promise<void> | void

  // ── Snapshot de params seguro para caché (`/btw`, side_question) ────────
  createCacheSafeParams?: (context: unknown) => unknown
  saveCacheSafeParams?: (params: unknown) => void

  // ── Tablero de tareas, leído por el pipeline de Stop ────────────────────
  getTaskListId?: () => string | undefined
  listTasks?: (taskListId: string | undefined) => Promise<HostTask[]>
  isTeammate?: () => boolean
  getAgentName?: () => string
  getTeamName?: () => string
  getShortcutDisplay?: (
    action: string,
    scope: string,
    fallback: string,
  ) => string

  // ── Puentes de runtime (runtimeBridges.ts) ──────────────────────────────
  createCompactBoundaryMessage?: (
    trigger: 'manual' | 'auto',
    preTokens: number,
    lastPreCompactMessageUuid?: string,
    userContext?: string,
    messagesSummarized?: number,
  ) => AgentMessageLike
  recordTranscript?: (
    messages: AgentMessageLike[],
    teamInfo?: unknown,
    startingParentUuidHint?: string,
    allMessages?: readonly AgentMessageLike[],
  ) => Promise<string | null>
  flushSessionStorage?: () => Promise<void>
  recordContentReplacement?: (
    replacements: unknown[],
    agentId?: string,
  ) => Promise<void>
  createDumpPromptsFetch?: (agentIdOrSessionId: string) => DumpPromptsFetch

  // ── Modo headless / --print (internal/headlessRuntime.ts) ──────────────
  registerStructuredOutputEnforcement?: (
    setAppState: (f: (prev: unknown) => unknown) => void,
    sessionId: string,
  ) => void
  getMainLoopModel?: () => string
  parseUserSpecifiedModel?: (model: string) => string
  loadAllPluginsCacheOnly?: () => Promise<{
    enabled: unknown[]
    [key: string]: unknown
  }>
  processUserInput?: (params: unknown) => Promise<{
    messages: AgentMessage[]
    shouldQuery: boolean
    allowedTools: unknown
    model?: string
    resultText?: string
    [key: string]: unknown
  }>
  fetchSystemPromptParts?: (params: unknown) => Promise<{
    defaultSystemPrompt: string[]
    userContext: Record<string, string>
    systemContext: Record<string, string>
  }>
  shouldEnableThinkingByDefault?: () => boolean | undefined
  buildSystemInitMessage?: (params: unknown) => unknown
  sdkCompatToolName?: (toolName: string) => string
  handleOrphanedPermission?: (
    orphanedPermission: unknown,
    tools: unknown[],
    messages: AgentMessage[],
    context: unknown,
  ) => AsyncGenerator<unknown>
  isResultSuccessful?: (
    result: AgentMessage | undefined,
    lastStopReason: string | null,
  ) => boolean
  normalizeMessage?: (message: AgentMessage) => AsyncGenerator<unknown>
  selectableUserMessagesFilter?: (message: AgentMessage) => boolean
  getCoordinatorUserContext?: (
    mcpClients: ReadonlyArray<{ name: string }>,
    scratchpadDir?: string,
  ) => Record<string, string>
  isSnipBoundaryMessage?: (message: AgentMessage) => boolean
  snipCompactIfNeeded?: (
    messages: AgentMessage[],
    options?: { force?: boolean },
  ) => { messages: AgentMessage[]; executed: boolean } | undefined

  // ── Cola de comandos (internal/commandQueue.ts) ─────────────────────────
  getCommandsByMaxPriority?: (
    maxPriority: 'now' | 'next' | 'later',
  ) => AgentMessage[]
  removeCommandsFromQueue?: (commands: AgentMessage[]) => void
  isSlashCommand?: (command: AgentMessage) => boolean
}

let agentHostBindings: AgentHostBindings | null = null

/**
 * Una tarea del tablero, en la forma MÍNIMA que el pipeline de Stop lee:
 * su estado para saber si hay trabajo de fondo en vuelo, y su dueño para
 * saber de quién. El tablero real declara muchos más campos; declararlos
 * todos aquí ataría este paquete a su esquema sin necesidad.
 */
export type HostTask = {
  id: string
  subject: string
  description?: string
  status: string
  owner?: string
}

/** Lo que un ejecutor de hooks emite por cada hook que corre. */
export type StopHookExecutionResult = {
  message?: AgentMessage
  blockingError?: { blockingError: string }
  preventContinuation?: boolean
  stopReason?: string
  hook?: unknown
  impossible?: boolean
}

export function installAgentHostBindings(bindings: AgentHostBindings): void {
  agentHostBindings = bindings
}

export function getAgentHostBindings(): AgentHostBindings {
  if (!agentHostBindings) {
    throw new HostBindingsError(
      'Agent host bindings have not been installed. Install host bindings before using @claude-code-how-works/agent runtime APIs.',
    )
  }
  return agentHostBindings
}
