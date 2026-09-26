import type { Message } from './messageShapes.js'
import type { SetAppState } from './messageQueueManager.js'
import type { Tools } from '@thyrox/tool-registry/Tool.js'
import type { OrphanedPermission } from '@thyrox/repl/textInputTypes.js'
import type { ProcessUserInputContext } from '@thyrox/repl/processUserInput/processUserInput.js'
import type {
  ModelUsage,
  SDKAssistantMessageError,
  SDKMessage,
} from '@thyrox/headless-sdk/agentSdkTypes.js'

/** `getFastModeState` de `@thyrox/provider/fastMode`: los tres estados del SDK. */
export type FastModeState = 'off' | 'cooldown' | 'on'

/** Una entrada del registro de errores en memoria. */
export type InMemoryError = { error: string; timestamp: string }
import type {
  AgentHookResult,
  AgentMessage,
  AgentQuerySource,
  AgentREPLHookContext,
  AgentStopHookInfo,
  AgentTask,
  AgentToolUseContext,
} from './internalTypes.js'

// ── Filesystem abstraction ─────────────────────────────────────────────────────

/** Minimal filesystem abstraction needed by cronTasksCore */
export type AgentFsImplementation = {
  readFile(path: string, options: { encoding: BufferEncoding }): Promise<string>
  [key: string]: unknown
}

// ── Session cron task ──────────────────────────────────────────────────────────

/** In-memory (session-only) cron task — mirrors bootstrap/state.SessionCronTask */
export type AgentSessionCronTask = {
  id: string
  cron: string
  prompt: string
  createdAt: number
  recurring?: boolean
  agentId?: string
}

// ── File history types ─────────────────────────────────────────────────────────

/** Minimal file history snapshot shape for binding signatures */
export type AgentFileHistorySnapshot = {
  messageId: string
  trackedFileBackups: Record<string, unknown>
  timestamp: Date
  [key: string]: unknown
}

// ── Host bindings ──────────────────────────────────────────────────────────────

