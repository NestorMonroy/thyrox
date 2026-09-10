/**
 * Adaptador del stream de Gemini a los eventos de Anthropic — porte de
 * `ccnmt: packages/provider/src/gemini/streamAdapter.ts` (244 lineas).
 *
 * El puerto es COMPLETO: `adaptGeminiStreamToAnthropic` y sus dos funciones
 * privadas. Ninguna queda fuera.
 *
 * TRES DIFERENCIAS DE FONDO con el adaptador de OpenAI:
 *
 * 1. Gemini manda cada llamada a funcion ENTERA en una parte, no en
 *    fragmentos. Por eso su bloque `tool_use` se abre, se rellena y se cierra
 *    dentro de la misma iteracion, en vez de acumular JSON parcial.
 * 2. El pensamiento no es un campo aparte: es una parte de TEXTO marcada con
 *    `thought: true`. Por eso hay un solo concepto de «bloque tipo texto» con
 *    dos sabores, y cambiar de sabor cierra el bloque abierto y abre otro.
 * 3. La firma de pensamiento viaja como `signature_delta` y puede venir
 *    adosada a una parte que no es ni texto ni llamada — de ahi la tercera
 *    rama del bucle, que la emite sobre el bloque abierto.
 */
import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { randomUUID } from 'crypto'
import type { GeminiPart, GeminiStreamChunk } from './types.js'

export async function* adaptGeminiStreamToAnthropic(
  stream: AsyncIterable<GeminiStreamChunk>,
  model: string,
): AsyncGenerator<BetaRawMessageStreamEvent, void> {
  const messageId = `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`
  let started = false
  let stopped = false
  let nextContentIndex = 0
  let openTextLikeBlock: { index: number; type: 'text' | 'thinking' } | null = null
  let sawToolUse = false
  let finishReason: string | undefined
  let inputTokens = 0
  let outputTokens = 0

  for await (const chunk of stream) {
    const usage = chunk.usageMetadata
    if (usage) {
      inputTokens = usage.promptTokenCount ?? inputTokens
      // La salida SUMA los tokens de pensamiento: Gemini los cuenta aparte y
      // Anthropic no tiene donde ponerlos por separado.
      outputTokens = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0)
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
            cache_read_input_tokens: 0,
          },
        },
      } as BetaRawMessageStreamEvent
    }

    const candidate = chunk.candidates?.[0]
    const parts = candidate?.content?.parts ?? []

    for (const part of parts) {
      if (part.functionCall) {
        if (openTextLikeBlock) {
          yield {
            type: 'content_block_stop',
            index: openTextLikeBlock.index,
          } as BetaRawMessageStreamEvent
          openTextLikeBlock = null
        }

        sawToolUse = true
        const toolIndex = nextContentIndex++
        // Gemini no da id de llamada: se acuna uno, porque Anthropic lo exige
        // para emparejar el resultado.
        const toolId = `toolu_${randomUUID().replace(/-/g, '').slice(0, 24)}`
        yield {
          type: 'content_block_start',
          index: toolIndex,
          content_block: {
            type: 'tool_use',
            id: toolId,
            name: part.functionCall.name || '',
            input: {},
          },
        } as BetaRawMessageStreamEvent

        if (part.thoughtSignature) {
          yield {
            type: 'content_block_delta',
            index: toolIndex,
            delta: { type: 'signature_delta', signature: part.thoughtSignature },
          } as BetaRawMessageStreamEvent
        }

        // Unos argumentos vacios no producen delta: el bloque ya nacio con
        // `input: {}`.
        if (part.functionCall.args && Object.keys(part.functionCall.args).length > 0) {
          yield {
            type: 'content_block_delta',
            index: toolIndex,
            delta: {
              type: 'input_json_delta',
              partial_json: JSON.stringify(part.functionCall.args),
            },
          } as BetaRawMessageStreamEvent
        }

        yield {
          type: 'content_block_stop',
          index: toolIndex,
        } as BetaRawMessageStreamEvent
        continue
      }

      const textLikeType = getTextLikeBlockType(part)
      if (textLikeType) {
        // Cambiar de sabor —de texto a pensamiento o al reves— cierra el
        // bloque abierto y abre otro.
        if (!openTextLikeBlock || openTextLikeBlock.type !== textLikeType) {
          if (openTextLikeBlock) {
            yield {
              type: 'content_block_stop',
              index: openTextLikeBlock.index,
            } as BetaRawMessageStreamEvent
          }

          openTextLikeBlock = { index: nextContentIndex++, type: textLikeType }

          yield {
            type: 'content_block_start',
            index: openTextLikeBlock.index,
            content_block:
              textLikeType === 'thinking'
                ? { type: 'thinking', thinking: '', signature: '' }
                : { type: 'text', text: '' },
          } as BetaRawMessageStreamEvent
        }

        if (part.text) {
          yield {
            type: 'content_block_delta',
            index: openTextLikeBlock.index,
            delta:
              textLikeType === 'thinking'
                ? { type: 'thinking_delta', thinking: part.text }
                : { type: 'text_delta', text: part.text },
          } as BetaRawMessageStreamEvent
        }

        if (part.thoughtSignature) {
          yield {
            type: 'content_block_delta',
            index: openTextLikeBlock.index,
            delta: { type: 'signature_delta', signature: part.thoughtSignature },
          } as BetaRawMessageStreamEvent
        }

        continue
      }

      // Una parte que no es ni texto ni llamada pero trae firma: se emite
      // sobre el bloque abierto, si lo hay. Sin este camino la firma se
      // perderia.
      if (part.thoughtSignature && openTextLikeBlock) {
        yield {
          type: 'content_block_delta',
          index: openTextLikeBlock.index,
          delta: { type: 'signature_delta', signature: part.thoughtSignature },
        } as BetaRawMessageStreamEvent
      }
    }

    if (candidate?.finishReason) {
      finishReason = candidate.finishReason
    }
  }

  // Un stream que no emitio ni un chunk NO produce cierre: sin message_start
  // no habria mensaje que cerrar.
  if (!started) {
    return
  }

  if (openTextLikeBlock) {
    yield {
      type: 'content_block_stop',
      index: openTextLikeBlock.index,
    } as BetaRawMessageStreamEvent
  }

  if (!stopped) {
    yield {
      type: 'message_delta',
      delta: {
        stop_reason: mapGeminiFinishReason(finishReason, sawToolUse),
        stop_sequence: null,
      },
      usage: { output_tokens: outputTokens },
    } as BetaRawMessageStreamEvent

    yield { type: 'message_stop' } as BetaRawMessageStreamEvent
    stopped = true
  }
}

