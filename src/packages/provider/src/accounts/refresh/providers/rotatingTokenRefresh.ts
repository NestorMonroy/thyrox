/**
 * El refresco de un proveedor cuyo refresh token es de un solo uso (codex,
 * openference): formulario sin `scope` —pedirlo de nuevo cuenta como cambio
 * de alcance e invalida familias hermanas—, un código de token gastado o
 * inválido es definitivo, y cualquier 401 del extremo de tokens también.
 *
 * Porte de la forma común de `omniroute: open-sse/services/tokenRefresh/
 * providers/codex.ts` y `openference.ts` (MIT).
 */
import { requireClientId, type ClientIdSource } from '../../oauth/flows/clientId.ts'
import { buildFormParams } from '../refreshErrors.ts'
import { FORM_HEADERS, jsonErrorCode, type RefreshDeps, type RefreshOutcome } from './refreshResult.ts'

const UNAUTHORIZED = 401

export interface RotatingTokenProvider {
  label: string
  tokenUrl: string
  deadCodes: ReadonlySet<string>
}

export async function refreshRotatingToken(provider: RotatingTokenProvider, refreshToken: string, deps: RefreshDeps & { config: ClientIdSource }): Promise<RefreshOutcome> {
  const fetch = deps.fetch ?? globalThis.fetch
  const clientId = requireClientId(deps.config)
  try {
    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: { ...FORM_HEADERS },
      body: buildFormParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      const errorCode = jsonErrorCode(errorText)
      if (errorCode && provider.deadCodes.has(errorCode)) {
        deps.log?.error?.('TOKEN_REFRESH', `${provider.label} refresh token already used or invalid. Re-authentication required.`, { status: response.status, errorCode })
        return { error: 'unrecoverable_refresh_error', code: errorCode }
      }
      // El extremo de tokens rechaza la credencial misma: reintentar con ella nunca sirve.
      if (response.status === UNAUTHORIZED) {
        const code = errorCode || 'unauthorized'
        deps.log?.error?.('TOKEN_REFRESH', `${provider.label} OAuth token endpoint returned 401. Re-authentication required.`, { status: response.status, errorCode: code })
        return { error: 'unrecoverable_refresh_error', code }
      }
      deps.log?.error?.('TOKEN_REFRESH', `Failed to refresh ${provider.label} token`, { status: response.status, error: errorText })
      return null
    }
    const tokens = (await response.json()) as Record<string, unknown>
    deps.log?.info?.('TOKEN_REFRESH', `Successfully refreshed ${provider.label} token`, { hasNewAccessToken: Boolean(tokens.access_token), hasNewRefreshToken: Boolean(tokens.refresh_token), expiresIn: tokens.expires_in })
    return { accessToken: tokens.access_token as string, refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn: tokens.expires_in as number | undefined }
  } catch (error) {
    deps.log?.error?.('TOKEN_REFRESH', `Network error refreshing ${provider.label} token: ${(error as Error).message}`)
    return null
  }
}
