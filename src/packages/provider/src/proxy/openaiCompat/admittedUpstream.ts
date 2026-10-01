/**
 * El upstream compatible con OpenAI que el proxy local usa para un modelo del
 * catálogo (ADR-007 1.14.0, M8): un relé en loopback que, por cada petición,
 * pide una admisión al coordinador de model scheduling del anfitrión y
 * reenvía SÓLO al `endpoint` de la `ExecutionUnit` del ticket. No hay otra
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
 */
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
  let admission: CoordinatorAdmission
  try {
    admission = await options.source.admit({ requestId: options.newRequestId(), client: options.client, model: body.model })
  } catch (error) {
    return openAIError(ADMISSION_REFUSED_STATUS, 'coordinator_unavailable', `el coordinador de model scheduling no respondió: ${messageOf(error)}`)
  }
  if (admission.status !== 'admitted') return refusalResponse(admission)
  return forwardAdmitted(options.source, admission.ticket, new URL(request.url).pathname, body)
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

function refusalResponse(refusal: AdmissionRefusal): Response {
  const type: AdmittedUpstreamErrorType = refusal.status === 'refused' ? 'admission_refused' : 'admission_failed'
  const verb = refusal.status === 'refused' ? 'rehusó' : 'falló'
  return openAIError(ADMISSION_REFUSED_STATUS, type, `la admisión ${verb} en la etapa ${refusal.stage}: ${refusal.reason}`)
}

/**
 * Reenvía SÓLO al endpoint de la unidad, con el modelo exacto del grant, y
 * suelta la admisión una vez: al terminar o abandonarse el cuerpo, o si el
 * runtime no respondió.
 */
async function forwardAdmitted(
  source: AdmissionSource, ticket: AdmissionTicket, path: string, body: Record<string, unknown>,
): Promise<Response> {
  const release = releaseOnce(source, ticket.admissionId)
  const target = `${ticket.unit.endpoint}${path}`
  let runtimeResponse: Response
  try {
    runtimeResponse = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, model: ticket.grant.artifact.modelId }),
    })
  } catch (error) {
    release()
    return openAIError(UPSTREAM_UNREACHABLE_STATUS, 'upstream_unreachable', `no se pudo conectar con el runtime en ${target}: ${messageOf(error)}`)
  }
  const init = { status: runtimeResponse.status, headers: relayedHeaders(runtimeResponse.headers) }
  return new Response(releasingBody(runtimeResponse.body, release), init)
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
