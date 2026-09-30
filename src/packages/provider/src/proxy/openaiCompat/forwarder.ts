/**
 * El upstream compatible con OpenAI del proxy local: atiende `/v1/messages`
 * traduciendo la petición Messages a `/chat/completions` con los traductores
 * de `../translators/` y la respuesta de vuelta a Messages, con y sin
 * stream. El `tool_result` de la petición siguiente viaja como mensaje
 * `role: tool` con el mismo id; eso lo hace `messagesToOpenAIRequest`.
 *
 * Reparte como `../claudeCli/forwarder.ts`: lo que no es un upstream suyo
 * sigue a `next`. Todo fallo del upstream —conexión, estado HTTP, JSON o SSE
 * ilegible, respuesta sin `choices`— vuelve como error Messages que nombra el
 * upstream y la URL, nunca como una respuesta vacía.
 *
 * Divergencias declaradas:
 * - `count_tokens` no existe en Chat Completions: 501.
 * - Un 5xx del upstream es un 502: el que falla es el upstream, no el proxy.
 * - La clave del upstream es la de su configuración (`Authorization:
 *   Bearer`), no la credencial que elige el selector: un servidor local como
 *   Ollama no la necesita, y el selector sólo recibe una identidad sintética.
 */
import { messagesToOpenAIRequest, openaiMessageToMessagesApiMessage } from '../translators/index.ts'
import { isSafeUpstreamUrl } from '../netGuards.ts'
import { errorResponse, type ForwardRequest } from '../server.ts'
import { sseFromEvents } from '../sdk/sdkForward.ts'
import { messagesEventsFromOpenAISse } from './streamTranslation.ts'

type Forwarder = (request: ForwardRequest) => Promise<Response>
type JsonRecord = Record<string, unknown>

export type OpenAICompatUpstreamConfig = {
  name: string
  /** La base al estilo del SDK de OpenAI, con su `/v1`: se le añade `/chat/completions`. */
  baseUrl: string
  apiKey?: string
  headers?: Record<string, string>
}

export type OpenAICompatForwarderConfig = {
  next: Forwarder
  upstreams: Record<string, OpenAICompatUpstreamConfig | undefined>
  env?: Record<string, string | undefined>
  fetch?: typeof fetch
}

const MESSAGES_PATH = '/v1/messages'
const COMPLETIONS_PATH = '/chat/completions'
const SSE_HEADERS = { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }
const BAD_GATEWAY = 502
const NOT_IMPLEMENTED = 501
const FIRST_SERVER_ERROR = 500
/** El tipo de error Messages de cada 4xx; el resto de 4xx es `invalid_request_error`. */
const CLIENT_ERROR_TYPES: Record<number, string> = {
  401: 'authentication_error',
  403: 'permission_error',
  404: 'not_found_error',
  429: 'rate_limit_error',
}
const DEFAULT_CLIENT_ERROR_TYPE = 'invalid_request_error'

/** Lo que identifica una llamada en los mensajes de error: el upstream y la URL. */
type Target = { upstream: string; url: string }

function describe(target: Target): string {
  return `upstream "${target.upstream}" (${target.url})`
}

export function completionsUrlOf(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}${COMPLETIONS_PATH}`
}

function requestHeadersOf(upstream: OpenAICompatUpstreamConfig): Headers {
  const headers = new Headers({ 'content-type': 'application/json' })
  for (const [name, value] of Object.entries(upstream.headers ?? {})) headers.set(name, value)
  if (upstream.apiKey) headers.set('authorization', `Bearer ${upstream.apiKey}`)
  return headers
}

function isServerError(status: number): boolean {
  return status >= FIRST_SERVER_ERROR
}

/** El error Messages de un estado HTTP de fallo del upstream, con su cuerpo. */
function upstreamStatusError(target: Target, status: number, text: string, requestId?: string): Response {
  const message = `${describe(target)} respondió ${status}: ${text}`
  if (isServerError(status)) return errorResponse(BAD_GATEWAY, 'api_error', message, requestId)
  return errorResponse(status, CLIENT_ERROR_TYPES[status] ?? DEFAULT_CLIENT_ERROR_TYPE, message, requestId)
}

function hasChoices(completion: unknown): boolean {
  const choices = (completion as JsonRecord | null)?.choices
  return Array.isArray(choices) && choices.length > 0
}

async function messageResponseOf(target: Target, upstream: Response, requestId?: string): Promise<Response> {
  const text = await upstream.text()
  let completion: unknown
  try {
    completion = JSON.parse(text)
  } catch {
    return errorResponse(BAD_GATEWAY, 'api_error', `${describe(target)} devolvió un cuerpo que no es JSON: ${text.slice(0, 200)}`, requestId)
  }
  if (!hasChoices(completion)) {
    return errorResponse(BAD_GATEWAY, 'api_error', `${describe(target)} devolvió una respuesta sin choices: ${text.slice(0, 200)}`, requestId)
  }
  return Response.json(openaiMessageToMessagesApiMessage(completion as JsonRecord))
}

function streamResponseOf(target: Target, upstream: Response, requestId?: string): Response {
  const events = messagesEventsFromOpenAISse(upstream.body, describe(target))
  return new Response(sseFromEvents(events, { requestId }), { headers: SSE_HEADERS })
}

export function createOpenAICompatForwarder(config: OpenAICompatForwarderConfig): Forwarder {
  const send = config.fetch ?? fetch

  async function serve(upstream: OpenAICompatUpstreamConfig, request: ForwardRequest): Promise<Response> {
    const target = { upstream: upstream.name, url: completionsUrlOf(upstream.baseUrl) }
    if (request.path !== MESSAGES_PATH) {
      return errorResponse(NOT_IMPLEMENTED, 'not_supported', `${describe(target)} no sirve ${request.path}`, request.requestId)
    }
    if (!isSafeUpstreamUrl(upstream.baseUrl, config.env)) {
      return errorResponse(BAD_GATEWAY, 'api_error', `baseUrl insegura para el ${describe(target)}`, request.requestId)
    }
    const wantsStream = request.body.stream === true
    const body = messagesToOpenAIRequest(request.upstreamModel, request.body, wantsStream)
    let response: Response
    try {
      response = await send(target.url, { method: 'POST', headers: requestHeadersOf(upstream), body: JSON.stringify(body), signal: request.signal })
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error)
      return errorResponse(BAD_GATEWAY, 'api_error', `no se pudo conectar con el ${describe(target)}: ${cause}`, request.requestId)
    }
    if (!response.ok) return upstreamStatusError(target, response.status, await response.text(), request.requestId)
    return wantsStream ? streamResponseOf(target, response, request.requestId) : messageResponseOf(target, response, request.requestId)
  }

  return request => {
    const upstream = config.upstreams[request.upstream.name]
    return upstream ? serve(upstream, request) : config.next(request)
  }
}
