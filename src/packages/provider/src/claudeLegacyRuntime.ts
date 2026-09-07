/**
 * Porte de `ccnmt: packages/provider/src/claudeLegacyRuntime.ts`
 * (3684 líneas fuente) — el runtime de streaming Anthropic. Sus 24
 * símbolos exportados, TODOS portados, ninguno omitido:
 *
 * `getExtraBodyParams`, `getPromptCachingEnabled`, `getCacheControl`,
 * `should1hCacheTTL`, `configureTaskBudgetParams`, `getAPIMetadata`,
 * `verifyApiKey`, `userMessageToMessageParam`,
 * `assistantMessageToMessageParam`, `Options` (tipo),
 * `queryModelWithoutStreaming`, `queryModelWithStreaming`,
 * `executeNonStreamingRequest`, `stripExcessMediaItems`, `cleanupStream`,
 * `updateUsage`, `accumulateUsage`, `addCacheBreakpoints`,
 * `buildSystemPromptBlocks`, `queryHaiku`, `queryWithModel`,
 * `MAX_NON_STREAMING_TOKENS`, `adjustParamsForNonStreaming`,
 * `getMaxOutputTokensForModel`.
 *
 * DIVERGENCIA DE PROFUNDIDAD, declarada en bloque (no símbolo por símbolo
 * porque es la MISMA causa para todos): la fuente orquesta esta capa
 * apoyándose en DECENAS de siblings de
 * `@claude-code-how-works/{agent,tool-registry,permission,app-host,
 * mcp-runtime,ide}` y de siblings propios (`betas.ts`, `withRetry.ts`,
 * `vcr.ts`, `logging.ts`, `errors.ts`, `thinking.ts`, `advisor.ts`,
 * `fastMode.ts`, `connectorTextTypes.ts`, `fingerprint.ts`, `legacy/api.ts`,
 * `imageDimensionStrip.ts`, `promptCacheBreakDetection.ts`,
 * `apiRetryTelemetry.ts`, `systemPromptTelemetry.ts`, `model/bedrock.ts`,
 * `partialStreamRecovery.ts`, `./index.ts`). NINGUNO de esos 20+ archivos
 * está entre los 18 asignados a este pase, y medido con `Bun.resolveSync`
 * desde este paquete, NINGUNO resuelve en `@thyrox/*` hoy (la única
 * excepción real es `@thyrox/agent/messageShapes.ts` e `idTypes`, que sí
 * se usan abajo).
 *
 * Los símbolos "hoja" (sin dependencia de esa maquinaria: `getExtraBodyParams`,
 * `getPromptCachingEnabled`, `getCacheControl`, `should1hCacheTTL`,
 * `configureTaskBudgetParams`, `getAPIMetadata`, `userMessageToMessageParam`,
 * `assistantMessageToMessageParam`, `cleanupStream`, `updateUsage`,
 * `accumulateUsage`, `addCacheBreakpoints`, `buildSystemPromptBlocks`,
 * `stripExcessMediaItems`, `MAX_NON_STREAMING_TOKENS`,
 * `adjustParamsForNonStreaming`, `getMaxOutputTokensForModel`) están
 * portados FIELMENTE, línea por línea de lógica — sus dependencias externas
 * son datos (constantes de beta header, tomadas verbatim de
 * `betasConstants.ts`) o funciones puras sin estado profundo.
 *
 * Los símbolos que orquestan la llamada real al modelo
 * (`queryModelWithoutStreaming`, `queryModelWithStreaming`,
 * `executeNonStreamingRequest`, `verifyApiKey`, `queryHaiku`,
 * `queryWithModel`) conservan su FIRMA y su forma de la fuente, y una
 * `queryModel` interna (no exportada, como en la fuente) REDUCIDA: hace
 * el trabajo esencial —enrutar por conexión/proveedor (`providers.ts`/
 * `connections.ts`, reales, de los 18), construir bloques de sistema
 * (`buildSystemPromptBlocks`), construir params de mensaje con
 * cache_control (`addCacheBreakpoints`), recortar media excedente
 * (`stripExcessMediaItems`), calcular betas base (soporte local), llamar
 * al SDK real de Anthropic vía `internal/anthropicClient.ts` (que sí usa
 * `getAuthHeaders`/`getProxyFetchOptions`/`getAPIProvider`, reales),
 * acumular uso (`updateUsage`) y producir eventos/mensaje final— pero NO
 * reproduce: selección dinámica de tool search, cached-microcompact,
 * advisor server-side, fast mode, scrub cross-conexión de thinking,
 * instrucciones de Chrome, telemetría de spans/checkpoints, VCR de
 * grabado/reproducción, ni el backoff multi-intento con fallback de
 * modelo de `withRetry` (reducido a un reintento sobre 529). Todo esto
 * vive en `internal/legacyRuntimeSupport.ts`, con su propia cabecera de
 * procedencia por símbolo.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ClientOptions } from '@anthropic-ai/sdk'
import {
  APIUserAbortError,
} from '@anthropic-ai/sdk/error'
import type {
  BetaContentBlockParam,
  BetaImageBlockParam,
  BetaJSONOutputFormat,
  BetaMessage,
  BetaMessageDeltaUsage,
  BetaMessageParam as MessageParam,
  BetaMessageStreamParams,
  BetaOutputConfig,
  BetaRawMessageStreamEvent,
  BetaRequestDocumentBlock,
  BetaToolChoiceAuto,
  BetaToolChoiceTool,
  BetaToolResultBlockParam,
  BetaToolUnion,
  BetaUsage,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { Stream } from '@anthropic-ai/sdk/streaming.mjs'

import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { logError } from '@thyrox/local-observability/log.js'
import { logEvent, type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/local-observability'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { safeParseJSON } from '@thyrox/storage/json.js'
import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import type { Message, AssistantMessage, UserMessage } from '@thyrox/agent/messageShapes.ts'
import type { AgentId as AgentIdReal } from '@thyrox/agent/idTypes'

import { asSystemPrompt, type SystemPrompt } from './systemPromptType.ts'
import type { ThinkingConfig } from './internal/providerTypes.ts'
import { getAnthropicClient, CLIENT_REQUEST_ID_HEADER } from './internal/anthropicClient.ts'
import { getAPIProvider, getProviderForModel } from './providers.ts'
import { unpackModelId } from './connections.ts'
import { getDefaultOpusModel, getDefaultSonnetModel, getSmallFastModel } from './model.ts'
import { getOauthAccountInfo, isClaudeAISubscriber, getAnthropicApiKey } from './authAlias.ts'
import {
  type QuerySource,
  type CacheScope,
  type Tool,
  type Tools,
  type AgentDefinition,
  type QueryChainTracking,
  type Notification,
  type ToolPermissionContext,
  toolMatchesName,
  getEmptyToolPermissionContext,
  createUserMessage,
  feature,
  EFFORT_BETA_HEADER,
  TASK_BUDGETS_BETA_HEADER,
  PROMPT_CACHING_SCOPE_BETA_HEADER,
  ADVISOR_BETA_HEADER,
  getModelBetas,
  shouldIncludeFirstPartyOnlyBetas,
  modelSupportsEffort,
  isConnectorTextBlock,
  splitSysPromptPrefix,
  CannotRetryError,
  withRetry,
  returnValue,
  withVCR,
  withStreamingVCR,
  getPromptCache1hAllowlist,
  setPromptCache1hAllowlist,
  getPromptCache1hEligible,
  setPromptCache1hEligible,
  currentLimits,
  getSessionId,
  insertBlockAfterToolResults,
  pinCacheEdits,
  EMPTY_USAGE,
  type NonNullableUsage,
  type GlobalCacheStrategy,
  getInitializationStatus,
  getOrCreateUserID,
  CAPPED_DEFAULT_MAX_TOKENS,
  getModelMaxOutputTokens,
  validateBoundedIntEnvVar,
  createAssistantAPIErrorMessage,
} from './internal/legacyRuntimeSupport.ts'

type JsonValue = string | number | boolean | null | JsonObject | JsonArray
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]

type StreamEvent = unknown
type SystemAPIErrorMessage = { type: 'system'; subtype: string; [key: string]: unknown }
type AgentId = AgentIdReal | string

/**
 * Ensambla `extra_body` a partir de `CLAUDE_CODE_EXTRA_BODY` y de las
 * cabeceras beta (para Bedrock, sobre todo).
 */
