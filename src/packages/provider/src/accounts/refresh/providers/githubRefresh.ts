/**
 * El refresco de un token de GitHub: formulario con el cliente y, si el
 * operador lo declara, su secreto. Un fallo de red se propaga: lo reintenta
 * quien llama.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/github.ts` (MIT).
 */
import type { GithubDeviceConfig } from '../../oauth/flows/githubDeviceFlow.ts'
import { GITHUB_OAUTH_ENDPOINTS } from '../../oauth/flows/githubFlow.ts'
import { buildFormParams, extractOAuthErrorCode } from '../refreshErrors.ts'
import { FORM_HEADERS, type RefreshDeps, type RefreshOutcome, unrecoverableFor } from './refreshResult.ts'

export async function refreshGithubToken(refreshToken: string, deps: RefreshDeps & { config: GithubDeviceConfig; clientSecret?: string | null }): Promise<RefreshOutcome> {
  const fetch = deps.fetch ?? globalThis.fetch
  const response = await fetch(GITHUB_OAUTH_ENDPOINTS.tokenUrl, {
    method: 'POST',
    headers: { ...FORM_HEADERS },
    body: buildFormParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: deps.config.clientId, client_secret: deps.clientSecret }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh GitHub token', { status: response.status, error: errorText })
    return unrecoverableFor(extractOAuthErrorCode(errorText))
  }
  const tokens = (await response.json()) as Record<string, unknown>
  deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed GitHub token', { hasNewAccessToken: Boolean(tokens.access_token), hasNewRefreshToken: Boolean(tokens.refresh_token), expiresIn: tokens.expires_in })
  return { accessToken: tokens.access_token as string, refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn: tokens.expires_in as number | undefined }
}
