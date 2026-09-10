/**
 * Adaptador de stream de OpenAI — porte de
 * `ccnmt: packages/provider/src/openai/streamAdapter.ts` (320 lineas).
 *
 * El puerto es COMPLETO: `adaptOpenAIStreamToAnthropic` (su unico export) y
 * `mapFinishReason` (privado). Ninguno queda fuera.
 *
 * El uso abundante de `as any` es un rodeo del sistema de tipos POR DISENO, y
 * viaja del original: las extensiones de OpenAI —`prompt_tokens_details`,
 * `reasoning_content`— son campos que existen en ejecucion y no estan en los
 * tipos publicados de `ChatCompletionChunk`.
 */
import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { ChatCompletionChunk } from 'openai/resources/chat/completions/completions.mjs'
import { randomUUID } from 'crypto'

/**
 * Adapta una respuesta en streaming de OpenAI a los eventos de stream de
 * Anthropic.
 *
 * El mapeo:
 *
 * - primer chunk              → `message_start`
 * - `delta.reasoning_content` → `content_block_start(thinking)` + `thinking_delta` + `content_block_stop`
 * - `delta.content`           → `content_block_start(text)` + `text_delta` + `content_block_stop`
 * - `delta.tool_calls`        → `content_block_start(tool_use)` + `input_json_delta` + `content_block_stop`
 * - `finish_reason`           → `message_delta(stop_reason)` + `message_stop`
 * - `usage.cached_tokens`     → `cache_read_input_tokens` del `message_start`
 *
 * El pensamiento: DeepSeek y los proveedores compatibles mandan
 * `delta.reasoning_content` para la cadena de razonamiento, y se mapea a los
 * bloques `thinking` de Anthropic.
 *
 * La cache de prompt: OpenAI reporta los tokens cacheados en
 * `usage.prompt_tokens_details.cached_tokens`, y se mapean a
 * `cache_read_input_tokens`.
 */
