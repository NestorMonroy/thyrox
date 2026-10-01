/**
 * Lo que el refresco proactivo lee de una conexión guardada: cuándo caduca
 * su token, cuántas veces se reintentó estando expirada, y si es una
 * conexión de GitHub Copilot, que por diseño no tiene refresh token.
 *
 * Porte de las funciones de estado de `omniroute: src/lib/tokenHealthCheck.ts` (MIT).
 */
export type ProviderData = Record<string, unknown>

export interface HealthConnection {
  id?: string
  provider?: string
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: unknown
  tokenExpiresAt?: unknown
  testStatus?: string | null
  errorCode?: string | null
  providerSpecificData?: ProviderData | null
  expiredRetryCount?: number
  expiredRetryAt?: string | null
}

const NUMERIC_TEXT = /^\d+(\.\d+)?$/
/** Por debajo de esto una cifra son segundos desde la época; por encima, milisegundos. */
const EPOCH_MS_THRESHOLD = 1e12
const MS_PER_SECOND = 1000

const epochToMs = (value: number) => (!Number.isFinite(value) || value <= 0 ? 0 : value < EPOCH_MS_THRESHOLD ? value * MS_PER_SECOND : value)

/**
 * La caducidad en milisegundos desde la época: cifra en segundos o en
 * milisegundos, como número o como texto (las columnas son de texto), o una
 * fecha. Cero si no hay un instante utilizable.
 */
export function parseTokenExpiryMs(expiresAt: unknown): number {
  if (typeof expiresAt === 'number') return epochToMs(expiresAt)
  if (typeof expiresAt !== 'string') return 0
  const text = expiresAt.trim()
  if (!text) return 0
  if (NUMERIC_TEXT.test(text)) return epochToMs(Number(text))
  const parsed = new Date(text).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

export function effectiveTokenExpiryMs(connection: HealthConnection | null | undefined): number {
  if (!connection || typeof connection !== 'object') return 0
  return parseTokenExpiryMs(connection.tokenExpiresAt || connection.expiresAt || null)
}

export function providerData(connection: HealthConnection | null | undefined): ProviderData {
  const data = connection?.providerSpecificData
  return typeof data === 'object' && data !== null ? data : {}
}

interface ExpiredRetry {
  count?: number
  at?: string
}

const storedExpiredRetry = (connection: HealthConnection) => providerData(connection).expiredRetry as ExpiredRetry | undefined

export function expiredRetryCount(connection: HealthConnection): number {
  return storedExpiredRetry(connection)?.count ?? connection.expiredRetryCount ?? 0
}

export function expiredRetryAt(connection: HealthConnection): string | null {
  return storedExpiredRetry(connection)?.at ?? connection.expiredRetryAt ?? null
}

export function withExpiredRetry(data: ProviderData, count: number, at: string): ProviderData {
  return { ...data, expiredRetry: { count, at } }
}

export function withClearedExpiredRetry(data: ProviderData): ProviderData {
  const next = { ...data }
  delete next.expiredRetry
  return next
}

/** GitHub y GHE Copilot entregan sólo un access token de GitHub y un subtoken corto de Copilot. */
const GITHUB_ACCESS_TOKEN_ONLY_PROVIDERS = new Set(['github', 'ghe-copilot'])
const GITHUB_API_BASE_URL = 'https://api.github.com'

const providerId = (connection: HealthConnection | null | undefined) => String(connection?.provider || '').toLowerCase()

export function isGithubAccessTokenOnlyConnection(connection: HealthConnection): boolean {
  return GITHUB_ACCESS_TOKEN_ONLY_PROVIDERS.has(providerId(connection)) && typeof connection.accessToken === 'string' && connection.accessToken.trim().length > 0
}

/** GHE Copilot pide el subtoken a su propio host; github.com, a api.github.com. */
export function copilotTokenBaseUrl(connection: HealthConnection): string {
  if (providerId(connection) === 'ghe-copilot') {
    const gheUrl = providerData(connection).gheUrl
    if (typeof gheUrl === 'string' && gheUrl.trim()) return `${gheUrl.trim().replace(/\/+$/, '')}/api/v3`
  }
  return GITHUB_API_BASE_URL
}

export function canClearGithubNoRefreshTokenState(connection: HealthConnection): boolean {
  return !connection.testStatus || connection.testStatus === 'active' || (connection.testStatus === 'expired' && connection.errorCode === 'no_refresh_token')
}
