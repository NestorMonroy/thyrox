/**
 * El upstream compatible con OpenAI que el proxy local usa para un modelo del
 * catálogo (ADR-007 1.14.0, M8): un relé en loopback que, por cada petición,
 * pide una admisión al coordinador de model scheduling del anfitrión y
 * reenvía SÓLO al `endpoint` de la `ModelExecutionUnit` del ticket. No hay otra
 * dirección: el relé no conoce puertos de Ollama ni base URLs declaradas.
 *
 *   petición → admit({ model }) → ticket { grant, unit }
 *     → POST <unit.endpoint>/v1/<ruta> con model = grant.artifact.modelId
 *     → respuesta (también en streaming) → finish(admissionId)
 *
 * `finish` se llama una sola vez por admisión, cuando el cuerpo de la
 * respuesta terminó de entregarse o el cliente lo abandonó; también si el
 * runtime no respondió. Una admisión rehusada o fallida, o un coordinador
 * ausente, responden un error OpenAI que nombra la etapa y la causa, y no
 * reenvían nada.
 *
 * Con `fallbackModels` (TASK-THYROX-0921) un fallo DEL MODELO —admisión
 * rehusada o fallida, runtime inalcanzable o 5xx— avanza al siguiente respaldo
 * y lo comunica a `onFallback`, como el `$a` de la referencia `claude-code-bin/2.1.286`. El salto es
 * de una petición: la siguiente vuelve a pedir el modelo original. Agotada la
 * cadena se entrega el último fallo. Lo que la referencia hace además —
 * reintentar en el sitio un `overloaded` agotado— queda en la política de
 * reintentos del cliente, que ya reintenta 502/503.
 */
import { LOCAL_REASONING_EFFORT } from '@thyrox/model-artifacts/modelQualification.ts'
import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from '@thyrox/model-scheduling/hostCoordinator.ts'

/** Lo que el relé necesita del coordinador; `ModelCoordinatorClient` lo cumple. */
export interface AdmissionSource {
  admit(request: AdmissionRequest): Promise<CoordinatorAdmission>
  finish(admissionId: string): Promise<'finished' | 'absent'>
}

export interface AdmittedUpstreamOptions {
  readonly source: AdmissionSource
  /** Quién pide, para trazar en el coordinador: el proxy de un ítem, `thyrox -p`. */
  readonly client: string
  readonly newRequestId: () => string
  /**
   * El contexto que declaró el consumidor, en tokens. Viaja en cada admisión:
   * sin él, el resolver concede el máximo del modelo y la unidad puede no
   * caber en su memoria (A6 r4).
   */
  readonly contextLength?: number
  /**
   * Los respaldos locales, en orden (`fallbackModels` de la recomendación,
   * TASK-THYROX-0921). Sin ellos, el relé sólo sirve el modelo pedido.
   */
  readonly fallbackModels?: readonly string[]
  /** Recibe cada salto de la cadena, para que quede rastro fuera del relé. */
  readonly onFallback?: (event: ModelFallbackEvent) => void
}

/**
 * Por qué el relé saltó al siguiente modelo: el subconjunto de los motivos de
 * la referencia `claude-code-bin/2.1.286` que el relé puede observar. Un error de la petición (4xx)
 * o un coordinador ausente no son del modelo, y no saltan.
 */
export type ModelFallbackTrigger = 'model_not_found' | 'overloaded' | 'server_error'

/** El rastro de un salto, con la forma del `system/model_fallback` de la referencia. */
export interface ModelFallbackEvent {
  readonly type: 'model_fallback'
  readonly originalModel: string
  readonly fallbackModel: string
  readonly trigger: ModelFallbackTrigger
  readonly chainIndex: number
  readonly contextLength?: number
  readonly reason: string
}

export interface AdmittedUpstream {
  /** La base al estilo del SDK de OpenAI, en loopback: incluye `/v1`. */
  readonly baseUrl: string
  stop(): Promise<void>
}

/** El tipo de error OpenAI con que el relé responde cuando no reenvía. */
export type AdmittedUpstreamErrorType =
  | 'admission_refused'
  | 'admission_failed'
  | 'coordinator_unavailable'
  | 'upstream_unreachable'

export const ADMISSION_REFUSED_STATUS = 503
export const UPSTREAM_UNREACHABLE_STATUS = 502

const LOOPBACK = '127.0.0.1'
const BAD_REQUEST_STATUS = 400
const SERVER_ERROR_STATUS = 500
/** Las cabeceras de la respuesta del runtime que no se copian: el relé re-enmarca el cuerpo. */
const HOP_BY_HOP_HEADERS = ['content-length', 'transfer-encoding', 'connection', 'content-encoding']

