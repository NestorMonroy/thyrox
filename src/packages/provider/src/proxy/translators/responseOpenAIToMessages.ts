/**
 * Traductor de respuesta OpenAI Chat Completions → Mensajes Messages —
 * la máquina de estados de eventos SSE, y un envoltorio de una sola pieza
 * para una respuesta no-stream.
 *
 * Porte de `omniroute: open-sse/translator/response/openai-to-claude.ts`
 * (793 líneas). Cubre `tool_calls`⇄`tool_use` (incluido el caso en que un
 * upstream envía el `id` y el `function.name` de una llamada en fragmentos
 * SSE SEPARADOS, #2077), `reasoning_content`⇄bloque `thinking`, y
 * `finish_reason`⇄`stop_reason`.
 *
 * pendiente, declarado con su porqué — todas son mitigaciones para
 * upstreams no-Anthropic concretos, ortogonales a los cuatro mecanismos
 * centrales:
 *
 * - extracción de bloques XML `<invoke>` (`extractXmlInvokeBlocks`, modelos
 *   como Dracarys) y de llamadas DSML (DeepSeek-V4-Flash,
 *   `utils/dsmlToolCalls.ts`) — formatos de tool-call fuera de banda que
 *   ningún modelo de referencia usa en el par Mensajes⇄OpenAI puro.
 * - el corte de frontera Markdown (`helpers/markdownBoundary.ts`) al emitir
 *   texto — evita partir un bloque de código a mitad de valla entre chunks;
 *   aquí el texto se relega tal cual llega.
 * - los "despojadores" de preámbulo (`utils/directivePreambleStripper.ts`) —
 *   atados a la variable `OMNIROUTE_SYSTEM_INSTRUCTION_APPEND`, que no es
 *   nuestra (regla 5 de esta tarea).
 * - el parche (`shim`) de argumentos de herramienta por nombre
 *   (`helpers/toolCallShim.ts`) para modelos que emiten JSON roto.
 * - el remapeo de nombre de herramienta anti-huella-digital de thyrox
 *   (`services/claudeCodeToolRemapper.ts`, 477 líneas) — aquí
 *   `restoreMessagesToolName` sólo consulta el `toolNameMap` propio de esta
 *   petición, sin la tabla estática TitleCase↔minúsculas.
 * - `isInternalReasoningPlaceholder`/`stripInternalReasoningPlaceholder`
 *   (`utils/reasoningPlaceholder.ts`) — un marcador interno de otra ruta del
 *   sistema; aquí todo `reasoning_content` no vacío se relega.
 *
 * `translateNonStreamingResponse` (el ensamblador real de la fuente) vive en
 * `handlers/responseTranslator.ts`, fuera de `translator/` — fuera del
 * alcance de lectura de esta tarea. `openaiMessageToMessagesApiMessage`, en su
 * lugar, ensambla el mensaje completo reproduciendo el MISMO mecanismo de
 * `openaiToMessagesResponse` sobre una secuencia sintética de eventos.
 */

import { sanitizeToolId } from './schemaUtils.js'
import { CLAUDE_OAUTH_TOOL_PREFIX } from './requestOpenAIToMessages.js'

type JsonRecord = Record<string, unknown>

const ABORT_FINISH_REASONS = new Set([
  'malformed_function_call',
  'unexpected_tool_call',
  'finish_reason_unspecified',
  'other',
  'language',
  'no_image',
])

/** Porte de `utils/finishReason.ts::isAbortFinishReason`. */
function isAbortFinishReason(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return ABORT_FINISH_REASONS.has(value.toLowerCase())
}

/**
 * Porte de `utils/toolCallArguments.ts::appendToolCallArgumentDelta`,
 * simplificado a los dos casos que el mecanismo central necesita
 * (delta incremental de verdad, y repetición/crecimiento de una instantánea
 * completa que algunos upstreams reenvían entera en cada chunk, #3701).
 */
function appendToolCallArgumentDelta(current: string, incoming: unknown): string {
  const next = typeof incoming === 'string' ? incoming : incoming == null ? '' : JSON.stringify(incoming)
  if (!current) return next
  if (!next) return current
  if (next === current) return current
  if (next.startsWith(current)) return next
  return current + next
}

