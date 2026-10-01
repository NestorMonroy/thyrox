/**
 * El refresco de Qoder: el cliente se autentica con Basic y además en el
 * formulario. Sin el extremo, el cliente o su secreto declarados no se intenta.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/qoder.ts` (MIT).
 */
import type { QoderOAuthConfig } from '../../oauth/flows/qoderFlow.ts'
import { buildFormParams, extractOAuthErrorCode } from '../refreshErrors.ts'
import { FORM_HEADERS, type RefreshDeps, type RefreshOutcome, unrecoverableFor } from './refreshResult.ts'

export async function refreshQoderToken(refreshToken: string, deps: RefreshDeps & { config: QoderOAuthConfig }): Promise<RefreshOutcome> {
  const { tokenUrl, clientId, clientSecret } = deps.config
  if (!tokenUrl || !clientId || !clientSecret) {
    deps.log?.warn?.('TOKEN_REFRESH', 'Qoder OAuth refresh skipped: browser OAuth is not configured in this environment')
    return null
  }
  const fetch = deps.fetch ?? globalThis.fetch
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { ...FORM_HEADERS, Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}` },
    body: buildFormParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh Qoder token', { status: response.status, error: errorText })
    return unrecoverableFor(extractOAuthErrorCode(errorText))
  }
  const tokens = (await response.json()) as Record<string, unknown>
  deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Qoder token', { hasNewAccessToken: Boolean(tokens.access_token), hasNewRefreshToken: Boolean(tokens.refresh_token), expiresIn: tokens.expires_in })
  return { accessToken: tokens.access_token as string, refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn: tokens.expires_in as number | undefined }
}