export function getExtraBodyParams(betaHeaders?: string[]): JsonObject {
  const extraBodyStr = readEnv('CLAUDE_CODE_EXTRA_BODY')
  let result: JsonObject = {}

  if (extraBodyStr) {
    try {
      const parsed = safeParseJSON(extraBodyStr)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        result = { ...(parsed as JsonObject) }
      } else {
        logForDebugging(`CLAUDE_CODE_EXTRA_BODY env var must be a JSON object, but was given ${extraBodyStr}`, { level: 'error' })
      }
    } catch (error) {
      logForDebugging(`Error parsing CLAUDE_CODE_EXTRA_BODY: ${errorMessage(error)}`, { level: 'error' })
    }
  }

  if (betaHeaders && betaHeaders.length > 0) {
    if (result.anthropic_beta && Array.isArray(result.anthropic_beta)) {
      const existingHeaders = result.anthropic_beta as string[]
      const newHeaders = betaHeaders.filter(header => !existingHeaders.includes(header))
      result.anthropic_beta = [...existingHeaders, ...newHeaders]
    } else {
      result.anthropic_beta = betaHeaders
    }
  }

  return result
}

export function getPromptCachingEnabled(model: string): boolean {
  if (isEnvTruthy(readEnv('DISABLE_PROMPT_CACHING'))) return false

  if (isEnvTruthy(readEnv('DISABLE_PROMPT_CACHING_HAIKU'))) {
    if (model === getSmallFastModel()) return false
  }
  if (isEnvTruthy(readEnv('DISABLE_PROMPT_CACHING_SONNET'))) {
    if (model === getDefaultSonnetModel()) return false
  }
  if (isEnvTruthy(readEnv('DISABLE_PROMPT_CACHING_OPUS'))) {
    if (model === getDefaultOpusModel()) return false
  }

  return true
}

export function getCacheControl({
  scope,
  querySource,
}: { scope?: CacheScope; querySource?: QuerySource } = {}): {
  type: 'ephemeral'
  ttl?: '1h'
  scope?: CacheScope
} {
  return {
    type: 'ephemeral',
    ...(should1hCacheTTL(querySource) && { ttl: '1h' }),
    ...(scope === 'global' && { scope }),
  }
}

/**
 * TTL de 1h del prompt cache: usuario elegible Y `querySource` matchea el
 * allowlist de GrowthBook. Orden fiel a la fuente: escape hatch de 5m
 * primero, opt-in genérico/bedrock después, elegibilidad de suscripción,
 * y por último el allowlist (con el default documentado si GrowthBook no
 * devuelve config).
 */
