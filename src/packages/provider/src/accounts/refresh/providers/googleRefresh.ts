/**
 * El refresco de un token de Google (antigravity, agy, gemini) con el cliente
 * que lo emitió. Sólo un `invalid_grant` en JSON se toma por token muerto.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/google.ts` (MIT).
 */
import type { GoogleClient } from '../googleClientBinding.ts'
import { buildFormParams } from '../refreshErrors.ts'
import { FORM_HEADERS, type RefreshDeps, type RefreshOutcome } from './refreshResult.ts'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ERROR_EXCERPT = 200

export async function refreshGoogleToken(refreshToken: string, client: GoogleClient, deps: RefreshDeps = {}): Promise<RefreshOutcome> {
  const fetch = deps.fetch ?? globalThis.fetch
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { ...FORM_HEADERS },
    body: buildFormParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: client.clientId, client_secret: client.clientSecret }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    deps.log?.error?.('TOKEN_REFRESH', 'Failed to refresh Google token', { status: response.status, error: errorText.slice(0, ERROR_EXCERPT) })
    try {
      if ((JSON.parse(errorText) as { error?: unknown }).error === 'invalid_grant') {
        deps.log?.error?.('TOKEN_REFRESH', 'Google refresh token invalid. Re-authentication required.', { provider: 'google' })
        return { error: 'unrecoverable_refresh_error', code: 'invalid_grant' }
      }
    } catch {
      // no es JSON: fallo pasajero
    }
    return null
  }
  const tokens = (await response.json()) as Record<string, unknown>
  deps.log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Google token', { hasNewAccessToken: Boolean(tokens.access_token), hasNewRefreshToken: Boolean(tokens.refresh_token), expiresIn: tokens.expires_in })
  return { accessToken: tokens.access_token as string, refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn: tokens.expires_in as number | undefined }
}