type ToolCallState = {
  id: string
  name: string
  blockIndex: number
  argBuffer: string
  startEmitted: boolean
}

export type OpenAIToMessagesState = {
  messageStartSent?: boolean
  messageId?: string
  model?: string
  nextBlockIndex: number
  toolCalls: Map<number, ToolCallState>
  toolNameMap?: Map<string, string>
  textBlockStarted?: boolean
  textBlockClosed?: boolean
  textBlockIndex?: number
  thinkingBlockStarted?: boolean
  thinkingBlockIndex?: number
  usage?: JsonRecord
  messagesFinishEmitted?: boolean
  pendingMessagesFinishChoice?: JsonRecord | null
  finishReason?: string | null
  // Tri-estado hilado desde el lado de la petición: `false` = el cliente
  // pidió explícitamente NO pensamiento (se suprime la emisión del bloque,
  // pero se sigue acumulando para el respaldo de texto de abajo); `true` =
  // lo pidió; `undefined` = llamador legado, se relega como siempre.
  requestedThinking?: boolean
  _reasoningAccum?: string
}

export function createOpenAIToMessagesState(toolNameMap?: Map<string, string>): OpenAIToMessagesState {
  return { nextBlockIndex: 0, toolCalls: new Map(), toolNameMap, pendingMessagesFinishChoice: null }
}

function restoreToolName(name: string, toolNameMap?: Map<string, string>): string {
  return (toolNameMap?.get(name) as string | undefined) ?? name
}

function stopThinkingBlock(state: OpenAIToMessagesState, results: JsonRecord[]): void {
  if (!state.thinkingBlockStarted) return
  results.push({ type: 'content_block_stop', index: state.thinkingBlockIndex })
  state.thinkingBlockStarted = false
}

function stopTextBlock(state: OpenAIToMessagesState, results: JsonRecord[]): void {
  if (!state.textBlockStarted || state.textBlockClosed) return
  state.textBlockClosed = true
  results.push({ type: 'content_block_stop', index: state.textBlockIndex })
}

/** Porte de `response/openai-to-claude.ts::trackUsageFromChunk`. */
function trackUsageFromChunk(chunk: JsonRecord, state: OpenAIToMessagesState): void {
  if (!chunk.usage || typeof chunk.usage !== 'object') return
  const usage = chunk.usage as JsonRecord
  const promptTokens = typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0
  const outputTokens = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0

  const details = usage.prompt_tokens_details as JsonRecord | undefined
  const cacheReadTokens = typeof details?.cached_tokens === 'number' ? details.cached_tokens : 0
  const cacheCreateTokens = typeof details?.cache_creation_tokens === 'number' ? details.cache_creation_tokens : 0

  const inputTokens = promptTokens - cacheReadTokens - cacheCreateTokens

  state.usage = { input_tokens: inputTokens, output_tokens: outputTokens }
  if (cacheReadTokens > 0) state.usage.cache_read_input_tokens = cacheReadTokens
  if (cacheCreateTokens > 0) state.usage.cache_creation_input_tokens = cacheCreateTokens
}

/** Porte de `response/openai-to-claude.ts::convertFinishReason`. */
function convertFinishReason(reason: unknown): string {
  switch (reason) {
    case 'stop':
      return 'end_turn'
    case 'length':
      return 'max_tokens'
    case 'tool_calls':
      return 'tool_use'
    default:
      // Un motivo de aborto de Gemini/Antigravity (llamada a herramienta
      // malformada, etc.) se surge como "tool_use" en vez de "end_turn" —
      // colapsarlo a un cierre limpio presentaría un tool_call abortado
      // como una finalización exitosa (9router#2462 sub-bug #2).
      return isAbortFinishReason(reason) ? 'tool_use' : 'end_turn'
  }
}

/**
 * Convierte un chunk SSE de OpenAI a cero o más eventos SSE de Mensajes.
 * `state` se muta entre llamadas.
 */
