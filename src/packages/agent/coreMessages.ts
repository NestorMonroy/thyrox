/**
 * Reexporta el porte, que vive en la ruta de la fuente
 * (`ccnmt: packages/agent/types/messages.ts` -> `types/messages.ts`). Hasta
 * aqui el porte vivia en este archivo, una ruta que la fuente no tiene, y
 * `types/messages.ts` guardaba una copia sin adaptar: el mismo modelo dos
 * veces en la misma capa. Mismo patron que `compactionDeps.ts`.
 */
export * from './types/messages.js'
import type { CoreMessage } from './types/messages.js'

/**
 * Un valor con forma de mensaje del core: objeto, y de uno de sus tres tipos.
 * Vive en el core porque es el core quien lo necesita para recibir los
 * mensajes del provider sin afirmarlos por cast (`AgentLoop.ts`).
 */
export function isCoreMessage(value: unknown): value is CoreMessage {
  if (typeof value !== 'object' || value === null) return false
  const type = (value as { type?: unknown }).type
  return type === 'user' || type === 'assistant' || type === 'system'
}
