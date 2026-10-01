/**
 * La renovación del token de Kimi web: `GET /api/auth/token/refresh` con el
 * refresh token como portador, desde el origen del sitio. Devuelve el
 * resultado en vez de lanzar, y la variante de conexión lo persiste.
 *
 * Porte de `omniroute: src/lib/kimi/tokenRefresh.ts` y de `getKimiWebBaseUrl`
 * en `open-sse/executors/kimi-web.ts` (MIT).
 */
import { sanitizeErrorMessage } from '../../sanitize/errorSanitization.ts'
import { type Environment, readVariable } from '../oauth/flows/clientId.ts'
import { kimiTokenExpiration } from './kimiJwt.ts'

const DEFAULT_BASE_URL = 'https://www.kimi.ai'
const REFRESH_PATH = '/api/auth/token/refresh'
/** Un token opaco, sin caducidad legible, se da por válido quince minutos. */
const OPAQUE_TOKEN_LIFETIME_SEC = 900
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'

type Row = Record<string, unknown>

export interface KimiWebRefreshResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiresAtSec?: number
  error?: string
}

export interface KimiWebExchangeDeps {
  fetch?: typeof globalThis.fetch
  env?: Environment
  now?: () => number
  baseUrl?: string
}

export type KimiWebExchange = (refreshToken: string) => Promise<KimiWebRefreshResult>

const withoutTrailingSlashes = (url: string) => url.replace(/\/+$/, '')

export function kimiWebBaseUrl(env: Environment = process.env): string {
  return withoutTrailingSlashes(readVariable(env, 'THYROX_KIMI_WEB_BASE_URL') ?? DEFAULT_BASE_URL)
}

export async function exchangeKimiWebRefreshToken(refreshToken: string, deps: KimiWebExchangeDeps = {}): Promise<KimiWebRefreshResult> {
  const token = String(refreshToken ?? '').trim()
  if (!token) return { success: false, error: 'No refresh_token provided' }
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  const baseUrl = withoutTrailingSlashes(deps.baseUrl || kimiWebBaseUrl(deps.env ?? process.env))
  try {
    const response = await fetch(`${baseUrl}${REFRESH_PATH}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json, text/plain, */*',
        Origin: baseUrl,
        Referer: `${baseUrl}/`,
        'User-Agent': BROWSER_USER_AGENT,
      },
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { success: false, error: `Kimi refresh returned HTTP ${response.status}: ${sanitizeErrorMessage(body)}` }
    }
    const data = (await response.json()) as Row | null
    const accessToken = data?.access_token
    if (!accessToken || typeof accessToken !== 'string') return { success: false, error: 'Invalid response from Kimi: missing access_token' }
    const expiresAtSec = kimiTokenExpiration(accessToken, now())?.expiresAtSec || Math.floor(now() / 1000) + OPAQUE_TOKEN_LIFETIME_SEC
    return { success: true, accessToken, refreshToken: (data?.refresh_token as string) || token, expiresAtSec }
  } catch (error) {
    return { success: false, error: `Network error refreshing Kimi token: ${error instanceof Error ? error.message : 'unknown'}` }
  }
}

/** Lo que se escribe en la conexión tras una renovación con éxito. */
export function kimiWebRefreshedUpdate(result: KimiWebRefreshResult): Row {
  return {
    apiKey: result.accessToken,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.expiresAtSec ? new Date(result.expiresAtSec * 1000).toISOString() : undefined,
    testStatus: 'active',
    lastError: null,
    errorCode: null,
  }
}

/** El refresh token de la conexión, o el que guardó en sus datos de proveedor. */
export function kimiWebRefreshToken(connection: Row): string {
  if (typeof connection.refreshToken === 'string' && connection.refreshToken) return connection.refreshToken
  const data = connection.providerSpecificData as Row | undefined
  return typeof data?.refreshToken === 'string' ? data.refreshToken : ''
}

export interface KimiWebConnectionStore {
  getById: (id: string) => Row | null
  update: (id: string, data: Row) => unknown
}

export async function refreshKimiWebConnection(connectionId: string, deps: { store: KimiWebConnectionStore; exchange?: KimiWebExchange }): Promise<KimiWebRefreshResult> {
  const connection = deps.store.getById(connectionId)
  if (!connection) return { success: false, error: `Connection ${connectionId} not found` }
  const refreshToken = kimiWebRefreshToken(connection)
  if (!refreshToken) return { success: false, error: 'Connection does not contain a refresh_token' }
  const result = await (deps.exchange ?? exchangeKimiWebRefreshToken)(refreshToken)
  if (!result.success || !result.accessToken) return result
  await deps.store.update(connectionId, kimiWebRefreshedUpdate(result))
  return result
}
