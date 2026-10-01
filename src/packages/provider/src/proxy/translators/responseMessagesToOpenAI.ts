/**
 * Traductor de respuesta Mensajes Messages → OpenAI Chat Completions —
 * la máquina de estados de eventos SSE, y un envoltorio de una sola pieza
 * para una respuesta no-stream.
 *
 * Porte de `omniroute: open-sse/translator/response/claude-to-openai.ts`
 * (435 líneas). Cubre los cuatro eventos centrales de la API de Mensajes —
 * `message_start`, `content_block_start/delta/stop`, `message_delta`,
 * `message_stop` — su mapeo de `tool_use`⇄`tool_calls`, de `thinking`⇄
 * `reasoning_content`, y de `stop_reason`⇄`finish_reason`.
 *
 * pendiente, declarado con su porqué:
 *
 * - el analizador textual de `<think>…</think>` (MiniMax, vía
 *   `utils/thinkTagParser.ts`) y el marcador `</think>` diferido
 *   (`state.pendingThinkClose`/`suppressThinkClose`, #5123/#4633) — es
 *   compatibilidad con clientes que esperan una etiqueta literal en el
 *   texto en vez de `reasoning_content`; no es parte de los cuatro
 *   mecanismos centrales pedidos, y `thinkTagParser.ts` no vive bajo
 *   `translator/`.
 *
 * `translateNonStreamingResponse` (el ensamblador real de la fuente) vive
 * en `handlers/responseTranslator.ts`, fuera de `translator/` — fuera del
 * alcance de lectura de esta tarea. `messagesApiMessageToOpenAIResponse`, en su
 * lugar, ensambla la respuesta completa reproduciendo el MISMO mecanismo de
 * `messagesToOpenAIResponse` sobre una secuencia sintética de eventos, así que
 * comparte código y control de anulación con el camino de streaming.
 */

type JsonRecord = Record<string, unknown>

export type MessagesToOpenAIState = {
  messageId?: string
  model?: string
  toolCallIndex: number
  toolCalls: Map<number, JsonRecord>
  toolNameMap?: Map<string, string>
  inThinkingBlock?: boolean
  currentBlockIndex?: number
  textBlockStarted?: boolean
  thinkingBlockStarted?: boolean
  finishReason?: string | null
  finishReasonSent?: boolean
  usage?: JsonRecord | null
}

export function createMessagesToOpenAIState(toolNameMap?: Map<string, string>): MessagesToOpenAIState {
  return {
    toolCallIndex: 0,
    toolCalls: new Map(),
    toolNameMap,
    finishReasonSent: false,
    usage: null,
  }
}

