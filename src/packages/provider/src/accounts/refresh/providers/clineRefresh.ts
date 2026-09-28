/**
 * El refresco de Cline: JSON con campos en camelCase, y la vida del token sale
 * de la caducidad absoluta que declara (al menos un segundo).
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/cline.ts` (MIT).
 */
import { extractOAuthErrorCode } from '../refreshErrors.ts'
import { type RefreshDeps, type RefreshOutcome, unrecoverableFor } from './refreshResult.ts'

const CLINE_REFRESH_URL = 'https://api.cline.bot/api/v1/auth/refresh'
const MILLISECONDS_PER_SECOND = 1000

export async function refreshClineToken(refreshToken: string, deps: RefreshDeps & { now?: () => number }): Promise<RefreshOutcome> {
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  try {
    const response = await fetch(CLINE_REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken, grantType: 'refresh_token', clientType: 'extension' }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh Cline token', { status: response.status, error: errorText })
      return unrecoverableFor(extractOAuthErrorCode(errorText))
    }
    const payload = (await response.json()) as Record<string, unknown>
    const data = ((payload?.data as Record<string, unknown>) || payload) as Record<string, unknown>
    const expiresIn = data.expiresAt ? Math.max(1, Math.floor((new Date(data.expiresAt as string).getTime() - now()) / MILLISECONDS_PER_SECOND)) : undefined
    deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Cline token', { hasNewAccessToken: Boolean(data.accessToken), hasNewRefreshToken: Boolean(data.refreshToken), expiresIn })
    return { accessToken: data.accessToken as string, refreshToken: (data.refreshToken as string) || refreshToken, expiresIn }
  } catch (error) {
    deps.log?.error?.('TOKEN_REFRESH', `Network error refreshing Cline token: ${(error as Error).message}`)
    return null
  }
}
