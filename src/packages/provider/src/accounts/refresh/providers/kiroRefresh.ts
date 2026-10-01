/**
 * El refresco de Kiro por el camino que corresponde al token: el IdP de la
 * organización, el OIDC de AWS (con un re-registro de cliente y un reintento si
 * el cliente guardado ya no sirve) o el servicio social de Kiro. A diferencia
 * de `kiroService.refreshToken`, aquí un token muerto se devuelve marcado y un
 * fallo pasajero como `null`, que es lo que el refresco periódico necesita.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/providers/kiro.ts` (MIT).
 */
import { buildExternalIdpRefreshParams, isExternalIdpAuthMethod } from '../../kiro/kiroExternalIdp.ts'
import { AWS_REGION_PATTERN } from '../../kiro/kiroRegion.ts'
import { createKiroService, type KiroClientRegistration } from '../../kiro/kiroService.ts'
import type { KiroOAuthConfig } from '../../oauth/flows/kiroFlow.ts'
import { KIRO_AUTH_SERVICE } from '../../oauth/flows/kiroSocialLogin.ts'
import { FORM_HEADERS, type RefreshDeps, type RefreshedTokens, type RefreshOutcome } from './refreshResult.ts'

const DEFAULT_REGION = 'us-east-1'
const DEFAULT_EXPIRES_IN_SECONDS = 3600
const ERROR_EXCERPT = 200
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' }
const IDP_DEAD_CODES = new Set(['invalid_grant', 'invalid_client'])
const AWS_DEAD_CODES = new Set(['InvalidGrantException', 'ExpiredTokenException', 'invalid_grant'])

type KiroRefreshOutcome = RefreshOutcome | (RefreshedTokens & { newClient?: KiroClientRegistration })

function parsedError(errorText: string): Record<string, unknown> | null {
  try {
    return JSON.parse(errorText) as Record<string, unknown>
  } catch {
    return null
  }
}

/** El tipo de error de AWS (`__type`) o el código OAuth. */
const awsErrorType = (errorText: string) => {
  const parsed = parsedError(errorText)
  return (parsed?.__type || parsed?.error) as string | undefined
}

