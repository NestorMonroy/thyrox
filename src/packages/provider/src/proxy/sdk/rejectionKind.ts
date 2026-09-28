/**
 * Qué capacidad rechazó el upstream en un 400 o un 413, leída del texto de
 * su error — porte de `HUn` del ejecutable 2.1.283 (`chunk-5t3x93y6.js`) con
 * sus predicados, y de `ZTr`, que compone el mensaje. El reenviador por SDK
 * (`./sdkForward.ts`) la usa para decirle al cliente qué se rechazó sin
 * reenviarle el texto del upstream.
 *
 * El orden de las comprobaciones es el de la referencia y decide cuál gana
 * cuando dos casan: «too much media» es a la vez `media_budget` y una frase
 * de documento, y gana `media_budget` porque va antes.
 */

/** `BS.header`: la beta del mensaje de sistema a mitad de conversación. */
const MID_CONVERSATION_SYSTEM_BETA = 'mid-conversation-system-2026-04-07'
const CAPABILITY_REJECTED_PREFIX = 'capability_rejected: '

/** `QQ`: frases de un rechazo de imagen. */
const IMAGE_REJECTIONS = [
  'could not process image', 'image exceeds', 'image dimensions exceed',
  'image does not match the provided media type', 'image cannot be empty', 'exceeds api limit',
  'images exceed the api limit', 'unable to resize image', 'unable to compress image', 'image file is empty',
]
/** `ZQ`: frases de un rechazo de documento. */
const DOCUMENT_REJECTIONS = [
  'could not process pdf', 'pdf pages', 'the pdf specified was not valid',
  'the pdf specified is password protected', 'pdf cannot be empty', 'too much media',
]
/** `sM`, `o7`, `i7`. */
const SYSTEM_MESSAGE = /system messages?\b|role .{0,2}system/i
const SYSTEM_POSITION = /(?:messages\.(\d{1,6}): )?(?:role .{0,2}system.{0,2} must (?:precede an|follow a)|use the top-level .{0,2}system.{0,2} parameter for the initial system prompt)/i
const TEXT_ONLY_SYSTEM = /text-only role .{0,2}system.{0,2} messages require/i

/** `$nn`: el error nombra una beta enviada en la cabecera. */
function namesBetaHeader(message: string, beta: string): boolean {
  return message.includes(beta) && message.includes('anthropic-beta')
}

/** `sAr`. */
function rejectsMidConversationSystem(message: string): boolean {
  if (namesBetaHeader(message, MID_CONVERSATION_SYSTEM_BETA)) return true
  if (SYSTEM_POSITION.test(message) || TEXT_ONLY_SYSTEM.test(message)) return true
  if (message.includes('Unexpected role') && message.includes('input message role')) return true
  if (message.includes('cache_control') && SYSTEM_MESSAGE.test(message)) return true
  return message.includes('not supported') && /role .{0,2}system/i.test(message)
}

/** `OUn`. */
function rejectsCacheControlField(message: string): boolean {
  if (!message.includes('cache_control')) return false
  if (SYSTEM_MESSAGE.test(message)) return false
  if (message.includes('empty text block')) return false
  if (/\bsystem\.\d+\./.test(message) || message.includes('tool_result')) return false
  if (/\bttl\b/i.test(message)) return false
  const lower = message.toLowerCase()
  return ['not permitted', 'cannot be set', 'unknown name', 'unknown field', 'unrecognized', 'additional propert']
    .some(phrase => lower.includes(phrase))
}

/** `tAr`. */
function rejectsThinkingSignature(message: string): boolean {
  const lower = message.toLowerCase().replaceAll('`', '')
  if (lower.includes('signature in thinking block')) return true
  if (lower.includes('invalid data in redacted_thinking block')) return true
  if (lower.includes('thinking.signature') && lower.includes('field required')) return true
  return (lower.includes('thinking block') || lower.includes('redacted_thinking'))
    && (lower.includes('cannot be modified') || lower.includes('invalid signature'))
}

/** `nAr`: el tipo de pensamiento que el modelo no admite. */
function rejectedThinkingType(message: string): string | undefined {
  const match = /thinking\.type[^a-z]{1,8}(enabled|adaptive)[^]*?not supported/i.exec(message)
    ?? /\b(adaptive) thinking is not supported/i.exec(message)
  return match?.[1] ? match[1].toLowerCase() : undefined
}

/** `e7`. */
function rejectsEffort(message: string): boolean {
  const lower = message.toLowerCase()
  if (lower.includes('effort parameter') && lower.includes('not support')) return true
  return lower.includes('output_config')
    && (lower.includes('extra inputs are not permitted') || lower.includes('requires a model that supports'))
}

/** `rAr`: el bloque multimedia rechazado, por su posición o por su frase. */
function rejectedMediaBlock(message: string): 'image' | 'document' | undefined {
  const positioned = message.match(/messages[.[](\d+)[\].]+content[.[](\d+)[\].]+(?:tool_result[.[]content[.[](\d+)[\].]+)?(image|document|pdf)/)
  if (positioned) return positioned[4] === 'image' ? 'image' : 'document'
  const lower = message.toLowerCase()
  if (IMAGE_REJECTIONS.some(phrase => lower.includes(phrase))) return 'image'
  if (DOCUMENT_REJECTIONS.some(phrase => lower.includes(phrase))) return 'document'
  return undefined
}

/** `IUn`. */
function isPromptTooLong(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('prompt is too long') || lower.includes('input is too long for requested model')
}

/**
 * `HUn`: la capacidad rechazada, o `undefined` si el texto no la nombra.
 * `betaHeaders` son las betas que la petición envió.
 */
export function rejectionKind(status: number, message: string, betaHeaders: readonly string[] = []): string | undefined {
  if (status === 413) return message.toLowerCase().includes('context window') || isPromptTooLong(message) ? 'prompt_too_long' : undefined
  if (status !== 400) return undefined
  if (rejectsMidConversationSystem(message)) return 'mid_conv_system'
  if (rejectsCacheControlField(message)) return 'cache_control_field'
  if (rejectsThinkingSignature(message)) return 'thinking_signature'
  const thinkingType = rejectedThinkingType(message)
  if (thinkingType) return `thinking_type:${thinkingType}`
  if (rejectsEffort(message)) return 'effort_unsupported'
  if (message.toLowerCase().includes('too much media')) return 'media_budget'
  const media = rejectedMediaBlock(message)
  if (media) return media === 'image' ? 'image_block' : 'document_block'
  if (isPromptTooLong(message)) return 'prompt_too_long'
  if (message.toLowerCase().includes('input length and `max_tokens` exceed context limit')) return 'max_tokens_context_overflow'
  for (const header of betaHeaders) {
    const beta = header.trim()
    if (beta && namesBetaHeader(message, beta)) return `beta_header:${beta}`
  }
  return undefined
}

/** `ZTr`. */
export function capabilityRejectedMessage(kind: string): string {
  return `${CAPABILITY_REJECTED_PREFIX}${kind}`
}
