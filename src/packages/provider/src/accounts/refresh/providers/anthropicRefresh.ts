/**
 * El refresco de un token OAuth de Anthropic: formulario con el cliente y la
 * beta de OAuth. Un token muerto se reconoce en cualquier forma de cuerpo.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/claudeOAuth.ts` (MIT).
 */
import type { AnthropicOAuthConfig } from '../../oauth/flows/anthropicFlow.ts'
import { requireClientId } from '../../oauth/flows/clientId.ts'
import { buildFormParams, readRefreshErrorBody } from '../refreshErrors.ts'
import { FORM_HEADERS, type RefreshDeps, type RefreshOutcome, unrecoverableFor } from './refreshResult.ts'

const ERROR_EXCERPT = 300

export async function refreshAnthropicOAuthToken(refreshToken: string, deps: RefreshDeps & { config: AnthropicOAuthConfig }): Promise<RefreshOutcome> {
  const fetch = deps.fetch ?? globalThis.fetch
  const params = buildFormParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: requireClientId(deps.config) })
  try {
    const response = await fetch(deps.config.tokenUrl, { method: 'POST', headers: { ...FORM_HEADERS, 'anthropic-beta': 'oauth-2025-04-20' }, body: params.toString() })
    if (!response.ok) {
      const { rawText, code } = await readRefreshErrorBody(response)
      deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh Anthropic OAuth token', { status: response.status, error: rawText.slice(0, ERROR_EXCERPT) })
      return unrecoverableFor(code)
    }
    const tokens = (await response.json()) as Record<string, unknown>
    deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Anthropic OAuth token', { hasNewAccessToken: Boolean(tokens.access_token), hasNewRefreshToken: Boolean(tokens.refresh_token), expiresIn: tokens.expires_in })
    return { accessToken: tokens.access_token as string, refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn: tokens.expires_in as number | undefined }
  } catch (error) {
    deps.log?.error?.('TOKEN_REFRESH', `Network error refreshing Anthropic token: ${(error as Error).message}`)
    return null
  }
}
