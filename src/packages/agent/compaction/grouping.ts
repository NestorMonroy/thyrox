/**
 * Porte de `ccnmt: packages/agent/compaction/grouping.ts`.
 *
 * Agrupa mensajes por "ronda de API": cada ronda es un `assistant` con su
 * `message.id`, más todo lo que le siga hasta el próximo `assistant` con id
 * distinto. Es el insumo de `snipCompactCore` (cortar por ronda completa,
 * nunca a mitad de una) y de `truncateHeadForPTLRetry` (idem, al recortar la
 * cabeza tras un prompt-too-long).
 *
 * DIVERGENCIA DE TIPO, sin cambio de comportamiento: la firma es genérica
 * (`<T extends GroupableMessage>`) en vez de fija a `GroupableMessage[]`, así
 * que el llamador recupera su tipo concreto de mensaje sin un cast.
 */

type GroupableMessage = { type: string; message?: { id?: string }; [key: string]: unknown }

export function groupMessagesByApiRound<T extends GroupableMessage>(messages: T[]): T[][] {
  const groups: T[][] = []
  let current: T[] = []
  let lastAssistantId: string | undefined

  for (const msg of messages) {
    if (
      msg.type === 'assistant' &&
      msg.message?.id !== lastAssistantId &&
      current.length > 0
    ) {
      groups.push(current)
      current = [msg]
    } else {
      current.push(msg)
    }
    if (msg.type === 'assistant') {
      lastAssistantId = msg.message?.id
    }
  }

  if (current.length > 0) {
    groups.push(current)
  }
  return groups
}
