/**
 * Soporte de `claudeLegacyRuntime.ts` (uno de los 18) — agrega en un solo
 * módulo los sustitutos locales de las DECENAS de siblings de
 * `ccnmt: packages/provider/src/claudeLegacyRuntime.ts` que NO están
 * asignados a este pase y que, medido con `Bun.resolveSync` desde
 * `/home/user/thyrox/src/packages/provider`, genuinamente no resuelven en
 * este árbol: `betas.ts`, `withRetry.ts`, `vcr.ts`, `logging.ts`,
 * `errors.ts`, `promptCacheBreakDetection.ts`, `thinking.ts`,
 * `advisor.ts`, `fastMode.ts`, `connectorTextTypes.ts`, `fingerprint.ts`,
 * `legacy/api.ts`, `imageDimensionStrip.ts`, `apiRetryTelemetry.ts`,
 * `systemPromptTelemetry.ts`, `model/bedrock.ts`, `partialStreamRecovery.ts`,
 * y la capa entera `@claude-code-how-works/{agent,tool-registry,permission,
 * app-host,mcp-runtime,ide}` (medido: sólo `@thyrox/agent/idTypes` y
 * `@thyrox/agent/messageShapes.ts` resuelven de esa familia; `context.ts`,
 * `effort.ts`, `constants/betas.ts`, `messages.ts`, `tokens.ts`,
 * `agentContext.ts`, `toolSearch.ts`, `attributionMetadata.ts`,
 * `compaction/*`, `claudeInChrome/*`, `contentArray.ts` — ninguno).
 *
 * Cada sustituto documenta su fidelidad: los que son constantes literales
 * (las cabeceras beta) están tomados de
 * `ccnmt: packages/provider/src/betasConstants.ts` verbatim — son datos,
 * no lógica, y citarlos preserva el comportamiento observable exacto de
 * qué string viaja en `anthropic-beta`. Los que son lógica de orquestación
 * profunda (tool search, cached-microcompact, advisor, fast mode, VCR,
 * retry con backoff 529, scrub de thinking cross-conexión, instrucciones
 * de Chrome) quedan REDUCIDOS a una forma mínima que preserva la FIRMA y
 * el contrato de llamada, no el comportamiento interno completo — el
 * propio `claudeLegacyRuntime.ts` declara, símbolo por símbolo, cuál usa
 * cuál y por qué.
 */

import { randomUUID } from 'node:crypto'
import { readEnv } from '@thyrox/config/env/utils'

// ---------------------------------------------------------------------------
// Tipos locales de la capa `tool-registry`/`agent` de la fuente — ninguno
// de esos paquetes resuelve aquí. Se aproximan a la forma estructural
// mínima que `claudeLegacyRuntime.ts` necesita para tipar sin interpretar.
// ---------------------------------------------------------------------------

export type QuerySource = string
export type CacheScope = 'global'

export type Tool = {
  name: string
  isMcp?: boolean
  isLsp?: boolean
  [key: string]: unknown
}
export type Tools = Tool[]
export type AgentDefinition = Record<string, unknown>
export type AgentId = string
export type QueryChainTracking = Record<string, unknown>
export type Notification = Record<string, unknown>
export type ToolPermissionContext = Record<string, unknown>

export function toolMatchesName(tool: Tool, name: string): boolean {
  return tool.name === name
}

export function getEmptyToolPermissionContext(): ToolPermissionContext {
  return {}
}

/**
 * Porte reducido de `@claude-code-how-works/agent/messages.js`:
 * `createUserMessage`. Construye el `UserMessage` mínimo que
 * `queryHaiku`/`queryWithModel` necesitan.
 */
export function createUserMessage(args: { content: unknown; isMeta?: boolean }): {
  type: 'user'
  isMeta?: boolean
  message: { role: 'user'; content: unknown }
} {
  return {
    type: 'user',
    ...(args.isMeta !== undefined && { isMeta: args.isMeta }),
    message: { role: 'user', content: args.content },
  }
}

