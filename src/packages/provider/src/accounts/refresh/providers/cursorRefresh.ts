/**
 * El refresco de Cursor: el refresh token va como bearer a
 * `exchange_user_api_key`, con reintentos propios ante la limitación y los
 * errores de servidor. La caducidad sale del token nuevo, con margen.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/cursor.ts` (MIT).
 */
import { decodeJwtPayload } from '../../jwtPayload.ts'
import type { RefreshDeps, UnrecoverableRefresh } from './refreshResult.ts'

const CURSOR_REFRESH_URL = 'https://api2.cursor.sh/auth/exchange_user_api_key'
const REFRESH_TIMEOUT_MS = 15_000
const REFRESH_ATTEMPTS = 3
const REFRESH_RETRY_BASE_MS = 300
const EXPIRY_SKEW_MS = 5 * 60 * 1000
const FALLBACK_TTL_MS = 60 * 60 * 1000
const MILLISECONDS_PER_SECOND = 1000
const JITTER_FLOOR = 0.8
const JITTER_SPAN = 0.4
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
const REJECTED_STATUSES = new Set([401, 403])

export interface CursorRefreshDeps extends RefreshDeps {
  now?: () => number
  random?: () => number
  sleep?: (ms: number) => Promise<void>
  attempts?: number
  retryBaseMs?: number
  timeoutMs?: number
}

export type CursorRefreshOutcome = { accessToken: string; refreshToken: string; expiresAt: string } | UnrecoverableRefresh | null

export async function refreshCursorToken(refreshToken: string, deps: CursorRefreshDeps = {}): Promise<CursorRefreshOutcome> {
  if (!refreshToken) return { error: 'unrecoverable_refresh_error', code: 'no_refresh_token' }
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  const random = deps.random ?? Math.random
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const attempts = deps.attempts ?? REFRESH_ATTEMPTS
  const retryBaseMs = deps.retryBaseMs ?? REFRESH_RETRY_BASE_MS
  const backoff = (attempt: number) => sleep(Math.floor(retryBaseMs * 2 ** attempt * (JITTER_FLOOR + random() * JITTER_SPAN)))
  /** La caducidad del JWT menos el margen; un token opaco dura una hora. */
  const expiresAtOf = (token: string) => {
    const exp = decodeJwtPayload(token)?.exp
    return typeof exp === 'number' ? exp * MILLISECONDS_PER_SECOND - EXPIRY_SKEW_MS : now() + FALLBACK_TTL_MS
  }
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    const lastAttempt = attempt === attempts - 1
    let response: Response
    try {
      response = await fetch(CURSOR_REFRESH_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${refreshToken}`, 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(deps.timeoutMs ?? REFRESH_TIMEOUT_MS),
      })
    } catch (error) {
      lastError = error
      if (lastAttempt) break
      await backoff(attempt)
      continue
    }
    if (response.ok) {
      const data = (await response.json()) as { accessToken?: string; refreshToken?: string }
      if (!data.accessToken) {
        deps.log?.error?.('TOKEN_REFRESH', 'Cursor refresh response missing access token')
        return null
      }
      deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Cursor token')
      return { accessToken: data.accessToken, refreshToken: data.refreshToken || refreshToken, expiresAt: new Date(expiresAtOf(data.accessToken)).toISOString() }
    }
    if (REJECTED_STATUSES.has(response.status)) {
      deps.log?.error?.('TOKEN_REFRESH', 'Cursor refresh rejected — re-authentication required', { status: response.status })
      return { error: 'unrecoverable_refresh_error', code: 'unauthorized' }
    }
    if (!RETRYABLE_STATUSES.has(response.status) || lastAttempt) {
      deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh Cursor token', { status: response.status })
      return null
    }
    lastError = new Error(`Cursor token refresh failed: ${response.status}`)
    await response.body?.cancel().catch(() => {})
    await backoff(attempt)
  }
  deps.log?.error?.('TOKEN_REFRESH', lastError instanceof Error ? lastError.message : 'Cursor token refresh failed')
  return null
}
