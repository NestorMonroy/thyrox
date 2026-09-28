/**
 * El reenvío de una petición del proxy por el SDK del proveedor de nube
 * (Bedrock, Vertex, Foundry) — porte de `jv`, `Oj`, `kj` y `Pj` de la
 * pasarela del ejecutable 2.1.283 (`chunk-wg7ts4cy.js`, extracto en
 * `.claude/workbench/cloud-sdk-forward-20260927T235948/outputs/gateway-sdk-upstreams.js`).
 *
 * Un upstream de nube no habla HTTP crudo con la API de Anthropic: su SDK
 * firma la petición (SigV4, OAuth de Google, Entra ID) y traduce la ruta. Por
 * eso aquí no se reenvían bytes: se llama a `messages.create` o
 * `messages.countTokens` y la respuesta del SDK se vuelve a escribir en la
 * forma del cable — JSON, o SSE evento a evento.
 *
 * Un error del SDK no se reenvía con su texto: el cliente recibe el tipo que
 * corresponde a su estado y un mensaje propio; sólo un 400/413 con un tipo
 * conocido conserva el mensaje del upstream, recortado, y si no lo trae se
 * dice qué capacidad se rechazó (`./rejectionKind.ts`).
 */
import type { APIError } from '@anthropic-ai/sdk'
import { errorResponse } from '../server.ts'
import { capabilityRejectedMessage, rejectionKind } from './rejectionKind.ts'

export type SdkProvider = 'bedrock' | 'vertex' | 'foundry'

type RequestOptions = { signal?: AbortSignal; headers?: Record<string, string> }

/** La superficie del SDK que el reenvío usa: la de `Anthropic` y sus variantes de nube. */
export type SdkMessagesClient = {
  messages: {
    create(body: Record<string, unknown>, options: RequestOptions): Promise<unknown>
    countTokens(body: Record<string, unknown>, options: RequestOptions): Promise<unknown>
  }
}

export type SdkForwardRequest = {
  path: string
  body: Record<string, unknown>
  provider: SdkProvider
  client: SdkMessagesClient
  /** El valor de `anthropic-beta` de la petición. */
  betaHeader?: string
  headers?: Record<string, string>
  signal?: AbortSignal
  requestId?: string
  /** El modelo que el cliente pidió, que reemplaza al del upstream en la respuesta. */
  wireModel?: string
}

/** `uj`. */
const SSE_HEADERS = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }
/** `dj`: un silencio más largo que esto se rellena con un `ping`. */
const SSE_KEEPALIVE_MS = 15_000
/** `pj`. */
const PING_EVENT = 'event: ping\ndata: {"type": "ping"}\n\n'
const MAX_UPSTREAM_MESSAGE = 1000

/** `Ej`. */
const ERROR_TYPES: Record<number, string> = {
  400: 'invalid_request_error', 401: 'authentication_error', 403: 'permission_error', 404: 'not_found_error',
  413: 'request_too_large', 429: 'rate_limit_error', 501: 'not_supported', 529: 'overloaded_error',
}
/** `Fc`. */
const ERROR_MESSAGES: Record<number, string> = {
  400: 'upstream rejected the request',
  401: 'upstream authentication failed — check the gateway operator',
  403: 'upstream denied the request — check the gateway operator',
  404: 'upstream resource not found',
  413: 'request too large for this upstream',
  429: 'upstream rate limit exceeded',
  500: 'upstream error',
  501: 'upstream does not support this endpoint',
  529: 'upstream overloaded',
}
/** `zv`: los tipos de error del upstream cuyo mensaje sí llega al cliente. */
const KNOWN_ERROR_TYPES = new Set([
  'invalid_request_error', 'authentication_error', 'permission_error', 'not_found_error', 'request_too_large',
  'rate_limit_error', 'not_supported', 'overloaded_error', 'api_error', 'billing_error', 'policy_blocked',
])

/**
 * `Ph`: lo que el upstream dijo de un error, por respuesta, para quien decida
 * si invalidar la credencial: el tipo de error de AWS y el mensaje original.
 */
export const upstreamErrorDetails = new WeakMap<Response, { errorType?: string; message: string }>()

/** `yl`. */
function errorTypeOf(status: number): string {
  return ERROR_TYPES[status] ?? 'api_error'
}

/** `re`: recorta sin partir un par sustituto de UTF-16. */
function truncateUtf16(text: string, limit: number): string {
  if (limit <= 0) return ''
  if (text.length <= limit) return text
  const head = text.slice(0, limit)
  const last = head.charCodeAt(limit - 1)
  return (last >= 0xd800 && last <= 0xdbff ? head.slice(0, -1) : head).toWellFormed()
}

/** `Pj`, con `kh`: el mensaje que el cliente recibe por un error del upstream. */
/**
 * Si el error es un `APIError` del SDK, reconocido por su forma y no por su
 * clase: cada SDK de nube instala su propia copia de `@anthropic-ai/sdk`, y
 * su `APIError` es otra clase aunque la versión coincida. La pasarela del
 * ejecutable no lo necesita porque empaqueta una sola copia.
 */
function isApiError(error: unknown): error is APIError {
  return error instanceof Error && 'status' in error && 'headers' in error && 'error' in error
}

function upstreamErrorMessage(status: number, error: APIError, betaHeader: string | undefined): string {
  if (status !== 400 && status !== 413) return ERROR_MESSAGES[status] ?? 'upstream error'
  const body = error.error as { type?: unknown; error?: { type?: unknown; message?: unknown } } | undefined
  const inner = body?.error
  if (body?.type === 'error' && typeof inner?.message === 'string' && inner.message !== ''
    && typeof inner.type === 'string' && KNOWN_ERROR_TYPES.has(inner.type)) {
    return truncateUtf16(inner.message, MAX_UPSTREAM_MESSAGE)
  }
  const kind = rejectionKind(status, error.message, betaHeader?.split(','))
  return kind !== undefined ? capabilityRejectedMessage(kind) : ERROR_MESSAGES[status] ?? 'upstream error'
}

