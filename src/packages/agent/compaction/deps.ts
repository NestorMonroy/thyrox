/**
 * Porte de `ccnmt: packages/agent/types/compaction-deps.ts` (el archivo que
 * `compactionDeps.ts` reexporta entero -- "Canonical owner is
 * @claude-code-how-works/agent/types/compaction-deps").
 *
 * Diecinueve interfaces de dependencia inyectada + el agregado
 * `CompactionDeps`. Puro contrato -- sin lógica que probar.
 *
 * `CoreMessage` -> `Message` (`../messageShapes.ts`); `Usage` ->
 * `../coreMessages.ts` (el porte ya existente de `ccnmt:
 * packages/agent/types/messages.ts`).
 *
 * DIVERGENCIA DECLARADA: la fuente importa `CompactionResult`,
 * `CompactionContext` y `TokenWarningState` de `./compaction.js` y no los usa
 * en ningún cuerpo de interfaz -- import muerto en el propio origen. No se
 * reproduce: `index.ts` los toma de `types.ts` directamente (bloque
 * `export type` separado), así que arrastrarlos aquí no tenía consumidor.
 */
import type { Message } from '../messageShapes.ts'
import type { Usage } from '../coreMessages.ts'
import type { PostCompactCleanupActions, ToolNameConstants } from './types.ts'

// ── Feature Flag ──

export interface FeatureFlagDep {
  isEnabled(flag: string): boolean
}

// ── Config ──

export interface ConfigDep {
  getAutoCompactEnabled(): boolean
  getSdkBetas(): string[]
  getEnv(key: string): string | undefined
}

// ── Model ──

export interface ModelDep {
  getContextWindowSize(model: string, betas: string[]): number
  getMaxOutputTokensForModel(model: string): number
  getMainLoopModel(): string
}

// ── Token ──

export interface TokenDep {
  estimateTokens(messages: Message[]): number
  tokensFromLastAPIResponse(messages: Message[]): number | undefined
  roughEstimate(content: string): number
  roughEstimateForMessages(messages: Message[]): number
}

// ── Analytics ──

export interface AnalyticsDep {
  logEvent(name: string, metadata: Record<string, unknown>): void
  getFeatureValue<T>(key: string, defaultValue: T): T
  getDynamicConfig<T>(key: string, defaultValue: T): Promise<T>
}

// ── API ──

export interface ApiDep {
  streamCompactSummary(params: {
    messages: Message[]
    summaryRequest: Message
    context: unknown
  }): Promise<Message>
  getPromptTooLongTokenGap(response: Message): number | undefined
  startsWithApiErrorPrefix(text: string): boolean
  notifyCompaction(source: string, agentId?: string): void
  notifyCacheDeletion(source: string): void
}

// ── Messages ──

export interface MessagesDep {
  createCompactBoundaryMessage(
    trigger: string,
    preTokenCount: number,
    lastUuid?: string,
    userFeedback?: string,
    messagesSummarized?: number,
  ): Message
  createUserMessage(params: Record<string, unknown>): Message
  getAssistantMessageText(message: Message): string | null
  getLastAssistantMessage(messages: Message[]): Message | null
  getMessagesAfterCompactBoundary(messages: Message[]): Message[]
  isCompactBoundaryMessage(message: Message): boolean
  normalizeMessagesForAPI(messages: Message[], tools: unknown[]): Message[]
}

// ── Attachments ──

export interface AttachmentsDep {
  stripImagesFromMessages(messages: Message[]): Message[]
  stripReinjectedAttachments(messages: Message[]): Message[]
  createAttachmentMessage(attachment: unknown): Message
  generateFileAttachment(
    filename: string,
    context: unknown,
    successEvent: string,
    errorEvent: string,
    source: string,
  ): Promise<unknown | null>
  getDeferredToolsDeltaAttachment(
    tools: unknown[],
    model: string,
    messages: Message[],
    options: { callSite: string },
  ): unknown[]
  getAgentListingDeltaAttachment(context: unknown, messages: Message[]): unknown[]
  getMcpInstructionsDeltaAttachment(
    mcpClients: unknown[],
    tools: unknown[],
    model: string,
    messages: Message[],
  ): unknown[]
}