function createChunk(state: MessagesToOpenAIState, delta: JsonRecord, finishReason: string | null = null) {
  return {
    id: `chatcmpl-${state.messageId}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: state.model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  }
}

/** Porte de `response/claude-to-openai.ts::convertStopReason`. */
function convertStopReason(reason: unknown): string {
  switch (reason) {
    case 'end_turn':
      return 'stop'
    case 'max_tokens':
      return 'length'
    case 'tool_use':
      return 'tool_calls'
    case 'stop_sequence':
      return 'stop'
    default:
      return 'stop'
  }
}

/**
 * Convierte un evento SSE de Mensajes (`chunk.type`) a cero o más piezas de
 * respuesta OpenAI. `state` se muta entre llamadas — es la máquina de
 * estados del stream completo.
 */
export function messagesToOpenAIResponse(chunk: JsonRecord | null, state: MessagesToOpenAIState): JsonRecord[] | null {
  if (!chunk) return null

  const results: JsonRecord[] = []
  const event = chunk.type

  switch (event) {
    case 'message_start': {
      const message = chunk.message as JsonRecord | undefined
      state.messageId = (message?.id as string) || `msg_${Date.now()}`
      state.model = message?.model as string | undefined
      state.toolCallIndex = 0
      const startUsage = message?.usage as JsonRecord | undefined
      if (startUsage && typeof startUsage === 'object') {
        const inputTokens =
          typeof startUsage.input_tokens === 'number'
            ? startUsage.input_tokens
            : typeof startUsage.prompt_tokens === 'number'
              ? startUsage.prompt_tokens
              : 0
        const outputTokens =
          typeof startUsage.output_tokens === 'number'
            ? startUsage.output_tokens
            : typeof startUsage.completion_tokens === 'number'
              ? startUsage.completion_tokens
              : 0
        const cacheRead = typeof startUsage.cache_read_input_tokens === 'number' ? startUsage.cache_read_input_tokens : 0
        const cacheCreation =
          typeof startUsage.cache_creation_input_tokens === 'number' ? startUsage.cache_creation_input_tokens : 0
        if (inputTokens > 0 || outputTokens > 0 || cacheRead > 0 || cacheCreation > 0) {
          const billableInputTokens = inputTokens + cacheRead
          state.usage = {
            prompt_tokens: billableInputTokens,
            completion_tokens: outputTokens,
            input_tokens: billableInputTokens,
            output_tokens: outputTokens,
          }
          if (cacheRead > 0) (state.usage as JsonRecord).cache_read_input_tokens = cacheRead
          if (cacheCreation > 0) (state.usage as JsonRecord).cache_creation_input_tokens = cacheCreation
        }
      }
      results.push(createChunk(state, { role: 'assistant' }))
      break
    }

    case 'content_block_start': {
      const block = chunk.content_block as JsonRecord | undefined
      if (block?.type === 'text') {
        state.textBlockStarted = true
      } else if (block?.type === 'thinking') {
        state.inThinkingBlock = true
        state.currentBlockIndex = chunk.index as number
        results.push(createChunk(state, { reasoning_content: '' }))
      } else if (block?.type === 'tool_use') {
        const toolCallIndex = state.toolCallIndex++
        const toolName = state.toolNameMap?.get(block.name as string) || block.name
        const toolCall: JsonRecord = {
          index: toolCallIndex,
          id: block.id,
          type: 'function',
          function: { name: toolName, arguments: '' },
        }
        state.toolCalls.set(chunk.index as number, toolCall)
        results.push(createChunk(state, { tool_calls: [toolCall] }))
      }
      break
    }

    case 'content_block_delta': {
      const delta = chunk.delta as JsonRecord | undefined
      if (delta?.type === 'text_delta' && delta.text) {
        results.push(createChunk(state, { content: delta.text }))
      } else if (delta?.type === 'thinking_delta' && delta.thinking) {
        results.push(createChunk(state, { reasoning_content: delta.thinking }))
      } else if (delta?.type === 'input_json_delta' && delta.partial_json) {
        const toolCall = state.toolCalls.get(chunk.index as number)
        if (toolCall) {
          const fn = toolCall.function as JsonRecord
          fn.arguments = (fn.arguments as string) + (delta.partial_json as string)
          results.push(
            createChunk(state, {
              tool_calls: [{ index: toolCall.index, function: { arguments: delta.partial_json } }],
            })
          )
        }
      }
      break
    }

    case 'content_block_stop': {
      if (state.inThinkingBlock && chunk.index === state.currentBlockIndex) {
        state.inThinkingBlock = false
      }
      state.textBlockStarted = false
      state.thinkingBlockStarted = false
      break
    }

    case 'message_delta': {
      if (chunk.usage && typeof chunk.usage === 'object') {
        const usage = chunk.usage as JsonRecord
        const previousUsage = (state.usage && typeof state.usage === 'object' ? state.usage : {}) as JsonRecord
        const previousInputTokens =
          typeof previousUsage.input_tokens === 'number'
            ? previousUsage.input_tokens
            : typeof previousUsage.prompt_tokens === 'number'
              ? previousUsage.prompt_tokens
              : 0
        const previousCacheReadTokens =
          typeof previousUsage.cache_read_input_tokens === 'number' ? previousUsage.cache_read_input_tokens : 0
        const previousCacheCreationTokens =
          typeof previousUsage.cache_creation_input_tokens === 'number' ? previousUsage.cache_creation_input_tokens : 0
        const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0
        const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0
        const thinkingTokens =
          typeof (usage.output_tokens_details as JsonRecord)?.thinking_tokens === 'number'
            ? (usage.output_tokens_details as JsonRecord).thinking_tokens
            : undefined
        const cacheReadTokens = typeof usage.cache_read_input_tokens === 'number' ? usage.cache_read_input_tokens : 0
        const cacheCreationTokens =
          typeof usage.cache_creation_input_tokens === 'number' ? usage.cache_creation_input_tokens : 0

        // #2215 — el creado de caché NO entra en prompt_tokens (Anthropic
        // rellena hasta 1024 tokens mínimos, e inflaría la facturación
        // hasta ~250x en un prompt corto). Se expone aparte.
        const billableInputTokens =
          inputTokens > 0 || cacheReadTokens > 0 || cacheCreationTokens > 0
            ? inputTokens + cacheReadTokens
            : previousInputTokens

        state.usage = {
          prompt_tokens: billableInputTokens,
          completion_tokens: outputTokens,
          input_tokens: billableInputTokens,
          output_tokens: outputTokens,
        }
        if (thinkingTokens !== undefined) {
          (state.usage as JsonRecord).reasoning_tokens = thinkingTokens
          ;(state.usage as JsonRecord).completion_tokens_details = { reasoning_tokens: thinkingTokens }
          ;(state.usage as JsonRecord).output_tokens_details = { thinking_tokens: thinkingTokens }
        }
        const effectiveCacheReadTokens = cacheReadTokens || previousCacheReadTokens
        const effectiveCacheCreationTokens = cacheCreationTokens || previousCacheCreationTokens
        if (effectiveCacheReadTokens > 0) (state.usage as JsonRecord).cache_read_input_tokens = effectiveCacheReadTokens
        if (effectiveCacheCreationTokens > 0)
          (state.usage as JsonRecord).cache_creation_input_tokens = effectiveCacheCreationTokens
      }

      const stopReason = (chunk.delta as JsonRecord | undefined)?.stop_reason
      if (stopReason) {
        state.finishReason = convertStopReason(stopReason)
        const finalChunk: JsonRecord = {
          id: `chatcmpl-${state.messageId}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: state.model,
          choices: [{ index: 0, delta: {}, finish_reason: state.finishReason }],
        }

        if (state.usage && typeof state.usage === 'object') {
          const usage = state.usage as JsonRecord
          const inputTokens = (usage.input_tokens as number) || 0
          const outputTokens = (usage.output_tokens as number) || 0
          const cachedTokens = (usage.cache_read_input_tokens as number) || 0
          const cacheCreationTokens = (usage.cache_creation_input_tokens as number) || 0

          const promptTokens = inputTokens
          const completionTokens = outputTokens
          const totalTokens = promptTokens + completionTokens

          const openaiUsage: JsonRecord = { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens }
          const reasoningTokens = usage.reasoning_tokens
          if (typeof reasoningTokens === 'number') {
            openaiUsage.reasoning_tokens = reasoningTokens
            openaiUsage.completion_tokens_details = { reasoning_tokens: reasoningTokens }
          }
          if (cachedTokens > 0 || cacheCreationTokens > 0) {
            const details: JsonRecord = {}
            if (cachedTokens > 0) details.cached_tokens = cachedTokens
            if (cacheCreationTokens > 0) details.cache_creation_tokens = cacheCreationTokens
            openaiUsage.prompt_tokens_details = details
          }
          finalChunk.usage = openaiUsage
        }

        results.push(finalChunk)
        state.finishReasonSent = true
      }
      break
    }

    case 'message_stop': {
      if (!state.finishReasonSent) {
        const finishReason = state.finishReason || (state.toolCalls.size > 0 ? 'tool_calls' : 'stop')
        const usage = state.usage as JsonRecord | undefined
        const cachedTokens = (usage?.cache_read_input_tokens as number) || 0
        const cacheCreationTokens = (usage?.cache_creation_input_tokens as number) || 0
        const usageObj: JsonRecord = usage
          ? {
              usage: {
                prompt_tokens: (usage.input_tokens as number) || 0,
                completion_tokens: (usage.output_tokens as number) || 0,
                total_tokens: ((usage.input_tokens as number) || 0) + ((usage.output_tokens as number) || 0),
                ...(typeof usage.reasoning_tokens === 'number'
                  ? { reasoning_tokens: usage.reasoning_tokens, completion_tokens_details: { reasoning_tokens: usage.reasoning_tokens } }
                  : {}),
                ...(cachedTokens > 0 || cacheCreationTokens > 0
                  ? {
                      prompt_tokens_details: {
                        ...(cachedTokens > 0 ? { cached_tokens: cachedTokens } : {}),
                        ...(cacheCreationTokens > 0 ? { cache_creation_tokens: cacheCreationTokens } : {}),
                      },
                    }
                  : {}),
              },
            }
          : {}
        results.push({
          id: `chatcmpl-${state.messageId}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: state.model,
          choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
          ...usageObj,
        })
        state.finishReasonSent = true
      }
      break
    }
  }

  return results.length > 0 ? results : null
}

/**
 * Ensambla una respuesta OpenAI Chat Completions NO-stream a partir de un
 * mensaje completo de la API de Mensajes de Mensajes, reproduciendo la
 * secuencia de eventos SSE que la generaría (`message_start` →
 * `content_block_*` por bloque → `message_delta` → `message_stop`) sobre el
 * mismo `messagesToOpenAIResponse`. No es un envoltorio distinto: es el mismo
 * mecanismo, alimentado con una única "pasada" sintética.
 */
export function messagesApiMessageToOpenAIResponse(
  message: JsonRecord,
  toolNameMap?: Map<string, string>
): JsonRecord {
  const state = createMessagesToOpenAIState(toolNameMap)
  const collected: JsonRecord[] = []
  // Se clona cada chunk al recogerlo: `messagesToOpenAIResponse` reusa la
  // misma referencia de `toolCall` entre el chunk de arranque (arguments:"")
  // y los deltas subsiguientes (arguments += fragmento), que es seguro en un
  // stream real porque cada chunk se serializa (JSON.stringify) antes de la
  // siguiente mutación. Aquí se recogen todos ANTES de ensamblar, así que
  // sin clonar, el chunk de arranque terminaría reflejando el argumento ya
  // acumulado — y `assembleFromChunks` lo contaría dos veces.
  const push = (r: JsonRecord[] | null) => {
    if (r) collected.push(...structuredClone(r))
  }

  push(messagesToOpenAIResponse({ type: 'message_start', message: { id: message.id, model: message.model, usage: message.usage } }, state))

  const content = Array.isArray(message.content) ? (message.content as JsonRecord[]) : []
  content.forEach((block, index) => {
    push(messagesToOpenAIResponse({ type: 'content_block_start', index, content_block: block }, state))
    if (block.type === 'text' && block.text) {
      push(messagesToOpenAIResponse({ type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } }, state))
    } else if (block.type === 'thinking' && block.thinking) {
      push(
        messagesToOpenAIResponse(
          { type: 'content_block_delta', index, delta: { type: 'thinking_delta', thinking: block.thinking } },
          state
        )
      )
    } else if (block.type === 'tool_use') {
      push(
        messagesToOpenAIResponse(
          { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input ?? {}) } },
          state
        )
      )
    }
    push(messagesToOpenAIResponse({ type: 'content_block_stop', index }, state))
  })

  push(
    messagesToOpenAIResponse(
      { type: 'message_delta', delta: { stop_reason: message.stop_reason }, usage: message.usage },
      state
    )
  )
  push(messagesToOpenAIResponse({ type: 'message_stop' }, state))

  return assembleFromChunks(collected, state)
}

/**
 * Recompone los fragmentos de stream (todos con la misma forma
 * `chatcmpl-chunk`) en un único objeto `chat.completion`, en vez de
 * reimplementar el ensamblado con otro código — así el control de anulación
 * de esta función cae exactamente sobre el mismo mecanismo que el stream.
 */
function assembleFromChunks(chunks: JsonRecord[], state: MessagesToOpenAIState): JsonRecord {
  let content = ''
  let reasoningContent = ''
  const toolCallsByIndex = new Map<number, JsonRecord>()
  let finishReason: string | null = null
  let usage: JsonRecord | undefined

  for (const chunk of chunks) {
    const choice = (chunk.choices as JsonRecord[])[0] as JsonRecord
    const delta = (choice.delta ?? {}) as JsonRecord
    if (typeof delta.content === 'string') content += delta.content
    if (typeof delta.reasoning_content === 'string') reasoningContent += delta.reasoning_content
    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls as JsonRecord[]) {
        const idx = tc.index as number
        const existing = toolCallsByIndex.get(idx) ?? { id: tc.id, type: 'function', function: { name: '', arguments: '' } }
        if (tc.id) existing.id = tc.id
        const fn = (tc.function ?? {}) as JsonRecord
        const existingFn = existing.function as JsonRecord
        if (fn.name) existingFn.name = fn.name
        if (typeof fn.arguments === 'string') existingFn.arguments = (existingFn.arguments as string) + fn.arguments
        toolCallsByIndex.set(idx, existing)
      }
    }
    if (choice.finish_reason) finishReason = choice.finish_reason as string
    if (chunk.usage) usage = chunk.usage as JsonRecord
  }

  const message: JsonRecord = { role: 'assistant', content }
  if (reasoningContent) message.reasoning_content = reasoningContent
  if (toolCallsByIndex.size > 0) {
    message.tool_calls = Array.from(toolCallsByIndex.keys())
      .sort((a, b) => a - b)
      .map((idx) => toolCallsByIndex.get(idx))
  }

  return {
    id: `chatcmpl-${state.messageId}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: state.model,
    choices: [{ index: 0, message, finish_reason: finishReason }],
    ...(usage ? { usage } : {}),
  }
}