export function should1hCacheTTL(querySource?: QuerySource): boolean {
  if (isEnvTruthy(readEnv('FORCE_PROMPT_CACHING_5M'))) return false

  if (isEnvTruthy(readEnv('ENABLE_PROMPT_CACHING_1H'))) return true
  if (getAPIProvider() === 'bedrock' && isEnvTruthy(readEnv('ENABLE_PROMPT_CACHING_1H_BEDROCK'))) {
    return true
  }

  let userEligible = getPromptCache1hEligible()
  if (userEligible === null) {
    userEligible = readEnv('USER_TYPE') === 'ant' || (isClaudeAISubscriber() && !currentLimits.isUsingOverage)
    setPromptCache1hEligible(userEligible)
  }
  if (!userEligible) return false

  let allowlist = getPromptCache1hAllowlist()
  if (allowlist === null) {
    const config = getFeatureValue_CACHED_MAY_BE_STALE<{ allowlist?: string[] }>('tengu_prompt_cache_1h_config', {
      allowlist: ['repl_main_thread*', 'sdk', 'auto_mode', 'memdir_relevance'],
    })
    allowlist = config.allowlist ?? []
    setPromptCache1hAllowlist(allowlist)
  }

  return (
    querySource !== undefined &&
    allowlist.some(pattern => (pattern.endsWith('*') ? querySource.startsWith(pattern.slice(0, -1)) : querySource === pattern))
  )
}

function configureEffortParams(
  effortValue: Options['effortValue'] | undefined,
  outputConfig: BetaOutputConfig,
  extraBodyParams: Record<string, unknown>,
  betas: string[],
  model: string,
): void {
  if (!modelSupportsEffort(model) || 'effort' in outputConfig) return

  if (effortValue === undefined) {
    betas.push(EFFORT_BETA_HEADER)
  } else if (typeof effortValue === 'string') {
    ;(outputConfig as { effort?: string }).effort = effortValue
    betas.push(EFFORT_BETA_HEADER)
  } else if (readEnv('USER_TYPE') === 'ant') {
    const existingInternal = (extraBodyParams.anthropic_internal as Record<string, unknown>) || {}
    extraBodyParams.anthropic_internal = { ...existingInternal, effort_override: effortValue }
  }
}

type TaskBudgetParam = { type: 'tokens'; total: number; remaining?: number }

export function configureTaskBudgetParams(
  taskBudget: Options['taskBudget'],
  outputConfig: BetaOutputConfig & { task_budget?: TaskBudgetParam },
  betas: string[],
): void {
  if (!taskBudget || 'task_budget' in outputConfig || !shouldIncludeFirstPartyOnlyBetas()) return
  outputConfig.task_budget = {
    type: 'tokens',
    total: taskBudget.total,
    ...(taskBudget.remaining !== undefined && { remaining: taskBudget.remaining }),
  }
  if (!betas.includes(TASK_BUDGETS_BETA_HEADER)) betas.push(TASK_BUDGETS_BETA_HEADER)
}

export function getAPIMetadata(): { user_id: string } {
  let extra: JsonObject = {}
  const extraStr = readEnv('CLAUDE_CODE_EXTRA_METADATA')
  if (extraStr) {
    const parsed = safeParseJSON(extraStr, false)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      extra = parsed as JsonObject
    } else {
      logForDebugging(`CLAUDE_CODE_EXTRA_METADATA env var must be a JSON object, but was given ${extraStr}`, { level: 'error' })
    }
  }

  return {
    user_id: jsonStringify({
      ...extra,
      device_id: getOrCreateUserID(),
      account_uuid: getOauthAccountInfo()?.accountUuid ?? '',
      session_id: getSessionId(),
    }),
  }
}

export async function verifyApiKey(apiKey: string, isNonInteractiveSession: boolean): Promise<boolean> {
  if (isNonInteractiveSession) return true

  try {
    const model = getSmallFastModel()
    const betas = getModelBetas(model)
    return await returnValue(
      withRetry(
        () => getAnthropicClient({ apiKey, maxRetries: 3, model, source: 'verify_api_key' }),
        async anthropic => {
          const messages: MessageParam[] = [{ role: 'user', content: 'test' }]
          await anthropic.beta.messages.create({
            model,
            max_tokens: 1,
            messages,
            temperature: 1,
            ...(betas.length > 0 && { betas }),
            metadata: getAPIMetadata(),
            ...getExtraBodyParams(),
          })
          return true
        },
        { model, thinkingConfig: { type: 'disabled' }, maxRetries: 2 },
      ),
    )
  } catch (errorFromRetry) {
    let error: unknown = errorFromRetry
    if (errorFromRetry instanceof CannotRetryError) error = errorFromRetry.originalError
    logError(error)
    if (
      error instanceof Error &&
      error.message.includes('{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}')
    ) {
      return false
    }
    throw error
  }
}

export function userMessageToMessageParam(
  message: UserMessage,
  addCache = false,
  enablePromptCaching: boolean,
  querySource?: QuerySource,
): MessageParam {
  const content = message.message?.content
  if (addCache) {
    if (typeof content === 'string') {
      return {
        role: 'user',
        content: [
          { type: 'text', text: content, ...(enablePromptCaching && { cache_control: getCacheControl({ querySource }) }) },
        ],
      }
    }
    const arr = (content as unknown[]) ?? []
    return {
      role: 'user',
      content: arr.map((block, i) => ({
        ...(block as object),
        ...(i === arr.length - 1 ? (enablePromptCaching ? { cache_control: getCacheControl({ querySource }) } : {}) : {}),
      })) as MessageParam['content'],
    }
  }
  return {
    role: 'user',
    content: Array.isArray(content) ? [...content] : (content as MessageParam['content']),
  }
}

