/**
 * El adaptador de proveedor de Gemini — porte de
 * `ccnmt: packages/provider/src/gemini/indexImpl.ts` (219 lineas, 1 export).
 *
 * El puerto es COMPLETO: `queryModelGemini`, la unica exportacion de la
 * fuente. Ninguna queda fuera.
 *
 * Es el modulo que ata a los otros seis de este directorio: resuelve el
 * modelo (`modelMapping`), traduce mensajes y herramientas
 * (`convertMessages`, `convertTools`), abre el stream HTTP (`client`) y lo
 * adapta de vuelta a la forma de Anthropic (`streamAdapter`).
 *
 * CUATRO DIFERENCIAS DE FONDO con su hermano de OpenAI, y ninguna es de
 * estilo:
 *
 * 1. Toma un SEXTO parametro, `thinkingConfig`, que se traduce a
 *    `generationConfig.thinkingConfig`. El de OpenAI no tiene equivalente:
 *    alla el razonamiento llega en un campo del propio delta.
 * 2. NO filtra herramientas diferidas. No hay busqueda de herramientas ni
 *    `TOOL_SEARCH_TOOL_NAME` aqui; las herramientas viajan enteras al
 *    esquema. El unico filtro es por `type` de herramienta server-side.
 * 3. NO acumula costo ni uso: no llama a `addToTotalSessionCost`. El de
 *    OpenAI si lo hace.
 * 4. Un `signature_delta` sobre un bloque que NO es de pensamiento se guarda
 *    en `GEMINI_THOUGHT_SIGNATURE_FIELD` en vez de en `signature`. Es lo que
 *    hace que la firma sobreviva el viaje de ida y vuelta por la forma de
 *    Anthropic, que no tiene donde ponerla fuera de un bloque `thinking`.
 *
 * El uso abundante de `as any`/`as unknown` es un rodeo del sistema de tipos
 * POR DISENO, y viaja del original: la traduccion es de SDK a SDK y las
 * formas coinciden en ejecucion aunque TypeScript no pueda demostrarlo.
 */
import type { BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { randomUUID } from 'crypto'
import type {
  ProviderAssistantMessage,
  ProviderMessage,
  ProviderStreamEvent,
  ProviderSystemAPIErrorMessage,
  ProviderSystemPrompt,
  ProviderThinkingConfig,
  ProviderTools,
} from '../contracts.js'
import { getProviderHostBindings } from '../host.js'
import type { ProviderRequestOptions } from '../requestOptions.js'
import {
  createAssistantAPIErrorMessage,
  normalizeContentFromAPI,
  normalizeMessagesForAPI,
  toolToAPISchema,
} from '../runtimeHelpers.js'
import { streamGeminiGenerateContent } from './client.js'
import { anthropicMessagesToGemini } from './convertMessages.js'
import { anthropicToolChoiceToGemini, anthropicToolsToGemini } from './convertTools.js'
import { resolveGeminiModel } from './modelMapping.js'
import { adaptGeminiStreamToAnthropic } from './streamAdapter.js'
import { GEMINI_THOUGHT_SIGNATURE_FIELD } from './types.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function* queryModelGemini(
  messages: readonly ProviderMessage[],
  systemPrompt: ProviderSystemPrompt,
  tools: ProviderTools,
  signal: AbortSignal,
  options: ProviderRequestOptions,
  thinkingConfig: ProviderThinkingConfig,
): AsyncGenerator<
  ProviderStreamEvent | ProviderAssistantMessage | ProviderSystemAPIErrorMessage,
  void
