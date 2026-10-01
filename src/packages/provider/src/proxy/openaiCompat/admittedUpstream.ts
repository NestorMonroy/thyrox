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
import type { AdmissionRequest, CoordinatorAdmission } from '@thyrox/model-scheduling/hostCoordinator.ts'

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

export function startAdmittedUpstream(options: AdmittedUpstreamOptions): AdmittedUpstream {
  void options
  throw new Error('startAdmittedUpstream: por implementar')
}