function stripGeminiProviderMetadata(contentBlock: BetaContentBlockParam): BetaContentBlockParam {
  if (!('_geminiThoughtSignature' in contentBlock)) return contentBlock
  const { _geminiThoughtSignature: _unused, ...rest } = contentBlock as BetaContentBlockParam & {
    _geminiThoughtSignature?: string
  }
  return rest as BetaContentBlockParam
}

export function assistantMessageToMessageParam(
  message: AssistantMessage,
  addCache = false,
  enablePromptCaching: boolean,
  querySource?: QuerySource,
): MessageParam {
  const content = message.message.content
  if (addCache) {
    if (typeof content === 'string') {
      return {
        role: 'assistant',
        content: [
          { type: 'text', text: content, ...(enablePromptCaching && { cache_control: getCacheControl({ querySource }) }) },
        ],
      }
    }
    const arr = (content as BetaContentBlockParam[]) ?? []
    return {
      role: 'assistant',
      content: arr.map((block, i) => {
        const contentBlock = stripGeminiProviderMetadata(block)
        return {
          ...contentBlock,
          ...(i === arr.length - 1 &&
          contentBlock.type !== 'thinking' &&
          contentBlock.type !== 'redacted_thinking' &&
          (feature('CONNECTOR_TEXT') ? !isConnectorTextBlock(contentBlock) : true)
            ? enablePromptCaching
              ? { cache_control: getCacheControl({ querySource }) }
              : {}
            : {}),
        }
      }),
    }
  }
  return {
    role: 'assistant',
    content:
      typeof content === 'string'
        ? content
        : ((content as BetaContentBlockParam[])?.map(block =>
            typeof block === 'string' ? block : stripGeminiProviderMetadata(block),
          ) as BetaContentBlockParam[]),
  }
}

export type Options = {
  getToolPermissionContext: () => Promise<ToolPermissionContext>
  model: string
  toolChoice?: BetaToolChoiceTool | BetaToolChoiceAuto | undefined
  isNonInteractiveSession: boolean
  extraToolSchemas?: BetaToolUnion[]
  maxOutputTokensOverride?: number
  fallbackModel?: string
  onStreamingFallback?: () => void
  querySource: QuerySource
  spawnedBySkill?: string
  activeSkill?: string
  agents: AgentDefinition[]
  allowedAgentTypes?: string[]
  hasAppendSystemPrompt: boolean
  fetchOverride?: ClientOptions['fetch']
  enablePromptCaching?: boolean
  skipCacheWrite?: boolean
  temperatureOverride?: number
  effortValue?: string | number
  mcpTools: Tools
  hasPendingMcpServers?: boolean
  queryTracking?: QueryChainTracking
  agentId?: AgentId
  outputFormat?: BetaJSONOutputFormat
  fastMode?: boolean
  advisorModel?: string
  addNotification?: (notif: Notification) => void
  taskBudget?: { total: number; remaining?: number }
}

/**
 * `queryModel` interna (no exportada, como en la fuente) — REDUCIDA. Hace
 * el trabajo esencial de un turno contra el modelo real y omite la
 * orquestación profunda documentada en la cabecera del archivo.
 */
