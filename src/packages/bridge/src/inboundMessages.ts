/**
 * Puerto fiel de `ccnmt: packages/bridge/src/inboundMessages.ts`.
 * `SDKMessage` es sólo-tipo (se borra al compilar, no necesita resolver)
 * — se cita `@thyrox/headless-sdk`, mismo convenio que el resto del
 * árbol. `detectImageFormatFromBase64` sí es import de valor y viene de
 * `@thyrox/storage: src/imageResizer.ts:819`, idéntica a la fuente; se
 * reimplementa como punto de inyección en
 * `internal/pendingCrossPackageDeps.ts` hasta que `@thyrox/bridge` sea
 * miembro del workspace.
 */
import type {
  Base64ImageSource,
  ContentBlockParam,
  ImageBlockParam,
} from '@anthropic-ai/sdk/resources/messages.mjs'
import type { UUID } from 'node:crypto'
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import { detectImageFormatFromBase64 } from './internal/pendingCrossPackageDeps.js'

/**
 * Procesa un mensaje de usuario entrante del bridge, extrayendo el
 * contenido y el UUID para encolarlo. Soporta tanto contenido string
 * como ContentBlockParam[] (p. ej. mensajes con imágenes).
 *
 * Normaliza bloques de imagen de clientes bridge que puedan usar
 * `mediaType` en camelCase en vez de `media_type` en snake_case
 * (mobile-apps#5825).
 *
 * Devuelve los campos extraídos, o undefined si el mensaje debe
 * omitirse (tipo distinto de user, contenido ausente/vacío).
 */
export function extractInboundMessageFields(
  msg: SDKMessage,
):
  | { content: string | Array<ContentBlockParam>; uuid: UUID | undefined }
  | undefined {
  if (msg.type !== 'user') return undefined
  const content = (
    msg.message as { content?: string | Array<ContentBlockParam> } | undefined
  )?.content
  if (!content) return undefined
  if (Array.isArray(content) && content.length === 0) return undefined

  const uuid =
    'uuid' in msg && typeof msg.uuid === 'string'
      ? (msg.uuid as UUID)
      : undefined

  return {
    content: Array.isArray(content) ? normalizeImageBlocks(content) : content,
    uuid,
  }
}

/**
 * Normaliza bloques de contenido de imagen de clientes bridge. Los
 * clientes iOS/web pueden enviar `mediaType` (camelCase) en vez de
 * `media_type` (snake_case), u omitir el campo por completo. Sin
 * normalización, el bloque malformado envenena la sesión — cada llamada
 * a la API subsiguiente falla con "media_type: Field required".
 *
 * El escaneo de vía rápida devuelve la referencia al array original
 * cuando no hace falta normalizar (cero asignaciones en el camino feliz).
 */
export function normalizeImageBlocks(
  blocks: Array<ContentBlockParam>,
): Array<ContentBlockParam> {
  if (!blocks.some(isMalformedBase64Image)) return blocks

  return blocks.map(block => {
    if (!isMalformedBase64Image(block)) return block
    const src = block.source as unknown as Record<string, unknown>
    const mediaType =
      typeof src.mediaType === 'string' && src.mediaType
        ? src.mediaType
        : detectImageFormatFromBase64(block.source.data)
    return {
      ...block,
      source: {
        type: 'base64' as const,
        media_type: mediaType as Base64ImageSource['media_type'],
        data: block.source.data,
      },
    }
  })
}

function isMalformedBase64Image(
  block: ContentBlockParam,
): block is ImageBlockParam & { source: Base64ImageSource } {
  if (block.type !== 'image' || block.source?.type !== 'base64') return false
  return !(block.source as unknown as Record<string, unknown>).media_type
}
