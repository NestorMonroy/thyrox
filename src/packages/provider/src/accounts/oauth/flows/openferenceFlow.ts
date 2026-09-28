/**
 * Openference: código con PKCE sobre un puerto fijo de loopback; la cuenta
 * se nombra por el id token OIDC o, si no lo trae, por el userinfo.
 *
 * Porte de `omniroute: src/lib/oauth/providers/openference.ts` y de
 * `OPENFERENCE_CONFIG` en `constants/oauth.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'
import { type ClientIdSource, type Environment, readVariable, requireClientId } from './clientId.ts'

const AUTHORIZE_URL = 'https://openference.com/app/oauth/authorize'
const TOKEN_URL = 'https://openference.com/oauth/token'
const USERINFO_URL = 'https://openference.com/oauth/userinfo'
const SCOPE = 'openid profile email model:invoke offline_access'
const LOOPBACK_PORT = 56123
const JWT_PARTS = 3

export function openferenceOAuthConfig(env: Environment = process.env): ClientIdSource {
  return { clientId: readVariable(env, 'THYROX_OPENFERENCE_OAUTH_CLIENT_ID'), clientIdVariable: 'THYROX_OPENFERENCE_OAUTH_CLIENT_ID' }
}

export interface OpenferenceIdentity {
  email: string | null
  name: string | null
}

/** El correo y el nombre que declara el id token, sin verificar su firma. */
export function decodeOpenferenceIdTokenIdentity(idToken: unknown): OpenferenceIdentity {
  if (typeof idToken !== 'string') return { email: null, name: null }
  const parts = idToken.split('.')
  if (parts.length !== JWT_PARTS) return { email: null, name: null }
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as JsonRecord
    return { email: (payload.email || payload.preferred_username || null) as string | null, name: (payload.name || null) as string | null }
  } catch {
    return { email: null, name: null }
  }
}

function firstText(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return null
}

export function createOpenferenceFlow(deps: { config: ClientIdSource; fetch?: typeof globalThis.fetch }): OAuthProviderFlow<ClientIdSource> {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    config: deps.config,
    flowType: 'authorization_code_pkce',
    fixedPort: LOOPBACK_PORT,
    callbackPath: '/callback',
    callbackHost: '127.0.0.1',

    buildAuthUrl: (config, redirectUri, state, codeChallenge) => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: requireClientId(config),
        redirect_uri: redirectUri,
        scope: SCOPE,
        code_challenge: codeChallenge ?? '',
        code_challenge_method: 'S256',
        state,
      })
      return `${AUTHORIZE_URL}?${params.toString()}`
    },

    async exchangeToken(config, code, redirectUri, codeVerifier) {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: requireClientId(config), code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
      })
      if (!response.ok) throw new Error(`Openference token exchange failed: ${await response.text()}`)
      return (await response.json()) as JsonRecord
    },

    async postExchange(tokens) {
      const response = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' } })
      return { userInfo: response.ok ? ((await response.json()) as JsonRecord) : {} }
    },

    mapTokens: (tokens, extra) => {
      const identity = decodeOpenferenceIdTokenIdentity(tokens.id_token)
      const userInfo = ((extra as { userInfo?: JsonRecord } | null)?.userInfo ?? {}) as JsonRecord
      const email = identity.email || firstText(userInfo.email, userInfo.preferred_username)
      const name = identity.name || firstText(userInfo.name, userInfo.email, userInfo.preferred_username) || email
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiresIn: tokens.expires_in,
        email,
        name,
        providerSpecificData: { scope: tokens.scope || SCOPE, tokenType: tokens.token_type || 'Bearer' },
      }
    },
  }
}