/**
 * Sustituto de la macro `feature()` de `bun:bundle` (sistema de flags de
 * compilación propio de ccnmt, ausente en este árbol). Siempre `false`:
 * es el valor seguro por defecto — cada rama gateada por `feature(...)`
 * en la fuente es una capacidad opt-in (CONNECTOR_TEXT, CACHED_MICROCOMPACT,
 * TRANSCRIPT_CLASSIFIER) que, deshabilitada, deja el comportamiento base
 * intacto.
 */
export function feature(_flag: string): boolean {
  return false
}

// ---------------------------------------------------------------------------
// Cabeceras beta — verbatim de
// `ccnmt: packages/provider/src/betasConstants.ts`. Son datos (strings de
// versión de API), no lógica: citarlos preserva el string exacto que
// viaja en `anthropic-beta`.
// ---------------------------------------------------------------------------

export const CLAUDE_CODE_20250219_BETA_HEADER = 'claude-code-how-works-how-works-20250219'
export const INTERLEAVED_THINKING_BETA_HEADER = 'interleaved-thinking-2025-05-14'
export const CONTEXT_1M_BETA_HEADER = 'context-1m-2025-08-07'
export const CONTEXT_MANAGEMENT_BETA_HEADER = 'context-management-2025-06-27'
export const STRUCTURED_OUTPUTS_BETA_HEADER = 'structured-outputs-2025-12-15'
export const EFFORT_BETA_HEADER = 'effort-2025-11-24'
export const TASK_BUDGETS_BETA_HEADER = 'task-budgets-2026-03-13'
export const PROMPT_CACHING_SCOPE_BETA_HEADER = 'prompt-caching-scope-2026-01-05'
export const FAST_MODE_BETA_HEADER = 'fast-mode-2026-02-01'
export const REDACT_THINKING_BETA_HEADER = 'redact-thinking-2026-02-12'
export const AFK_MODE_BETA_HEADER = '' // gateada por TRANSCRIPT_CLASSIFIER, siempre off aquí (feature() = false)
export const ADVISOR_BETA_HEADER = 'advisor-tool-2026-03-01'
export const CACHE_DIAGNOSIS_BETA_HEADER = 'cache-diagnosis-2026-04-07'
export const CACHE_EDITING_BETA_HEADER = ''
export const TOOL_SEARCH_BETA_HEADER_1P = 'advanced-tool-use-2025-11-20'
export const TOOL_SEARCH_BETA_HEADER_3P = 'tool-search-tool-2025-10-19'

// ---------------------------------------------------------------------------
// `betas.ts` — reducido a los seis símbolos que `claudeLegacyRuntime.ts`
// consume. `getModelBetas`/`getMergedBetas` en la fuente calculan la
// lista completa de betas por-modelo con docenas de gates de GrowthBook;
// aquí devuelven la base mínima verbatim-correcta (Claude Code +
// interleaved thinking), sin los gates opt-in.
// ---------------------------------------------------------------------------

export function getModelBetas(_model: string): string[] {
  return [CLAUDE_CODE_20250219_BETA_HEADER, INTERLEAVED_THINKING_BETA_HEADER]
}

export function getMergedBetas(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const beta of list ?? []) {
      if (beta && !seen.has(beta)) {
        seen.add(beta)
        out.push(beta)
      }
    }
  }
  return out
}

export function getBedrockExtraBodyParamsBetas(betas: string[]): string[] {
  const bedrockOnly = new Set([INTERLEAVED_THINKING_BETA_HEADER, CONTEXT_1M_BETA_HEADER, TOOL_SEARCH_BETA_HEADER_3P])
  return betas.filter(b => bedrockOnly.has(b))
}

export function sanitizeBetaHeaders(betas: string[]): string[] {
  return betas.filter(b => b.length > 0)
}

export function shouldIncludeFirstPartyOnlyBetas(): boolean {
  return true
}

export function shouldUseGlobalCacheScope(): boolean {
  return false
}

export function getToolSearchBetaHeader(): string {
  return TOOL_SEARCH_BETA_HEADER_1P
}

export function modelSupportsStructuredOutputs(_model: string): boolean {
  return true
}

export function modelSupportsEffort(_model: string): boolean {
  return false
}

export function modelSupportsAdvisor(_model: string): boolean {
  return false
}

export function isAdvisorEnabled(): boolean {
  return false
}

