/**
 * Las cuentas de Kiro que entran por el IdP de la organización («Your
 * organization», casi siempre Microsoft Entra): su token lo emite ese IdP y se
 * refresca contra su propio extremo, como cliente público, sin secreto. El
 * extremo sale de un archivo en disco, así que sólo se admite https en un IdP
 * conocido.
 *
 * Porte de `omniroute: open-sse/services/kiroExternalIdp.ts` (MIT).
 */
import { decodeJwtPayload } from '../jwtPayload.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'

export const KIRO_EXTERNAL_IDP_AUTH_METHOD = 'external_idp'
/** CodeWhisperer ata el bearer del IdP a su perfil sólo con esta cabecera. */
export const KIRO_EXTERNAL_IDP_TOKEN_TYPE_HEADER = 'TokenType'
export const KIRO_EXTERNAL_IDP_TOKEN_TYPE_VALUE = 'EXTERNAL_IDP'

/** Hosts exactos, o sufijos si empiezan por punto. */
const ALLOWED_IDP_HOST_SUFFIXES: readonly string[] = [
  'login.microsoftonline.com',
  'login.microsoftonline.us',
  'login.partner.microsoftonline.cn',
  'login.microsoft.com',
  'login.windows.net',
  'sts.windows.net',
  '.okta.com',
  '.oktapreview.com',
  '.okta-emea.com',
  '.auth0.com',
  '.onelogin.com',
  '.pingidentity.com',
  '.pingone.com',
  'accounts.google.com',
  'oauth2.googleapis.com',
  '.amazoncognito.com',
]

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function isExternalIdpAuthMethod(authMethod: unknown): boolean {
  return normalizeString(authMethod).toLowerCase() === KIRO_EXTERNAL_IDP_AUTH_METHOD
}

/** El extremo de tokens normalizado, o un error si no es https en un IdP admitido. */
export function validateExternalIdpTokenEndpoint(rawEndpoint: unknown): string {
  const tokenEndpoint = normalizeString(rawEndpoint)
  if (!tokenEndpoint) throw new Error('tokenEndpoint is required for external_idp')
  let parsed: URL
  try {
    parsed = new URL(tokenEndpoint)
  } catch {
    throw new Error('tokenEndpoint must be a valid URL')
  }
  if (parsed.protocol !== 'https:') throw new Error('tokenEndpoint must use https')
  const host = parsed.hostname.toLowerCase()
  const allowed = ALLOWED_IDP_HOST_SUFFIXES.some(suffix => (suffix.startsWith('.') ? host.endsWith(suffix) : host === suffix))
  if (!allowed) throw new Error(`tokenEndpoint host is not an allowed identity provider: ${host}`)
  return parsed.toString()
}

/** Los alcances, de arreglo o de texto, como una sola cadena separada por espacios. */
export function normalizeScope(scopes: unknown): string {
  if (Array.isArray(scopes)) return scopes.map(normalizeString).filter(Boolean).join(' ')
  return normalizeString(scopes)
}

/** El IdP de empresa pone el nombre en `preferred_username` o `upn`, no siempre en `email`. */
export function emailFromExternalIdpToken(accessToken: unknown): string | null {
  const claims = decodeJwtPayload(accessToken)
  if (!claims) return null
  const pick = (key: string) => (typeof claims[key] === 'string' ? (claims[key] as string) : undefined)
  return pick('email') || pick('preferred_username') || pick('upn') || null
}

export interface ExternalIdpRefreshRequest {
  tokenEndpoint: string
  body: URLSearchParams
}

/** El grant `refresh_token` de cliente público; falla cerrado si falta cualquier campo. */
export function buildExternalIdpRefreshParams(refreshToken: string, providerSpecificData: JsonRecord | null | undefined): ExternalIdpRefreshRequest {
  const data = providerSpecificData || {}
  const clientId = normalizeString(data.clientId ?? data.client_id)
  const tokenEndpoint = validateExternalIdpTokenEndpoint(data.tokenEndpoint ?? data.token_endpoint)
  const scope = normalizeScope(data.scope ?? data.scopes)
  if (!refreshToken) throw new Error('refresh token is required for external_idp refresh')
  if (!clientId) throw new Error('clientId is required for external_idp refresh')
  if (!scope) throw new Error('scope is required for external_idp refresh')
  return { tokenEndpoint, body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshToken, scope }) }
}
