/**
 * `/api/embed` de Ollama, alcanzable sólo con una admisión (ADR-007 1.14.0,
 * M8), igual que `admittedChat`: habla con el `endpoint` de la unidad del
 * ticket y pide el modelo que el grant concede.
 */
import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'

import { OllamaRequestError } from './ollamaApi.js'

export interface EmbedReply {
  /** Un vector por texto, en el orden de la entrada. */
  readonly embeddings: readonly (readonly number[])[]
  readonly promptEvalCount: number
  readonly totalDurationNs: number
}

const EMBED_PATH = '/api/embed'
const JSON_HEADERS = { 'content-type': 'application/json' }

type JsonObject = Record<string, unknown>

/** Los vectores de `input` según la unidad del ticket; un estado HTTP de fallo lanza `OllamaRequestError`. */
export async function admittedEmbed(ticket: AdmissionTicket, input: readonly string[]): Promise<EmbedReply> {
  const response = await fetch(`${ticket.unit.endpoint}${EMBED_PATH}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ model: ticket.grant.artifact.modelId, input }),
  })
  const text = await response.text()
  if (!response.ok) throw new OllamaRequestError(EMBED_PATH, response.status, text)
  const document = JSON.parse(text) as JsonObject
  return {
    embeddings: (document.embeddings ?? []) as number[][],
    promptEvalCount: Number(document.prompt_eval_count ?? 0),
    totalDurationNs: Number(document.total_duration ?? 0),
  }
}
