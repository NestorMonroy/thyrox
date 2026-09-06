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
 *
 * Ampliado (segundo pase, `imageResizerHelpers.test.ts`) con dos símbolos
 * más — sin dependencia externa, puramente aritméticos:
 *
 *   - `ImageDimensions` — el tipo de entrada de `createImageMetadataText`,
 *     portado VERBATIM.
 *   - `createImageMetadataText` — portada VERBATIM (las cuatro guardas de
 *     dimensión inválida, el cálculo del factor de escala, y el
 *     ensamblado de las dos cláusulas "source:"/"original …").
 *
 * Ninguno de los símbolos restantes lo ejercitan
 * `detectImageFormat.behavior.test.ts` ni `imageResizerHelpers.test.ts` —
 * son las dos únicas suites de este agente sobre este archivo.
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

export type ImageDimensions = {
  originalWidth?: number
  originalHeight?: number
  displayWidth?: number
  displayHeight?: number
}

/**
 * Crea una descripción textual de la metadata de una imagen, incluyendo
 * dimensiones y ruta de origen. Devuelve `null` si no hay metadata útil
 * disponible.
 */
export function createImageMetadataText(
  dims: ImageDimensions,
  sourcePath?: string,
): string | null {
  const { originalWidth, originalHeight, displayWidth, displayHeight } = dims
  // Omitir si las dimensiones no están disponibles o son inválidas.
  // Nota: verifica undefined/null y cero, para prevenir división entre cero.
  if (
    !originalWidth ||
    !originalHeight ||
    !displayWidth ||
    !displayHeight ||
    displayWidth <= 0 ||
    displayHeight <= 0
  ) {
    // Si hay ruta de origen pero no dimensiones válidas, aun así devolver
    // la información de origen.
    if (sourcePath) {
      return `[Image source: ${sourcePath}]`
    }
    return null
  }
  // Verificar si la imagen fue redimensionada.
  const wasResized =
    originalWidth !== displayWidth || originalHeight !== displayHeight

  // Sólo incluir metadata si hay información útil (redimensionada o con
  // ruta de origen).
  if (!wasResized && !sourcePath) {
    return null
  }

  // Ensamblar las partes de la metadata.
  const parts: string[] = []

  if (sourcePath) {
    parts.push(`source: ${sourcePath}`)
  }

  if (wasResized) {
    const scaleFactor = originalWidth / displayWidth
    parts.push(
      `original ${originalWidth}x${originalHeight}, displayed at ${displayWidth}x${displayHeight}. Multiply coordinates by ${scaleFactor.toFixed(2)} to map to original image.`,
    )
  }

  return `[Image: ${parts.join(', ')}]`
}