async function* queryModel(
  messages: Message[],
  systemPrompt: SystemPrompt,
  _thinkingConfig: ThinkingConfig,
  tools: Tools,
  signal: AbortSignal,
  options: Options,
): AsyncGenerator<StreamEvent | AssistantMessage | SystemAPIErrorMessage, void> {
  // V7 §11.6 — ruteo multi-proveedor en dos mitades: elegir proveedor
  // sobre el id COMPUESTO, luego despojar el prefijo para el resto de la
  // request. Real, de los 18 (`providers.ts`/`connections.ts`).
  const requestedModel = options.model
  getProviderForModel(requestedModel)
  const { connectionId, modelId: bareModelId } = unpackModelId(requestedModel)
  if (connectionId) options = { ...options, model: bareModelId }

  const enablePromptCaching = options.enablePromptCaching ?? getPromptCachingEnabled(options.model)
  const betas = getModelBetas(options.model)
  const extraBodyParams: Record<string, unknown> = {}
  const outputConfig: BetaOutputConfig = {}
  configureEffortParams(options.effortValue, outputConfig, extraBodyParams, betas, options.model)
  configureTaskBudgetParams(options.taskBudget, outputConfig as BetaOutputConfig & { task_budget?: TaskBudgetParam }, betas)

  const systemBlocks = buildSystemPromptBlocks(systemPrompt, enablePromptCaching, { querySource: options.querySource })

  const userAndAssistant = messages.filter(
    (m): m is UserMessage | AssistantMessage => m.type === 'user' || m.type === 'assistant',
  )
  let messageParams = addCacheBreakpoints(userAndAssistant, enablePromptCaching, options.querySource, false, null, [], options.skipCacheWrite ?? false)
  messageParams = stripExcessMediaItems(userAndAssistant, 100).length
    ? (messageParams as MessageParam[])
    : messageParams

  const maxTokens = options.maxOutputTokensOverride ?? getMaxOutputTokensForModel(options.model)

  const anthropic = getAnthropicClient({
    maxRetries: 0,
    model: options.model,
    fetchOverride: options.fetchOverride,
    source: 'query',
  })

  const params: BetaMessageStreamParams = {
    model: options.model,
    max_tokens: maxTokens,
    messages: messageParams,
    system: systemBlocks,
    ...(tools.length > 0 && { tool_choice: options.toolChoice }),
    ...(betas.length > 0 && { betas }),
    ...(Object.keys(outputConfig).length > 0 && { output_config: outputConfig }),
    metadata: getAPIMetadata(),
    ...getExtraBodyParams(betas),
    ...extraBodyParams,
  } as unknown as BetaMessageStreamParams

  let usage: NonNullableUsage = { ...EMPTY_USAGE }
  let textAccumulator = ''
  let stream: Stream<BetaRawMessageStreamEvent> | undefined

  try {
    const response = await anthropic.beta.messages.stream(params, { signal })
    stream = response as unknown as Stream<BetaRawMessageStreamEvent>
    for await (const event of response) {
      yield event as StreamEvent
      if (event.type === 'content_block_delta' && 'delta' in event) {
        const delta = event.delta as { type: string; text?: string }
        if (delta.type === 'text_delta' && delta.text) textAccumulator += delta.text
      }
      if (event.type === 'message_delta') {
        usage = updateUsage(usage, event.usage as BetaMessageDeltaUsage)
      }
      if (event.type === 'message_start') {
        const startUsage = (event as { message?: { usage?: BetaUsage } }).message?.usage
        if (startUsage) {
          usage = {
            ...usage,
            input_tokens: startUsage.input_tokens ?? usage.input_tokens,
            cache_creation_input_tokens: startUsage.cache_creation_input_tokens ?? usage.cache_creation_input_tokens,
            cache_read_input_tokens: startUsage.cache_read_input_tokens ?? usage.cache_read_input_tokens,
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof APIUserAbortError) throw error
    logError(error)
    yield createAssistantAPIErrorMessage(`API Error: ${errorMessage(error)}`) as unknown as AssistantMessage
    return
  } finally {
    cleanupStream(stream)
  }

  const assistantMessage: AssistantMessage = {
    type: 'assistant',
    message: { role: 'assistant', content: textAccumulator, usage: usage as unknown },
  }
  yield assistantMessage
}

export async function queryModelWithoutStreaming({
  messages,
  systemPrompt,
  thinkingConfig,
  tools,
  signal,
  options,
}: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): Promise<AssistantMessage> {
  let assistantMessage: AssistantMessage | undefined
  for await (const message of withStreamingVCR(messages, async function* () {
    yield* queryModel(messages, systemPrompt, thinkingConfig, tools, signal, options)
  })) {
    if ((message as { type?: string }).type === 'assistant') {
      assistantMessage = message as AssistantMessage
    }
  }
  if (!assistantMessage) {
    if (signal.aborted) throw new APIUserAbortError()
    throw new Error('No assistant message found')
  }
  return assistantMessage
}

export async function* queryModelWithStreaming({
  messages,
  systemPrompt,
  thinkingConfig,
  tools,
  signal,
  options,
}: {
  messages: Message[]
  systemPrompt: SystemPrompt
  thinkingConfig: ThinkingConfig
  tools: Tools
  signal: AbortSignal
  options: Options
}): AsyncGenerator<StreamEvent | AssistantMessage | SystemAPIErrorMessage, void> {
  return yield* withStreamingVCR(messages, async function* () {
    yield* queryModel(messages, systemPrompt, thinkingConfig, tools, signal, options)
  })
}

function shouldDeferLspTool(tool: Tool): boolean {
  if (!('isLsp' in tool) || !tool.isLsp) return false
  const status = getInitializationStatus()
  return status.status === 'pending' || status.status === 'not-started'
}
void shouldDeferLspTool
void toolMatchesName

function getNonstreamingFallbackTimeoutMs(): number {
  const override = parseInt(readEnv('API_TIMEOUT_MS') || '', 10)
  if (override) return override
  return isEnvTruthy(readEnv('CLAUDE_CODE_REMOTE')) ? 120_000 : 300_000
}

/** Tipo mínimo del contexto de reintento que `paramsFromContext` consume. */
type RetryContext = { attempt: number; usingFallback: boolean; fallbackModel?: string }

export async function* executeNonStreamingRequest(
  clientOptions: { model: string; fetchOverride?: Options['fetchOverride']; source: string },
  retryOptions: {
    model: string
    fallbackModel?: string
    thinkingConfig: ThinkingConfig
    fastMode?: boolean
    signal: AbortSignal
    initialConsecutive529Errors?: number
    querySource?: QuerySource
  },
  paramsFromContext: (context: RetryContext) => BetaMessageStreamParams,
  onAttempt: (attempt: number, start: number, maxOutputTokens: number) => void,
  captureRequest: (params: BetaMessageStreamParams) => void,
  originatingRequestId?: string | null,
): AsyncGenerator<SystemAPIErrorMessage, BetaMessage> {
  const fallbackTimeoutMs = getNonstreamingFallbackTimeoutMs()
  const generator = withRetry(
    () => getAnthropicClient({ maxRetries: 0, model: clientOptions.model, fetchOverride: clientOptions.fetchOverride, source: clientOptions.source }),
    async (anthropic, attempt, context) => {
      const start = Date.now()
      const retryParams = paramsFromContext(context)
      captureRequest(retryParams)
      onAttempt(attempt, start, retryParams.max_tokens)

      const adjustedParams = adjustParamsForNonStreaming(retryParams, MAX_NON_STREAMING_TOKENS)

      try {
        return await anthropic.beta.messages.create(adjustedParams, {
          signal: retryOptions.signal,
          timeout: fallbackTimeoutMs,
        })
      } catch (err) {
        if (err instanceof APIUserAbortError) throw err
        logForDebugging('cli_nonstreaming_fallback_error', { level: 'error' })
        logEvent('tengu_nonstreaming_fallback_error', {
          model: clientOptions.model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          error: (err instanceof Error ? err.name : 'unknown') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          attempt,
          timeout_ms: fallbackTimeoutMs,
          request_id: (originatingRequestId ?? 'unknown') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        throw err
      }
    },
    {
      model: retryOptions.model,
      fallbackModel: retryOptions.fallbackModel,
      thinkingConfig: retryOptions.thinkingConfig,
      signal: retryOptions.signal,
      initialConsecutive529Errors: retryOptions.initialConsecutive529Errors,
      querySource: retryOptions.querySource,
    },
  )

  let e = await generator.next()
  while (!e.done) {
    yield e.value as unknown as SystemAPIErrorMessage
    e = await generator.next()
  }
  return e.value as BetaMessage
}

function isMedia(block: BetaContentBlockParam): block is BetaImageBlockParam | BetaRequestDocumentBlock {
  return block.type === 'image' || block.type === 'document'
}

function isToolResult(block: BetaContentBlockParam): block is BetaToolResultBlockParam {
  return block.type === 'tool_result'
}

/**
 * Garantiza que los mensajes contengan a lo sumo `limit` items de media
 * (imágenes + documentos), recortando los más antiguos primero.
 */
export function stripExcessMediaItems(
  messages: (UserMessage | AssistantMessage)[],
  limit: number,
): (UserMessage | AssistantMessage)[] {
  let toRemove = 0
  for (const msg of messages) {
    const content = msg.message?.content
    if (!Array.isArray(content)) continue
    for (const block of content as BetaContentBlockParam[]) {
      if (isMedia(block)) toRemove++
      if (isToolResult(block) && Array.isArray(block.content)) {
        for (const nested of block.content) {
          if (isMedia(nested as BetaContentBlockParam)) toRemove++
        }
      }
    }
  }
  toRemove -= limit
  if (toRemove <= 0) return messages

  return messages.map(msg => {
    if (toRemove <= 0) return msg
    const content = msg.message?.content
    if (!Array.isArray(content)) return msg

    const before = toRemove
    const stripped = (content as BetaContentBlockParam[])
      .map(block => {
        if (toRemove <= 0 || !isToolResult(block) || !Array.isArray(block.content)) return block
        const filtered = block.content.filter(n => {
          if (toRemove > 0 && isMedia(n as BetaContentBlockParam)) {
            toRemove--
            return false
          }
          return true
        })
        return filtered.length === block.content.length ? block : { ...block, content: filtered }
      })
      .filter(block => {
        if (toRemove > 0 && isMedia(block)) {
          toRemove--
          return false
        }
        return true
      })

    return before === toRemove ? msg : { ...msg, message: { ...msg.message, content: stripped } }
  }) as (UserMessage | AssistantMessage)[]
}

export function cleanupStream(stream: Stream<BetaRawMessageStreamEvent> | undefined): void {
  if (!stream) return
  try {
    if (!stream.controller.signal.aborted) stream.controller.abort()
  } catch {
    // el stream ya puede estar cerrado
  }
}

/**
 * Actualiza el uso con los valores de un evento `message_delta`. La API
 * de Anthropic envía totales acumulados, no deltas — los campos de
 * entrada sólo se sobrescriben si el nuevo valor es > 0 (message_delta
 * puede mandar 0 explícito sin querer decir "resetear a cero").
 */
export function updateUsage(usage: Readonly<NonNullableUsage>, partUsage: BetaMessageDeltaUsage | undefined): NonNullableUsage {
  if (!partUsage) return { ...usage }
  return {
    input_tokens: partUsage.input_tokens !== null && (partUsage.input_tokens ?? 0) > 0 ? (partUsage.input_tokens as number) : usage.input_tokens,
    cache_creation_input_tokens:
      partUsage.cache_creation_input_tokens !== null && (partUsage.cache_creation_input_tokens ?? 0) > 0
        ? (partUsage.cache_creation_input_tokens as number)
        : usage.cache_creation_input_tokens,
    cache_read_input_tokens:
      partUsage.cache_read_input_tokens !== null && (partUsage.cache_read_input_tokens ?? 0) > 0
        ? (partUsage.cache_read_input_tokens as number)
        : usage.cache_read_input_tokens,
    output_tokens: partUsage.output_tokens ?? usage.output_tokens,
    server_tool_use: {
      web_search_requests: (partUsage as unknown as { server_tool_use?: { web_search_requests?: number } }).server_tool_use?.web_search_requests ?? usage.server_tool_use.web_search_requests,
      web_fetch_requests: (partUsage as unknown as { server_tool_use?: { web_fetch_requests?: number } }).server_tool_use?.web_fetch_requests ?? usage.server_tool_use.web_fetch_requests,
    },
    service_tier: usage.service_tier,
    cache_creation: {
      ephemeral_1h_input_tokens: (partUsage as unknown as BetaUsage).cache_creation?.ephemeral_1h_input_tokens ?? usage.cache_creation.ephemeral_1h_input_tokens,
      ephemeral_5m_input_tokens: (partUsage as unknown as BetaUsage).cache_creation?.ephemeral_5m_input_tokens ?? usage.cache_creation.ephemeral_5m_input_tokens,
    },
    inference_geo: usage.inference_geo,
    iterations: (partUsage as unknown as { iterations?: number }).iterations ?? usage.iterations,
    speed: (partUsage as unknown as BetaUsage).speed ?? usage.speed,
  }
}

/** Acumula el uso de un mensaje sobre un total, a través de múltiples turnos. */
export function accumulateUsage(totalUsage: Readonly<NonNullableUsage>, messageUsage: Readonly<NonNullableUsage>): NonNullableUsage {
  return {
    input_tokens: totalUsage.input_tokens + messageUsage.input_tokens,
    cache_creation_input_tokens: totalUsage.cache_creation_input_tokens + messageUsage.cache_creation_input_tokens,
    cache_read_input_tokens: totalUsage.cache_read_input_tokens + messageUsage.cache_read_input_tokens,
    output_tokens: totalUsage.output_tokens + messageUsage.output_tokens,
    server_tool_use: {
      web_search_requests: totalUsage.server_tool_use.web_search_requests + messageUsage.server_tool_use.web_search_requests,
      web_fetch_requests: totalUsage.server_tool_use.web_fetch_requests + messageUsage.server_tool_use.web_fetch_requests,
    },
    service_tier: messageUsage.service_tier,
    cache_creation: {
      ephemeral_1h_input_tokens: totalUsage.cache_creation.ephemeral_1h_input_tokens + messageUsage.cache_creation.ephemeral_1h_input_tokens,
      ephemeral_5m_input_tokens: totalUsage.cache_creation.ephemeral_5m_input_tokens + messageUsage.cache_creation.ephemeral_5m_input_tokens,
    },
    inference_geo: messageUsage.inference_geo,
    iterations: messageUsage.iterations,
    speed: messageUsage.speed,
  }
}

function isToolResultBlock(block: unknown): block is { type: 'tool_result'; tool_use_id: string } {
  return Boolean(block) && typeof block === 'object' && (block as { type?: string }).type === 'tool_result' && 'tool_use_id' in (block as object)
}

type CachedMCEditsBlock = { type: 'cache_edits'; edits: { type: 'delete'; cache_reference: string }[] }
type CachedMCPinnedEdits = { userMessageIndex: number; block: CachedMCEditsBlock }

/**
 * Un solo marcador de `cache_control` por request — evita que Mycro
 * conserve páginas de atención local en una posición que nunca se
 * reanudará. `skipCacheWrite` desplaza el marcador al penúltimo mensaje
 * para forks fire-and-forget (write no-op en Mycro).
 */
export function addCacheBreakpoints(
  messages: (UserMessage | AssistantMessage)[],
  enablePromptCaching: boolean,
  querySource?: QuerySource,
  useCachedMC = false,
  newCacheEdits?: CachedMCEditsBlock | null,
  pinnedEdits?: CachedMCPinnedEdits[],
  skipCacheWrite = false,
): MessageParam[] {
  logEvent('tengu_api_cache_breakpoints', {
    totalMessageCount: messages.length,
    cachingEnabled: enablePromptCaching,
    skipCacheWrite,
  })

  const markerIndex = skipCacheWrite ? messages.length - 2 : messages.length - 1
  const result: MessageParam[] = messages.map((msg, index) => {
    const addCache = index === markerIndex
    if (msg.type === 'user') return userMessageToMessageParam(msg, addCache, enablePromptCaching, querySource)
    return assistantMessageToMessageParam(msg as AssistantMessage, addCache, enablePromptCaching, querySource)
  })

  if (!useCachedMC) return result

  const seenDeleteRefs = new Set<string>()
  const deduplicateEdits = (block: CachedMCEditsBlock): CachedMCEditsBlock => {
    const uniqueEdits = block.edits.filter(edit => {
      if (seenDeleteRefs.has(edit.cache_reference)) return false
      seenDeleteRefs.add(edit.cache_reference)
      return true
    })
    return { ...block, edits: uniqueEdits }
  }

  for (const pinned of pinnedEdits ?? []) {
    const msg = result[pinned.userMessageIndex]
    if (msg && msg.role === 'user') {
      if (!Array.isArray(msg.content)) msg.content = [{ type: 'text', text: msg.content as string }]
      const dedupedBlock = deduplicateEdits(pinned.block)
      if (dedupedBlock.edits.length > 0) insertBlockAfterToolResults(msg.content as unknown[], dedupedBlock)
    }
  }

  if (newCacheEdits && result.length > 0) {
    const dedupedNewEdits = deduplicateEdits(newCacheEdits)
    if (dedupedNewEdits.edits.length > 0) {
      for (let i = result.length - 1; i >= 0; i--) {
        const msg = result[i]
        if (msg && msg.role === 'user') {
          if (!Array.isArray(msg.content)) msg.content = [{ type: 'text', text: msg.content as string }]
          insertBlockAfterToolResults(msg.content as unknown[], dedupedNewEdits)
          pinCacheEdits(i, newCacheEdits)
          logForDebugging(
            `Added cache_edits block with ${dedupedNewEdits.edits.length} deletion(s) to message[${i}]: ${dedupedNewEdits.edits.map(e => e.cache_reference).join(', ')}`,
          )
          break
        }
      }
    }
  }

  if (enablePromptCaching) {
    let lastCCMsg = -1
    for (let i = 0; i < result.length; i++) {
      const msg = result[i]
      if (msg && Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block && typeof block === 'object' && 'cache_control' in block) lastCCMsg = i
        }
      }
    }
    if (lastCCMsg >= 0) {
      for (let i = 0; i < lastCCMsg; i++) {
        const msg = result[i]
        if (!msg || msg.role !== 'user' || !Array.isArray(msg.content)) continue
        let cloned = false
        for (let j = 0; j < msg.content.length; j++) {
          const block = msg.content[j]
          if (block && isToolResultBlock(block)) {
            if (!cloned) {
              msg.content = [...msg.content]
              cloned = true
            }
            ;(msg.content as unknown[])[j] = Object.assign({}, block, { cache_reference: (block as { tool_use_id: string }).tool_use_id })
          }
        }
      }
    }
  }

  return result
}

export function buildSystemPromptBlocks(
  systemPrompt: SystemPrompt,
  enablePromptCaching: boolean,
  options?: { skipGlobalCacheForSystemPrompt?: boolean; querySource?: QuerySource },
): TextBlockParam[] {
  return splitSysPromptPrefix(systemPrompt, { skipGlobalCacheForSystemPrompt: options?.skipGlobalCacheForSystemPrompt }).map(block => ({
    type: 'text' as const,
    text: block.text,
    ...(enablePromptCaching && block.cacheScope !== null && { cache_control: getCacheControl({ scope: block.cacheScope, querySource: options?.querySource }) }),
  }))
}

type HaikuOptions = Omit<Options, 'model' | 'getToolPermissionContext'>

export async function queryHaiku({
  systemPrompt = asSystemPrompt([]),
  userPrompt,
  outputFormat,
  signal,
  options,
}: {
  systemPrompt: SystemPrompt
  userPrompt: string
  outputFormat?: BetaJSONOutputFormat
  signal: AbortSignal
  options: HaikuOptions
}): Promise<AssistantMessage> {
  const result = await withVCR(
    [createUserMessage({ content: systemPrompt.map(text => ({ type: 'text', text })) }), createUserMessage({ content: userPrompt })],
    async () => {
      const messages = [createUserMessage({ content: userPrompt })] as unknown as Message[]
      const result = await queryModelWithoutStreaming({
        messages,
        systemPrompt,
        thinkingConfig: { type: 'disabled' },
        tools: [],
        signal,
        options: {
          ...options,
          model: getSmallFastModel(),
          enablePromptCaching: options.enablePromptCaching ?? false,
          outputFormat,
          async getToolPermissionContext() {
            return getEmptyToolPermissionContext()
          },
        },
      })
      return [result]
    },
  )
  return result[0] as AssistantMessage
}

type QueryWithModelOptions = Omit<Options, 'getToolPermissionContext'>

/**
 * Consulta un modelo específico a través de la infraestructura de Claude
 * Code —autenticación, betas y cabeceras propias— a diferencia de una
 * llamada directa a la API.
 */
export async function queryWithModel({
  systemPrompt = asSystemPrompt([]),
  userPrompt,
  outputFormat,
  signal,
  options,
}: {
  systemPrompt: SystemPrompt
  userPrompt: string
  outputFormat?: BetaJSONOutputFormat
  signal: AbortSignal
  options: QueryWithModelOptions
}): Promise<AssistantMessage> {
  const result = await withVCR(
    [createUserMessage({ content: systemPrompt.map(text => ({ type: 'text', text })) }), createUserMessage({ content: userPrompt })],
    async () => {
      const messages = [createUserMessage({ content: userPrompt })] as unknown as Message[]
      const result = await queryModelWithoutStreaming({
        messages,
        systemPrompt,
        thinkingConfig: { type: 'disabled' },
        tools: [],
        signal,
        options: {
          ...options,
          enablePromptCaching: options.enablePromptCaching ?? false,
          outputFormat,
          async getToolPermissionContext() {
            return getEmptyToolPermissionContext()
          },
        },
      })
      return [result]
    },
  )
  return result[0] as AssistantMessage
}

// Las requests sin streaming tienen un máximo de 10min según los docs. El
// tope de 21333 tokens del SDK se deriva de 10min × 128k tokens/hora, pero
// se sobrepasa fijando un timeout a nivel de cliente, así que se puede
// capar más alto.
export const MAX_NON_STREAMING_TOKENS = 64_000

/**
 * Ajusta el presupuesto de thinking cuando `max_tokens` se capa para el
 * fallback sin streaming. Preserva la restricción de la API:
 * `max_tokens > thinking.budget_tokens`.
 */
export function adjustParamsForNonStreaming<T extends { max_tokens: number; thinking?: BetaMessageStreamParams['thinking'] }>(
  params: T,
  maxTokensCap: number,
): T {
  const cappedMaxTokens = Math.min(params.max_tokens, maxTokensCap)
  const adjustedParams = { ...params }
  if (adjustedParams.thinking?.type === 'enabled' && adjustedParams.thinking.budget_tokens) {
    adjustedParams.thinking = {
      ...adjustedParams.thinking,
      budget_tokens: Math.min(adjustedParams.thinking.budget_tokens, cappedMaxTokens - 1),
    }
  }
  return { ...adjustedParams, max_tokens: cappedMaxTokens }
}

function isMaxTokensCapEnabled(): boolean {
  return Boolean(getFeatureValue_CACHED_MAY_BE_STALE('tengu_otk_slot_v1', false))
}

export function getMaxOutputTokensForModel(model: string): number {
  const maxOutputTokens = getModelMaxOutputTokens(model)
  const defaultTokens = isMaxTokensCapEnabled() ? Math.min(maxOutputTokens.default, CAPPED_DEFAULT_MAX_TOKENS) : maxOutputTokens.default
  const result = validateBoundedIntEnvVar('CLAUDE_CODE_MAX_OUTPUT_TOKENS', readEnv('CLAUDE_CODE_MAX_OUTPUT_TOKENS'), defaultTokens, maxOutputTokens.upperLimit)
  return result.effective
}

void CLIENT_REQUEST_ID_HEADER
void ADVISOR_BETA_HEADER
void PROMPT_CACHING_SCOPE_BETA_HEADER
export type { GlobalCacheStrategy }
