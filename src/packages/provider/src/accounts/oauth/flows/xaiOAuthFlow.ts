/**
 * xAI OAuth: código con PKCE de 96 bytes sobre un puerto fijo, con un nonce
 * nuevo por intento; la cuenta se nombra por el id token que devuelve el
 * servidor de tokens (sólo para mostrarla: la autorización la valida xAI).
 *
 * Porte de `omniroute: src/lib/oauth/providers/xai-oauth.ts` y de
 * `XAI_OAUTH_CONFIG` en `constants/oauth.ts` (MIT).
 */
import { randomBytes } from 'node:crypto'

import { encodeQuery, GROK_BUILD_AUTHORIZE_URL, GROK_BUILD_TOKEN_URL } from '../../grok/grokBuild.ts'
import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'
import { type ClientIdSource, requireClientId } from './clientId.ts'

const SCOPE = 'openid profile email offline_access grok-cli:access api:access'
const LOOPBACK_PORT = 56121
const PKCE_VERIFIER_BYTES = 96
const NONCE_BYTES = 16
const JWT_PARTS = 3

export interface IdTokenIdentity {
  email: string | null
  name: string | null
}

/** El correo y el nombre que declara el id token, sin verificar su firma. */
export function decodeXaiIdTokenIdentity(idToken: unknown): IdTokenIdentity {
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

/** El intercambio del código por tokens en el servidor de xAI; `label` nombra al proveedor en el error. */
export async function exchangeXaiCode(fetch: typeof globalThis.fetch, config: ClientIdSource, code: string, redirectUri: string, codeVerifier: string, label: string): Promise<JsonRecord> {
  const response = await fetch(GROK_BUILD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: requireClientId(config), code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
  })
  if (!response.ok) throw new Error(`${label} token exchange failed: ${await response.text()}`)
  return (await response.json()) as JsonRecord
}

export function createXaiOAuthFlow(deps: { config: ClientIdSource; fetch?: typeof globalThis.fetch }): OAuthProviderFlow<ClientIdSource> {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    config: deps.config,
    flowType: 'authorization_code_pkce',
    fixedPort: LOOPBACK_PORT,
    callbackPath: '/callback',
    callbackHost: '127.0.0.1',
    pkceVerifierBytes: PKCE_VERIFIER_BYTES,

    buildAuthUrl: (config, redirectUri, state, codeChallenge) => `${GROK_BUILD_AUTHORIZE_URL}?${encodeQuery({
      response_type: 'code',
      client_id: requireClientId(config),
      redirect_uri: redirectUri,
      scope: SCOPE,
      code_challenge: codeChallenge ?? '',
      code_challenge_method: 'S256',
      state,
      nonce: randomBytes(NONCE_BYTES).toString('hex'),
      plan: 'generic',
      referrer: 'cli-proxy-api',
    })}`,

    exchangeToken: (config, code, redirectUri, codeVerifier) => exchangeXaiCode(fetch, config, code, redirectUri, codeVerifier, 'xAI'),

    mapTokens: tokens => {
      const identity = decodeXaiIdTokenIdentity(tokens.id_token)
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiresIn: tokens.expires_in,
        email: identity.email,
        name: identity.name || identity.email,
        providerSpecificData: { scope: tokens.scope || SCOPE, tokenType: tokens.token_type || 'Bearer' },
      }
    },
  }
}
