/**
 * `/v1/antigravity` del proxy local: el punto al que el servidor MITM
 * reenvía el sobre cloudcode del IDE Antigravity. La petición se traduce a
 * OpenAI Chat Completions y sigue el camino de `/v1/chat/completions`; la
 * respuesta vuelve en la forma de cloudcode —un evento SSE por trozo con
 * stream, un solo objeto sin él—. Un error del upstream conserva su estado.
 *
 * Porte de `omniroute: src/app/api/v1/antigravity/route.ts` (MIT), que lo
 * resuelve con la cadena de traductores de `handleChat`.
 */
import { parseSseEvents } from '../sse.ts'
import { serveChatCompletion } from './chatCompletions.ts'
import { antigravityToOpenAIRequest } from './translators/requestAntigravityToOpenAI.ts'
import {
  openaiCompletionToAntigravity,
  openaiToAntigravityResponse,
  type OpenAIToAntigravityState,
} from './translators/responseOpenAIToAntigravity.ts'

export const ANTIGRAVITY_PATH = '/v1/antigravity'

type JsonRecord = Record<string, unknown>

export async function serveAntigravity(
  model: string,
  body: JsonRecord,
  forward: (messagesBody: JsonRecord) => Promise<Response>,
): Promise<Response> {
  const stream = body.stream === true
  const chat = await serveChatCompletion(model, antigravityToOpenAIRequest(model, body, stream), forward)
  if (!chat.ok) return chat
  if (!stream) return Response.json(openaiCompletionToAntigravity((await chat.json()) as JsonRecord), { status: chat.status })
  return new Response(cloudcodeEvents(chat), {
    status: chat.status,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}

/** Los trozos OpenAI de `chat`, re-emitidos como eventos de cloudcode. */
function cloudcodeEvents(chat: Response): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const state: OpenAIToAntigravityState = {}
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of parseSseEvents(chat)) {
        const event = openaiToAntigravityResponse(chunk, state)
        if (event) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      controller.close()
    },
  })
}
