/**
 * `/api/chat` de Ollama, alcanzable sólo con una admisión (ADR-007 1.14.0,
 * M8): recibe el `ExecutionGrant` y la `ModelExecutionUnit` del ticket, habla con
 * el `endpoint` de esa unidad y pide el modelo que el grant concede. Fuera de
 * este módulo nadie hace inferencia contra el runtime.
 */
import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'

import { OllamaRequestError, type ChatReply, type ChatToolCall } from './ollamaApi.js'

/** El cuerpo de `/api/chat` sin `model`: el modelo lo fija el grant, no el llamador. */
export type AdmittedChatBody = Readonly<Record<string, unknown>>

const CHAT_PATH = '/api/chat'
const JSON_HEADERS = { 'content-type': 'application/json' }

type JsonObject = Record<string, unknown>

export interface AdmittedChatOptions {
  /**
   * Plazo de la petición entera, en milisegundos. Sin él no hay ninguno: el
   * `fetch` de Bun cortaría a los 300 s por su cuenta, y una generación en CPU
   * los supera (H-THYROX-417). El plazo lo declara quien pide la inferencia.
   */
  readonly deadlineMs?: number
}

/** Un turno de chat contra la unidad del ticket; un estado HTTP de fallo lanza `OllamaRequestError`. */
export async function admittedChat(ticket: AdmissionTicket, body: AdmittedChatBody, options: AdmittedChatOptions = {}): Promise<ChatReply> {
  const init: RequestInit & { timeout: false } = {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ ...body, model: ticket.grant.artifact.modelId }),
    timeout: false,
    ...(options.deadlineMs === undefined ? {} : { signal: AbortSignal.timeout(options.deadlineMs) }),
  }
  const response = await fetch(`${ticket.unit.endpoint}${CHAT_PATH}`, init)
  const text = await response.text()
  if (!response.ok) throw new OllamaRequestError(CHAT_PATH, response.status, text)
  return chatReplyOf(JSON.parse(text) as JsonObject)
}

function chatReplyOf(document: JsonObject): ChatReply {
  const message = (document.message ?? {}) as JsonObject
  const calls = (message.tool_calls ?? []) as { function: ChatToolCall }[]
  return {
    content: String(message.content ?? ''),
    toolCalls: calls.map(call => ({ name: call.function.name, arguments: call.function.arguments ?? {} })),
    evalCount: Number(document.eval_count ?? 0),
    evalDurationNs: Number(document.eval_duration ?? 0),
  }
}
