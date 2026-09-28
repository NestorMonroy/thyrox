/**
 * El circuito del refresco proactivo. Un refresco que falla deja la conexión
 * activa, y sin circuito el siguiente barrido la reintentaría cada minuto
 * para siempre. Cada fallo seguido dobla la espera, desde cinco minutos hasta
 * cuatro horas; un fallo de red espera dos minutos sin alargar la escalera.
 * Un refresco que funciona borra el circuito.
 *
 * Porte de `omniroute: src/lib/tokenRefreshCircuit.ts` y de
 * `getRefreshBackoffUntil`, `buildRefreshFailureUpdate`,
 * `buildTransientRefreshRetryUpdate`, `clearRefreshCircuit` y
 * `shouldNullRefreshTokenAfterUnrecoverable` de `src/lib/tokenHealthCheck.ts` (MIT).
 */
import { expiredRetryCount, type HealthConnection, providerData, type ProviderData } from './connectionExpiry.ts'

const MS_PER_MINUTE = 60 * 1000
const REFRESH_CIRCUIT_BASE_MIN = 5
const REFRESH_CIRCUIT_MAX_MIN = 240
const TRANSIENT_REFRESH_RETRY_MIN = 2

/** Proveedores cuyo refresh token rota: uno muerto ya no sirve y se descarta. */
const ROTATING_REFRESH_PROVIDERS = new Set(['codex', 'openai', 'kimi-coding', 'cline', 'kiro', 'amazon-q', 'gitlab-duo', 'claude', 'openference'])
/**
 * Anthropic rota, pero un token «muerto» suele ser otra aplicación que
 * refrescó la misma cuenta, no una revocación: se conserva para los reintentos.
 */
const PRESERVE_REFRESH_TOKEN_PROVIDERS = new Set(['claude'])

export interface RefreshCircuitState {
  streak?: number
  until?: string
  lastFailAt?: string
  transient?: boolean
}

export interface RefreshFailureUpdate {
  lastHealthCheckAt: string
  testStatus: string
  lastError: string
  lastErrorAt: string
  lastErrorType: string
  lastErrorSource: string
  errorCode: string
  providerSpecificData: ProviderData & { refreshCircuit: RefreshCircuitState }
  expiredRetryCount?: number
  expiredRetryAt?: string
}

const lowerId = (provider: unknown) => String(provider || '').toLowerCase()
const circuitOf = (connection: HealthConnection | null | undefined) => providerData(connection).refreshCircuit as RefreshCircuitState | undefined

export function shouldNullRefreshTokenAfterUnrecoverable(provider: unknown): boolean {
  const id = lowerId(provider)
  return !PRESERVE_REFRESH_TOKEN_PROVIDERS.has(id) && ROTATING_REFRESH_PROVIDERS.has(id)
}

export function preservesRefreshTokenOnUnrecoverable(provider: unknown): boolean {
  return PRESERVE_REFRESH_TOKEN_PROVIDERS.has(lowerId(provider))
}

export function isInRefreshBackoff(connection: HealthConnection | null | undefined, nowMs: number): boolean {
  const until = circuitOf(connection)?.until
  if (typeof until !== 'string') return false
  const untilMs = new Date(until).getTime()
  return Number.isFinite(untilMs) && untilMs > nowMs
}

export function refreshBackoffUntil(streak: number, now: string): string {
  const backoffMin = Math.min(REFRESH_CIRCUIT_BASE_MIN * 2 ** Math.max(0, streak - 1), REFRESH_CIRCUIT_MAX_MIN)
  return new Date(new Date(now).getTime() + backoffMin * MS_PER_MINUTE).toISOString()
}

/** Una conexión expirada sigue expirada y cuenta el reintento; una activa sigue activa. */
function expiredRetryFields(connection: HealthConnection, now: string) {
  const wasExpired = connection.testStatus === 'expired'
  const count = expiredRetryCount(connection) + (wasExpired ? 1 : 0)
  return {
    testStatus: wasExpired ? 'expired' : 'active',
    data: wasExpired ? { expiredRetry: { count, at: now } } : {},
    fields: wasExpired ? { expiredRetryCount: count, expiredRetryAt: now } : {},
  }
}

export function buildRefreshFailureUpdate(connection: HealthConnection, now: string, overrides?: { errorCode?: string; lastError?: string; lastErrorType?: string; testStatus?: string }): RefreshFailureUpdate {
  const retry = expiredRetryFields(connection, now)
  const streak = (circuitOf(connection)?.streak ?? 0) + 1
  return {
    lastHealthCheckAt: now,
    testStatus: retry.testStatus,
    lastError: 'Health check: token refresh failed',
    lastErrorAt: now,
    lastErrorType: 'token_refresh_failed',
    lastErrorSource: 'oauth',
    errorCode: 'refresh_failed',
    providerSpecificData: { ...providerData(connection), refreshCircuit: { streak, until: refreshBackoffUntil(streak, now), lastFailAt: now }, ...retry.data },
    ...retry.fields,
    ...(overrides ?? {}),
  }
}

/**
 * Un fallo de red no alarga la escalera: se reintenta en dos minutos, salvo
 * que ya haya una espera más larga, que se respeta.
 */
export function buildTransientRefreshRetryUpdate(connection: HealthConnection, now: string): RefreshFailureUpdate {
  const retry = expiredRetryFields(connection, now)
  const existing = circuitOf(connection)
  const parsedUntil = existing?.until ? new Date(existing.until).getTime() : 0
  const existingUntil = Number.isFinite(parsedUntil) ? parsedUntil : 0
  const transientUntil = new Date(now).getTime() + TRANSIENT_REFRESH_RETRY_MIN * MS_PER_MINUTE
  const useTransient = existingUntil <= transientUntil
  return {
    lastHealthCheckAt: now,
    testStatus: retry.testStatus,
    lastError: 'Health check: token refresh transient error (network/timeout)',
    lastErrorAt: now,
    lastErrorType: 'token_refresh_transient',
    lastErrorSource: 'oauth',
    errorCode: 'refresh_transient',
    providerSpecificData: {
      ...providerData(connection),
      refreshCircuit: { streak: existing?.streak ?? 0, until: useTransient ? new Date(transientUntil).toISOString() : (existing?.until as string), lastFailAt: now, transient: useTransient },
      ...retry.data,
    },
    ...retry.fields,
  }
}

/** Los datos sin circuito ni reintentos; `undefined` si no había nada que borrar. */
export function clearRefreshCircuit(data: ProviderData | null | undefined): ProviderData | undefined {
  if (!data || typeof data !== 'object') return undefined
  if (!('refreshCircuit' in data) && !('expiredRetry' in data)) return undefined
  const next = { ...data }
  delete next.refreshCircuit
  delete next.expiredRetry
  return next
}
