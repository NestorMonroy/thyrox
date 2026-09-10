/**
 * Porte COMPLETO de `ccnmt: packages/storage/src/imageValidation.ts`.
 *
 * La fuente exporta dos símbolos —`ImageSizeError`,
 * `validateImagesForAPI`— más el tipo `OversizedImage` y el type guard
 * privado `isBase64ImageBlock`. `imageValidation.behavior.test.ts` los
 * ejercita a los cuatro, incluida su suite "source pins" (asserts sobre
 * el texto literal del archivo), así que este porte es completo, no
 * parcial.
 *
 * Sustitutos locales declarados — los tres imports de la fuente
 * (`API_IMAGE_MAX_BASE64_SIZE`, `logEvent`, `formatFileSize`) vienen de
 * paquetes que no existen en este árbol:
 *
 *   - `API_IMAGE_MAX_BASE64_SIZE`
 *     (`@claude-code-how-works/provider/apiLimits.js`) — reconstruida
 *     VERBATIM: el valor server-enforced de 5 MB, pineado en
 *     `ccnmt: packages/provider/src/__tests__/apiLimits.behavior.test.ts`
 *     (`expect(API_IMAGE_MAX_BASE64_SIZE).toBe(5 * 1024 * 1024)`). Se
 *     escribe como la multiplicación, nunca como el conteo de bytes en
 *     dígitos planos, para que el test de "source pins" de esta suite
 *     («NOT hardcoded literal») siga siendo verdad tal como lo es en la
 *     fuente.
 *   - `logEvent` (`@claude-code-how-works/local-observability`) — no-op
 *     local. Ningún test de esta suite ejercita la telemetría real, sólo
 *     el literal del nombre de evento y su posición relativa al `push`
 *     (los tests de "source pins").
 *   - `formatFileSize` (`@claude-code-how-works/output/formatters`) —
 *     portada VERBATIM desde
 *     `ccnmt: packages/output/src/formatters/format.ts` (función pura de
 *     KB/MB/GB, sin dependencias propias — las únicas importaciones de ese
 *     archivo las usan otras funciones exportadas, no ésta).
 */

const API_IMAGE_MAX_BASE64_SIZE = 5 * 1024 * 1024

function logEvent(name: string, metadata: Record<string, unknown> = {}): void {
  void name
  void metadata
}

/**
 * Formatea un conteo de bytes a un string legible (KB, MB, GB).
 * @example formatFileSize(1536) → "1.5KB"
 */
function formatFileSize(sizeInBytes: number): string {
  const kb = sizeInBytes / 1024
  if (kb < 1) {
    return `${sizeInBytes} bytes`
  }
  if (kb < 1024) {
    return `${kb.toFixed(1).replace(/\.0$/, '')}KB`
  }
  const mb = kb / 1024
  if (mb < 1024) {
    return `${mb.toFixed(1).replace(/\.0$/, '')}MB`
  }
  const gb = mb / 1024
  return `${gb.toFixed(1).replace(/\.0$/, '')}GB`
}

/**
 * Información sobre una imagen con tamaño excedido.
 */
export type OversizedImage = {
  index: number
  size: number
}

/**
 * Error lanzado cuando una o más imágenes exceden el límite de tamaño
 * de la API.
 */
export class ImageSizeError extends Error {
  constructor(oversizedImages: OversizedImage[], maxSize: number) {
    let message: string
    const firstImage = oversizedImages[0]
    if (oversizedImages.length === 1 && firstImage) {
      message =
        `Image base64 size (${formatFileSize(firstImage.size)}) exceeds API limit (${formatFileSize(maxSize)}). ` +
        `Please resize the image before sending.`
    } else {
      message =
        `${oversizedImages.length} images exceed the API limit (${formatFileSize(maxSize)}): ` +
        oversizedImages
          .map(img => `Image ${img.index}: ${formatFileSize(img.size)}`)
          .join(', ') +
        `. Please resize these images before sending.`
    }
    super(message)
    this.name = 'ImageSizeError'
  }
}

/**
 * Type guard para verificar si un bloque es un bloque de imagen base64.
 */
function isBase64ImageBlock(
  block: unknown,
): block is { type: 'image'; source: { type: 'base64'; data: string } } {
  if (typeof block !== 'object' || block === null) return false
  const b = block as Record<string, unknown>
  if (b.type !== 'image') return false
  if (typeof b.source !== 'object' || b.source === null) return false
  const source = b.source as Record<string, unknown>
  return source.type === 'base64' && typeof source.data === 'string'
}

/**
 * Valida que todas las imágenes en los mensajes estén dentro del límite
 * de tamaño de la API. Es una red de seguridad en la frontera de la API
 * para atrapar cualquier imagen con tamaño excedido que se haya colado
 * en el procesamiento previo.
 *
 * Nota: el límite de 5MB de la API aplica al largo del string codificado
 * en base64, no a los bytes crudos decodificados.
 *
 * Funciona tanto con tipos UserMessage/AssistantMessage (que tienen
 * { type, message }) como con tipos MessageParam crudos (que tienen
 * { role, content }).
 *
 * @param messages - Arreglo de mensajes a validar
 * @throws ImageSizeError si alguna imagen excede el límite de la API
 */
export function validateImagesForAPI(messages: unknown[]): void {
  const oversizedImages: OversizedImage[] = []
  let imageIndex = 0

  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) continue

    const m = msg as Record<string, unknown>

    // Maneja el formato de mensaje envuelto { type: 'user', message: { role, content } }
    // Sólo se revisan mensajes de usuario.
    if (m.type !== 'user') continue

    const innerMessage = m.message as Record<string, unknown> | undefined
    if (!innerMessage) continue

    const content = innerMessage.content
    if (typeof content === 'string' || !Array.isArray(content)) continue

    for (const block of content) {
      if (isBase64ImageBlock(block)) {
        imageIndex++
        // Verifica el largo del string codificado en base64 directamente
        // (no los bytes decodificados) — el límite de la API aplica al
        // tamaño del payload en base64.
        const base64Size = block.source.data.length
        if (base64Size > API_IMAGE_MAX_BASE64_SIZE) {
          logEvent('tengu_image_api_validation_failed', {
            base64_size_bytes: base64Size,
            max_bytes: API_IMAGE_MAX_BASE64_SIZE,
          })
          oversizedImages.push({ index: imageIndex, size: base64Size })
        }
      }
    }
  }

  if (oversizedImages.length > 0) {
    throw new ImageSizeError(oversizedImages, API_IMAGE_MAX_BASE64_SIZE)
  }
}
