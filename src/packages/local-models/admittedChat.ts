/**
 * `/api/chat` de Ollama, alcanzable sólo con una admisión (ADR-007 1.14.0,
 * M8): recibe el `ExecutionGrant` y la `ExecutionUnit` del ticket, habla con
 * el `endpoint` de esa unidad y pide el modelo que el grant concede. Fuera de
 * este módulo nadie hace inferencia contra el runtime.
 */
import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'

import type { ChatReply } from './ollamaApi.js'

/** El cuerpo de `/api/chat` sin `model`: el modelo lo fija el grant, no el llamador. */
export type AdmittedChatBody = Readonly<Record<string, unknown>>

/** Un turno de chat contra la unidad del ticket; un estado HTTP de fallo lanza `OllamaRequestError`. */
export async function admittedChat(ticket: AdmissionTicket, body: AdmittedChatBody): Promise<ChatReply> {
  void ticket; void body
  throw new Error('admittedChat: por implementar')
}