/**
 * `kj`: Bedrock no lee la cabecera `anthropic-beta`; las betas viajan en el
 * cuerpo, en `anthropic_beta`, sin repetir. En los demás proveedores quedan
 * en la cabecera. La referencia normaliza cada beta por su registro (`Yut`),
 * que para una cabecera conocida devuelve la misma cadena.
 */
export function bedrockBetaBody(
  body: Record<string, unknown>,
  betaHeader: string | undefined,
  provider: SdkProvider,
): { body: Record<string, unknown>; betaHeader: string | undefined } {
  if (provider !== 'bedrock' || !betaHeader) return { body, betaHeader: betaHeader || undefined }
  const betas = betaHeader.split(',').map(beta => beta.trim()).filter(Boolean)
  if (betas.length === 0) return { body, betaHeader: undefined }
  const current = Array.isArray(body.anthropic_beta) ? body.anthropic_beta : []
  return { body: { ...body, anthropic_beta: [...new Set([...current, ...betas])] }, betaHeader: undefined }
}

/**
 * `Oj`: los eventos del stream del SDK como SSE. El modelo del cable
 * reemplaza al del upstream en `message_start`; un error a mitad del stream
 * se vuelve un evento `error` y cierra; un silencio largo se rellena con
 * `ping` para que ningún intermediario corte la conexión.
 */
export function sseFromEvents(
  events: AsyncIterable<unknown>,
  { requestId, wireModel, keepaliveIntervalMs = SSE_KEEPALIVE_MS }: { requestId?: string; wireModel?: string; keepaliveIntervalMs?: number } = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const ping = encoder.encode(PING_EVENT)
  const iterator = events[Symbol.asyncIterator]()
  let lastWrite = Date.now()
  let finished = false
  let keepalive: ReturnType<typeof setInterval> | undefined
  return new ReadableStream<Uint8Array>({
    start(controller) {
      keepalive = setInterval(() => {
        if (!finished && Date.now() - lastWrite >= keepaliveIntervalMs && (controller.desiredSize ?? 0) > 0) {
          controller.enqueue(ping)
          lastWrite = Date.now()
        }
      }, Math.ceil(keepaliveIntervalMs / 3))
      keepalive.unref?.()
    },
    async pull(controller) {
      try {
        const { value, done } = await iterator.next()
        if (finished) return
        if (done) {
          finished = true
          clearInterval(keepalive)
          controller.close()
          return
        }
        const event = value as { type: string; message?: unknown }
        const rewritten = wireModel !== undefined && event.type === 'message_start' && typeof event.message === 'object' && event.message !== null
          ? { ...event, message: { ...event.message, model: wireModel } }
          : event
        controller.enqueue(encoder.encode(`event: ${rewritten.type}\ndata: ${JSON.stringify(rewritten)}\n\n`))
        lastWrite = Date.now()
      } catch (error) {
        if (finished) return
        const status = isApiError(error) ? error.status ?? 500 : 500
        const payload = { type: 'error', ...(requestId && { request_id: requestId }), error: { type: errorTypeOf(status), message: ERROR_MESSAGES[status] ?? 'upstream error' } }
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(payload)}\n\n`))
        finished = true
        clearInterval(keepalive)
        controller.close()
      }
    },
    async cancel() {
      finished = true
      clearInterval(keepalive)
      await iterator.return?.(undefined).catch(() => {})
    },
  })
}

/**
 * `jv`: la petición por el SDK. Devuelve `undefined` para una ruta que no es
 * de mensajes: sólo `/v1/messages` y `/v1/messages/count_tokens` llegan aquí.
 */
export async function forwardThroughSdk(request: SdkForwardRequest): Promise<Response | undefined> {
  const { path, provider, client, signal, requestId, wireModel } = request
  const prepared = bedrockBetaBody(request.body, request.betaHeader, provider)
  const headers = { ...request.headers, ...(prepared.betaHeader && { 'anthropic-beta': prepared.betaHeader }) }
  const options: RequestOptions = { signal, ...(Object.keys(headers).length > 0 && { headers }) }
  if (path === '/v1/messages/count_tokens' && provider === 'bedrock') {
    return errorResponse(501, 'not_supported', 'count_tokens is not supported on Bedrock upstreams', requestId)
  }
  try {
    switch (path) {
      case '/v1/messages': {
        if (prepared.body.stream) {
          const stream = await client.messages.create({ ...prepared.body, stream: true }, options)
          return new Response(sseFromEvents(stream as AsyncIterable<unknown>, { requestId, wireModel }), { headers: SSE_HEADERS })
        }
        const message = await client.messages.create(prepared.body, options)
        return Response.json(wireModel !== undefined ? { ...(message as object), model: wireModel } : message)
      }
      case '/v1/messages/count_tokens':
        return Response.json(await client.messages.countTokens(prepared.body, options))
    }
    return undefined
  } catch (error) {
    if (!isApiError(error)) throw error
    const status = error.status ?? 500
    const response = errorResponse(status, errorTypeOf(status), upstreamErrorMessage(status, error, request.betaHeader), requestId)
    upstreamErrorDetails.set(response, { errorType: error.headers?.get('x-amzn-errortype') ?? undefined, message: error.message })
    return response
  }
}
