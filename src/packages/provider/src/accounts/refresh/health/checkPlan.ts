/**
 * Lo que el refresco proactivo decide con cada conexión antes de llamar a
 * nadie, y cómo se escriben los resultados. Las conexiones muertas no se
 * tocan salvo las que pueden recuperarse solas; una conexión cuyo proveedor
 * ya no se sirve se marca expirada una vez; Cursor, Kimi web, las cookies web y Copilot van
 * a su propia comprobación; un token que rota se refresca sólo cuando está
 * por caducar, porque refrescarlo por calendario gasta rotaciones y puede
 * revocar la familia de sus hermanas.
 *
 * Porte de la decisión de `checkConnection` en
 * `omniroute: src/lib/tokenHealthCheck.ts` (MIT).
 */
import { deprecationNotice } from '../deprecatedProviders.ts'
import { effectiveTokenExpiryMs, expiredRetryAt, expiredRetryCount, type HealthConnection, isGithubAccessTokenOnlyConnection, providerData, type ProviderData, withExpiredRetry } from './connectionExpiry.ts'
import { clearRefreshCircuit, isInRefreshBackoff, shouldNullRefreshTokenAfterUnrecoverable } from './refreshCircuit.ts'

const MS_PER_MINUTE = 60 * 1000
const DEFAULT_HEALTH_CHECK_INTERVAL_MIN = 60
/** Cuántas veces se reintenta una conexión expirada antes de desactivarla. */
export const EXPIRED_RETRY_MAX = 3
const EXPIRED_RETRY_BACKOFF_MIN = 5
/** Un token que caduca antes de esto se refresca ya. */
const TOKEN_EXPIRY_BUFFER_MS = 5 * MS_PER_MINUTE
const TERMINAL_STATUSES = new Set(['banned', 'expired'])
const KIMI_WEB_PROVIDERS = new Set(['kimi-web', 'kimi_web'])
/** Los que rotan su refresh token en cada refresco: no se refrescan por calendario. */
const ROTATING_REFRESH_PROVIDERS = new Set(['codex', 'openai', 'kimi-coding', 'cline', 'kiro', 'amazon-q', 'gitlab-duo', 'claude', 'openference'])

export interface CheckedConnection extends HealthConnection {
  isActive?: boolean
  healthCheckInterval?: number | null
  lastHealthCheckAt?: string | null
  lastErrorType?: string | null
  apiKey?: string | null
}

export interface CheckPlanContext {
  nowMs: number
  skipProviders: ReadonlySet<string>
  supportsTokenRefresh: (provider: string) => boolean
  isWebCookieProvider: (provider: string) => boolean
}

export type ConnectionUpdate = Record<string, unknown>

export type CheckPlan =
  | { action: 'skip' }
  | { action: 'mark'; update: ConnectionUpdate }
  | { action: 'touch' }
  | { action: 'cursor' }
  | { action: 'kimi-web' }
  | { action: 'web-cookie'; intervalMin: number }
  | { action: 'github-copilot' }
  | { action: 'deactivate' }
  | { action: 'refresh'; reason: string; retryAttempt?: number }

const SKIP: CheckPlan = { action: 'skip' }
const lowerId = (provider: unknown) => String(provider || '').toLowerCase()

function oauthErrorUpdate(now: string, testStatus: string, lastError: string, code: string): ConnectionUpdate {
  return { testStatus, lastHealthCheckAt: now, lastError, lastErrorAt: now, lastErrorType: code, lastErrorSource: 'oauth', errorCode: code }
}

/** Una conexión expirada o baneada no se toca, salvo las que pueden recuperarse. */
function isTerminal(connection: CheckedConnection, provider: string): boolean {
  if (typeof connection.testStatus !== 'string' || !TERMINAL_STATUSES.has(connection.testStatus.toLowerCase())) return false
  if (connection.testStatus !== 'expired') return true
  const githubWithoutRefresh = connection.errorCode === 'no_refresh_token' && isGithubAccessTokenOnlyConnection(connection)
  const cursorAlive = provider === 'cursor' && connection.lastErrorType !== 'account_deactivated'
  const retryBudgetLeft = connection.lastErrorType !== 'account_deactivated' && expiredRetryCount(connection) < EXPIRED_RETRY_MAX
  return !githubWithoutRefresh && !cursorAlive && !retryBudgetLeft
}

