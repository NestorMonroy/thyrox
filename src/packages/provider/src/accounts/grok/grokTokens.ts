/**
 * Las formas en que llegan los tokens de Grok Build — la respuesta del
 * servidor de tokens (navegador o código de dispositivo), el JWT pegado y el
 * `auth.json` del CLI pegado — convergen en la misma conexión, para que el
 * refresco no dependa de cuál la obtuvo.
 *
 * Porte de `mapGrokBuildBrowserTokens`/`isGrokBuildBrowserTokens` de
 * `omniroute: src/lib/oauth/providers/grok-cli-oauth.ts` y de
 * `extractTokenAndRefresh`, `parseJwtPayload`, `resolveGrokIdentity`,
 * `resolveGrokExpiresIn` y `mapImportedToken` de `grok-cli.ts` (MIT).
 */
import { decodeXaiIdTokenIdentity } from '../oauth/flows/xaiOAuthFlow.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'
import { GROK_BUILD_OAUTH_ISSUER } from './grokBuild.ts'

export const GROK_BUILD_BROWSER_SCOPE = 'openid profile email offline_access grok-cli:access'
const DEFAULT_TTL_SECONDS = 21600
const MIN_TTL_SECONDS = 1
const MILLISECONDS_PER_SECOND = 1000
const JWT_PARTS = 3
const JWT_PREFIX = 'eyJ'

interface PastedToken {
  accessToken: string
  refreshToken: string | null
  rawAuthJson: JsonRecord | null
  expiresAt: string | null
}

/** La respuesta de un servidor de tokens lleva `access_token`; lo pegado, no. */
export function isGrokBuildBrowserTokens(tokens: unknown): tokens is JsonRecord {
  return !!tokens && typeof tokens === 'object' && typeof (tokens as JsonRecord).access_token === 'string'
}

/** Nunca una caducidad no positiva: se leería como «no caduca» y el refresco no llegaría. */
const clampTtl = (seconds: number) => Math.max(MIN_TTL_SECONDS, seconds)

export function mapGrokBuildBrowserTokens(tokens: JsonRecord): JsonRecord {
  const identity = decodeXaiIdTokenIdentity(tokens.id_token)
  const expiresIn = typeof tokens.expires_in === 'number' && Number.isFinite(tokens.expires_in) ? tokens.expires_in : DEFAULT_TTL_SECONDS
  return {
    accessToken: typeof tokens.access_token === 'string' ? tokens.access_token : '',
    refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : null,
    expiresIn: clampTtl(expiresIn),
    email: identity.email,
    name: identity.name || identity.email,
    providerSpecificData: {
      scope: typeof tokens.scope === 'string' ? tokens.scope : GROK_BUILD_BROWSER_SCOPE,
      tokenType: typeof tokens.token_type === 'string' ? tokens.token_type : 'Bearer',
      autoSync: true,
    },
  }
}

function decodeJwtPayload(token: string): JsonRecord | null {
  const parts = token.split('.')
  if (parts.length !== JWT_PARTS) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf-8')) as unknown
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as JsonRecord) : null
  } catch {
    return null
  }
}

/** El token de lo pegado: un JWT suelto, `{ accessToken }` o el `auth.json` del CLI. */
function extractPastedToken(input: unknown, clientId: string | null): PastedToken {
  const bare = (accessToken: string, refreshToken: string | null): PastedToken => ({ accessToken, refreshToken, rawAuthJson: null, expiresAt: null })
  if (typeof input === 'string') return bare(input, null)
  if (!input || typeof input !== 'object') return bare('', null)
  const record = input as JsonRecord

  // El `auth.json` puede venir envuelto una vez como `{ accessToken: {...} }`.
  const inner = typeof record.accessToken === 'object' && record.accessToken !== null ? (record.accessToken as JsonRecord) : record
  const preferredScope = clientId ? `${GROK_BUILD_OAUTH_ISSUER}::${clientId}` : null
  const keys = Object.keys(inner)
  const ordered = preferredScope && keys.includes(preferredScope) ? [preferredScope, ...keys.filter(key => key !== preferredScope)] : keys
  for (const key of ordered) {
    const entry = inner[key] as JsonRecord | null
    if (entry && typeof entry === 'object' && typeof entry.key === 'string' && entry.key.startsWith(JWT_PREFIX)) {
      return {
        accessToken: entry.key,
        refreshToken: typeof entry.refresh_token === 'string' ? entry.refresh_token : null,
        rawAuthJson: inner,
        expiresAt: typeof entry.expires_at === 'string' ? entry.expires_at : null,
      }
    }
  }

  if (typeof record.accessToken === 'string' && record.accessToken.length > 0) {
    return bare(record.accessToken, typeof record.refreshToken === 'string' ? record.refreshToken : null)
  }
  return bare('', null)
}

const claim = (payload: JsonRecord | null, key: string) => (typeof payload?.[key] === 'string' ? (payload[key] as string) : '')

/** Un principal de equipo u organización es la identidad de la cuenta. */
function resolveIdentity(payload: JsonRecord | null) {
  const principalType = claim(payload, 'principal_type')
  const principalId = claim(payload, 'principal_id')
  const type = principalType.toLowerCase()
  const isTeam = type === 'team' && Boolean(principalId)
  const isOrganization = type === 'organization' && Boolean(principalId)
  return {
    principalType: principalType || null,
    principalId: principalId || null,
    email: claim(payload, 'email') || null,
    userId: (isTeam || isOrganization ? principalId : claim(payload, 'sub')) || null,
    teamId: (isTeam ? principalId : claim(payload, 'team_id')) || null,
    organizationId: (isOrganization ? principalId : claim(payload, 'organization_id')) || null,
  }
}

/** La caducidad de `expires_at`; si no, la del `exp` del JWT; si no, seis horas. */
function resolveExpiresIn(pasted: PastedToken, payload: JsonRecord | null, nowMs: number): number {
  const nowSeconds = Math.floor(nowMs / MILLISECONDS_PER_SECOND)
  let expiresIn = DEFAULT_TTL_SECONDS
  if (pasted.expiresAt) {
    const parsed = Date.parse(pasted.expiresAt)
    if (!Number.isNaN(parsed)) expiresIn = Math.floor(parsed / MILLISECONDS_PER_SECOND) - nowSeconds
  } else if (typeof payload?.exp === 'number' && payload.exp) {
    expiresIn = payload.exp - nowSeconds
  }
  return clampTtl(expiresIn)
}

/** Lo pegado nunca trae id token, tipo ni alcance: esos campos quedan nulos. */
export function mapImportedGrokToken(token: unknown, options: { clientId: string | null; now: number }): JsonRecord {
  const pasted = extractPastedToken(token, options.clientId)
  const payload = decodeJwtPayload(pasted.accessToken)
  const identity = resolveIdentity(payload)
  return {
    accessToken: pasted.accessToken,
    refreshToken: pasted.refreshToken,
    idToken: null,
    expiresIn: resolveExpiresIn(pasted, payload, options.now),
    tokenType: null,
    scope: null,
    email: identity.email,
    providerSpecificData: {
      userId: identity.userId,
      email: identity.email,
      teamId: identity.teamId,
      tier: (payload?.tier as number) || 1,
      principalType: identity.principalType,
      principalId: identity.principalId,
      organizationId: identity.organizationId,
      rawAuthJson: pasted.rawAuthJson || undefined,
      autoSync: true,
    },
  }
}
