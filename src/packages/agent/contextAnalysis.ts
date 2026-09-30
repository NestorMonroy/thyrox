/**
 * Porte de `ccnmt: packages/agent/contextAnalysis.ts`: `analyzeContext`
 * (el recorrido bloque a bloque que reparte los tokens de una conversación
 * en cubos), sus dos auxiliares `processBlock` e `increment`, el tipo
 * `TokenStats` y la transformación pura `tokenStatsToStatsigMetrics`.
 *
 * Dos divergencias declaradas, ambas de forma y no de conducta:
 *
 *  - `normalizeMessagesForAPI` se toma de `./internal/queryRuntime.js`, el
 *    mismo hogar del que `query.ts` la consume en este árbol (la fuente la
 *    importa de `../messages.js`, que aquí no la exporta; la versión de
 *    `@thyrox/provider/runtimeHelpers` existe pero el paquete no la
 *    publica en su mapa de exports). Esa versión resuelve por los enlaces
 *    del host y exige la lista de herramientas como segundo argumento;
 *    aquí no hay ninguna que filtrar, así que viaja vacía. Como sus
 *    bloques llegan sin tipo (`unknown`), `processBlock` los estrecha por
 *    forma antes de leer un campo.
 *  - La fuente enumera dieciséis tipos de bloque (`image`, `thinking`,
 *    `server_tool_use`, …) sólo para sumarlos a `other`. Aquí es la rama
 *    `default` del mismo `switch`: mismo destino para los mismos bloques,
 *    sin atar el archivo a la lista de literales de una versión del SDK.
 */
import { roughTokenCountEstimation as countTokens } from './tokenEstimation.js'
import type { Message } from './messageShapes.js'
import { normalizeMessagesForAPI } from './internal/queryRuntime.js'
import type { AgentMessage } from './internalTypes.js'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'

export type TokenStats = {
  toolRequests: Map<string, number>
  toolResults: Map<string, number>
  humanMessages: number
  assistantMessages: number
  localCommandOutputs: number
  other: number
  attachments: Map<string, number>
  duplicateFileReads: Map<string, { count: number; tokens: number }>
  total: number
}

export function analyzeContext(messages: Message[]): TokenStats {
  const stats: TokenStats = {
    toolRequests: new Map(),
    toolResults: new Map(),
    humanMessages: 0,
    assistantMessages: 0,
    localCommandOutputs: 0,
    other: 0,
    attachments: new Map(),
    duplicateFileReads: new Map(),
    total: 0,
  }

  const toolIdsToToolNames = new Map<string, string>()
  const readToolIdToFilePath = new Map<string, string>()
  const fileReadStats = new Map<string, { count: number; totalTokens: number }>()

  messages.forEach(msg => {
    if (msg.type === 'attachment') {
      const type = msg.attachment.type || 'unknown'
      stats.attachments.set(type, (stats.attachments.get(type) || 0) + 1)
    }
  })

  const normalizedMessages = normalizeMessagesForAPI(messages, [])
  normalizedMessages.forEach(msg => {
    const content = msg.message?.content
    if (content === undefined) return

    // Camino de respaldo: contenido en cadena, sin bloques.
    if (typeof content === 'string') {
      const tokens = countTokens(content)
      stats.total += tokens
      // ¿Es la salida de un comando local?
      if (msg.type === 'user' && content.includes('local-command-stdout')) {
        stats.localCommandOutputs += tokens
      } else {
        stats[msg.type === 'user' ? 'humanMessages' : 'assistantMessages'] += tokens
      }
    } else {
      content.forEach(block => {
        if (!isContentBlock(block)) return
        processBlock(block, msg, stats, toolIdsToToolNames, readToolIdToFilePath, fileReadStats)
      })
    }
  })

  // Lecturas repetidas: el excedente sobre una lectura media por archivo.
  fileReadStats.forEach((data, path) => {
    if (data.count > 1) {
      const averageTokensPerRead = Math.floor(data.totalTokens / data.count)
      const duplicateTokens = averageTokensPerRead * (data.count - 1)
      stats.duplicateFileReads.set(path, { count: data.count, tokens: duplicateTokens })
    }
  })

  return stats
}

/** Un bloque de contenido ya estrechado por forma: lleva `type`. */
type ContentBlock = { type: string; [key: string]: unknown }

function isContentBlock(value: unknown): value is ContentBlock {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
}