export type AgentHostBindings = {
  // ── Observability ────────────────────────────────────────────────────────────
  logDebug?: (message: string, metadata?: unknown) => void
  logEvent?: (event: string, metadata?: Record<string, number | boolean | string>) => void
  logError?: (err: unknown) => void
  logAntError?: (message: string, err: unknown) => void
  /** La forma de `local-observability/src/logging/error-log.ts:67`. */
  getInMemoryErrors?: () => InMemoryError[]
  categorizeRetryableAPIError?: (error: unknown) => SDKAssistantMessageError
  headlessProfilerCheckpoint?: (name: string) => void
  queryCheckpoint?: (name: string) => void

  // ── Session state ────────────────────────────────────────────────────────────
  getProjectRoot?: () => string
  getCwdState?: () => string
  setCwdState?: (cwd: string) => void
  getSessionId?: () => string
  getSdkBetas?: () => string[]
  getOriginalCwd?: () => string
  getIsNonInteractiveSession?: () => boolean
  isSessionPersistenceDisabled?: () => boolean

  // ── Cron session state ───────────────────────────────────────────────────────
  getScheduledTasksEnabled?: () => boolean
  setScheduledTasksEnabled?: (enabled: boolean) => void
  getSessionCronTasks?: () => AgentSessionCronTask[]
  addSessionCronTask?: (task: AgentSessionCronTask) => void
  removeSessionCronTasks?: (ids: readonly string[]) => number

  // ── Config / environment ─────────────────────────────────────────────────────
  getClaudeConfigHomeDir?: () => string

  // ── Process utilities ────────────────────────────────────────────────────────
  isProcessRunning?: (pid: number) => boolean
  registerCleanup?: (fn: () => Promise<void>) => () => void

  // ── Filesystem ───────────────────────────────────────────────────────────────
  getFsImplementation?: () => AgentFsImplementation

  // ── Storage ──────────────────────────────────────────────────────────────────
  recordFileHistorySnapshot?: (
    messageId: string,
    snapshot: AgentFileHistorySnapshot,
    isSnapshotUpdate: boolean,
  ) => Promise<void>

  // ── VSCode integration ────────────────────────────────────────────────────────
  notifyVscodeFileUpdated?: (
    filePath: string,
    oldContent: string | null,
    newContent: string | null,
  ) => void

  // ── Stop hooks ────────────────────────────────────────────────────────────────
  executeStopHooks?: (
    permissionMode?: string,
    signal?: AbortSignal,
    timeoutMs?: number,
    stopHookActive?: boolean,
    subagentId?: string,
    toolUseContext?: AgentToolUseContext,
    messages?: AgentMessage[],
    agentType?: string,
  ) => AsyncGenerator<AgentHookResult>

  executeTaskCompletedHooks?: (
    taskId: string,
    taskSubject?: string,
    taskDescription?: string,
    agentName?: string,
    teamName?: string,
    permissionMode?: string,
    signal?: AbortSignal,
    timeoutMs?: number,
    toolUseContext?: AgentToolUseContext,
  ) => AsyncGenerator<AgentHookResult>

  executeTeammateIdleHooks?: (
    agentName?: string,
    teamName?: string,
    permissionMode?: string,
    signal?: AbortSignal,
  ) => AsyncGenerator<AgentHookResult>

  executeStopFailureHooks?: (
    message: AgentMessage,
    toolUseContext: AgentToolUseContext,
  ) => void

  getStopHookMessage?: (blockingError: { blockingError: string }) => string
  getTaskCompletedHookMessage?: (blockingError: { blockingError: string }) => string
  getTeammateIdleHookMessage?: (blockingError: { blockingError: string }) => string

  // ── Message creators ──────────────────────────────────────────────────────────
  createAttachmentMessage?: (attachment: { type: string; [key: string]: unknown }) => AgentMessage
  createStopHookSummaryMessage?: (
    hookCount: number,
    hookInfos: AgentStopHookInfo[],
    hookErrors: string[],
    preventedContinuation: boolean,
    stopReason: string,
    hasOutput: boolean,
    style: string,
    toolUseID: string,
  ) => AgentMessage
  createSystemMessage?: (content: string, level?: string) => AgentMessage
  createUserInterruptionMessage?: (opts: { toolUse: boolean }) => AgentMessage
  createUserMessage?: (opts: { content: string; isMeta?: boolean }) => AgentMessage
  createCompactBoundaryMessage?: (
    trigger: 'manual' | 'auto',
    preTokens: number,
    lastPreCompactMessageUuid?: string,
    userContext?: string,
    messagesSummarized?: number,
  ) => AgentMessage

  // ── Teammate context ───────────────────────────────────────────────────────────
  isTeammate?: () => boolean
  getAgentName?: () => string | undefined
  getTeamName?: () => string | undefined

  // ── Task management ────────────────────────────────────────────────────────────
  getTaskListId?: () => string | undefined
  listTasks?: (taskListId: string | undefined) => Promise<AgentTask[]>

  // ── UI ─────────────────────────────────────────────────────────────────────────
  getShortcutDisplay?: (action: string, context: string, fallback: string) => string

  // ── Cache / context ────────────────────────────────────────────────────────────
  createCacheSafeParams?: (ctx: AgentREPLHookContext) => unknown
  saveCacheSafeParams?: (params: unknown) => void
  registerStructuredOutputEnforcement?: (
    setAppState: SetAppState,
    sessionId: string,
  ) => void
  getMainLoopModel?: () => string
  parseUserSpecifiedModel?: (model: string) => string
  loadAllPluginsCacheOnly?: () => Promise<{
    enabled: unknown[]
    [key: string]: unknown
  }>
  processUserInput?: (params: unknown) => Promise<{
    messages: Message[]
    shouldQuery: boolean
    allowedTools?: string[]
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
  buildSystemInitMessage?: (params: unknown) => SDKMessage
  sdkCompatToolName?: (toolName: string) => string
  handleOrphanedPermission?: (
    orphanedPermission: OrphanedPermission,
    tools: Tools,
    messages: AgentMessage[],
    context: ProcessUserInputContext,
  ) => AsyncGenerator<SDKMessage>
  isResultSuccessful?: (
    result: AgentMessage | undefined,
    lastStopReason: string | null,
  ) => boolean
  normalizeMessage?: (message: AgentMessage) => AsyncGenerator<SDKMessage>
  selectableUserMessagesFilter?: (message: AgentMessage) => boolean
  getCoordinatorUserContext?: (
    mcpClients: ReadonlyArray<{ name: string }>,
    scratchpadDir?: string,
  ) => Record<string, string>
  isSnipBoundaryMessage?: (message: AgentMessage) => boolean
  snipCompactIfNeeded?: (
    messages: AgentMessage[],
    options?: { force?: boolean },
  ) => { messages: Message[]; executed: boolean } | undefined

  // ── Session storage / debug capture ─────────────────────────────────────────
  recordTranscript?: (
    messages: AgentMessage[],
    teamInfo?: unknown,
    startingParentUuidHint?: string,
    allMessages?: readonly AgentMessage[],
  ) => Promise<string | null>
  flushSessionStorage?: () => Promise<void>
  recordContentReplacement?: (
    replacements: unknown[],
    agentId?: string,
  ) => Promise<void>
  createDumpPromptsFetch?: (
    agentIdOrSessionId: string,
  ) => (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>

  // ── Features ────────────────────────────────────────────────────────────────────
  executePromptSuggestion?: (ctx: AgentREPLHookContext) => void
  classifyJobState?: (jobDir: string, messages: AgentMessage[]) => Promise<void>

  // ── Computer use (CHICAGO_MCP) ────────────────────────────────────────────────
  cleanupComputerUseAfterTurn?: (toolUseContext: AgentToolUseContext) => Promise<void>

  // ── Token budget (query loop) ─────────────────────────────────────────────────
  getCurrentTurnTokenBudget?: () => number
  getTurnOutputTokens?: () => number
  incrementBudgetContinuationCount?: () => void
  microcompactMessages?: (
    messages: AgentMessage[],
    toolUseContext?: AgentToolUseContext,
    querySource?: AgentQuerySource,
  ) => Promise<{ messages: AgentMessage[]; [key: string]: unknown }>
  autoCompactIfNeeded?: (
    messages: AgentMessage[],
    toolUseContext: AgentToolUseContext,
    cacheSafeParams: unknown,
    querySource?: AgentQuerySource,
    tracking?: unknown,
    snipTokensFreed?: number,
  ) => Promise<{
    wasCompacted: boolean
    compactionResult?: unknown
    consecutiveFailures?: number
  }>
  getTotalAPIDuration?: () => number
  getTotalCost?: () => number
  getModelUsage?: () => Record<string, ModelUsage>
  getFastModeState?: (model: string, fastMode?: boolean) => FastModeState
  notifyCommandLifecycle?: (
    uuid: string,
    state: 'started' | 'completed',
  ) => void
  getCommandsByMaxPriority?: (
    maxPriority: 'now' | 'next' | 'later',
  ) => AgentMessage[]
  removeCommandsFromQueue?: (commands: AgentMessage[]) => void
  isSlashCommand?: (command: AgentMessage) => boolean

  // ── Timing ───────────────────────────────────────────────────────────────────
  now?: () => number
}
