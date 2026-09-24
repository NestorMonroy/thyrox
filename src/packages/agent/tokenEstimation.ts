/**
 * Estimación aproximada de tokens — porte del binario 2.1.275.
 *
 * `xu` (`chunk-8f0aeskw.js`) es la base: una cadena divide su longitud entre
 * los bytes por token y redondea; lo que no es cadena cuenta 0. `R`/`ige`
 * (mismo archivo) estiman un bloque y un contenido; `dAo`/`Vm`
 * (`chunk-q2gh92k2.js`) un mensaje y una lista.
 *
 * CORREGIDO 2026-09-24 contra el binario. Esta cabecera conservaba «verbatim»
 * un ajuste de 1.5 tokens por carácter CJK traído de ccnmt, y lo llamaba «el
 * comportamiento». Los dos estimadores de tokens de 2.1.275 no lo tienen:
 * `xu` es `round(len/n)` y `s3n` es `ceil(len/4)`. El binario SÍ trata el
 * CJK en otros tres sitios, ninguno de tokens: `nt`/`tt`/`ot` cuentan
 * palabras (han = 1/2, fonético = 1/4) sólo para descartar sugerencias de
 * prompt demasiado cortas; `o3t` clasifica caracteres para el ancho en
 * terminal; `uwo` segmenta texto por escrituras asiáticas. Gana el binario.
 *
 * Quedan sin portar, declarado: `countTokensWithAPI`,
 * `countMessagesTokensWithAPI`, `countTokensViaHaikuFallback`,
 * `countTokensWithBedrock` y `roughTokenCountEstimationForAPIRequest`, que
 * dependen del SDK del API. Y la rama de adjuntos de `dAo` llama a
 * `normalizeAttachmentForAPI` (`IJe`), que este árbol aún no tiene: aquí se
 * recibe como parámetro, y sin él un adjunto cuenta 0.
 */

export function roughTokenCountEstimation(
  content: string,
  bytesPerToken: number = 4,
): number {
  if (typeof content !== 'string') return 0
  return Math.round(content.length / bytesPerToken)
}

type Block = { type?: string; [key: string]: unknown } | string
type Content = string | readonly Block[] | null | undefined
type Message = {
  type?: string
  message?: { content?: Content }
  attachment?: unknown
  rendered?: unknown
}
type AttachmentNormalizer = (input: {
  attachment: unknown
  rendered: unknown
}) => readonly { message: { content?: Content } }[]

/** `R`: la estimación de un bloque de contenido. */
export function roughTokenCountEstimationForBlock(
  block: Block,
  bytesPerToken: number = 4,
): number {
  if (typeof block === 'string') return roughTokenCountEstimation(block, bytesPerToken)
  switch (block.type) {
    case 'text':
      return roughTokenCountEstimation(block.text as string, bytesPerToken)
    case 'image':
    case 'document':
      return 2000
    case 'tool_result':
      return roughTokenCountEstimationForContent(block.content as Content, bytesPerToken)
    case 'tool_use':
      return roughTokenCountEstimation(
        (block.name as string) + JSON.stringify(block.input ?? {}),
        bytesPerToken,
      )
    case 'thinking':
      return roughTokenCountEstimation(block.thinking as string, bytesPerToken)
    case 'redacted_thinking':
      return roughTokenCountEstimation(block.data as string, bytesPerToken)
    default:
      return roughTokenCountEstimation(JSON.stringify(block), bytesPerToken)
  }
}

/** `ige`: la estimación de un contenido, cadena o lista de bloques. */
export function roughTokenCountEstimationForContent(
  content: Content,
  bytesPerToken: number = 4,
): number {
  if (!content) return 0
  if (typeof content === 'string') return roughTokenCountEstimation(content, bytesPerToken)
  let total = 0
  for (const block of content) total += roughTokenCountEstimationForBlock(block, bytesPerToken)
  return total
}

/** `dAo`: la estimación de un mensaje del transcript. */
export function roughTokenCountEstimationForMessage(
  message: Message,
  bytesPerToken: number = 4,
  normalizeAttachment?: AttachmentNormalizer,
): number {
  if (
    (message.type === 'assistant' || message.type === 'user' || message.type === 'api_system') &&
    message.message?.content
  ) {
    return roughTokenCountEstimationForContent(message.message.content, bytesPerToken)
  }
  if (message.type === 'attachment' && message.attachment && normalizeAttachment) {
    let total = 0
    for (const normalized of normalizeAttachment({
      attachment: message.attachment,
      rendered: message.rendered,
    })) {
      total += roughTokenCountEstimationForContent(normalized.message.content, bytesPerToken)
    }
    return total
  }
  return 0
}

/** `Vm`: la suma sobre una lista de mensajes. */
export function roughTokenCountEstimationForMessages(
  messages: readonly Message[],
  bytesPerToken: number = 4,
  normalizeAttachment?: AttachmentNormalizer,
): number {
  let total = 0
  for (const message of messages) {
    total += roughTokenCountEstimationForMessage(message, bytesPerToken, normalizeAttachment)
  }
  return total
}

/**
 * Devuelve una razón bytes-por-token estimada para una extensión de
 * archivo dada. El JSON denso tiene muchos tokens de un solo carácter
 * (`{`, `}`, `:`, `,`, `"`), lo que hace que la razón real sea más
 * cercana a 2 que al 4 por defecto.
 */
export function bytesPerTokenForFileType(fileExtension: string): number {
  switch (fileExtension) {
    case 'json':
    case 'jsonl':
    case 'jsonc':
      return 2
    default:
      return 4
  }
}

/**
 * Como {@link roughTokenCountEstimation} pero usa una razón bytes-por-token
 * más precisa cuando el tipo de archivo es conocido.
 *
 * Importa cuando el conteo de tokens vía API no está disponible (p. ej. en
 * Bedrock) y se cae al estimado aproximado — un subconteo puede dejar
 * pasar un resultado de herramienta sobredimensionado.
 */
export function roughTokenCountEstimationForFileType(
  content: string,
  fileExtension: string,
): number {
  return roughTokenCountEstimation(
    content,
    bytesPerTokenForFileType(fileExtension),
  )
}
