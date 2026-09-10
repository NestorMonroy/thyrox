/**
 * Porte de `ccnmt: packages/agent/compaction/snipProjection.ts`.
 *
 * La fuente tipa con `CoreMessage` (`../types/messages.js`), un tipo
 * compartido que este arbol no tiene todavia. Se reusa `Message` de
 * `../messageShapes.ts` — el porte minimo ya establecido en este paquete
 * para la jerarquia de mensajes — porque su indice `[key: string]: unknown`
 * ya deja pasar el campo `subtype` que este modulo necesita leer.
 */
import type { Message } from '../messageShapes.ts'

const SNIP_BOUNDARY_SUBTYPE = 'snip_boundary'

/** ¿Es este mensaje el marcador de limite de un snip? Sólo lo son los de sistema. */
export function isSnipBoundaryMessage(message: Message): boolean {
  if (message.type !== 'system') return false
  return (message as { subtype?: string }).subtype === SNIP_BOUNDARY_SUBTYPE
}

/**
 * Proyecta la conversacion desde el primer limite de snip en adelante.
 * Sin limite, devuelve el input tal cual (misma referencia).
 */
export function projectSnippedView(messages: Message[]): Message[] {
  const boundaryIndex = messages.findIndex(m => isSnipBoundaryMessage(m))
  if (boundaryIndex === -1) return messages
  return messages.slice(boundaryIndex)
}
