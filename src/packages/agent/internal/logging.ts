/**
 * Observadores de logging del agente — porte de
 * `ccnmt: packages/agent/internal/logging.ts`.
 *
 * Cuatro funciones, todas catch-block / hot-path, que delegan en las
 * ataduras del host (`AgentHostBindings`) — con fallback a `console.*` sólo
 * donde la ausencia del host NO debe quedar en silencio.
 *
 * Tres invariantes:
 *  1. `logEvent` — delegado puro (telemetría): no-op silencioso si el host
 *     no está.
 *  2. `logError` + `logAntError` — delegan si el host está instalado;
 *     SI NO, caen a `console.error`. Nunca en silencio.
 *  3. `logForDebugging` — delegado puro (archivo de debug log): no-op
 *     silencioso si el host no está.
 *
 * La separación delegado-vs-fallback importa: que la telemetría o el debug
 * log queden a oscuras es aceptable; que un error quede a oscuras, no.
 */
import { getAgentHostBindings } from '../host.ts'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../internalTypes.ts'

type AgentAnalyticsMetadata = Record<
  string,
  | string
  | number
  | boolean
  | AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
>

export type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS }

export function logEvent(
  event: string,
  metadata: AgentAnalyticsMetadata,
): void {
  getAgentHostBindings().logEvent?.(
    event,
    metadata as Record<string, string | number | boolean>,
  )
}

export function logError(error: unknown): void {
  const logger = getAgentHostBindings().logError
  if (logger) {
    logger(error)
    return
  }
  console.error(error)
}

export function logAntError(message: string, error: unknown): void {
  const logger = getAgentHostBindings().logAntError
  if (logger) {
    logger(message, error)
    return
  }
  console.error(message, error)
}

export function logForDebugging(
  message: string,
  metadata?: unknown,
): void {
  getAgentHostBindings().logDebug?.(message, metadata)
}