> {
  try {
    const hostBindings = getProviderHostBindings()
    const logForDebugging =
      hostBindings.session.logForDebugging ?? hostBindings.anthropic.logForDebugging
    const geminiModel = resolveGeminiModel(options.model)
    const messagesForAPI = normalizeMessagesForAPI(messages, tools)

    const toolSchemas = await Promise.all(
      tools.map(tool =>
        toolToAPISchema(tool, {
          getToolPermissionContext: options.getToolPermissionContext,
          tools,
          agents: options.agents,
          allowedAgentTypes: options.allowedAgentTypes,
          model: options.model,
        }),
      ),
    )

    // Las dos herramientas server-side de Anthropic no tienen contraparte en
    // Gemini: se descartan por su `type` antes de traducir.
    const standardTools = toolSchemas.filter(
      (tool): tool is BetaToolUnion & { type: string } => {
        const anyTool = tool as unknown as Record<string, unknown>
        return (
          anyTool.type !== 'advisor_20260301' && anyTool.type !== 'computer_20250124'
        )
      },
    )

    const { contents, systemInstruction } = anthropicMessagesToGemini(
      messagesForAPI,
      systemPrompt,
    )
    const geminiTools = anthropicToolsToGemini(standardTools)
    const toolChoice = anthropicToolChoiceToGemini(options.toolChoice)

    const stream = streamGeminiGenerateContent({
      model: geminiModel,
      signal,
      fetchOverride: options.fetchOverride as any,
      body: {
        contents,
        ...(systemInstruction && { systemInstruction }),
        ...(geminiTools.length > 0 && { tools: geminiTools }),
        ...(toolChoice && {
          toolConfig: {
            functionCallingConfig: toolChoice,
          },
        }),
        generationConfig: {
          ...(options.temperatureOverride !== undefined && {
            temperature: options.temperatureOverride,
          }),
          ...(thinkingConfig.type !== 'disabled' && {
            thinkingConfig: {
              includeThoughts: true,
              ...(thinkingConfig.type === 'enabled' && {
                thinkingBudget: thinkingConfig.budgetTokens,
              }),
            },
          }),
        },
      },
    })

    logForDebugging(
      `[Gemini] Calling model=${geminiModel}, messages=${contents.length}, tools=${geminiTools.length}`,
    )

    const adaptedStream = adaptGeminiStreamToAnthropic(stream, geminiModel)
    const contentBlocks: Record<number, any> = {}
    let partialMessage: any
    let ttftMs = 0
    const start = Date.now()

    for await (const event of adaptedStream) {
      switch (event.type) {
        case 'message_start':
          partialMessage = (event as any).message
          ttftMs = Date.now() - start
          break
        case 'content_block_start': {
          const idx = (event as any).index
          const contentBlock = (event as any).content_block
          if (contentBlock.type === 'tool_use') {
            contentBlocks[idx] = { ...contentBlock, input: '' }
          } else if (contentBlock.type === 'text') {
            contentBlocks[idx] = { ...contentBlock, text: '' }
          } else if (contentBlock.type === 'thinking') {
            contentBlocks[idx] = { ...contentBlock, thinking: '', signature: '' }
          } else {
            contentBlocks[idx] = { ...contentBlock }
          }
          break
        }
        case 'content_block_delta': {
          const idx = (event as any).index
          const delta = (event as any).delta
          const block = contentBlocks[idx]
          if (!block) break

          if (delta.type === 'text_delta') {
            block.text = (block.text || '') + delta.text
          } else if (delta.type === 'input_json_delta') {
            block.input = (block.input || '') + delta.partial_json
          } else if (delta.type === 'thinking_delta') {
            block.thinking = (block.thinking || '') + delta.thinking
          } else if (delta.type === 'signature_delta') {
            // La firma de un bloque de pensamiento cabe en la forma de
            // Anthropic; la de cualquier otro bloque no, y por eso viaja en
            // el campo propio de Gemini (diferencia 4 de la cabecera).
            if (block.type === 'thinking') {
              block.signature = delta.signature
            } else {
              block[GEMINI_THOUGHT_SIGNATURE_FIELD] = delta.signature
            }
          }
          break
        }
        case 'content_block_stop': {
          const idx = (event as any).index
          const block = contentBlocks[idx]
          if (!block || !partialMessage) break

          const message: ProviderAssistantMessage = {
            message: {
              ...partialMessage,
              content: normalizeContentFromAPI([block], tools, options.agentId),
            },
            requestId: undefined,
            type: 'assistant',
            uuid: randomUUID(),
            timestamp: new Date().toISOString(),
          } as unknown as ProviderAssistantMessage
          yield message
          break
        }
        case 'message_delta':
        case 'message_stop':
          break
      }

      yield {
        type: 'stream_event',
        event,
        ...(event.type === 'message_start' ? { ttftMs } : undefined),
      } as unknown as ProviderStreamEvent
    }
  } catch (error) {
    const hostBindings = getProviderHostBindings()
    const logForDebugging =
      hostBindings.session.logForDebugging ?? hostBindings.anthropic.logForDebugging
    const errorMessage = error instanceof Error ? error.message : String(error)
    logForDebugging(`[Gemini] Error: ${errorMessage}`, { level: 'error' })
    yield createAssistantAPIErrorMessage({
      content: `API Error: ${errorMessage}`,
      apiError: 'api_error',
      error: (error instanceof Error ? error : new Error(String(error))) as any,
    })
  }
}
