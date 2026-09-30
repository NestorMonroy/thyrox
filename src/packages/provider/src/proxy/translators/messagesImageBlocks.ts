/**
 * Porte de
 * `omniroute: open-sse/translator/request/openai-to-claude/imageBlocks.ts`
 * (entero, 77 líneas) y
 * `omniroute: open-sse/translator/request/openai-to-claude/sanitizeToolResultId.ts`
 * (entero, 13 líneas). Convierte partes de imagen con forma OpenAI
 * (`image_url`, o la variante de AI-SDK `image`) a bloques `image` de la
 * API de Mensajes de Mensajes, incluidas las anidadas dentro de un
 * `tool_result` — sin esto Anthropic rehúsa con 400.
 */

import { sanitizeToolId } from './schemaUtils.js'

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/

type MessagesImageBlock = {
  type: 'image'
  source: { type: 'base64'; media_type: string; data: string } | { type: 'url'; url: string }
}

export function extractOpenAiImageUrl(imageUrl: unknown): string {
  if (typeof imageUrl === 'string') return imageUrl
  if (imageUrl && typeof imageUrl === 'object' && !Array.isArray(imageUrl)) {
    const url = (imageUrl as { url?: unknown }).url
    if (typeof url === 'string') return url
  }
  return ''
}

export function urlToMessagesImageBlock(url: string): MessagesImageBlock | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  const match = trimmed.match(DATA_URL_RE)
  if (match) {
    return {
      type: 'image',
      source: { type: 'base64', media_type: match[1] as string, data: match[2] as string },
    }
  }
  return { type: 'image', source: { type: 'url', url: trimmed } }
}

/**
 * Traduce una parte con forma OpenAI/AI-SDK a un bloque `image` de Mensajes.
 * Devuelve `null` cuando la parte no es una imagen (el llamador la conserva
 * tal cual).
 */
export function openAiImagePartToMessagesBlock(
  part: Record<string, unknown>
): MessagesImageBlock | null {
  const type = part.type
  if (type === 'image_url') {
    return urlToMessagesImageBlock(extractOpenAiImageUrl(part.image_url))
  }
  if (type === 'image') {
    if (part.source && typeof part.source === 'object' && !Array.isArray(part.source)) {
      return { type: 'image', source: part.source as MessagesImageBlock['source'] }
    }
    if (typeof part.image === 'string') {
      return urlToMessagesImageBlock(part.image)
    }
  }
  return null
}

/**
 * Recorre el contenido de un `tool_result` y reescribe sus partes
 * `image_url`/`image` como bloques `image` de Mensajes. Un `tool_result`
 * anidado recursa; el contenido no-arreglo (una cadena) vuelve intacto.
 */
export function normalizeToolResultImages(content: unknown): unknown {
  if (!Array.isArray(content)) return content
  return content.map((block) => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return block
    const rec = block as Record<string, unknown>
    const image = openAiImagePartToMessagesBlock(rec)
    if (image) return image
    if (rec.type === 'tool_result' && Array.isArray(rec.content)) {
      return { ...rec, content: normalizeToolResultImages(rec.content) }
    }
    return rec
  })
}

/**
 * Sanea el `tool_use_id` de un mensaje de rol `tool` con la misma regla que
 * el `tool_use.id` del asistente. Devuelve `null` para un id ausente en vez
 * de acuñar uno al vuelo, para que el llamador pueda seguir descartando un
 * `tool_result` huérfano en vez de fabricar uno que nunca casará.
 */
export function sanitizeToolResultId(rawId: unknown): string | null {
  if (!rawId) return null
  return sanitizeToolId(typeof rawId === 'string' ? rawId : String(rawId))
}
