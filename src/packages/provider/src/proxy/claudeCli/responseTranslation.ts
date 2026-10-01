/**
 * De lo que `claude -p` emitió a la respuesta `/v1/messages` del cliente:
 * el mensaje del asistente con los nombres de tool del cliente, y su forma
 * SSE cuando la petición pidió `stream`.
 *
 * Divergencia declarada: el SSE se sintetiza del mensaje completo —un
 * `text_delta` por bloque de texto y un `input_json_delta` por `tool_use`—,
 * no se retransmite token a token. La forma de los eventos es la del API de
 * Mensajes (`message_start` … `message_stop`).
 */
import { clientToolName, type ContentBlock, contentBlocksOf } from './requestTranslation.ts'
import type { AssistantMessage } from './streamJson.ts'

export type SseEvent = Record<string, unknown> & { type: string }

export type Usage = { input_tokens: number; output_tokens: number } & Record<string, unknown>

export type MessagesResponse = {
  id: string
  type: 'message'
  role: 'assistant'
  model: string
  content: ContentBlock[]
  stop_reason: 'end_turn' | 'tool_use'
  stop_sequence: null
  usage: Usage
}

const EMPTY_USAGE: Usage = { input_tokens: 0, output_tokens: 0 }

/** Un bloque `tool_use` del puente con el nombre que el cliente declaró; los demás, tal cual. */
function clientFacingBlock(block: ContentBlock): ContentBlock {
  if (block.type !== 'tool_use' || typeof block.name !== 'string') return block
  const name = clientToolName(block.name)
  return name === undefined ? block : { ...block, name }
}

/** Los bloques de un mensaje de asistente como los ve el cliente. */
export function clientFacingContent(message: AssistantMessage | undefined): ContentBlock[] {
  return contentBlocksOf(message?.content).map(clientFacingBlock)
}

function usageOf(message: AssistantMessage | undefined): Usage {
  const usage = message?.usage
  if (!usage) return EMPTY_USAGE
  return { ...usage, input_tokens: Number(usage.input_tokens ?? 0), output_tokens: Number(usage.output_tokens ?? 0) }
}

export function messagesResponseOf(options: {
  message: AssistantMessage | undefined
  content: ContentBlock[]
  /** El modelo si el mensaje no lo declara: el que se pidió al upstream. */
  fallbackModel: string
  stopReason: MessagesResponse['stop_reason']
  fallbackId: string
}): MessagesResponse {
  return {
    id: options.message?.id ?? options.fallbackId,
    type: 'message',
    role: 'assistant',
    model: options.message?.model ?? options.fallbackModel,
    content: options.content,
    stop_reason: options.stopReason,
    stop_sequence: null,
    usage: usageOf(options.message),
  }
}

function blockEvents(block: ContentBlock, index: number): SseEvent[] {
  if (block.type === 'tool_use') {
    return [
      { type: 'content_block_start', index, content_block: { ...block, input: {} } },
      { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input ?? {}) } },
      { type: 'content_block_stop', index },
    ]
  }
  const text = typeof block.text === 'string' ? block.text : ''
  return [
    { type: 'content_block_start', index, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index },
  ]
}

/** Los eventos SSE del API de Mensajes que reproducen un mensaje completo. */
export function messageSseEvents(message: MessagesResponse): SseEvent[] {
  const opening = { ...message, content: [], stop_reason: null, usage: { ...message.usage, output_tokens: 0 } }
  return [
    { type: 'message_start', message: opening },
    ...message.content.flatMap(blockEvents),
    { type: 'message_delta', delta: { stop_reason: message.stop_reason, stop_sequence: null }, usage: { output_tokens: message.usage.output_tokens } },
    { type: 'message_stop' },
  ]
}