export function openaiToMessagesResponse(chunk: JsonRecord | null, state: OpenAIToMessagesState): JsonRecord[] | null {
  if (!chunk && !state.pendingMessagesFinishChoice) return null

  const results: JsonRecord[] = []
  const chunkUsage = chunk?.usage
  const hasChunkUsage = Boolean(chunkUsage && typeof chunkUsage === 'object')

  // La cosecha de uso corre ANTES de la guarda de `choices`: varios
  // upstreams con forma OpenAI entregan el bloque de uso autoritativo en un
  // chunk final `{"choices":[],"usage":{...}}` (#11817).
  if (chunk) trackUsageFromChunk(chunk, state)

  const choices = chunk?.choices as JsonRecord[] | undefined
  const chunkChoice = choices?.[0]
  const flushingPendingFinish = !chunkChoice && Boolean(state.pendingMessagesFinishChoice)
  const choice = (chunkChoice || state.pendingMessagesFinishChoice) as JsonRecord | undefined
  if (!choice) return null
  if (flushingPendingFinish) state.pendingMessagesFinishChoice = null
  const delta = choice.delta as JsonRecord | undefined

  if (!state.messageStartSent) {
    state.messageStartSent = true
    const rawId = (chunk?.id as string | undefined)?.replace('chatcmpl-', '')
    state.messageId = rawId && rawId.length >= 8 && rawId !== 'chat' ? rawId : `msg_${Date.now()}`
    state.model = (chunk?.model as string | undefined) || 'unknown'
    state.nextBlockIndex = 0
    results.push({
      type: 'message_start',
      message: {
        id: state.messageId,
        type: 'message',
        role: 'assistant',
        model: state.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    })
  }

  // reasoning_content (pensamiento) — GLM, DeepSeek, etc. También admite el
  // alias `reasoning` y `reasoning_details[]` (StepFun/OpenRouter).
  let reasoningContent = (delta?.reasoning_content ?? delta?.reasoning) as string | undefined
  if (!reasoningContent && Array.isArray(delta?.reasoning_details)) {
    const parts: string[] = []
    for (const detail of delta?.reasoning_details as JsonRecord[]) {
      const text = (detail?.text ?? detail?.content) as string | undefined
      if (typeof text === 'string' && text) parts.push(text)
    }
    if (parts.length > 0) reasoningContent = parts.join('')
  }
  const hasReasoning = typeof reasoningContent === 'string' && reasoningContent !== ''
  if (hasReasoning) {
    if (state.requestedThinking !== false) {
      stopTextBlock(state, results)
      if (!state.thinkingBlockStarted) {
        state.thinkingBlockIndex = state.nextBlockIndex++
        state.thinkingBlockStarted = true
        results.push({ type: 'content_block_start', index: state.thinkingBlockIndex, content_block: { type: 'thinking', thinking: '' } })
      }
      results.push({ type: 'content_block_delta', index: state.thinkingBlockIndex, delta: { type: 'thinking_delta', thinking: reasoningContent } })
    }
    // La acumulación corre SIEMPRE, fuera de la compuerta de arriba: permite
    // sintetizar un bloque de texto en el cierre cuando el cliente pidió
    // explícitamente NO pensamiento pero la respuesta fue sólo razonamiento
    // (ver más abajo, "FIX B").
    state._reasoningAccum = (state._reasoningAccum || '') + reasoningContent
  }

  if (delta?.content) {
    const content = delta.content as string
    if (content) {
      stopThinkingBlock(state, results)
      if (!state.textBlockStarted) {
        state.textBlockIndex = state.nextBlockIndex++
        state.textBlockStarted = true
        state.textBlockClosed = false
        results.push({ type: 'content_block_start', index: state.textBlockIndex, content_block: { type: 'text', text: '' } })
      }
      results.push({ type: 'content_block_delta', index: state.textBlockIndex, delta: { type: 'text_delta', text: content } })
    }
  }

  if (delta?.tool_calls) {
    for (const tc of delta.tool_calls as JsonRecord[]) {
      const idx = (tc.index as number) ?? 0

      const incomingName = (() => {
        let n = ((tc.function as JsonRecord)?.name as string) || ''
        if (n.startsWith(CLAUDE_OAUTH_TOOL_PREFIX)) n = n.slice(CLAUDE_OAUTH_TOOL_PREFIX.length)
        return restoreToolName(n, state.toolNameMap)
      })()

      // Un `tool_call` se identifica por su `id`. Algunos upstreams (GLM
      // 5.2) transmiten el `id` y el `function.name` en chunks SSE
      // SEPARADOS. Mensajes no puede parchear un `content_block_start` ya
      // emitido, así que el `tool_call` se registra en el chunk del `id`
      // pero se DIFIERE `content_block_start` hasta que llega el nombre
      // (#2077).
      if (tc.id && !state.toolCalls.has(idx)) {
        stopThinkingBlock(state, results)
        stopTextBlock(state, results)
        state.toolCalls.set(idx, {
          id: sanitizeToolId(tc.id as string),
          name: incomingName,
          blockIndex: state.nextBlockIndex++,
          argBuffer: '',
          startEmitted: false,
        })
      }

      const toolInfo = state.toolCalls.get(idx)
      if (toolInfo) {
        if (tc.id && !toolInfo.id) toolInfo.id = sanitizeToolId(tc.id as string)
        if (incomingName && !toolInfo.startEmitted && !toolInfo.name) toolInfo.name = incomingName

        if (!toolInfo.startEmitted && (toolInfo.name || (tc.function as JsonRecord)?.arguments != null)) {
          toolInfo.startEmitted = true
          results.push({
            type: 'content_block_start',
            index: toolInfo.blockIndex,
            content_block: { type: 'tool_use', id: toolInfo.id, name: toolInfo.name || '', input: {} },
          })
        }
      }

      const argumentsFragment = (tc.function as JsonRecord)?.arguments
      if (argumentsFragment && toolInfo) {
        const nextArgs = appendToolCallArgumentDelta(toolInfo.argBuffer, argumentsFragment)
        const deltaStr = nextArgs.slice(toolInfo.argBuffer.length)
        toolInfo.argBuffer = nextArgs
        if (!deltaStr) continue
        results.push({ type: 'content_block_delta', index: toolInfo.blockIndex, delta: { type: 'input_json_delta', partial_json: deltaStr } })
      }
    }
  }

  // Cierre — se protege contra un `finish_reason` duplicado con un flag
  // dedicado (`messagesFinishEmitted`), en vez de reusar `state.finishReason`:
  // en el camino Responses→Mensajes el mismo `state` lo escribe otro paso
  // ANTES de éste (#5828).
  if (choice.finish_reason && !state.messagesFinishEmitted) {
    if (!hasChunkUsage && !flushingPendingFinish) {
      state.pendingMessagesFinishChoice = choice
      return results.length > 0 ? results : null
    }

    state.messagesFinishEmitted = true
    stopThinkingBlock(state, results)

    // FIX B — si la respuesta terminó siendo sólo razonamiento (ningún
    // bloque de texto ordinario abrió) y el cliente pidió explícitamente NO
    // pensamiento, se sintetiza un bloque de texto a partir del
    // razonamiento acumulado. Un compactador que sólo mire bloques de texto
    // vería, si no, una respuesta "vacía".
    if (!state.textBlockStarted && state._reasoningAccum && state.requestedThinking === false) {
      state.textBlockIndex = state.nextBlockIndex++
      state.textBlockStarted = true
      state.textBlockClosed = false
      results.push({ type: 'content_block_start', index: state.textBlockIndex, content_block: { type: 'text', text: '' } })
      results.push({ type: 'content_block_delta', index: state.textBlockIndex, delta: { type: 'text_delta', text: state._reasoningAccum } })
    }

    stopTextBlock(state, results)

    for (const [, toolInfo] of state.toolCalls) {
      if (!toolInfo.startEmitted) {
        toolInfo.startEmitted = true
        results.push({
          type: 'content_block_start',
          index: toolInfo.blockIndex,
          content_block: { type: 'tool_use', id: toolInfo.id, name: toolInfo.name || '', input: {} },
        })
      }
      results.push({ type: 'content_block_stop', index: toolInfo.blockIndex })
    }

    state.finishReason = choice.finish_reason as string
    const finalUsage = state.usage || { input_tokens: 0, output_tokens: 0 }
    results.push({ type: 'message_delta', delta: { stop_reason: convertFinishReason(choice.finish_reason) }, usage: finalUsage })
    results.push({ type: 'message_stop' })
  }

  return results.length > 0 ? results : null
}

/**
 * Ensambla un mensaje Mensajes completo a partir de una respuesta OpenAI Chat
 * Completions no-stream, reproduciendo la secuencia de eventos que un
 * stream habría emitido sobre el mismo `openaiToMessagesResponse` — igual que
 * `messagesApiMessageToOpenAIResponse` en la dirección opuesta.
 */
export function openaiMessageToMessagesApiMessage(
  response: JsonRecord,
  toolNameMap?: Map<string, string>,
  requestedThinking?: boolean
): JsonRecord {
  const state = createOpenAIToMessagesState(toolNameMap)
  state.requestedThinking = requestedThinking
  const collected: JsonRecord[] = []
  const push = (r: JsonRecord[] | null) => {
    if (r) collected.push(...structuredClone(r))
  }

  const choice = ((response.choices as JsonRecord[]) ?? [])[0] as JsonRecord | undefined
  const message = (choice?.message ?? {}) as JsonRecord

  push(
    openaiToMessagesResponse(
      { id: response.id, model: response.model, choices: [{ index: 0, delta: { role: 'assistant' } }] },
      state
    )
  )
  if (typeof message.reasoning_content === 'string' && message.reasoning_content) {
    push(
      openaiToMessagesResponse(
        { choices: [{ index: 0, delta: { reasoning_content: message.reasoning_content } }] },
        state
      )
    )
  }
  if (typeof message.content === 'string' && message.content) {
    push(openaiToMessagesResponse({ choices: [{ index: 0, delta: { content: message.content } }] }, state))
  }
  if (Array.isArray(message.tool_calls)) {
    push(
      openaiToMessagesResponse(
        {
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: (message.tool_calls as JsonRecord[]).map((tc, index) => ({
                  index,
                  id: tc.id,
                  function: { name: (tc.function as JsonRecord)?.name, arguments: (tc.function as JsonRecord)?.arguments },
                })),
              },
            },
          ],
        },
        state
      )
    )
  }
  push(
    openaiToMessagesResponse(
      { choices: [{ index: 0, delta: {}, finish_reason: choice?.finish_reason ?? 'stop' }], usage: response.usage },
      state
    )
  )
  // Sin `usage` en el mismo chunk que `finish_reason`, el mecanismo lo
  // DIFIERE (`pendingMessagesFinishChoice`) esperando un chunk de uso tardío —
  // que en un stream real llega después (#11817). Aquí no hay más chunks:
  // se fuerza el vacío (`chunk === null`) que en el stream real dispara esa
  // misma purga.
  push(openaiToMessagesResponse(null, state))

  return assembleFromEvents(collected)
}