type AdmissionRefusal = Exclude<CoordinatorAdmission, { status: 'admitted' }>

export function startAdmittedUpstream(options: AdmittedUpstreamOptions): AdmittedUpstream {
  const server = Bun.serve({
    hostname: LOOPBACK,
    port: 0,
    fetch: request => relayRequest(options, request),
  })
  return {
    baseUrl: `http://${LOOPBACK}:${server.port}/v1`,
    stop: () => server.stop(true),
  }
}

/** Una petición del cliente: modelo pedido → admisión → reenvío al endpoint del ticket. */
async function relayRequest(options: AdmittedUpstreamOptions, request: Request): Promise<Response> {
  const body = await readJsonObject(request)
  if (!hasModel(body)) {
    return openAIError(BAD_REQUEST_STATUS, 'invalid_request_error', 'la petición no declara un `model` de texto')
  }
  const chain = modelChainOf(body.model, options.fallbackModels ?? [])
  const path = new URL(request.url).pathname
  let attempt = await attemptModel(options, body.model, path, body)
  for (let chainIndex = 1; attempt.kind === 'model_failure' && chainIndex < chain.length; chainIndex += 1) {
    const fallbackModel = chain[chainIndex] as string
    await attempt.response.body?.cancel()
    options.onFallback?.(fallbackEventOf(options, body.model, fallbackModel, chainIndex, attempt))
    attempt = await attemptModel(options, fallbackModel, path, body)
  }
  return attempt.response
}

/** El pedido primero y después sus respaldos, sin repetirlo (el `chn` de la referencia). */
function modelChainOf(model: string, fallbackModels: readonly string[]): readonly string[] {
  return [model, ...new Set(fallbackModels.filter(candidate => candidate !== '' && candidate !== model))]
}

/**
 * Lo que dejó un intento: una respuesta que se entrega tal cual (`final`), o
 * un fallo del modelo con su motivo, que la cadena puede saltar. Si no queda
 * respaldo, también ese fallo se entrega tal cual.
 */
type Attempt =
  | { readonly kind: 'final'; readonly response: Response }
  | { readonly kind: 'model_failure'; readonly response: Response; readonly trigger: ModelFallbackTrigger; readonly reason: string }

async function attemptModel(options: AdmittedUpstreamOptions, model: string, path: string,
  body: Record<string, unknown>): Promise<Attempt> {
  let admission: CoordinatorAdmission
  try {
    admission = await options.source.admit(admissionRequestOf(options, model))
  } catch (error) {
    const response = openAIError(ADMISSION_REFUSED_STATUS, 'coordinator_unavailable', `el coordinador de model scheduling no respondió: ${messageOf(error)}`)
    return { kind: 'final', response }
  }
  if (admission.status !== 'admitted') {
    const reason = refusalMessage(admission)
    return { kind: 'model_failure', response: refusalResponse(admission, reason), trigger: refusalTrigger(admission), reason }
  }
  return forwardAdmitted(options.source, admission.ticket, path, body)
}

/** Un modelo que el coordinador no resuelve no existe; un rechazo en otra etapa es falta de sitio; un fallo, del servidor. */
function refusalTrigger(refusal: AdmissionRefusal): ModelFallbackTrigger {
  if (refusal.status === 'failed') return 'server_error'
  return refusal.stage === 'resolve' ? 'model_not_found' : 'overloaded'
}

function fallbackEventOf(options: AdmittedUpstreamOptions, originalModel: string, fallbackModel: string,
  chainIndex: number, failure: { trigger: ModelFallbackTrigger; reason: string }): ModelFallbackEvent {
  const event: ModelFallbackEvent = { type: 'model_fallback', originalModel, fallbackModel, trigger: failure.trigger, chainIndex, reason: failure.reason }
  return options.contextLength === undefined ? event : { ...event, contextLength: options.contextLength }
}

function admissionRequestOf(options: AdmittedUpstreamOptions, model: string): AdmissionRequest {
  const request: AdmissionRequest = { requestId: options.newRequestId(), client: options.client, model }
  return options.contextLength === undefined ? request : { ...request, contextLength: options.contextLength }
}

/**
 * Sin razonamiento pedido, el relé lo apaga: Ollama hace razonar a Qwen3 por
 * defecto, y en CPU eso eran 900-1600 tokens por turno a <1 tok/s
 * (TASK-THYROX-0919 r2). `"none"` es el valor que ese runtime acepta: `think:
 * false` y `"low"` siguieron razonando (`probes/think_control.variants.out`).
 * El razonamiento que la petición pide pasa tal cual.
 */
