/**
 * El resultado de un sondeo del login social de Kiro, y el intervalo del
 * siguiente: un `slow_down` lo amplía para todos los sondeos posteriores
 * (RFC 8628).
 *
 * Porte de `omniroute: src/lib/oauth/kiroSocialPoll.ts` (MIT).
 */
export interface KiroSocialPollData {
  error?: unknown
  /** Kiro informa el progreso aquí (`authorization_pending`), no en `error`. */
  status?: unknown
  accessToken?: unknown
  refreshToken?: unknown
}

export type KiroSocialPollOutcome =
  | { kind: 'pending'; error: 'authorization_pending' | 'slow_down' }
  | { kind: 'error'; error: string; status: number }
  | { kind: 'success' }

const SLOW_DOWN_INCREMENT_MS = 5000
const FALLBACK_ERROR_STATUS = 400
const INVALID_TOKEN_STATUS = 502

export function nextKiroSocialPollInterval(currentIntervalMs: number, error: unknown): number {
  return error === 'slow_down' ? currentIntervalMs + SLOW_DOWN_INCREMENT_MS : currentIntervalMs
}

function errorCode(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : 'authorization_failed'
}

function isHttpError(status: number): boolean {
  return status >= 400 && status <= 599
}

export function classifyKiroSocialPoll(responseOk: boolean, responseStatus: number, data: KiroSocialPollData): KiroSocialPollOutcome {
  const progress = data.error ?? data.status
  if (progress === 'authorization_pending' || progress === 'slow_down') return { kind: 'pending', error: progress }
  if (!responseOk || data.error) {
    return { kind: 'error', error: errorCode(data.error), status: isHttpError(responseStatus) ? responseStatus : FALLBACK_ERROR_STATUS }
  }
  if (!data.accessToken && !data.refreshToken) return { kind: 'error', error: 'invalid_token_response', status: INVALID_TOKEN_STATUS }
  return { kind: 'success' }
}
