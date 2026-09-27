/**
 * Servidor proxy local — el camino de inferencia de la pasarela del
 * ejecutable 2.1.283 (chunk-wg7ts4cy.js): `Jue` (el `fetch` de `Bun.serve`),
 * `Bv` (el reenvío con conmutación entre upstreams), `Mt` (el cuerpo de
 * error), `AD`/`Yne` (las cabeceras de seguridad) y `fj`/`Oh` (qué rutas son
 * de inferencia). Extracto reflujado con `bin/binary reflow` en
 * `.claude/workbench/omniroute-analysis-20260927T160306/outputs/reflow/`.
 *
 * A ese camino se suman el control de acceso de CLIProxyAPI
 * (`sdk/access/manager.go`, `./access.ts`) y, por upstream, el selector de
 * credenciales (`sdk/cliproxy/auth/selector.go`, `./credentialSelectors.ts`).
 * El selector ve las cabeceras y el cuerpo del cliente tal como llegó —con
 * su protocolo, el alcance que da su clave de acceso y la identidad que
 * deriva `Enrich`; la afinidad por sesión (`./session/affinitySelector.ts`)
 * saca de ahí la sesión o reconoce la conversación por su historia— y
 * recibe el desenlace de cada intento por `onResult`.
 *
 * CLIProxyAPI y la pasarela del ejecutable son referencias, no
 * dependencias: todo lo que aquí corre lo implementa thyrox. El servidor
 * decide a quién, con qué modelo y con qué credencial; el reenvío HTTP al
 * upstream es `createHttpForwarder` (`./upstreamForwarder.ts`), y
 * `startProxyServer` los une. `forward` es un parámetro para poder probar
 * el enrutamiento sin red, no un hueco que llene un tercero.
 *
 * Divergencias declaradas, con su razón:
 * - Lo que en `Jue` es de la pasarela empresarial —OIDC, sesiones por
 *   cookie, Postgres, límites de gasto por usuario, telemetría, políticas
 *   administradas, la prueba de carga— no se porta: el proxy local no tiene
 *   usuarios ni almacén. Los límites de gasto ya existen sueltos
 *   (`./spendLimits.ts`) para cuando haya a quién aplicárselos.
 * - `/v1/models` (`qv`) vive en `./modelsList.ts`; `/v1/chat/completions`,
 *   que la pasarela no sirve, en `./chatCompletions.ts`.
 * - `Mv` (upstream `raw`) está en `./upstreamForwarder.ts`; `jv` (cliente
 *   de proveedor por SDK, con su renovación de credencial ante 401/403)
 *   queda pendiente hasta que haya un upstream de nube que servir.
 * - La excepción de `Bv` que no conmuta un 429 de un upstream `raw` con
 *   identidad de usuario reenviada no aplica: no hay identidad de usuario.
 */
import { randomUUID } from 'node:crypto'
import { type AccessManager, httpStatusOf } from './access.ts'
import type { CredentialSelector, ProxyCredential } from './credentialSelectors.ts'
import { CHAT_COMPLETIONS_PATH, serveChatCompletion } from './chatCompletions.ts'
import { modelsResponse } from './modelsList.ts'
import { enrich } from './session/enrich.ts'
import { blamesRequest, type ProviderTraits } from './resilience/errorClassifier.ts'
import { createRecoverableStream } from './resilience/streamRecovery.ts'
import { callerScope } from './session/identity.ts'
import { METADATA_KEYS } from './session/info.ts'
import { type GatewayRoutingConfig, type GatewayUpstream, resolveUpstreamModel } from './upstreamRouting.ts'

/** `fj`: las rutas de inferencia. */
export const INFERENCE_PATHS = ['/v1/messages', '/v1/messages/count_tokens'] as const
/** `Yne`: las cabeceras de seguridad de toda respuesta. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
}
/** `Xne`, `Qne` y `eie`: el id de petición del cliente, el propio y su forma válida. */
export const CLIENT_REQUEST_ID_HEADER = 'x-client-request-id'
export const REQUEST_ID_HEADER = 'x-request-id'
const REQUEST_ID_FORM = /^[A-Za-z0-9._-]{1,64}$/
/** Las cabeceras internas que `Jue` retira antes de responder. */
const INTERNAL_HEADERS = ['x-gateway-upstream', 'x-gateway-model', 'x-gateway-upstream-model', 'x-gateway-upstream-kind', 'x-cri-upstream-kind']

export type ForwardRequest = {
  upstream: GatewayUpstream
  upstreamModel: string
  credential: ProxyCredential
  path: string
  /** La query de la petición del cliente, con su `?` (`Sh`), o vacía. */
  search: string
  body: Record<string, unknown>
  headers: Headers
  signal: AbortSignal
}

