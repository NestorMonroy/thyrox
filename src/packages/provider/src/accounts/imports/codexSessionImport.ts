/**
 * El JSON de sesión que se copia de `chatgpt.com/api/auth/session`: de él
 * sólo sale un access token (y el correo, si viene), la misma credencial que
 * la importación de un token suelto. A diferencia del `auth.json`, no exige
 * refresh token. Puro: sin E/S ni red.
 *
 * Porte de `omniroute: src/lib/oauth/utils/codexSessionImport.ts` (MIT).
 */
import { decodeJwtPayload } from '../jwtPayload.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'

export type ParsedCodexSession = { accessToken: string; email?: string }
export type SessionParseResult = { ok: true; session: ParsedCodexSession } | { ok: false; error: string }

const MILLISECONDS_PER_SECOND = 1000
const JWT_SEGMENTS = 3

const toObject = (value: unknown): JsonRecord | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null)
const nonEmpty = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)

/** El token bajo sus nombres conocidos: `accessToken` primero, luego snake_case y alternativos, y un nivel bajo `tokens`. */
function findAccessToken(record: JsonRecord): string | undefined {
  const direct = nonEmpty(record.accessToken) || nonEmpty(record.access_token) || nonEmpty(record.sessionToken) || nonEmpty(record.session_token)
  if (direct) return direct
  const nested = toObject(record.tokens)
  return nested ? nonEmpty(nested.access_token) || nonEmpty(nested.accessToken) : undefined
}

/** Vencida si el `expires` de la sesión o el `exp` del token ya pasaron. */
function isExpired(record: JsonRecord, accessToken: string, nowMs: number): boolean {
  const expires = nonEmpty(record.expires)
  if (expires) {
    const ms = Date.parse(expires)
    if (Number.isFinite(ms) && ms <= nowMs) return true
  }
  const exp = decodeJwtPayload(accessToken)?.exp
  return typeof exp === 'number' && Number.isFinite(exp) && exp * MILLISECONDS_PER_SECOND <= nowMs
}

/** Lo pegado es un objeto JSON (y no un JWT suelto ni una URL de retorno). */
export function looksLikeCodexSessionJson(value: string): boolean {
  try {
    return toObject(JSON.parse(typeof value === 'string' ? value : '')) !== null
  } catch {
    return false
  }
}

export function parseCodexSessionJson(raw: unknown, nowMs: number = Date.now()): SessionParseResult {
  const record = toObject(raw)
  if (!record) return { ok: false, error: 'Pasted session data is not a JSON object' }
  const accessToken = findAccessToken(record)
  if (!accessToken) {
    return { ok: false, error: 'Could not find an access token field in the pasted session JSON (expected accessToken, access_token, sessionToken, or tokens.access_token)' }
  }
  if (accessToken.split('.').length !== JWT_SEGMENTS) return { ok: false, error: 'The access token field does not look like a valid JWT' }
  if (isExpired(record, accessToken, nowMs)) return { ok: false, error: 'Session is expired — sign in to chatgpt.com again and re-copy the session JSON' }
  const user = toObject(record.user)
  return { ok: true, session: { accessToken, email: (user && nonEmpty(user.email)) || undefined } }
}