export function isValidAdvisorModel(_model: string): boolean {
  return false
}

export function getExperimentAdvisorModels(): string[] {
  return []
}

export const ADVISOR_TOOL_INSTRUCTIONS = ''

export function isFastModeAvailable(): boolean {
  return false
}
export function isFastModeCooldown(): boolean {
  return false
}
export function isFastModeSupportedByModel(_model: string): boolean {
  return false
}

export function isToolSearchEnabled(
  _model: string,
  _tools: Tools,
  _getToolPermissionContext: () => Promise<ToolPermissionContext>,
  _agents: AgentDefinition[],
  _source: string,
): Promise<boolean> {
  return Promise.resolve(false)
}

export function extractDiscoveredToolNames(_messages: unknown[]): Set<string> {
  return new Set()
}
export function isDeferredTool(_tool: Tool): boolean {
  return false
}
export function isDeferredToolsDeltaEnabled(): boolean {
  return false
}
export const TOOL_SEARCH_TOOL_NAME = 'ToolSearchTool'
export function formatDeferredToolLine(tool: Tool): string {
  return `- ${tool.name}`
}
export function count<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.filter(predicate).length
}
export function isMcpInstructionsDeltaEnabled(): boolean {
  return false
}
export function isToolFromMcpServer(_toolName: string, _serverName: string): boolean {
  return false
}
export const CLAUDE_IN_CHROME_MCP_SERVER_NAME = 'claude-in-chrome'
export const CHROME_TOOL_SEARCH_INSTRUCTIONS = ''

// ---------------------------------------------------------------------------
// `thinking.ts` — reducido: sin auto-detección de soporte por-modelo, sin
// override de tipo. `ThinkingConfig` real vive en `internal/providerTypes.ts`.
// ---------------------------------------------------------------------------

export function modelSupportsThinking(_model: string): boolean {
  return false
}
export function modelSupportsAdaptiveThinking(_model: string): boolean {
  return false
}
export function mustUseAdaptiveThinking(_model: string): boolean {
  return false
}
export function getThinkingTypeOverride(_model: string): string | undefined {
  return undefined
}
export function getDefaultThinkingDisplay(): boolean {
  return true
}
export function getMaxThinkingTokensForModel(_model: string): number {
  return 32_000
}

// ---------------------------------------------------------------------------
// `withRetry.ts` — reducido a un único reintento sobre 529 (overloaded),
// preservando el CONTRATO de llamada (generador que produce
// `SystemAPIErrorMessage` y retorna el valor final) que
// `executeNonStreamingRequest`/`verifyApiKey` consumen. La fuente hace
// backoff exponencial multi-intento con fallback de modelo; aquí es
// intento único + un reintento, sin fallback de modelo.
// ---------------------------------------------------------------------------

export type RetryContext = { attempt: number; usingFallback: boolean; fallbackModel?: string }

export class CannotRetryError extends Error {
  originalError: unknown
  constructor(originalError: unknown) {
    super(originalError instanceof Error ? originalError.message : String(originalError))
    this.name = 'CannotRetryError'
    this.originalError = originalError
  }
}

export class FallbackTriggeredError extends Error {
  constructor(message = 'fallback triggered') {
    super(message)
    this.name = 'FallbackTriggeredError'
  }
}

export function is529Error(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      ('status' in error ? (error as { status?: number }).status === 529 : false),
  )
}

export type WithRetryOptions = {
  model: string
  fallbackModel?: string
  thinkingConfig?: unknown
  fastMode?: boolean
  signal?: AbortSignal
  initialConsecutive529Errors?: number
  querySource?: QuerySource
  maxRetries?: number
}

/**
 * Firma fiel a la fuente: `withRetry(getClient, fn, options)` produce un
 * generador async. `fn` recibe `(cliente, intento, contexto)`. Reducido:
 * un solo reintento ante 529/`APIConnectionTimeoutError`-like; cualquier
 * otro error se envuelve en `CannotRetryError` y se relanza.
 */
