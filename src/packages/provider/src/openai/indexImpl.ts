/**
 * El adaptador de proveedor de OpenAI — porte de
 * `ccnmt: packages/provider/src/openai/indexImpl.ts` (289 lineas, 1 export).
 *
 * El puerto es COMPLETO: `queryModelOpenAI`, la unica exportacion de la
 * fuente. Ninguna queda fuera.
 *
 * Es el modulo que ata a los otros cinco de este directorio: resuelve el
 * modelo (`modelMapping`), decide las herramientas diferidas
 * (`runtimeHelpers`), traduce mensajes y herramientas (`convertMessages`,
 * `convertTools`), pide el cliente (`client`) y adapta el stream de vuelta
 * (`streamAdapter`).
 *
 * El uso abundante de `as any`/`as unknown` es un rodeo del sistema de tipos
 * POR DISENO, y viaja del original: la traduccion es de SDK a SDK y las formas
 * coinciden en ejecucion aunque TypeScript no pueda demostrarlo.
 */
import type { BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { randomUUID } from 'crypto'
import {
  getEmptyProviderToolPermissionContext,
  providerToolMatchesName,
  type ProviderAssistantMessage,
  type ProviderMessage,
  type ProviderStreamEvent,
  type ProviderSystemAPIErrorMessage,
  type ProviderSystemPrompt,
  type ProviderTools,
} from '../contracts.js'
import { getProviderHostBindings } from '../host.js'
import type { ProviderRequestOptions } from '../requestOptions.js'
import {
  TOOL_SEARCH_TOOL_NAME,
  calculateUSDCost,
  createAssistantAPIErrorMessage,
  extractDiscoveredToolNames,
  isDeferredTool,
  isToolSearchEnabled,
  normalizeContentFromAPI,
  normalizeMessagesForAPI,
  toolToAPISchema,
} from '../runtimeHelpers.js'
import { getOpenAIClient } from './client.js'
import { anthropicMessagesToOpenAI } from './convertMessages.js'
import {
  anthropicToolChoiceToOpenAI,
  anthropicToolsToOpenAI,
} from './convertTools.js'
import { resolveOpenAIModel } from './modelMapping.js'
import { adaptOpenAIStreamToAnthropic } from './streamAdapter.js'

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function* queryModelOpenAI(
  messages: readonly ProviderMessage[],
  systemPrompt: ProviderSystemPrompt,
  tools: ProviderTools,
  signal: AbortSignal,
  options: ProviderRequestOptions,
): AsyncGenerator<
  ProviderStreamEvent | ProviderAssistantMessage | ProviderSystemAPIErrorMessage,
  void
> {
  try {
    const hostBindings = getProviderHostBindings()
    const logForDebugging =
      hostBindings.session.logForDebugging ?? hostBindings.anthropic.logForDebugging
    const openaiModel = resolveOpenAIModel(options.model)
    const messagesForAPI = normalizeMessagesForAPI(messages, tools)

    const useToolSearch = await isToolSearchEnabled(
      options.model,
      tools,
      options.getToolPermissionContext ||
        (async () => getEmptyProviderToolPermissionContext()),
      options.agents || [],
      options.querySource,
    )

    const deferredToolNames = new Set<string>()
    if (useToolSearch) {
      for (const tool of tools) {
        if (isDeferredTool(tool)) {
          deferredToolNames.add(tool.name)
        }
      }
    }

    // Con la busqueda activa, una herramienta diferida solo viaja si YA se
    // descubrio; la propia herramienta de busqueda viaja siempre.
    let filteredTools = tools
    if (useToolSearch && deferredToolNames.size > 0) {
      const discoveredToolNames = extractDiscoveredToolNames(messages)
      filteredTools = tools.filter(tool => {
        if (!deferredToolNames.has(tool.name)) return true
        if (providerToolMatchesName(tool, TOOL_SEARCH_TOOL_NAME)) return true
        return discoveredToolNames.has(tool.name)
      })
    }

    const toolSchemas = await Promise.all(
      filteredTools.map(tool =>
        toolToAPISchema(tool, {
          getToolPermissionContext: options.getToolPermissionContext,
          tools,
          agents: options.agents,
          allowedAgentTypes: options.allowedAgentTypes,
          model: options.model,
          deferLoading: useToolSearch && deferredToolNames.has(tool.name),
        }),
      ),
    )

    // Las herramientas de servidor con tipo propio no son llamadas a funcion.
    const standardTools = toolSchemas.filter(
      (tool): tool is BetaToolUnion & { type: string } => {
        const anyTool = tool as unknown as Record<string, unknown>
        return (
          anyTool.type !== 'advisor_20260301' && anyTool.type !== 'computer_20250124'
        )
      },
    )

    const openaiMessages = anthropicMessagesToOpenAI(messagesForAPI, systemPrompt)
    const openaiTools = anthropicToolsToOpenAI(standardTools)
    const openaiToolChoice = anthropicToolChoiceToOpenAI(options.toolChoice)

    if (useToolSearch) {
      const includedDeferredTools = filteredTools.filter(tool =>
        deferredToolNames.has(tool.name),
      ).length
      logForDebugging(
        `[OpenAI] Tool search enabled: ${includedDeferredTools}/${deferredToolNames.size} deferred tools included, total tools=${openaiTools.length}`,
      )
    } else {
      logForDebugging(`[OpenAI] Tool search disabled, total tools=${openaiTools.length}`)
    }

    const client = getOpenAIClient({
      maxRetries: 0,
      fetchOverride: options.fetchOverride as any,
      source: options.querySource,
      // El modelo viaja para que el cliente resuelva el endpoint y la clave de
      // SU conexion, no las variables de entorno globales. Asi conviven varias
      // conexiones compatibles con OpenAI.
      model: options.model,
    })

    logForDebugging(
      `[OpenAI] Calling model=${openaiModel}, messages=${openaiMessages.length}, tools=${openaiTools.length}`,
    )

    const stream = await client.chat.completions.create(
      {
        model: openaiModel,
        messages: openaiMessages as any,
        ...(openaiTools.length > 0 && {
          tools: openaiTools as any,
          ...(openaiToolChoice && { tool_choice: openaiToolChoice as any }),
        }),
        stream: true,
        stream_options: { include_usage: true },
        ...(options.temperatureOverride !== undefined && {
          temperature: options.temperatureOverride,
        }),
      },
      { signal },
    )

    const adaptedStream = adaptOpenAIStreamToAnthropic(stream as any, openaiModel)
    const contentBlocks: Record<number, any> = {}
    let partialMessage: any
    let usage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }
    let ttftMs = 0
    const start = Date.now()

    for await (const event of adaptedStream) {
      switch (event.type) {
        case 'message_start': {
          partialMessage = (event as any).message
          ttftMs = Date.now() - start
          if ((event as any).message?.usage) {
            usage = { ...usage, ...(event as any).message.usage }
          }
          break
        }
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
            block.signature = delta.signature
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
          } as ProviderAssistantMessage
          yield message
          break
        }
        case 'message_delta': {
          const deltaUsage = (event as any).usage
          if (deltaUsage) {
            usage = { ...usage, ...deltaUsage }
          }
          break
        }
        case 'message_stop':
          break
      }

      if (
        event.type === 'message_stop' &&
        usage.input_tokens + usage.output_tokens > 0
      ) {
        const costUSD = calculateUSDCost(openaiModel, usage as any)
        hostBindings.session.addToTotalSessionCost?.(
          costUSD,
          usage as any,
          options.model,
        )
      }

      yield {
        type: 'stream_event',
        event,
        ...(event.type === 'message_start' ? { ttftMs } : undefined),
      } as ProviderStreamEvent
    }
  } catch (error) {
    const hostBindings = getProviderHostBindings()
    const logForDebugging =
      hostBindings.session.logForDebugging ?? hostBindings.anthropic.logForDebugging
    const errorMessage = error instanceof Error ? error.message : String(error)
    logForDebugging(`[OpenAI] Error: ${errorMessage}`, { level: 'error' })
    yield createAssistantAPIErrorMessage({
      content: `API Error: ${errorMessage}`,
      apiError: 'api_error',
      error: (error instanceof Error ? error : new Error(String(error))) as any,
    })
  }
}
