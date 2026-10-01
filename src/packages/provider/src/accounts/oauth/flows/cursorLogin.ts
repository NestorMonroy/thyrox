/**
 * El login deep-control de Cursor: una URL con el reto PKCE que abre quien
 * inicia sesión, y un sondeo que devuelve los tokens cuando termina. El
 * verificador se queda en la sesión y nunca sale en la URL.
 *
 * Porte de `omniroute: src/lib/oauth/services/cursorLogin.ts` (MIT). Las
 * sesiones viven en la instancia, no en el módulo.
 */
import { randomUUID } from 'node:crypto'

import { generatePkce } from '../pkce.ts'

const LOGIN_URL = 'https://cursor.com/loginDeepControl'
const POLL_URL = 'https://api2.cursor.sh/auth/poll'
const SESSION_TTL_MS = 15 * 60 * 1000
const EXPIRY_SKEW_MS = 5 * 60 * 1000
const FALLBACK_TTL_MS = 60 * 60 * 1000
const MILLISECONDS_PER_SECOND = 1000
const PENDING_STATUS = 404
const JWT_PARTS = 3

export interface CursorTokenCredentials {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  accountId?: string
  email?: string
}

interface CursorSession {
  verifier: string
  challenge: string
  uuid: string
  loginUrl: string
  createdAt: number
  expiresAt: number
}

export type CursorPollResult =
  | { status: 'pending' }
  | { status: 'ok'; accessToken: string; refreshToken: string }
  | { status: 'error'; message: string; httpStatus?: number }

function jwtClaims(token: string): Record<string, unknown> | undefined {
  const parts = token.split('.')
  if (parts.length !== JWT_PARTS || !parts[1]) return undefined
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function accountIdOf(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  return typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : undefined
}

/** La caducidad del token, cinco minutos antes de su `exp`; sin `exp`, una hora desde ahora. */
export function cursorTokenExpiry(token: string, now: () => number = Date.now): Date {
  const exp = jwtClaims(token)?.exp
  return typeof exp === 'number' ? new Date(exp * MILLISECONDS_PER_SECOND - EXPIRY_SKEW_MS) : new Date(now() + FALLBACK_TTL_MS)
}

/** La cuenta (`sub`) y el email salen del JWT del access token o, si no, del refresh. */
export function credentialsFromCursorTokens(accessToken: string, refreshToken: string, now: () => number = Date.now): CursorTokenCredentials {
  const claims = jwtClaims(accessToken) ?? jwtClaims(refreshToken)
  const accountId = accountIdOf(claims?.sub)
  const email = typeof claims?.email === 'string' && claims.email.length > 0 ? claims.email.toLowerCase() : undefined
  return {
    accessToken,
    refreshToken,
    expiresAt: cursorTokenExpiry(accessToken, now),
    ...(accountId ? { accountId } : {}),
    ...(email ? { email } : {}),
  }
}

export interface CursorLogin {
  /** Abre una sesión: devuelve su id y la URL de login, nunca el verificador. */
  start(): { sessionId: string; loginUrl: string }
  view(sessionId: string): { uuid: string; loginUrl: string; expiresAt: number } | null
  peek(sessionId: string): CursorSession | null
  consume(sessionId: string): CursorSession | null
  cancel(sessionId: string): boolean
  pollOnce(uuid: string, verifier: string, signal?: AbortSignal): Promise<CursorPollResult>
}

export function createCursorLogin(deps: { fetch?: typeof globalThis.fetch; now?: () => number } = {}): CursorLogin {
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  const sessions = new Map<string, CursorSession>()

  const prune = () => {
    const at = now()
    for (const [id, session] of sessions) if (session.expiresAt <= at) sessions.delete(id)
  }
  const live = (sessionId: string) => {
    prune()
    return sessions.get(sessionId) ?? null
  }

  return {
    start() {
      prune()
      const { codeVerifier, codeChallenge } = generatePkce()
      const uuid = randomUUID()
      const params = new URLSearchParams({ challenge: codeChallenge, uuid, mode: 'login', redirectTarget: 'cli' })
      const loginUrl = `${LOGIN_URL}?${params.toString()}`
      const sessionId = randomUUID()
      const createdAt = now()
      sessions.set(sessionId, { verifier: codeVerifier, challenge: codeChallenge, uuid, loginUrl, createdAt, expiresAt: createdAt + SESSION_TTL_MS })
      return { sessionId, loginUrl }
    },

    view(sessionId) {
      const session = live(sessionId)
      return session ? { uuid: session.uuid, loginUrl: session.loginUrl, expiresAt: session.expiresAt } : null
    },

    peek: live,

    consume(sessionId) {
      const session = live(sessionId)
      if (session) sessions.delete(sessionId)
      return session
    },

    cancel(sessionId) {
      prune()
      return sessions.delete(sessionId)
    },

    async pollOnce(uuid, verifier, signal) {
      const url = `${POLL_URL}?uuid=${encodeURIComponent(uuid)}&verifier=${encodeURIComponent(verifier)}`
      try {
        const response = await fetch(url, { signal })
        if (response.status === PENDING_STATUS) return { status: 'pending' }
        if (!response.ok) return { status: 'error', message: `Cursor auth poll failed: ${response.status}`, httpStatus: response.status }
        const data = (await response.json()) as { accessToken?: string; refreshToken?: string }
        if (!data.accessToken || !data.refreshToken) return { status: 'error', message: 'Cursor auth response missing tokens' }
        return { status: 'ok', accessToken: data.accessToken, refreshToken: data.refreshToken }
      } catch (error) {
        if (signal?.aborted) return { status: 'error', message: 'Cursor login cancelled' }
        return { status: 'error', message: error instanceof Error ? error.message : String(error) }
      }
    },
  }
}