function processBlock(
  block: ContentBlock,
  message: AgentMessage,
  stats: TokenStats,
  toolIds: Map<string, string>,
  readToolPaths: Map<string, string>,
  fileReads: Map<string, { count: number; totalTokens: number }>,
): void {
  const tokens = countTokens(jsonStringify(block))
  stats.total += tokens

  switch (block.type) {
    case 'text':
      // ¿Es la salida de un comando local?
      if (message.type === 'user' && typeof block.text === 'string' && block.text.includes('local-command-stdout')) {
        stats.localCommandOutputs += tokens
      } else {
        stats[message.type === 'user' ? 'humanMessages' : 'assistantMessages'] += tokens
      }
      break

    case 'tool_use': {
      if (typeof block.name === 'string' && typeof block.id === 'string') {
        const toolName = block.name || 'unknown'
        increment(stats.toolRequests, toolName, tokens)
        toolIds.set(block.id, toolName)

        // Sigue la ruta de cada lectura de la herramienta Read.
        if (
          toolName === 'Read' &&
          'input' in block &&
          block.input &&
          typeof block.input === 'object' &&
          'file_path' in block.input
        ) {
          const path = String(block.input.file_path)
          readToolPaths.set(block.id, path)
        }
      }
      break
    }

    case 'tool_result': {
      if (typeof block.tool_use_id === 'string') {
        const toolName = toolIds.get(block.tool_use_id) || 'unknown'
        increment(stats.toolResults, toolName, tokens)

        // Acumula los tokens leídos por archivo.
        if (toolName === 'Read') {
          const path = readToolPaths.get(block.tool_use_id)
          if (path) {
            const current = fileReads.get(path) || { count: 0, totalTokens: 0 }
            fileReads.set(path, { count: current.count + 1, totalTokens: current.totalTokens + tokens })
          }
        }
      }
      break
    }

    default:
      // Imágenes, documentos, thinking, resultados de herramientas del
      // servidor…: por ahora no se desglosan.
      stats.other += tokens
      break
  }
}

function increment(map: Map<string, number>, key: string, value: number): void {
  map.set(key, (map.get(key) || 0) + value)
}

export function tokenStatsToStatsigMetrics(
  stats: TokenStats,
): Record<string, number> {
  const metrics: Record<string, number> = {
    total_tokens: stats.total,
    human_message_tokens: stats.humanMessages,
    assistant_message_tokens: stats.assistantMessages,
    local_command_output_tokens: stats.localCommandOutputs,
    other_tokens: stats.other,
  }

  stats.attachments.forEach((count, type) => {
    metrics[`attachment_${type}_count`] = count
  })

  stats.toolRequests.forEach((tokens, tool) => {
    metrics[`tool_request_${tool}_tokens`] = tokens
  })

  stats.toolResults.forEach((tokens, tool) => {
    metrics[`tool_result_${tool}_tokens`] = tokens
  })

  const duplicateTotal = [...stats.duplicateFileReads.values()].reduce(
    (sum, d) => sum + d.tokens,
    0,
  )

  metrics.duplicate_read_tokens = duplicateTotal
  metrics.duplicate_read_file_count = stats.duplicateFileReads.size

  if (stats.total > 0) {
    metrics.human_message_percent = Math.round(
      (stats.humanMessages / stats.total) * 100,
    )
    metrics.assistant_message_percent = Math.round(
      (stats.assistantMessages / stats.total) * 100,
    )
    metrics.local_command_output_percent = Math.round(
      (stats.localCommandOutputs / stats.total) * 100,
    )
    metrics.duplicate_read_percent = Math.round(
      (duplicateTotal / stats.total) * 100,
    )

    const toolRequestTotal = [...stats.toolRequests.values()].reduce(
      (sum, v) => sum + v,
      0,
    )
    const toolResultTotal = [...stats.toolResults.values()].reduce(
      (sum, v) => sum + v,
      0,
    )

    metrics.tool_request_percent = Math.round(
      (toolRequestTotal / stats.total) * 100,
    )
    metrics.tool_result_percent = Math.round(
      (toolResultTotal / stats.total) * 100,
    )

    // Porcentajes de solicitud por herramienta.
    stats.toolRequests.forEach((tokens, tool) => {
      metrics[`tool_request_${tool}_percent`] = Math.round(
        (tokens / stats.total) * 100,
      )
    })

    // Porcentajes de resultado por herramienta.
    stats.toolResults.forEach((tokens, tool) => {
      metrics[`tool_result_${tool}_percent`] = Math.round(
        (tokens / stats.total) * 100,
      )
    })
  }

  return metrics
}
