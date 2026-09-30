/**
 * `/v1/chat/completions` del proxy local: un cliente de OpenAI Chat
 * Completions servido por upstreams que hablan la API de Mensajes.
 *
 * La petición se traduce con `openaiToMessagesRequest` y viaja por el mismo
 * camino de conmutación que `/v1/messages` (`forwardBody` en
 * `./server.ts`, recibido como parámetro para no cerrar un ciclo de
 * importación). La respuesta vuelve traducida:
 * - sin stream, con `messagesApiMessageToOpenAIResponse`;
 * - con stream, pasando cada evento SSE de Mensajes por la máquina
 *   `messagesToOpenAIResponse` y cerrando con `data: [DONE]`, como hace el
 *   manejador de OmniRoute (`open-sse/handlers`), leído como referencia;
 * - un error del upstream, con su estado y la forma `{error:{…}}` de OpenAI.
 *
 * El `_toolNameMap` que la traducción de la petición devuelve no viaja al
 * upstream: se retira del cuerpo y sirve para devolver a cada herramienta
 * su nombre original.
 */
import {
  messagesApiMessageToOpenAIResponse,
  messagesToOpenAIResponse,
  createMessagesToOpenAIState,
  openaiToMessagesRequest,
} from './translators/index.ts'

export const CHAT_COMPLETIONS_PATH = '/v1/chat/completions'

type JsonRecord = Record<string, unknown>

export async function serveChatCompletion(
  model: string,
  body: JsonRecord,
  forward: (messagesBody: JsonRecord) => Promise<Response>,
): Promise<Response> {
  const stream = body.stream === true
  const translated = openaiToMessagesRequest(model, body, stream)
  const toolNameMap = translated._toolNameMap as Map<string, string> | undefined
  delete translated._toolNameMap

  const upstream = await forward(translated)
  if (!upstream.ok) return openAIError(upstream)
  if (stream) {
    return new Response(translateStream(upstream.body, toolNameMap), {
      status: upstream.status,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    })
  }
  const message = (await upstream.json()) as JsonRecord
  return Response.json(messagesApiMessageToOpenAIResponse(message, toolNameMap), { status: upstream.status })
}

/** Un error del upstream en la forma de OpenAI, conservando su estado. */
async function openAIError(upstream: Response): Promise<Response> {
  let type = 'api_error'
  let message = upstream.statusText || 'upstream error'
  try {
    const parsed = JSON.parse(await upstream.text()) as { error?: { type?: unknown; message?: unknown } }
    if (typeof parsed.error?.type === 'string') type = parsed.error.type
    if (typeof parsed.error?.message === 'string') message = parsed.error.message
  } catch {
    // Un cuerpo que no es JSON deja el mensaje del estado.
  }
  const headers = new Headers({ 'content-type': 'application/json' })
  const retryAfter = upstream.headers.get('retry-after')
  if (retryAfter !== null) headers.set('retry-after', retryAfter)
  return new Response(JSON.stringify({ error: { message, type, code: null } }), { status: upstream.status, headers })
}

/** Los eventos SSE de Mensajes, re-emitidos como trozos de OpenAI. */
function translateStream(source: ReadableStream<Uint8Array> | null, toolNameMap?: Map<string, string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const state = createMessagesToOpenAIState(toolNameMap)
  let pending = ''
  const emit = (controller: ReadableStreamDefaultController<Uint8Array>, event: string) => {
    const data = event
      .split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n')
    if (!data) return
    let chunk: JsonRecord
    try {
      chunk = JSON.parse(data) as JsonRecord
    } catch {
      return
    }
    for (const piece of messagesToOpenAIResponse(chunk, state) ?? []) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(piece)}\n\n`))
    }
  }
  return new ReadableStream({
    async start(controller) {
      if (source) {
        const reader = source.getReader()
        for (let read = await reader.read(); !read.done; read = await reader.read()) {
          pending += decoder.decode(read.value, { stream: true }).replace(/\r\n/g, '\n')
          let boundary = pending.indexOf('\n\n')
          while (boundary !== -1) {
            emit(controller, pending.slice(0, boundary))
            pending = pending.slice(boundary + 2)
            boundary = pending.indexOf('\n\n')
          }
        }
      }
      emit(controller, pending + decoder.decode())
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))

      controller.close()
    },
  })
}