export async function* adaptOpenAIStreamToAnthropic(
  stream: AsyncIterable<ChatCompletionChunk>,
  model: string,
): AsyncGenerator<BetaRawMessageStreamEvent, void> {
  const messageId = `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`

  let started = false
  let currentContentIndex = -1

  // Bloques tool_use en curso: indice de tool_calls → su bloque.
  const toolBlocks = new Map<
    number,
    { contentIndex: number; id: string; name: string; arguments: string }
  >()

  let thinkingBlockOpen = false
  let textBlockOpen = false

  let inputTokens = 0
  let outputTokens = 0
  let cachedTokens = 0

  // Indices de todo bloque abierto, para la limpieza final.
  const openBlockIndices = new Set<number>()

  for await (const chunk of stream) {
    const choice = chunk.choices?.[0]
    const delta = choice?.delta

    // El uso se extrae de cualquier chunk que lo traiga.
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens ?? inputTokens
      outputTokens = chunk.usage.completion_tokens ?? outputTokens
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const details = (chunk.usage as any).prompt_tokens_details
      if (details?.cached_tokens) {
        cachedTokens = details.cached_tokens
      }
    }

    if (!started) {
      started = true

      yield {
        type: 'message_start',
        message: {
          id: messageId,
          type: 'message',
          role: 'assistant',
          content: [],
          model,
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: inputTokens,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: cachedTokens,
          },
        },
      } as BetaRawMessageStreamEvent
    }

    if (!delta) continue

    // reasoning_content da el bloque thinking de Anthropic.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reasoningContent = (delta as any).reasoning_content
    if (reasoningContent != null && reasoningContent !== '') {
      if (!thinkingBlockOpen) {
        currentContentIndex++
        thinkingBlockOpen = true
        openBlockIndices.add(currentContentIndex)

        yield {
          type: 'content_block_start',
          index: currentContentIndex,
          content_block: { type: 'thinking', thinking: '', signature: '' },
        } as BetaRawMessageStreamEvent
      }

      yield {
        type: 'content_block_delta',
        index: currentContentIndex,
        delta: { type: 'thinking_delta', thinking: reasoningContent },
      } as BetaRawMessageStreamEvent
    }

    if (delta.content != null && delta.content !== '') {
      if (!textBlockOpen) {
        // El pensamiento termino y empieza la respuesta: se cierra su bloque.
        if (thinkingBlockOpen) {
          yield {
            type: 'content_block_stop',
            index: currentContentIndex,
          } as BetaRawMessageStreamEvent
          openBlockIndices.delete(currentContentIndex)
          thinkingBlockOpen = false
        }

        currentContentIndex++
        textBlockOpen = true
        openBlockIndices.add(currentContentIndex)

        yield {
          type: 'content_block_start',
          index: currentContentIndex,
          content_block: { type: 'text', text: '' },
        } as BetaRawMessageStreamEvent
      }

      yield {
        type: 'content_block_delta',
        index: currentContentIndex,
        delta: { type: 'text_delta', text: delta.content },
      } as BetaRawMessageStreamEvent
    }

    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const tcIndex = tc.index

        if (!toolBlocks.has(tcIndex)) {
          if (thinkingBlockOpen) {
            yield {
              type: 'content_block_stop',
              index: currentContentIndex,
            } as BetaRawMessageStreamEvent
            openBlockIndices.delete(currentContentIndex)
            thinkingBlockOpen = false
          }

          if (textBlockOpen) {
            yield {
              type: 'content_block_stop',
              index: currentContentIndex,
            } as BetaRawMessageStreamEvent
            openBlockIndices.delete(currentContentIndex)
            textBlockOpen = false
          }

          currentContentIndex++
          const toolId =
            tc.id || `toolu_${randomUUID().replace(/-/g, '').slice(0, 24)}`
          const toolName = tc.function?.name || ''

          toolBlocks.set(tcIndex, {
            contentIndex: currentContentIndex,
            id: toolId,
            name: toolName,
            arguments: '',
          })
          openBlockIndices.add(currentContentIndex)

          yield {
            type: 'content_block_start',
            index: currentContentIndex,
            content_block: {
              type: 'tool_use',
              id: toolId,
              name: toolName,
              input: {},
            },
          } as BetaRawMessageStreamEvent
        }

        const argFragment = tc.function?.arguments
        if (argFragment) {
          toolBlocks.get(tcIndex)!.arguments += argFragment
          yield {
            type: 'content_block_delta',
            index: toolBlocks.get(tcIndex)!.contentIndex,
            delta: { type: 'input_json_delta', partial_json: argFragment },
          } as BetaRawMessageStreamEvent
        }
      }
    }

    if (choice?.finish_reason) {
      if (thinkingBlockOpen) {
        yield {
          type: 'content_block_stop',
          index: currentContentIndex,
        } as BetaRawMessageStreamEvent
        openBlockIndices.delete(currentContentIndex)
        thinkingBlockOpen = false
      }

      if (textBlockOpen) {
        yield {
          type: 'content_block_stop',
          index: currentContentIndex,
        } as BetaRawMessageStreamEvent
        openBlockIndices.delete(currentContentIndex)
        textBlockOpen = false
      }

      for (const [, block] of toolBlocks) {
        if (openBlockIndices.has(block.contentIndex)) {
          yield {
            type: 'content_block_stop',
            index: block.contentIndex,
          } as BetaRawMessageStreamEvent
          openBlockIndices.delete(block.contentIndex)
        }
      }

      // Algunos backends devuelven «stop» aunque haya tool_calls. Se fuerza
      // «tool_use» cuando se vio algun bloque de herramienta, porque si no el
      // bucle de consulta no llega a ejecutarlas.
      const hasToolCalls = toolBlocks.size > 0
      const stopReason = hasToolCalls
        ? 'tool_use'
        : mapFinishReason(choice.finish_reason)

      yield {
        type: 'message_delta',
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: outputTokens },
      } as BetaRawMessageStreamEvent

      yield { type: 'message_stop' } as BetaRawMessageStreamEvent
    }
  }

  // Red de seguridad: si el stream acaba sin finish_reason, se cierra lo que
  // quedara abierto. Sin esto el consumidor recibe un bloque que nunca cierra.
  for (const idx of openBlockIndices) {
    yield {
      type: 'content_block_stop',
      index: idx,
    } as BetaRawMessageStreamEvent
  }
}

/**
 * Traduce el `finish_reason` de OpenAI al `stop_reason` de Anthropic.
 *
 * `stop` y `content_filter` dan `end_turn`; `tool_calls` da `tool_use`;
 * `length` da `max_tokens`. Cualquier otro valor cae a `end_turn`.
 */
function mapFinishReason(reason: string): string {
  switch (reason) {
    case 'stop':
      return 'end_turn'
    case 'tool_calls':
      return 'tool_use'
    case 'length':
      return 'max_tokens'
    case 'content_filter':
      return 'end_turn'
    default:
      return 'end_turn'
  }
}