function assembleFromEvents(events: JsonRecord[]): JsonRecord {
  const blocks = new Map<number, JsonRecord>()
  let id = ''
  let model = ''
  let stopReason: string | null = null
  let usage: JsonRecord | undefined

  for (const event of events) {
    if (event.type === 'message_start') {
      const message = event.message as JsonRecord
      id = message.id as string
      model = message.model as string
    } else if (event.type === 'content_block_start') {
      blocks.set(event.index as number, { ...(event.content_block as JsonRecord) })
    } else if (event.type === 'content_block_delta') {
      const block = blocks.get(event.index as number)
      if (!block) continue
      const delta = event.delta as JsonRecord
      if (delta.type === 'text_delta') block.text = ((block.text as string) || '') + (delta.text as string)
      if (delta.type === 'thinking_delta') block.thinking = ((block.thinking as string) || '') + (delta.thinking as string)
      if (delta.type === 'input_json_delta') {
        block._argBuffer = ((block._argBuffer as string) || '') + (delta.partial_json as string)
      }
    } else if (event.type === 'message_delta') {
      stopReason = (event.delta as JsonRecord)?.stop_reason as string | null
      if (event.usage) usage = event.usage as JsonRecord
    }
  }

  const content = Array.from(blocks.keys())
    .sort((a, b) => a - b)
    .map((idx) => {
      const block = blocks.get(idx) as JsonRecord
      if (block.type === 'tool_use' && typeof block._argBuffer === 'string') {
        const { _argBuffer, ...rest } = block
        try {
          return { ...rest, input: _argBuffer ? JSON.parse(_argBuffer) : {} }
        } catch {
          return { ...rest, input: {} }
        }
      }
      return block
    })

  return {
    id,
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    ...(usage ? { usage } : {}),
  }
}