export async function* withRetry<TClient, TResult>(
  getClient: () => TClient | Promise<TClient>,
  fn: (client: TClient, attempt: number, context: RetryContext) => Promise<TResult>,
  options: WithRetryOptions,
): AsyncGenerator<{ type: 'system'; subtype: string; attempt: number }, TResult> {
  const maxRetries = options.maxRetries ?? 1
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const client = await getClient()
      return await fn(client, attempt, { attempt, usingFallback: false })
    } catch (error) {
      lastError = error
      if (attempt < maxRetries && is529Error(error)) {
        yield { type: 'system', subtype: 'retry', attempt }
        continue
      }
      throw new CannotRetryError(error)
    }
  }
  throw new CannotRetryError(lastError)
}

/** Drena un generador de `withRetry`/similar y devuelve su valor final. */
export async function returnValue<T>(gen: AsyncGenerator<unknown, T>): Promise<T> {
  let result = await gen.next()
  while (!result.done) result = await gen.next()
  return result.value
}

// ---------------------------------------------------------------------------
// `vcr.ts` — grabado/reproducción de respuestas para tests, NO asignado.
// Sustituto no-op: ejecuta la función real cada vez, sin grabar ni leer
// una cinta.
// ---------------------------------------------------------------------------

export async function withVCR<T>(_seedMessages: unknown, fn: () => Promise<T>): Promise<T> {
  return fn()
}

export async function* withStreamingVCR<T>(
  _messages: unknown,
  genFn: () => AsyncGenerator<T, void>,
): AsyncGenerator<T, void> {
  yield* genFn()
}

// ---------------------------------------------------------------------------
// Estado de sesión que la fuente lee de
// `@claude-code-how-works/app-host/bootstrap/state.js` — zona `app-host`
// prohibida y, además, no asignada. Mismo criterio que
// `internal/authFileDescriptor.ts`: variables de módulo locales — el
// propósito de la caché es "estable durante este proceso", que una
// variable local cumple igual (se pierde la sincronización con el resto
// del estado de app-host; nadie más en este árbol lee estos slots hoy).
// ---------------------------------------------------------------------------

let afkModeHeaderLatched: boolean | null = null
let cacheDiagnosisHeaderLatched: boolean | null = null
let cacheEditingHeaderLatched: boolean | null = null
let fastModeHeaderLatched: boolean | null = null
let lastApiCompletionTimestamp: number | null = null
let promptCache1hAllowlist: string[] | null = null
let promptCache1hEligible: boolean | null = null
let thinkingClearLatched: boolean | null = null
let lastMainRequestId: string | null = null
const sessionId = randomUUID()

export const getAfkModeHeaderLatched = (): boolean | null => afkModeHeaderLatched
export const setAfkModeHeaderLatched = (v: boolean | null): void => {
  afkModeHeaderLatched = v
}
export const getCacheDiagnosisHeaderLatched = (): boolean | null => cacheDiagnosisHeaderLatched
export const setCacheDiagnosisHeaderLatched = (v: boolean | null): void => {
  cacheDiagnosisHeaderLatched = v
}
export const getCacheEditingHeaderLatched = (): boolean | null => cacheEditingHeaderLatched
export const setCacheEditingHeaderLatched = (v: boolean | null): void => {
  cacheEditingHeaderLatched = v
}
export const getFastModeHeaderLatched = (): boolean | null => fastModeHeaderLatched
export const setFastModeHeaderLatched = (v: boolean | null): void => {
  fastModeHeaderLatched = v
}
export const getLastApiCompletionTimestamp = (): number | null => lastApiCompletionTimestamp
export const setLastApiCompletionTimestamp = (v: number | null): void => {
  lastApiCompletionTimestamp = v
}
export const getPromptCache1hAllowlist = (): string[] | null => promptCache1hAllowlist
export const setPromptCache1hAllowlist = (v: string[]): void => {
  promptCache1hAllowlist = v
}
export const getPromptCache1hEligible = (): boolean | null => promptCache1hEligible
export const setPromptCache1hEligible = (v: boolean): void => {
  promptCache1hEligible = v
}
export const getThinkingClearLatched = (): boolean | null => thinkingClearLatched
export const setThinkingClearLatched = (v: boolean | null): void => {
  thinkingClearLatched = v
}
export const getSessionId = (): string => sessionId
export const setLastMainRequestId = (id: string | null): void => {
  lastMainRequestId = id
}
export const getLastMainRequestId = (): string | null => lastMainRequestId

