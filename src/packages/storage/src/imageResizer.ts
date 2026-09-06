/**
 * Porte PARCIAL DECLARADO de `ccnmt: packages/storage/src/imageResizer.ts`.
 *
 * La fuente exporta doce símbolos: `ImageResizeError`, `ImageDimensions`,
 * `ResizeResult`, `maybeResizeAndDownsampleImageBuffer`,
 * `ImageBlockWithDimensions`, `maybeResizeAndDownsampleImageBlock`,
 * `compressImageBuffer`, `compressImageBufferWithTokenLimit`,
 * `compressImageBlock`, `detectImageFormatFromBuffer`,
 * `detectImageFormatFromBase64`, `createImageMetadataText` (más los
 * privados `classifyImageError`, `hashString`, `ImageCompressionContext`,
 * `CompressedImageResult`, `createCompressedImageResult`,
 * `tryProgressiveResizing`, `applyFormatOptimizations`, `tryPalettePNG`,
 * `tryJPEGConversion`, `createUltraCompressedJPEG`, y las constantes
 * `ERROR_TYPE_*`). Este archivo porta sólo los DOS que
 * `detectImageFormat.behavior.test.ts` ejercita:
 *
 *   - `detectImageFormatFromBuffer` — portada VERBATIM (sniffing de
 *     magic bytes puro: PNG, JPEG, GIF, WebP, con los defaults
 *     defensivos de buffer corto/desconocido).
 *   - `detectImageFormatFromBase64` — portada VERBATIM (decodifica y
 *     delega en la anterior; el `try/catch` es defensa en profundidad).
 *   - `ImageMediaType` — el tipo de retorno de ambas, portado VERBATIM.
 *
 * Quedan SIN portar, por divergencia de alcance declarada — todos
 * dependen de `sharp` vía `getImageProcessor`
 * (`@claude-code-how-works/tool-registry/tools/FileReadTool/imageProcessor.js`),
 * de `@claude-code-how-works/local-observability` (`logEvent`,
 * `logForDebugging`, `logError`, `errorMessage`), de
 * `@claude-code-how-works/output/formatters` (`formatFileSize`) o de
 * `@claude-code-how-works/provider/apiLimits.js`
 * (`API_IMAGE_MAX_BASE64_SIZE`, `IMAGE_MAX_HEIGHT`, `IMAGE_MAX_WIDTH`,
 * `IMAGE_TARGET_RAW_SIZE`) — ninguno de esos cuatro paquetes existe en
 * este árbol, y el binario nativo de `sharp` no es una dependencia que
 * este pase pueda instalar (decisión pendiente del ejecutor):
 *
 *   - `ImageResizeError`, `maybeResizeAndDownsampleImageBuffer`,
 *     `maybeResizeAndDownsampleImageBlock`, `compressImageBuffer`,
 *     `compressImageBufferWithTokenLimit`, `compressImageBlock`,
 *     `ResizeResult`, `ImageBlockWithDimensions`, `classifyImageError`,
 *     `hashString`, `ImageCompressionContext`, `CompressedImageResult`,
 *     `createCompressedImageResult`, `tryProgressiveResizing`,
 *     `applyFormatOptimizations`, `tryPalettePNG`, `tryJPEGConversion`,
 *     `createUltraCompressedJPEG`, las constantes `ERROR_TYPE_*`.
 *   - `ImageDimensions`, `createImageMetadataText` — sin dependencia
 *     externa (son puros), pero fuera del alcance de este agente hasta
 *     que `imageResizerHelpers.test.ts` los pida (otro test de la misma
 *     tarea, portado en un pase siguiente sobre este mismo archivo).
 *
 * Ninguno de esos símbolos lo ejercita `detectImageFormat.behavior.test.ts`
 * — es la única suite de este agente sobre este archivo hasta ahora.
 */

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'

/**
 * Detecta el formato de una imagen a partir de un buffer, usando magic bytes.
 * @param buffer Buffer con datos de imagen
 * @returns String de media type (p.ej. 'image/png', 'image/jpeg') o
 *   'image/png' como default
 */
export function detectImageFormatFromBuffer(buffer: Buffer): ImageMediaType {
  if (buffer.length < 4) return 'image/png' // default

  // Firma PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }

  // Firma JPEG (FFD8FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  // Firma GIF (GIF87a o GIF89a)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif'
  }

  // Firma WebP (RIFF....WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    if (
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp'
    }
  }

  // Default a PNG si es desconocido
  return 'image/png'
}

/**
 * Detecta el formato de una imagen a partir de datos en base64, usando
 * magic bytes.
 * @param base64Data Datos de imagen codificados en base64
 * @returns String de media type (p.ej. 'image/png', 'image/jpeg') o
 *   'image/png' como default
 */
export function detectImageFormatFromBase64(
  base64Data: string,
): ImageMediaType {
  try {
    const buffer = Buffer.from(base64Data, 'base64')
    return detectImageFormatFromBuffer(buffer)
  } catch {
    // Default a PNG ante cualquier error
    return 'image/png'
  }
}