export async function refreshKiroToken(refreshToken: string, providerSpecificData: Record<string, unknown> | null | undefined, deps: RefreshDeps & { config: KiroOAuthConfig }): Promise<KiroRefreshOutcome> {
  const fetch = deps.fetch ?? globalThis.fetch
  const data = providerSpecificData ?? {}
  const log = deps.log
  try {
    if (isExternalIdpAuthMethod(data.authMethod)) {
      let request: ReturnType<typeof buildExternalIdpRefreshParams>
      try {
        request = buildExternalIdpRefreshParams(refreshToken, data)
      } catch (error) {
        log?.error?.('TOKEN_REFRESH', `Invalid Kiro external_idp refresh config: ${(error as Error).message}`)
        return null
      }
      const response = await fetch(request.tokenEndpoint, { method: 'POST', headers: { ...FORM_HEADERS }, body: request.body })
      if (!response.ok) {
        const errorText = await response.text()
        const code = parsedError(errorText)?.error as string | undefined
        if (code && IDP_DEAD_CODES.has(code)) {
          log?.error?.('TOKEN_REFRESH', 'Kiro external_idp refresh token expired/invalid. Re-authentication required.', { oauthErr: code })
          return { error: 'unrecoverable_refresh_error', code }
        }
        log?.error?.('TOKEN_REFRESH', 'Failed to refresh Kiro external_idp token', { status: response.status, error: errorText.slice(0, ERROR_EXCERPT) })
        return null
      }
      const tokens = (await response.json()) as Record<string, unknown>
      log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Kiro external_idp token', { hasNewAccessToken: Boolean(tokens.access_token), hasNewRefreshToken: Boolean(tokens.refresh_token), expiresIn: tokens.expires_in })
      return { accessToken: tokens.access_token as string, refreshToken: (tokens.refresh_token as string) || refreshToken, expiresIn: (tokens.expires_in as number) || DEFAULT_EXPIRES_IN_SECONDS }
    }

    const clientId = data.clientId as string | undefined
    const clientSecret = data.clientSecret as string | undefined
    // Un token social importado trae cliente registrado, pero ese cliente no sabe refrescarlo.
    if (clientId && clientSecret && data.authMethod !== 'imported') {
      const region = (data.region as string) || DEFAULT_REGION
      if (!AWS_REGION_PATTERN.test(region)) {
        log?.error?.('TOKEN_REFRESH', `Invalid Kiro region: ${region}`)
        return null
      }
      const endpoint = `https://oidc.${region}.amazonaws.com/token`
      const oidcBody = (client: { clientId: string; clientSecret: string }) => JSON.stringify({ clientId: client.clientId, clientSecret: client.clientSecret, refreshToken, grantType: 'refresh_token' })
      const response = await fetch(endpoint, { method: 'POST', headers: JSON_HEADERS, body: oidcBody({ clientId, clientSecret }) })
      if (!response.ok) {
        const errorText = await response.text()
        const errorType = awsErrorType(errorText)
        if (errorType && AWS_DEAD_CODES.has(errorType)) {
          log?.error?.('TOKEN_REFRESH', 'Kiro AWS refresh token expired/invalid. Re-authentication required.', { awsErrorType: errorType })
          return { error: 'unrecoverable_refresh_error', code: errorType }
        }
        log?.warn?.('TOKEN_REFRESH', 'Kiro OIDC refresh failed, attempting client re-registration...', { status: response.status, error: errorText.slice(0, ERROR_EXCERPT) })
        try {
          const newClient = await createKiroService({ config: deps.config, fetch }).registerClient(region)
          const retry = await fetch(endpoint, { method: 'POST', headers: JSON_HEADERS, body: oidcBody(newClient) })
          if (retry.ok) {
            const tokens = (await retry.json()) as Record<string, unknown>
            log?.info?.('TOKEN_REFRESH', 'Kiro refresh recovered via client re-registration', { hasNewAccessToken: Boolean(tokens.accessToken), expiresIn: tokens.expiresIn })
            return { accessToken: tokens.accessToken as string, refreshToken: (tokens.refreshToken as string) || refreshToken, expiresIn: tokens.expiresIn as number | undefined, newClient }
          }
        } catch (error) {
          log?.warn?.('TOKEN_REFRESH', 'Kiro client re-registration fallback failed', { error: String(error) })
        }
        log?.error?.('TOKEN_REFRESH', 'Failed to refresh Kiro AWS token', { status: response.status, error: errorText.slice(0, ERROR_EXCERPT) })
        return null
      }
      const tokens = (await response.json()) as Record<string, unknown>
      log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Kiro AWS token', { hasNewAccessToken: Boolean(tokens.accessToken), expiresIn: tokens.expiresIn })
      return { accessToken: tokens.accessToken as string, refreshToken: (tokens.refreshToken as string) || refreshToken, expiresIn: tokens.expiresIn as number | undefined }
    }

    const response = await fetch(`${KIRO_AUTH_SERVICE}/refreshToken`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ refreshToken }) })
    if (!response.ok) {
      const errorText = await response.text()
      const errorType = awsErrorType(errorText)
      if (errorType && AWS_DEAD_CODES.has(errorType)) {
        log?.error?.('TOKEN_REFRESH', 'Kiro social refresh token expired/invalid. Re-authentication required.', { awsErrorType: errorType })
        return { error: 'unrecoverable_refresh_error', code: errorType }
      }
      log?.error?.('TOKEN_REFRESH', 'Failed to refresh Kiro social token', { status: response.status, error: errorText.slice(0, ERROR_EXCERPT) })
      return null
    }
    const tokens = (await response.json()) as Record<string, unknown>
    log?.info?.('TOKEN_REFRESH', 'Successfully refreshed Kiro social token', { hasNewAccessToken: Boolean(tokens.accessToken), expiresIn: tokens.expiresIn })
    return { accessToken: tokens.accessToken as string, refreshToken: (tokens.refreshToken as string) || refreshToken, expiresIn: tokens.expiresIn as number | undefined }
  } catch (error) {
    log?.error?.('TOKEN_REFRESH', `Network error refreshing Kiro token: ${(error as Error).message}`)
    return null
  }
}
