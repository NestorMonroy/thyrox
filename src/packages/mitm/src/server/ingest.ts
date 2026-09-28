/**
 * La entrada que el servidor MITM envía al inspector de tráfico: el servidor
 * corre como proceso aparte y no llega al búfer del inspector, así que
 * publica lo capturado en el punto de ingesta local. El envío nunca lanza:
 * la captura no puede romper el tráfico que se reenvía.
 *
 * Porte de `omniroute: src/mitm/_internal/ingest.cjs` (MIT). La forma de la
 * entrada es la de `InterceptedRequest` con origen `agent-bridge`.
 */
import { randomUUID } from 'node:crypto'

import type { InterceptedRequest } from '../inspector/types.ts'
import type { AgentId } from '../types.ts'

export const INGEST_PATH = '/api/tools/traffic-inspector/internal/ingest'

export interface IngestEntryInput {
  id?: string
  timestamp?: string
  method?: string
  host?: string
  path?: string
  requestHeaders?: Record<string, string>
  requestBody?: string | null
  requestSize?: number
  responseHeaders?: Record<string, string>
  responseBody?: string | null
  responseSize?: number
  status: InterceptedRequest['status']
  /** Sólo un agente conocido; el servidor omite el que no reconoce. */
  agentId?: AgentId
  sourceModel?: string | null
  mappedModel?: string
  error?: string
  proxyLatencyMs?: number
  upstreamLatencyMs?: number
}

/** La entrada válida para el esquema; `id` y `timestamp` se pueden fijar. */
export function buildIngestEntry(o: IngestEntryInput): InterceptedRequest {
  const entry: InterceptedRequest = {
    id: o.id || randomUUID(),
    source: 'agent-bridge',
    timestamp: o.timestamp || new Date().toISOString(),
    method: o.method || 'GET',
    host: o.host || '',
    path: o.path || '/',
    requestHeaders: o.requestHeaders || {},
    requestBody: o.requestBody ?? null,
    requestSize: Number.isFinite(o.requestSize) ? o.requestSize! : 0,
    responseHeaders: o.responseHeaders || {},
    responseBody: o.responseBody ?? null,
    responseSize: Number.isFinite(o.responseSize) ? o.responseSize! : 0,
    status: o.status,
  }
  if (o.agentId) entry.agent = o.agentId
  if (o.sourceModel !== undefined) entry.sourceModel = o.sourceModel
  if (o.mappedModel) entry.mappedModel = o.mappedModel
  if (typeof o.error === 'string') entry.error = o.error
  if (typeof o.proxyLatencyMs === 'number') entry.proxyLatencyMs = o.proxyLatencyMs
  if (typeof o.upstreamLatencyMs === 'number') entry.upstreamLatencyMs = o.upstreamLatencyMs
  if (typeof o.proxyLatencyMs === 'number' && typeof o.upstreamLatencyMs === 'number') {
    entry.totalLatencyMs = o.proxyLatencyMs + o.upstreamLatencyMs
  }
  return entry
}

type FetchLike = (url: string, init: RequestInit) => Promise<{ ok: boolean }>

/** Publica la entrada; `true` sólo con un 2xx, `false` ante cualquier otra cosa. */
export async function postIngestEntry(
  baseUrl: string,
  token: string,
  entry: unknown,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  if (!token || !baseUrl) return false
  try {
    const res = await fetchImpl(`${baseUrl}${INGEST_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(entry),
    })
    return res?.ok === true
  } catch {
    return false
  }
}