/**
 * El sabor de bloque de una parte: `thinking` si viene marcada como
 * pensamiento, `text` si no. Una parte sin texto de cadena no es de este tipo.
 */
function getTextLikeBlockType(part: GeminiPart): 'text' | 'thinking' | null {
  if (typeof part.text !== 'string') {
    return null
  }
  return part.thought ? 'thinking' : 'text'
}

/**
 * Traduce el motivo de fin de Gemini al de Anthropic.
 *
 * Solo `MAX_TOKENS` tiene traduccion propia. TODOS los demas —incluidos los de
 * bloqueo por seguridad, recitacion o contenido prohibido— caen a la misma
 * rama, y ahi decide la presencia de una llamada a herramienta: `tool_use` si
 * la hubo, `end_turn` si no. Es deliberado y esta escrito con los casos
 * enumerados uno a uno en vez de un default a secas, para que se vea cuales
 * son.
 */
function mapGeminiFinishReason(reason: string | undefined, sawToolUse: boolean): string {
  switch (reason) {
    case 'MAX_TOKENS':
      return 'max_tokens'
    case 'STOP':
    case 'FINISH_REASON_UNSPECIFIED':
    case 'SAFETY':
    case 'RECITATION':
    case 'BLOCKLIST':
    case 'PROHIBITED_CONTENT':
    case 'SPII':
    case 'MALFORMED_FUNCTION_CALL':
    default:
      return sawToolUse ? 'tool_use' : 'end_turn'
  }
}
