/**
 * Qué capacidad rechazó el upstream en un 400/413 — porte de `HUn` y sus
 * predicados del ejecutable 2.1.283 (`chunk-5t3x93y6.js`, extracto en
 * `.claude/workbench/cloud-sdk-forward-20260927T235948/outputs/rejection-kind.js`).
 * Cada caso es el texto que el predicado busca; el orden de los casos es el
 * de `HUn`, que decide cuál gana cuando dos casan.
 */
import { describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { capabilityRejectedMessage, rejectionKind } = (await import(
  process.env.REJECTION_KIND_MODULE ?? '../src/proxy/sdk/rejectionKind.ts'
)) as typeof import('../src/proxy/sdk/rejectionKind.ts')

describe('413', () => {
  test('ventana de contexto o prompt largo es prompt_too_long', () => {
    expect(rejectionKind(413, 'exceeds the context window')).toBe('prompt_too_long')
    expect(rejectionKind(413, 'Prompt is too long')).toBe('prompt_too_long')
    expect(rejectionKind(413, 'input is too long for requested model')).toBe('prompt_too_long')
  })
  test('otro 413 no se clasifica', () => expect(rejectionKind(413, 'body too large')).toBeUndefined())
})

describe('400', () => {
  const cases: [string, string, string | undefined][] = [
    ['la beta del sistema a mitad de conversación', 'anthropic-beta: mid-conversation-system-2026-04-07 is not enabled', 'mid_conv_system'],
    ['un sistema que debe preceder', 'messages.3: role "system" must precede an assistant turn', 'mid_conv_system'],
    ['un sistema sólo de texto', 'text-only role `system` messages require', 'mid_conv_system'],
    ['un rol inesperado', 'Unexpected role system for input message role', 'mid_conv_system'],
    ['cache_control en un mensaje de sistema', 'cache_control is not allowed on system messages', 'mid_conv_system'],
    ['un rol de sistema no soportado', 'role "system" is not supported here', 'mid_conv_system'],
    ['un campo cache_control desconocido', 'cache_control: unknown field scope', 'cache_control_field'],
    ['cache_control con ttl no es el campo', 'cache_control: ttl unknown field', undefined],
    ['cache_control en tool_result no es el campo', 'tool_result cache_control: unknown field', undefined],
    ['una firma de pensamiento inválida', 'Invalid `signature` in `thinking` block', 'thinking_signature'],
    ['un bloque de pensamiento modificado', 'thinking block cannot be modified', 'thinking_signature'],
    ['la firma requerida', 'thinking.signature: Field required', 'thinking_signature'],
    ['el tipo de pensamiento no soportado', 'thinking.type: "adaptive" is not supported for this model', 'thinking_type:adaptive'],
    ['el pensamiento adaptativo no soportado', 'Adaptive thinking is not supported', 'thinking_type:adaptive'],
    ['el esfuerzo no soportado', 'the effort parameter is not supported', 'effort_unsupported'],
    ['output_config sin soporte', 'output_config: extra inputs are not permitted', 'effort_unsupported'],
    ['demasiada multimedia', 'Too much media in the request', 'media_budget'],
    ['una imagen por posición', 'messages.2.content.0.image.source: bad', 'image_block'],
    ['un pdf por posición', 'messages.2.content.1.pdf: bad', 'document_block'],
    ['una imagen por texto', 'Could not process image', 'image_block'],
    ['un pdf por texto', 'The PDF specified was not valid', 'document_block'],
    ['el prompt largo en un 400', 'prompt is too long: 250000 tokens', 'prompt_too_long'],
    ['max_tokens sobre el contexto', 'input length and `max_tokens` exceed context limit', 'max_tokens_context_overflow'],
    ['nada reconocible', 'something else', undefined],
  ]
  for (const [name, message, kind] of cases) test(name, () => expect(rejectionKind(400, message)).toBe(kind))

  test('una beta enviada que el error nombra', () => {
    expect(rejectionKind(400, 'anthropic-beta header value context-1m is invalid', [' foo ', 'context-1m'])).toBe('beta_header:context-1m')
    expect(rejectionKind(400, 'context-1m is invalid', ['context-1m'])).toBeUndefined()
  })
})

test('otro estado no se clasifica', () => expect(rejectionKind(500, 'prompt is too long')).toBeUndefined())
test('el mensaje del rechazo lleva su prefijo', () => expect(capabilityRejectedMessage('media_budget')).toBe('capability_rejected: media_budget'))
