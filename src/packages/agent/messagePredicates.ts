/**
 * Porte de `ccnmt: packages/agent/messagePredicates.ts` (byte-identical en
 * comportamiento; comentarios traducidos al español).
 */
import type { Message, UserMessage } from './messageShapes.js'

// Los mensajes tool_result comparten type:'user' con los turnos humanos; el
// discriminante es el campo opcional toolUseResult.
export function isHumanTurn(m: Message): m is UserMessage {
  return m.type === 'user' && !m.isMeta && m.toolUseResult === undefined
}
