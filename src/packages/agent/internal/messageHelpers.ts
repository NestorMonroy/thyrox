/**
 * Helpers de mensaje — porte de `ccnmt: packages/agent/internal/messageHelpers.ts`.
 *
 * Homónimo engañoso: este archivo NO es la familia `messages/helpers` — es
 * un módulo distinto que vive bajo `internal/`. Exporta:
 *
 *   1. `SYNTHETIC_MESSAGES` — el conjunto de cadenas que otros módulos usan
 *      como ancla para reconocer un mensaje de usuario INYECTADO (rechazo
 *      de tool, interrupción) y no contarlo como prompt real.
 *   2. `countToolCalls` — cuenta MENSAJES de assistant que usan una tool
 *      dada, no bloques `tool_use` individuales (dos tool_use en el mismo
 *      mensaje cuentan una vez), con salida temprana opcional vía
 *      `maxCount`.
 */
import type { ToolUseBlock } from '@anthropic-ai/sdk/resources/index.mjs'

type AssistantLikeMessage = {
  type: 'assistant'
  message: {
    content: unknown[]
  }
}

type CountableMessage =
  | AssistantLikeMessage
  | {
      type: string
      [key: string]: unknown
    }

export const SYNTHETIC_MESSAGES = new Set([
  '[Request interrupted by user]',
  '[Request interrupted by user for tool use]',
  "The user doesn't want to take this action right now. STOP what you are doing and wait for the user to tell you how to proceed.",
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.",
  'No response requested.',
])

export function countToolCalls(
  messages: CountableMessage[],
  toolName: string,
  maxCount?: number,
): number {
  let count = 0
  for (const msg of messages) {
    if (!msg) continue
    if (msg.type === 'assistant' && Array.isArray(msg.message.content)) {
      const hasToolUse = msg.message.content.some(
        (block): block is ToolUseBlock =>
          block.type === 'tool_use' && block.name === toolName,
      )
      if (hasToolUse) {
        count++
        if (maxCount && count >= maxCount) {
          return count
        }
      }
    }
  }
  return count
}