// ---------------------------------------------------------------------------
// `claudeAiLimits.ts` — no asignado. `currentLimits.isUsingOverage` es el
// único campo leído en este pase.
// ---------------------------------------------------------------------------

export const currentLimits: { isUsingOverage: boolean } = { isUsingOverage: false }
export function extractQuotaStatusFromError(_error: unknown): unknown {
  return undefined
}
export function extractQuotaStatusFromHeaders(_headers: unknown): unknown {
  return undefined
}

// ---------------------------------------------------------------------------
// `contentArray.ts` / `compaction/microCompact.ts` — no asignados.
// `addCacheBreakpoints` (uno de los 24 exportados) los consume sólo en su
// rama `useCachedMC` (feature CACHED_MICROCOMPACT, siempre off aquí).
// ---------------------------------------------------------------------------

export function insertBlockAfterToolResults(content: unknown[], block: unknown): void {
  let insertAt = content.length
  for (let i = content.length - 1; i >= 0; i--) {
    const entry = content[i] as { type?: string } | undefined
    if (entry?.type === 'tool_result') {
      insertAt = i + 1
      break
    }
  }
  content.splice(insertAt, 0, block)
}

export function pinCacheEdits(_userMessageIndex: number, _block: unknown): void {
  // no-op: el pinning cross-turno de cache_edits vive en
  // `agent/compaction/microCompact.js`, fuera de alcance.
}
export function consumePendingCacheEdits(): unknown {
  return null
}
export function getPinnedCacheEdits(): unknown[] {
  return []
}
export function markToolsSentToAPIState(_tools: unknown): void {}

// ---------------------------------------------------------------------------
// `connectorTextTypes.ts` / `fingerprint.ts` / `legacy/api.ts` /
// `imageDimensionStrip.ts` / `promptCacheBreakDetection.ts` /
// `apiRetryTelemetry.ts` / `systemPromptTelemetry.ts` /
// `partialStreamRecovery.ts` — no asignados. Sustitutos mínimos.
// ---------------------------------------------------------------------------

export function isConnectorTextBlock(_block: unknown): boolean {
  return false
}

export function computeFingerprintFromMessages(_messages: unknown[]): string {
  return ''
}

export function splitSysPromptPrefix(
  systemPrompt: readonly string[],
  _options?: { skipGlobalCacheForSystemPrompt?: boolean },
): { text: string; cacheScope: CacheScope | null }[] {
  return systemPrompt.map(text => ({ text, cacheScope: null }))
}

export function logAPIPrefix(_model: string): string {
  return ''
}

export function parseMediaBlockStripError(_error: unknown): unknown {
  return null
}
export function stripMediaBlockFromMessages<T>(messages: T[]): T[] {
  return messages
}

export const CACHE_TTL_1HOUR_MS = 60 * 60 * 1000
export function checkResponseForCacheBreak(_response: unknown): boolean {
  return false
}
export function recordPromptState(_state: unknown): void {}

export function emitApiRetriesExhausted(_info: unknown): void {}
export function maybeEmitSystemPromptEvent(_joined: string): void {}

export const API_ERROR_MESSAGE_PREFIX = 'API Error: '
export const CUSTOM_OFF_SWITCH_MESSAGE = ''
export function getAssistantMessageFromError(error: unknown): {
  type: 'assistant'
  message: { role: 'assistant'; content: string; id?: string }
} {
  const text = error instanceof Error ? error.message : String(error)
  return { type: 'assistant', message: { role: 'assistant', content: `${API_ERROR_MESSAGE_PREFIX}${text}` } }
}
export function getErrorMessageIfRefusal(_response: unknown): string | undefined {
  return undefined
}

