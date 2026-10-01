/**
 * El tipo de un error, para agrupar y filtrar sin leer mensajes. Sigue la idea
 * de OmniRoute, que guarda en `call_logs.error_type` la clase que su
 * `errorClassifier` asigna (`src/lib/usage/callLogs.ts:654`); el vocabulario es
 * propio, porque aquí el error no siempre viene de una llamada HTTP.
 */
export const ERROR_TYPES = ['render', 'aborted', 'timeout', 'network', 'auth', 'rate_limit', 'server', 'client', 'unknown'] as const
export type ErrorType = (typeof ERROR_TYPES)[number]

const NETWORK_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE', 'EHOSTUNREACH'])
const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNABORTED'])

function statusType(status: number): ErrorType {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limit'
  if (status === 408 || status === 504) return 'timeout'
  if (status >= 500) return 'server'
  if (status >= 400) return 'client'
  return 'unknown'
}

export function classifyError(source: string, error: unknown, context: Record<string, unknown> = {}): ErrorType {
  if (source === 'component_boundary') return 'render'
  const name = error instanceof Error ? error.name : ''
  const code = typeof (error as { code?: unknown } | null)?.code === 'string' ? (error as { code: string }).code : ''
  if (name === 'AbortError' || name === 'CancelError') return 'aborted'
  if (TIMEOUT_CODES.has(code) || name === 'TimeoutError') return 'timeout'
  if (NETWORK_CODES.has(code)) return 'network'
  const status = Number(context.status)
  return Number.isInteger(status) ? statusType(status) : 'unknown'
}