export function planConnectionCheck(connection: CheckedConnection, context: CheckPlanContext): CheckPlan {
  if (!connection?.id) return SKIP
  const provider = lowerId(connection.provider)
  if (context.skipProviders.has(provider)) return SKIP
  const intervalMin = connection.healthCheckInterval ?? DEFAULT_HEALTH_CHECK_INTERVAL_MIN
  if (intervalMin <= 0) return SKIP
  if (!connection.isActive && !(connection.testStatus === 'expired' && expiredRetryCount(connection) < EXPIRED_RETRY_MAX)) return SKIP
  if (isTerminal(connection, provider)) return SKIP

  const now = new Date(context.nowMs).toISOString()
  // Después de la guarda terminal: una vez marcada expirada, los barridos siguientes la saltan.
  const deprecation = deprecationNotice(String(connection.provider || ''))
  if (deprecation) return { action: 'mark', update: oauthErrorUpdate(now, 'expired', deprecation.reason, 'provider_deprecated') }

  const expiresAtMs = effectiveTokenExpiryMs(connection)
  const aboutToExpire = expiresAtMs > 0 && expiresAtMs - context.nowMs < TOKEN_EXPIRY_BUFFER_MS
  if (provider === 'cursor') {
    if (expiresAtMs > 0 && !aboutToExpire) return SKIP
    return isInRefreshBackoff(connection, context.nowMs) ? SKIP : { action: 'cursor' }
  }
  if (KIMI_WEB_PROVIDERS.has(provider)) return { action: 'kimi-web' }
  if (context.isWebCookieProvider(String(connection.provider || ''))) return { action: 'web-cookie', intervalMin }

  if (!connection.refreshToken || typeof connection.refreshToken !== 'string') {
    if (isGithubAccessTokenOnlyConnection(connection)) return { action: 'github-copilot' }
    // Un proveedor que sabe refrescar y no tiene con qué necesita volver a autenticar.
    const needsReauth = context.supportsTokenRefresh(String(connection.provider)) && (!connection.testStatus || connection.testStatus === 'active') && !connection.apiKey
    return needsReauth ? { action: 'mark', update: oauthErrorUpdate(now, 'expired', 'No refresh token available — re-authenticate this account.', 'no_refresh_token') } : SKIP
  }

  let retryAttempt: number | undefined
  if (connection.testStatus === 'expired') {
    const retries = expiredRetryCount(connection)
    // Llega aquí activa: una inactiva sin reintentos ya se saltó arriba.
    if (retries >= EXPIRED_RETRY_MAX) return { action: 'deactivate' }
    const lastRetry = expiredRetryAt(connection)
    const lastRetryMs = lastRetry ? new Date(lastRetry).getTime() : 0
    if (context.nowMs - lastRetryMs < EXPIRED_RETRY_BACKOFF_MIN * MS_PER_MINUTE * 2 ** retries) return SKIP
    retryAttempt = retries + 1
  }

  if (!context.supportsTokenRefresh(String(connection.provider))) return { action: 'touch' }

  const lastCheckMs = connection.lastHealthCheckAt ? new Date(connection.lastHealthCheckAt).getTime() : 0
  const dueByInterval = expiresAtMs === 0 && !ROTATING_REFRESH_PROVIDERS.has(provider) && context.nowMs - lastCheckMs >= intervalMin * MS_PER_MINUTE
  if (!aboutToExpire && !dueByInterval) return SKIP
  if (isInRefreshBackoff(connection, context.nowMs)) return SKIP
  const reason = aboutToExpire ? 'token expiring soon' : `interval: ${intervalMin}min`
  return retryAttempt === undefined ? { action: 'refresh', reason } : { action: 'refresh', reason, retryAttempt }
}

const NETWORK_ERROR = /ETIMEDOUT|ECONNREFUSED|ECONNRESET|ECONNABORTED|EPIPE|EHOSTUNREACH|ENETUNREACH|ENOTCONN|ENOTFOUND|EAI_AGAIN|ERR_NETWORK|ERR_SOCKET|ERR_CONNECTION/i
const NETWORK_MESSAGE = new RegExp(`${NETWORK_ERROR.source}|socket hang up|fetch failed`, 'i')

