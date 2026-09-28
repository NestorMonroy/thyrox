/**
 * Los tipos del inspector de tráfico: la petición interceptada y las formas
 * normalizadas de una conversación.
 *
 * Porte de `omniroute: src/mitm/inspector/types.ts` (MIT).
 */
import { z } from 'zod'
import type { AgentId } from '../types.ts'

export type CaptureSource = 'agent-bridge' | 'custom-host' | 'http-proxy' | 'system-proxy' | 'tproxy'
export type DetectedKind = 'llm' | 'app' | 'unknown'

export interface InterceptedRequest {
  id: string
  source: CaptureSource
  /** Sólo cuando `source` es `agent-bridge`. */
  agent?: AgentId
  /** ISO 8601. */
  timestamp: string
  method: string
  host: string
  path: string
  requestHeaders: Record<string, string>
  /** Enmascarado. */
  requestBody: string | null
  requestSize: number
  responseHeaders: Record<string, string>
  responseBody: string | null
  responseSize: number
  status: number | 'in-flight' | 'error'
  proxyLatencyMs?: number
  upstreamLatencyMs?: number
  totalLatencyMs?: number
  /** Saneado. */
  error?: string
  sourceModel?: string | null
  mappedModel?: string | null
  detectedKind?: DetectedKind
  /** Doce hexadecimales del SHA-256 del prompt de sistema. */
  contextKey?: string
  annotation?: string
  sessionId?: string
  note?: string
  /** Proceso de origen (sólo Linux). */
  pid?: number
  processName?: string
}

export const InterceptedRequestSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['agent-bridge', 'custom-host', 'http-proxy', 'system-proxy', 'tproxy']),
  agent: z.string().optional(),
  timestamp: z.string().datetime(),
  method: z.string(),
  host: z.string(),
  path: z.string(),
  requestHeaders: z.record(z.string(), z.string()),
  requestBody: z.string().nullable(),
  requestSize: z.number().int().nonnegative(),
  responseHeaders: z.record(z.string(), z.string()),
  responseBody: z.string().nullable(),
  responseSize: z.number().int().nonnegative(),
  status: z.union([z.number().int(), z.literal('in-flight'), z.literal('error')]),
  proxyLatencyMs: z.number().nonnegative().optional(),
  upstreamLatencyMs: z.number().nonnegative().optional(),
  totalLatencyMs: z.number().nonnegative().optional(),
  error: z.string().optional(),
  sourceModel: z.string().nullable().optional(),
  mappedModel: z.string().nullable().optional(),
  detectedKind: z.enum(['llm', 'app', 'unknown']).optional(),
  contextKey: z.string().optional(),
  annotation: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  note: z.string().optional(),
  pid: z.number().int().nonnegative().optional(),
  processName: z.string().optional(),
})

export type NormalizedBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown }
  /** Un nodo de herramienta cuyo contenido aún no se resolvió (petición en curso). */
  | { type: 'pending' }

export interface NormalizedTurn {
  role: 'system' | 'user' | 'assistant' | 'tool'
  blocks: NormalizedBlock[]
  /** El registro de llamada que produjo el turno, si quien normaliza lo tiene. */
  sourceCallLogId?: string
  timestamp?: string
}

export interface NormalizedConversation {
  request: NormalizedTurn[]
  response: NormalizedTurn[]
  contextKey: string | null
}

export interface LlmMetadata {
  provider: string | null
  apiKind: string | null
  model: string | null
  messages: number
  tokensIn: number | null
  tokensOut: number | null
  streamed: boolean
  mappedTo: string | null
  costEstimateUsd: number | null
}

export type WsEvent =
  | { type: 'snapshot'; data: InterceptedRequest[] }
  | { type: 'new'; data: InterceptedRequest }
  | { type: 'update'; data: InterceptedRequest }
  | { type: 'clear' }

export type ListFilters = {
  profile?: 'llm' | 'custom' | 'all'
  host?: string
  agent?: AgentId
  status?: '2xx' | '3xx' | '4xx' | '5xx' | 'error'
  source?: CaptureSource
  sessionId?: string
}
