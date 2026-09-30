/**
 * El refresco de GitLab Duo contra la instancia de la conexión. El inicio usa
 * PKCE, pero el refresco sólo pide cliente y refresh token.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/gitlabDuo.ts` (MIT).
 */
import type { GitlabDuoConfig } from '../../oauth/flows/gitlabDuoFlow.ts'
import { buildFormParams } from '../refreshErrors.ts'
import { FORM_HEADERS, type RefreshDeps, type RefreshOutcome, unrecoverableFor } from './refreshResult.ts'

const ERROR_EXCERPT = 200

function instanceBaseUrl(providerSpecificData: Record<string, unknown> | null | undefined, config: GitlabDuoConfig): string {
  const declared = typeof providerSpecificData?.baseUrl === 'string' ? providerSpecificData.baseUrl.trim() : ''
  return (declared || config.baseUrl).replace(/\/$/, '')
}

export async function refreshGitLabDuoToken(refreshToken: string, providerSpecificData: Record<string, unknown> | null | undefined, deps: RefreshDeps & { config: GitlabDuoConfig }): Promise<RefreshOutcome> {
  if (!refreshToken) {
    deps.log?.warn?.('TOKEN_REFRESH', 'No refresh token for GitLab Duo')
    return null
  }
  const fetch = deps.fetch ?? globalThis.fetch
  const clientId = (providerSpecificData?.clientId as string) || deps.config.clientId || ''
  try {
    const response = await fetch(`${instanceBaseUrl(providerSpecificData, deps.config)}/oauth/token`, {
      method: 'POST',
      headers: { ...FORM_HEADERS },
      body: buildFormParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      let dead = null
      try {
        dead = unrecoverableFor((JSON.parse(errorText) as { error?: string }).error ?? null)
      } catch {
        // no es JSON: fallo pasajero
      }
      if (dead) {
        deps.log?.error?.('TOKEN_REFRESH', 'GitLab Duo refresh token invalid. Re-authentication required.', { errorCode: dead.code })
        return dead
      }
      deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh GitLab Duo token', { status: response.status, error: errorText.slice(0, ERROR_EXCERPT) })
      return null
    }
    const tokens = (await response.json()) as Record<string, unknown>
    deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed GitLab Duo token', { hasNewAccessToken: Boolean(tokens.access_token), hasNewRefreshToken: Boolean(tokens.refresh_token), expiresIn: tokens.expires_in })
    return { accessToken: tokens.access_token as string, refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn: tokens.expires_in as number | undefined }
  } catch (error) {
    deps.log?.error?.('TOKEN_REFRESH', `Network error refreshing GitLab Duo token: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}