/** Sólo un fallo de red o de plazo es pasajero; un error de programa o de base, no. */
export function isTransientRefreshError(error: unknown): boolean {
  const record = (typeof error === 'object' && error !== null ? error : {}) as { name?: unknown; code?: unknown; cause?: { message?: unknown; code?: unknown } }
  const name = error instanceof Error ? error.name : String(record.name ?? '')
  const message = error instanceof Error ? error.message : String(error)
  const cause = record.cause instanceof Error ? record.cause.message : ''
  if (name === 'AbortError' || name === 'TimeoutError') return true
  return NETWORK_MESSAGE.test(`${message} ${cause}`) || NETWORK_ERROR.test(`${String(record.code ?? '')} ${String(record.cause?.code ?? '')}`)
}

export interface RefreshedTokensResult {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  expiresIn?: number
  providerSpecificData?: ProviderData
}

/** Los tokens nuevos, sin errores ni circuito, con la caducidad explícita o derivada. */
export function refreshedConnectionUpdate(connection: HealthConnection, result: RefreshedTokensResult, nowMs: number): ConnectionUpdate {
  const now = new Date(nowMs).toISOString()
  const update: ConnectionUpdate = { accessToken: result.accessToken, lastHealthCheckAt: now, testStatus: 'active', lastError: null, lastErrorAt: null, lastErrorType: null, lastErrorSource: null, errorCode: null }
  if (result.refreshToken) update.refreshToken = result.refreshToken
  const expiresAt = result.expiresAt || (result.expiresIn ? new Date(nowMs + result.expiresIn * 1000).toISOString() : null)
  if (expiresAt) {
    update.expiresAt = expiresAt
    update.tokenExpiresAt = expiresAt
  }
  const merged = { ...providerData(connection), ...(result.providerSpecificData ?? {}) }
  const cleared = clearRefreshCircuit(merged)
  if (cleared !== undefined) update.providerSpecificData = cleared
  else if (result.providerSpecificData) update.providerSpecificData = merged
  return update
}

export type UnrecoverableOutcome = { kind: 'changed'; update: ConnectionUpdate } | { kind: 'still-valid'; update: ConnectionUpdate } | { kind: 'expired'; exhausted: boolean; retry: number; update: ConnectionUpdate }

interface StoredTokens {
  refreshToken?: string | null
  accessToken?: string | null
  expiresAt?: unknown
  tokenExpiresAt?: unknown
}

/**
 * Qué hacer con un refresh token muerto. Si la fila cambió mientras se
 * refrescaba, otro ya lo rotó y la conexión está sana. Si el access token
 * sigue sirviendo, la conexión sigue activa con el aviso. Si no, expira y
 * cuenta el reintento; a la tercera se desactiva.
 */
export function unrecoverableRefreshOutcome(connection: CheckedConnection, result: { error: string; code?: string }, current: StoredTokens | null, attempted: { refreshToken: string; accessToken: string | null }, nowMs: number): UnrecoverableOutcome {
  const now = new Date(nowMs).toISOString()
  if (current && (current.refreshToken !== attempted.refreshToken || (current.accessToken || null) !== attempted.accessToken)) return { kind: 'changed', update: { lastHealthCheckAt: now } }
  if (effectiveTokenExpiryMs(current || connection) > nowMs + TOKEN_EXPIRY_BUFFER_MS) {
    return { kind: 'still-valid', update: { ...oauthErrorUpdate(now, 'active', `Health check refresh failed (${result.error}). Re-authenticate before the current access token expires.`, result.error) } }
  }
  const retry = expiredRetryCount(connection) + 1
  const exhausted = retry >= EXPIRED_RETRY_MAX
  const label = result.code || result.error
  const rotating = ROTATING_REFRESH_PROVIDERS.has(lowerId(connection.provider))
  const update: ConnectionUpdate = {
    lastHealthCheckAt: now,
    testStatus: 'expired',
    lastError: `Refresh token ${rotating ? 'consumed' : 'rejected'} (${label}). Please re-authenticate this account.`,
    lastErrorAt: now,
    lastErrorType: result.error,
    lastErrorSource: 'oauth',
    errorCode: label,
    providerSpecificData: withExpiredRetry(providerData(connection), retry, now),
  }
  if (exhausted) update.isActive = false
  if (shouldNullRefreshTokenAfterUnrecoverable(connection.provider)) update.refreshToken = null
  return { kind: 'expired', exhausted, retry, update }
}