export type NonNullableUsage = {
  input_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  output_tokens: number
  server_tool_use: { web_search_requests: number; web_fetch_requests: number }
  service_tier: string | null
  cache_creation: { ephemeral_1h_input_tokens: number; ephemeral_5m_input_tokens: number }
  inference_geo?: string
  iterations?: number
  speed?: string
}
export const EMPTY_USAGE: NonNullableUsage = {
  input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  output_tokens: 0,
  server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
  service_tier: null,
  cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
}
export type GlobalCacheStrategy = 'none' | 'system_prompt'
export function logAPIError(_info: unknown): void {}
export function logAPIQuery(_info: unknown): void {}
export function logAPISuccessAndDuration(_info: unknown): void {}

export function getInferenceProfileBackingModel(model: string): string {
  return model
}

export function startSessionActivity(_label: string): void {}
export function stopSessionActivity(_label: string): void {}

export function getInitializationStatus(): { status: 'ready' | 'pending' | 'not-started' } {
  return { status: 'ready' }
}

// ---------------------------------------------------------------------------
// `agent/context.js`/`config/env/validation`/`config/generators` — no
// asignados (medido: fuera del alcance de `@thyrox/agent`/`@thyrox/config`
// publicados hoy).
// ---------------------------------------------------------------------------

export const CAPPED_DEFAULT_MAX_TOKENS = 8_000

/**
 * Tabla local de tokens de salida máximos por familia de modelo. La
 * fuente (`agent/context.js: getModelMaxOutputTokens`) deriva esto de un
 * registro de modelos mucho más rico (por-conexión, por-proveedor); aquí
 * es una tabla fija por prefijo de nombre, suficiente para que
 * `getMaxOutputTokensForModel` (uno de los 24 exportados) tenga un valor
 * de partida coherente.
 */
export function getModelMaxOutputTokens(model: string): { default: number; upperLimit: number } {
  if (/opus|sonnet/.test(model)) return { default: 64_000, upperLimit: 64_000 }
  if (/haiku/.test(model)) return { default: 32_000, upperLimit: 32_000 }
  return { default: 8_192, upperLimit: 32_000 }
}

export function getSonnet1mExpTreatmentEnabled(): boolean {
  return false
}

export function validateBoundedIntEnvVar(
  _name: string,
  rawValue: string | undefined,
  defaultValue: number,
  upperLimit: number,
): { effective: number } {
  const parsed = rawValue !== undefined ? parseInt(rawValue, 10) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return { effective: defaultValue }
  return { effective: Math.min(parsed, upperLimit) }
}

/** `config/generators` — usado sólo para el drenado de `withRetry` arriba. */
export { returnValue as returnValueFromGenerator }

export function getOrCreateUserID(): string {
  return readEnv('CLAUDE_CODE_USER_ID') ?? sessionId
}

export function resolveAppliedEffort(_options: unknown): string | undefined {
  return undefined
}
export function computeAttributionMetadata(_options: unknown): Record<string, unknown> {
  return {}
}
export function getAgentContext(): Record<string, unknown> {
  return {}
}
export function getAttributionHeader(): string | undefined {
  return undefined
}
export function getCLISyspromptPrefix(): string {
  return ''
}
export function tokenCountFromLastAPIResponse(): number | undefined {
  return undefined
}
export function getDynamicConfig_BLOCKS_ON_INIT(): Record<string, unknown> {
  return {}
}
export function getAPIContextManagement(): Record<string, unknown> | undefined {
  return undefined
}

export function normalizeContentFromAPI(content: unknown): unknown {
  return content
}
export function normalizeMessagesForAPI<T>(messages: T[], _tools: Tools): T[] {
  return messages
}
export function stripAdvisorBlocks<T>(messages: T[]): T[] {
  return messages
}
export function stripCrossConnectionThinkingBlocks<T>(messages: T[], _connectionId: string | undefined): T[] {
  return messages
}
export function stripInvalidThinkingBlocks<T>(messages: T[]): T[] {
  return messages
}
export function stripToolReferenceBlocksFromUserMessage<T>(message: T): T {
  return message
}
export function stripCallerFieldFromAssistantMessage<T>(message: T): T {
  return message
}
export function ensureToolResultPairing<T>(messages: T[]): T[] {
  return messages
}
export function createAssistantAPIErrorMessage(text: string): {
  type: 'assistant'
  message: { role: 'assistant'; content: string }
} {
  return { type: 'assistant', message: { role: 'assistant', content: text } }
}
