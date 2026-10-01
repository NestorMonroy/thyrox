/**
 * El refresco de un proveedor sin ruta propia: el grant `refresh_token`
 * contra su extremo de tokens, con el cliente que declare.
 *
 * Porte de `refreshAccessToken` en `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
import { extractOAuthErrorCode } from './refreshErrors.ts'
import { FORM_HEADERS, type RefreshDeps, type RefreshOutcome, unrecoverableFor } from './providers/refreshResult.ts'

export interface TokenEndpoint {
  refreshUrl?: string
  tokenUrl?: string
  clientId?: string | null
  clientSecret?: string | null
}

export async function refreshWithTokenEndpoint(provider: string, refreshToken: string, endpoint: TokenEndpoint | null | undefined, deps: RefreshDeps = {}): Promise<RefreshOutcome> {
  const fetch = deps.fetch ?? globalThis.fetch
  const url = endpoint?.refreshUrl || endpoint?.tokenUrl
  if (!endpoint || !url) {
    deps.log?.warn?.('TOKEN_REFRESH', `No refresh endpoint configured for provider: ${provider}`)
    return null
  }
  if (!refreshToken) {
    deps.log?.warn?.('TOKEN_REFRESH', `No refresh token available for provider: ${provider}`)
    return null
  }
  try {
    const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
    if (endpoint.clientId) params.set('client_id', endpoint.clientId)
    if (endpoint.clientSecret) params.set('client_secret', endpoint.clientSecret)
    const response = await fetch(url, { method: 'POST', headers: { ...FORM_HEADERS }, body: params })
    if (!response.ok) {
      const errorText = await response.text()
      deps.log?.error?.('TOKEN_REFRESH', `Failed to refresh token for ${provider}`, { status: response.status, error: errorText })
      return unrecoverableFor(extractOAuthErrorCode(errorText))
    }
    const tokens = (await response.json()) as Record<string, unknown>
    deps.log?.info?.('TOKEN_REFRESH', `Successfully refreshed token for ${provider}`, { hasNewAccessToken: Boolean(tokens.access_token), hasNewRefreshToken: Boolean(tokens.refresh_token), expiresIn: tokens.expires_in })
    return { accessToken: tokens.access_token as string, refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn: tokens.expires_in as number | undefined }
  } catch (error) {
    deps.log?.error?.('TOKEN_REFRESH', `Error refreshing token for ${provider}`, { error: (error as Error).message })
    return null
  }
}