export type ProxyServerConfig = {
  access: AccessManager
  routing: GatewayRoutingConfig
  credentials: Record<string, ProxyCredential[] | undefined>
  selector: CredentialSelector
  forward: (request: ForwardRequest) => Promise<Response>
  /** Los rasgos de cada proveedor que el clasificador de errores necesita. */
  providerTraits?: (provider: string) => ProviderTraits | undefined
  /**
   * Reabrir un SSE que se corta antes de que el cliente reciba un byte
   * (`./resilience/streamRecovery.ts`). Apagada por defecto: retener la
   * ventana de apertura suma hasta `HOLDBACK_MS` al primer token.
   */
  streamRecovery?: { enabled: boolean; maxEarlyRetries?: number }
}

/** `Mt`: el cuerpo de error del formato Anthropic. */
export function errorResponse(status: number, type: string, message: string, requestId?: string): Response {
  return Response.json(
    { type: 'error', ...(requestId && { request_id: requestId }), error: { type, message } },
    { status },
  )
}


/** Estados que hacen pasar al siguiente upstream (`Bv`). */
function fallsOver(status: number): boolean {
  return status >= 500 || status === 429 || status === 401 || status === 403 || status === 404
}

/** Lo que la selección de credencial lee del cliente: su alcance y su cuerpo tal como llegó. */
type SelectionSource = { callerScope: string; payload: string; sourceFormat: string }

type JsonBody = { body: Record<string, unknown>; text: string }

/** El cuerpo de la petición como objeto JSON con su texto, o la respuesta 400 que lo rechaza. */
async function readJsonObject(request: Request, requestId: string): Promise<JsonBody | Response> {
  let parsed: unknown
  const text = await request.text()
  try {
    parsed = JSON.parse(text)
  } catch {
    return errorResponse(400, 'invalid_request_error', 'invalid JSON', requestId)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return errorResponse(400, 'invalid_request_error', 'request body must be a JSON object', requestId)
  }
  return { body: parsed as Record<string, unknown>, text }
}

/** El `model` del cuerpo, o la respuesta 400 que lo rechaza. */
function requireModel(body: Record<string, unknown>, requestId: string): string | Response {
  if (!('model' in body) || body.model === '') return errorResponse(400, 'invalid_request_error', 'model is required', requestId)
  if (typeof body.model !== 'string') return errorResponse(400, 'invalid_request_error', 'model must be a string', requestId)
  return body.model
}

async function forwardAcrossUpstreams(config: ProxyServerConfig, request: Request, path: string, requestId: string, scope: string): Promise<Response> {
  const read = await readJsonObject(request, requestId)
  if (read instanceof Response) return read
  return forwardBody(config, request, path, read.body, requestId, { callerScope: scope, payload: read.text, sourceFormat: 'claude' })
}

