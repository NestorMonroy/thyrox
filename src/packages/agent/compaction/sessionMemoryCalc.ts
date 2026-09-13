/**
 * Porte de `ccnmt: packages/agent/compaction/sessionMemoryCalc.ts`.
 *
 * Decide, expandiendo hacia atrás desde el final del historial, cuántos
 * mensajes recientes caben en la "memoria de sesión" (el resumen que se
 * mantiene fuera del contexto principal): al menos `minTokens` Y
 * `minTextBlockMessages`, sin pasar de `maxTokens`. El resultado se ajusta
 * después para no partir un par `tool_use`/`tool_result` ni un bloque
 * `thinking` que comparte `message.id` con un mensaje ya dentro del rango.
 */
import type { SessionMemoryCompactConfig } from './types.ts'

export type SMMessage = {
  type: string
  message?: {
    content?: unknown
    id?: string
    [key: string]: unknown
  }
  uuid?: string
  [key: string]: unknown
}

export interface SessionMemoryCalcDeps {
  estimateMessageTokens: (messages: SMMessage[]) => number
  isCompactBoundaryMessage: (message: SMMessage) => boolean
}

export const DEFAULT_SM_COMPACT_CONFIG: SessionMemoryCompactConfig = {
  minTokens: 10_000,
  minTextBlockMessages: 5,
  maxTokens: 40_000,
}

/** ¿Este mensaje aporta texto legible? (para `user`, contenido no vacío; para `assistant`, un bloque `text`). */
export function hasTextBlocks(message: SMMessage): boolean {
  if (message.type === 'assistant') {
    const content = message.message?.content
    return Array.isArray(content) && content.some((block) => block.type === 'text')
  }
  if (message.type === 'user') {
    const content = message.message?.content
    if (typeof content === 'string') {
      return content.length > 0
    }
    if (Array.isArray(content)) {
      return content.some((block) => block.type === 'text')
    }
  }
  return false
}

function getToolResultIds(message: SMMessage): string[] {
  if (message.type !== 'user') return []
  const content = message.message?.content
  if (!Array.isArray(content)) return []
  const ids: string[] = []
  for (const block of content) {
    if (block.type === 'tool_result') ids.push(block.tool_use_id)
  }
  return ids
}

function hasToolUseWithIds(message: SMMessage, toolUseIds: Set<string>): boolean {
  if (message.type !== 'assistant') return false
  const content = message.message?.content
  if (!Array.isArray(content)) return false
  return content.some((block) => block.type === 'tool_use' && toolUseIds.has(block.id))
}

/**
 * Corre `startIndex` hacia atrás en dos pasadas: (1) hasta cubrir todo
 * `tool_use` cuyo `tool_result` quedó dentro del rango conservado, y (2)
 * hasta cubrir todo mensaje `assistant` que comparta `message.id` con uno ya
 * conservado (el mismo turno partido en streaming, con bloques `thinking`
 * que `normalizeMessagesForAPI` necesita fusionar).
 */
export function adjustIndexToPreserveAPIInvariants(messages: SMMessage[], startIndex: number): number {
  if (startIndex <= 0 || startIndex >= messages.length) {
    return startIndex
  }

  let adjustedIndex = startIndex

  // Paso 1: pares tool_use/tool_result.
  const allToolResultIds: string[] = []
  for (let i = startIndex; i < messages.length; i++) {
    allToolResultIds.push(...getToolResultIds(messages[i]!))
  }

  if (allToolResultIds.length > 0) {
    const toolUseIdsInKeptRange = new Set<string>()
    for (let i = adjustedIndex; i < messages.length; i++) {
      const msg = messages[i]!
      if (msg.type === 'assistant' && Array.isArray(msg.message!.content)) {
        for (const block of msg.message!.content as Array<Record<string, unknown>>) {
          if (block.type === 'tool_use') {
            toolUseIdsInKeptRange.add(block.id as string)
          }
        }
      }
    }

    const neededToolUseIds = new Set(allToolResultIds.filter((id) => !toolUseIdsInKeptRange.has(id)))

    for (let i = adjustedIndex - 1; i >= 0 && neededToolUseIds.size > 0; i--) {
      const message = messages[i]!
      if (hasToolUseWithIds(message, neededToolUseIds)) {
        adjustedIndex = i
        if (message.type === 'assistant' && Array.isArray(message.message!.content)) {
          for (const block of message.message!.content as Array<Record<string, unknown>>) {
            if (block.type === 'tool_use' && neededToolUseIds.has(block.id as string)) {
              neededToolUseIds.delete(block.id as string)
            }
          }
        }
      }
    }
  }

  // Paso 2: bloques thinking que comparten message.id con un assistant ya conservado.
  const messageIdsInKeptRange = new Set<string>()
  for (let i = adjustedIndex; i < messages.length; i++) {
    const msg = messages[i]!
    if (msg.type === 'assistant' && msg.message?.id) {
      messageIdsInKeptRange.add(msg.message.id)
    }
  }

  for (let i = adjustedIndex - 1; i >= 0; i--) {
    const message = messages[i]!
    if (message.type === 'assistant' && message.message?.id && messageIdsInKeptRange.has(message.message.id)) {
      adjustedIndex = i
    }
  }

  return adjustedIndex
}

/**
 * Punto de partida: el mensaje después de `lastSummarizedIndex` (o ninguno,
 * si es -1 o no se encontró). Expande hacia atrás hasta cumplir el mínimo
 * DOBLE (tokens Y mensajes con texto) o tocar el tope de tokens, con un piso
 * duro en la última frontera de compactación -- cruzarla dejaría mensajes
 * huérfanos que `getMessagesAfterCompactBoundary` ya recortó del lado del
 * resumen.
 */
export function calculateMessagesToKeepIndex(
  messages: SMMessage[],
  lastSummarizedIndex: number,
  config: SessionMemoryCompactConfig,
  deps: SessionMemoryCalcDeps,
): number {
  if (messages.length === 0) return 0

  let startIndex = lastSummarizedIndex >= 0 ? lastSummarizedIndex + 1 : messages.length

  let totalTokens = 0
  let textBlockMessageCount = 0
  for (let i = startIndex; i < messages.length; i++) {
    const msg = messages[i]!
    totalTokens += deps.estimateMessageTokens([msg])
    if (hasTextBlocks(msg)) textBlockMessageCount++
  }

  if (totalTokens >= config.maxTokens) {
    return adjustIndexToPreserveAPIInvariants(messages, startIndex)
  }

  if (totalTokens >= config.minTokens && textBlockMessageCount >= config.minTextBlockMessages) {
    return adjustIndexToPreserveAPIInvariants(messages, startIndex)
  }

  const idx = messages.findLastIndex((m) => deps.isCompactBoundaryMessage(m))
  const floor = idx === -1 ? 0 : idx + 1
  for (let i = startIndex - 1; i >= floor; i--) {
    const msg = messages[i]!
    const msgTokens = deps.estimateMessageTokens([msg])
    totalTokens += msgTokens
    if (hasTextBlocks(msg)) textBlockMessageCount++
    startIndex = i

    if (totalTokens >= config.maxTokens) break
    if (totalTokens >= config.minTokens && textBlockMessageCount >= config.minTextBlockMessages) break
  }

  return adjustIndexToPreserveAPIInvariants(messages, startIndex)
}
