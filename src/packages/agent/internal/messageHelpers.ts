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
type ToolUseLike = { type: string; name?: string }

type AssistantLikeMessage = {
  type: 'assistant'
  message: {
    content?: string | readonly unknown[]
  }
}

/**
 * Tipo estrecho propio, como en la fuente
 * (`ccnmt: packages/agent/internal/messageHelpers.ts:3-14`): la funcion solo
 * lee `type` y `message.content`, asi que acepta cualquier mensaje con esa
 * forma —el `Message` canonico y el `AgentMessage` del bucle— sin atarse a
 * ninguno de los dos.
 */
type CountableMessage = {
  type: string
  message?: unknown
  [key: string]: unknown
}

/**
 * La rama comodin de la union de la fuente (`type: string`) impide que
 * `msg.type === 'assistant'` estreche; la guarda lo hace explicito.
 */
function isAssistantLike(msg: CountableMessage): msg is CountableMessage & AssistantLikeMessage {
  if (msg.type !== 'assistant') return false
  const body = msg.message
  return typeof body === 'object' && body !== null
}

function isToolUseLike(block: unknown): block is ToolUseLike {
  return typeof block === 'object' && block !== null && typeof (block as { type?: unknown }).type === 'string'
}

export const SYNTHETIC_MESSAGES = new Set([
  '[Request interrupted by user]',
  '[Request interrupted by user for tool use]',
  "The user doesn't want to take this action right now. STOP what you are doing and wait for the user to tell you how to proceed.",
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.",
  'No response requested.',
])

export function countToolCalls(
  messages: readonly CountableMessage[],
  toolName: string,
  maxCount?: number,
): number {
  let count = 0
  for (const msg of messages) {
    if (!msg) continue
    if (isAssistantLike(msg) && Array.isArray(msg.message.content)) {
      const hasToolUse = msg.message.content.some(
        block => isToolUseLike(block) && block.type === 'tool_use' && block.name === toolName,
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