const REASONING_OFF = LOCAL_REASONING_EFFORT

function runtimeBodyOf(body: Record<string, unknown>, modelId: string): Record<string, unknown> {
  return { reasoning_effort: REASONING_OFF, ...body, model: modelId }
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json()
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function hasModel(body: Record<string, unknown>): body is Record<string, unknown> & { model: string } {
  return typeof body.model === 'string'
}

function refusalMessage(refusal: AdmissionRefusal): string {
  const verb = refusal.status === 'refused' ? 'rehusó' : 'falló'
  return `la admisión ${verb} en la etapa ${refusal.stage}: ${refusal.reason}`
}

function refusalResponse(refusal: AdmissionRefusal, message: string): Response {
  const type: AdmittedUpstreamErrorType = refusal.status === 'refused' ? 'admission_refused' : 'admission_failed'
  return openAIError(ADMISSION_REFUSED_STATUS, type, message)
}

/**
 * Reenvía SÓLO al endpoint de la unidad, con el modelo exacto del grant, y
 * suelta la admisión una vez: al terminar o abandonarse el cuerpo, o si el
 * runtime no respondió.
 */
async function forwardAdmitted(
  source: AdmissionSource, ticket: AdmissionTicket, path: string, body: Record<string, unknown>,
): Promise<Attempt> {
  const release = releaseOnce(source, ticket.admissionId)
  const target = `${ticket.unit.endpoint}${path}`
  let runtimeResponse: Response
  try {
    // Sin el corte de 300 s del fetch de Bun: un modelo en CPU tarda minutos
    // en el prefill, y el plazo lo deciden el pool y el proxy (A6 r7).
    runtimeResponse = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(runtimeBodyOf(body, ticket.grant.artifact.modelId)),
      timeout: false,
    } as RequestInit)
  } catch (error) {
    release()
    const reason = `no se pudo conectar con el runtime en ${target}: ${messageOf(error)}`
    return { kind: 'model_failure', response: openAIError(UPSTREAM_UNREACHABLE_STATUS, 'upstream_unreachable', reason), trigger: 'server_error', reason }
  }
  const init = { status: runtimeResponse.status, headers: relayedHeaders(runtimeResponse.headers) }
  const response = new Response(releasingBody(runtimeResponse.body, release), init)
  if (!isServerError(runtimeResponse.status)) return { kind: 'final', response }
  return { kind: 'model_failure', response, trigger: 'server_error', reason: `el runtime respondió ${runtimeResponse.status}` }
}

/** Un 5xx es del servidor y admite otro modelo; un 4xx es de la petición y se repetiría igual. */
function isServerError(status: number): boolean {
  return status >= SERVER_ERROR_STATUS
}

/** Una función que llama `finish` la primera vez y no hace nada las siguientes. */
function releaseOnce(source: AdmissionSource, admissionId: string): () => void {
  let released = false
  return () => {
    if (released) return
    released = true
    void source.finish(admissionId).catch(() => undefined)
  }
}

/** El cuerpo del runtime, que suelta la admisión cuando se agota o el cliente lo cancela. */
function releasingBody(body: ReadableStream<Uint8Array> | null, release: () => void): ReadableStream<Uint8Array> {
  if (body === null) {
    release()
    return new ReadableStream({ start: controller => controller.close() })
  }
  const reader = body.getReader()
  let enqueuedAny = false
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (enqueuedAny) await yieldToServer()
      try {
        const chunk = await reader.read()
        if (chunk.done) {
          controller.close()
          release()
          return
        }
        controller.enqueue(chunk.value)
        enqueuedAny = true
      } catch (error) {
        release()
        controller.error(error)
      }
    },
    async cancel(reason) {
      release()
      await reader.cancel(reason)
    },
  }, { highWaterMark: 0 })
}

/**
 * Bun.serve agota un cuerpo que se lee sin pausa ANTES de escribir la
 * respuesta al socket (medido: el stream cerraba antes de que el cliente
 * viera las cabeceras, y `finish` se adelantaba a la entrega). Dejar cada
 * `pull` posterior al primer chunk pendiente una macrotarea hace que el
 * servidor escriba lo encolado —cabeceras incluidas— antes de leer más, y
 * el cierre del stream sigue a la entrega real.
 */
function yieldToServer(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function relayedHeaders(headers: Headers): Headers {
  const relayed = new Headers(headers)
  for (const name of HOP_BY_HOP_HEADERS) relayed.delete(name)
  return relayed
}

function openAIError(status: number, type: string, message: string): Response {
  return Response.json({ error: { type, message } }, { status })
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
