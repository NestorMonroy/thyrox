/**
 * La compresión previa del contexto aplicada a un cuerpo de Messages de
 * Anthropic — el disparo proactivo de `handleChatCore` de OmniRoute
 * (`open-sse/handlers/chatCore.ts`, a58000c7, MIT) sobre `./contextManager.ts`.
 *
 * Se comprime cuando la estimación pasa de una fracción de la ventana menos lo
 * que ocupan las herramientas, y se comprime hasta ese umbral. El gestor
 * trabaja con los mensajes de sistema dentro de `messages`; la API de
 * Messages los lleva en `system`, así que el `system` entra como primer
 * mensaje y sale otra vez a su campo, con el aviso de historia recortada
 * dentro si lo hubo.
 *
 * Divergencias declaradas:
 * - La fracción es fija (0,7, el valor por defecto de la referencia); la
 *   referencia la lee de su base de datos.
 * - Sin la segunda pasada de último recurso contra la ventana entera: sólo
 *   actúa cuando la primera está apagada, y aquí no hay forma de apagarla.
 * - Sin los motores de compresión opcionales del prompt ni el adaptador de la
 *   API de Responses: el proxy sólo recibe Messages.
 */
import { type ContextWindowOf, compressContext, type CompressStats, estimateTokens, getTokenLimit } from './contextManager.ts'

/** La fracción de la ventana a partir de la cual se comprime. */
export const PROACTIVE_COMPRESSION_RATIO = 0.7

export type CompactOptions = { provider: string; model: string; contextWindowOf?: ContextWindowOf }

type Body = Record<string, unknown>

/** El cuerpo comprimido si pasaba del umbral, o el mismo objeto si no. */
export function compactMessagesBody<T extends Body>(body: T, options: CompactOptions): { body: T; compressed: boolean; stats: CompressStats } {
  const messages = Array.isArray(body.messages) ? (body.messages as Body[]) : null
  if (!messages) return { body, compressed: false, stats: {} }
  const limit = getTokenLimit(options.provider, options.model, options.contextWindowOf)
  const toolsReserve = Array.isArray(body.tools) ? estimateTokens(body.tools) : 0
  const threshold = Math.max(1, Math.floor((Math.max(1, limit) - toolsReserve) * PROACTIVE_COMPRESSION_RATIO))

  const hasSystem = body.system !== undefined
  const inline = hasSystem ? [{ role: 'system', content: body.system }, ...messages] : messages
  if (estimateTokens(inline) <= threshold) return { body, compressed: false, stats: {} }

  const result = compressContext({ messages: inline }, { provider: options.provider, model: options.model, maxTokens: threshold, reserveTokens: 0 })
  if (!result.compressed) return { body, compressed: false, stats: result.stats }
  const compressed = result.body.messages as Body[]
  const lead = compressed[0]
  if (lead?.role !== 'system') return { body: { ...body, messages: compressed }, compressed: true, stats: result.stats }
  return { body: { ...body, system: lead.content, messages: compressed.slice(1) }, compressed: true, stats: result.stats }
}