/** `Bv`: el cuerpo ya validado, por cada upstream hasta que uno responda. */
async function forwardBody(
  config: ProxyServerConfig,
  request: Request,
  path: string,
  body: Record<string, unknown>,
  requestId: string,
  source: SelectionSource,
): Promise<Response> {
  const model = requireModel(body, requestId)
  if (model instanceof Response) return model
  // `Enrich`: la identidad derivada de la conversación, antes de elegir credencial.
  const enriched = enrich({
    payload: source.payload,
    headers: request.headers,
    sourceFormat: source.sourceFormat,
    optionsMetadata: source.callerScope ? { [METADATA_KEYS.callerScope]: source.callerScope } : {},
  })

  const reasons: string[] = []
  let attempted = false
  // Los fallos que se conservan para devolver el más informativo, en el orden de `Bv`.
  let notImplemented: Response | undefined
  let rateLimited: Response | undefined
  let unauthorized: Response | undefined
  let notFound: Response | undefined
  const discard = (r: Response | undefined) => void r?.body?.cancel().catch(() => {})

  for (const upstream of config.routing.upstreams) {
    if (request.signal.aborted) break
    const resolved = resolveUpstreamModel(model, upstream, config.routing.models, config.routing.auto_include_builtin_models)
    if (!resolved.ok) {
      reasons.push(resolved.error)
      continue
    }
    attempted = true
    // Por upstream, una metadata propia: la afinidad escribe en ella su espacio de nombres.
    const selection = { headers: request.headers, payload: source.payload, sourceFormat: source.sourceFormat, metadata: { ...enriched.optionsMetadata } }
    const report = (success: boolean, skipCooldown = false) =>
      config.selector.onResult?.({ authId: credential.id, provider: upstream.provider, model: resolved.model, success, skipCooldown, options: selection })
    let credential: ProxyCredential
    try {
      credential = config.selector.pick(upstream.provider, resolved.model, config.credentials[upstream.name] ?? [], new Date(), selection)
    } catch (error) {
      reasons.push(`${upstream.name}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    try {
      const forwarded: ForwardRequest = {
        upstream,
        upstreamModel: resolved.model,
        credential,
        path,
        search: new URL(request.url).search,
        body: resolved.model === model ? body : { ...body, model: resolved.model },
        headers: request.headers,
        signal: request.signal,
      }
      const response = await config.forward(forwarded)
      // Un 4xx puede culpar a la petición y no a la credencial; lo decide el
      // clasificador sobre una copia del cuerpo, que el cliente recibe entero.
      const blamed = response.status >= 400 && response.status < 500
        && blamesRequest(response.status, await response.clone().text(), upstream.provider, { traitsOf: config.providerTraits })
      report(response.status < 400, blamed)
      if (fallsOver(response.status)) {
        reasons.push(`${response.status} ${response.statusText}`)
        if (response.status === 501) { discard(notImplemented); notImplemented = response }
        else if (response.status === 429) { discard(rateLimited); rateLimited = response }
        else if (response.status === 401 || response.status === 403) { discard(unauthorized); unauthorized = response }
        else if (response.status === 404) { discard(notFound); notFound = response }
        else discard(response)
        continue
      }
      for (const kept of [notImplemented, rateLimited, unauthorized, notFound]) discard(kept)
      return recoverable(config, forwarded, response)
    } catch (error) {
      // Un cierre del cliente no es culpa de la credencial.
      report(false, request.signal.aborted)
      reasons.push(error instanceof Error ? error.message : String(error))
    }
  }

  if (request.signal.aborted) {
    for (const kept of [notImplemented, rateLimited, unauthorized, notFound]) discard(kept)
    return errorResponse(499, 'api_error', 'client closed request', requestId)
  }
  if (!attempted) return errorResponse(400, 'invalid_request_error', reasons.join('; '), requestId)
  if (rateLimited) { for (const r of [notImplemented, unauthorized, notFound]) discard(r); return rateLimited }
  if (unauthorized) { for (const r of [notImplemented, notFound]) discard(r); return unauthorized }
  if (notFound) { discard(notImplemented); return notFound }
  if (notImplemented) return notImplemented
  return errorResponse(502, 'api_error', `all upstreams failed (${config.routing.upstreams.length} attempted)`, requestId)
}

/**
 * La respuesta con su SSE envuelto para reabrirse ante un corte temprano,
 * contra el mismo upstream y la misma credencial. Una reapertura que no da
 * 2xx cuenta como fallida y su cuerpo se descarta.
 */
function recoverable(config: ProxyServerConfig, forwarded: ForwardRequest, response: Response): Response {
  const options = config.streamRecovery
  const isSse = response.headers.get('content-type')?.includes('text/event-stream') ?? false
  if (!options?.enabled || !isSse || !response.body) return response
  const reopen = async () => {
    const next = await config.forward(forwarded)
    if (next.ok && next.body) return next.body
    void next.body?.cancel().catch(() => {})
    return null
  }
  const body = createRecoverableStream(response.body, reopen, { finalize: () => {}, maxEarlyRetries: options.maxEarlyRetries })
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers })
}

/** El `fetch` del servidor: id de petición, cabeceras de seguridad, acceso y reenvío. */
export function createProxyHandler(config: ProxyServerConfig): (request: Request) => Promise<Response> {
  return async request => {
    const offered = request.headers.get(CLIENT_REQUEST_ID_HEADER)
    const requestId = offered && REQUEST_ID_FORM.test(offered) ? offered : randomUUID()
    let response: Response
    try {
      response = await route(config, request, requestId)
    } catch {
      response = errorResponse(500, 'api_error', 'internal server error', requestId)
    }
    // Una respuesta de `fetch` tiene cabeceras inmutables: se copia para poder tocarlas.
    const headers = new Headers(response.headers)
    for (const name of INTERNAL_HEADERS) headers.delete(name)
    headers.set(REQUEST_ID_HEADER, requestId)
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) if (!headers.has(name)) headers.set(name, value)
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }
}

async function route(config: ProxyServerConfig, request: Request, requestId: string): Promise<Response> {
  const { pathname } = new URL(request.url)
  if (request.method === 'GET' && pathname === '/healthz') return new Response('ok', { status: 200 })
  const access = config.access.authenticate(request)
  if (access.error) return errorResponse(httpStatusOf(access.error), 'authentication_error', access.error.message, requestId)
  // `requestCallerScope`: el espacio de afinidad de este cliente sale de su clave de acceso, nunca guardada en claro.
  const scope = callerScope(access.result?.principal ?? '')
  if (request.method === 'POST' && (INFERENCE_PATHS as readonly string[]).includes(pathname)) {
    return forwardAcrossUpstreams(config, request, pathname, requestId, scope)
  }
  if (request.method === 'GET' && pathname === '/v1/models') {
    return modelsResponse(config.routing.models, config.routing.upstreams, config.routing.auto_include_builtin_models)
  }
  if (request.method === 'POST' && pathname === CHAT_COMPLETIONS_PATH) {
    const read = await readJsonObject(request, requestId)
    if (read instanceof Response) return read
    const model = requireModel(read.body, requestId)
    if (model instanceof Response) return model
    const source = { callerScope: scope, payload: read.text, sourceFormat: 'openai' }
    return serveChatCompletion(model, read.body, messagesBody => forwardBody(config, request, '/v1/messages', messagesBody, requestId, source))
  }
  return new Response('not found', { status: 404 })
}