// ── Hooks ──

export interface HooksDep {
  executePreCompactHooks(
    params: { trigger: string; customInstructions: string | null },
    signal: AbortSignal,
  ): Promise<{ newCustomInstructions?: string; userDisplayMessage?: string }>
  executePostCompactHooks(
    params: { trigger: string; compactSummary: string },
    signal: AbortSignal,
  ): Promise<{ userDisplayMessage?: string }>
  processSessionStartHooks(source: string, options: { model: string }): Promise<Message[]>
}

// ── State ──

export interface StateDep {
  markPostCompaction(): void
  setLastSummarizedMessageId(id: string | undefined): void
  getLastSummarizedMessageId(): string | undefined
}

// ── Session Memory ──

export interface SessionMemoryDep {
  isSessionMemoryEmpty(content: string): Promise<boolean>
  truncateSessionMemoryForCompact(content: string): { truncatedContent: string; wasTruncated: boolean }
  getSessionMemoryContent(): Promise<string | null>
  waitForSessionMemoryExtraction(): Promise<void>
  getSessionMemoryPath(): string
}

// ── Session Storage ──

export interface SessionStorageDep {
  getTranscriptPath(): string
  reAppendSessionMetadata(): void
  clearSessionMessagesCache(): void
}

// ── Plans ──

export interface PlansDep {
  getPlan(agentId?: string): string | null
  getPlanFilePath(agentId?: string): string
}

// ── Skills ──

export interface SkillsDep {
  getInvokedSkillsForAgent(
    agentId?: string,
  ): Map<string, { skillName: string; skillPath: string; content: string; invokedAt: number }>
}

// ── Tool Search ──

export interface ToolSearchDep {
  isToolSearchEnabled(
    model: string,
    tools: unknown[],
    getPermissions: () => Promise<unknown>,
    agents: unknown,
    source: string,
  ): Promise<boolean>
  extractDiscoveredToolNames(messages: Message[]): Set<string>
}

// ── Fork ──

export interface ForkDep {
  runForkedAgent(params: {
    promptMessages: Message[]
    cacheSafeParams: unknown
    canUseTool: () => Promise<{ behavior: string; message: string }>
    querySource: string
    forkLabel: string
    maxTurns: number
    skipCacheWrite: boolean
    overrides?: { abortController: AbortController }
  }): Promise<{
    messages: Message[]
    totalUsage: Usage & { cache_creation_input_tokens?: number; cache_read_input_tokens?: number }
  }>
}

// ── Activity ──

export interface ActivityDep {
  isSessionActivityTrackingActive(): boolean
  sendSessionActivitySignal(): void
}

// ── Transcript ──

export interface TranscriptDep {
  writeSessionTranscriptSegment(messages: Message[]): void
}

// ── Context Cleanup ──

export interface ContextCleanupDep {
  clearUserContextCache(): void
  resetMemoryFilesCache(source: string): void
}

export interface CompactionDeps {
  featureFlags: FeatureFlagDep
  config: ConfigDep
  model: ModelDep
  tokens: TokenDep
  analytics: AnalyticsDep
  api: ApiDep
  messages: MessagesDep
  attachments: AttachmentsDep
  hooks: HooksDep
  state: StateDep
  sessionMemory: SessionMemoryDep
  sessionStorage: SessionStorageDep
  plans: PlansDep
  skills: SkillsDep
  toolSearch: ToolSearchDep
  fork: ForkDep
  activity: ActivityDep
  transcript: TranscriptDep
  contextCleanup: ContextCleanupDep
  postCompactCleanup: PostCompactCleanupActions
  toolNames: ToolNameConstants
}
