/**
 * El login de Cline: el código de la redirección lleva los tokens en JSON
 * base64; si no los lleva, se intercambia. `clinepass` usa este mismo flujo.
 *
 * Porte de `omniroute: src/lib/oauth/providers/cline.ts` y de `CLINE_CONFIG`
 * en `constants/oauth.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'

const AUTHORIZE_URL = 'https://api.cline.bot/api/v1/auth/authorize'
const TOKEN_URL = 'https://api.cline.bot/api/v1/auth/token'
const DEFAULT_EXPIRES_IN_SECONDS = 3600
const MILLISECONDS_PER_SECOND = 1000

/** Los tokens que la redirección trae dentro del código, o `null` si el código no es eso. */
function decodeEmbeddedTokens(code: string): JsonRecord | null {
  let base64 = code
  try {
    base64 = decodeURIComponent(base64)
  } catch {
    // Ya venía decodificado.
  }
  const decoded = Buffer.from(base64, 'base64').toString('utf-8')
  const lastBrace = decoded.lastIndexOf('}')
  if (lastBrace === -1) return null
  try {
    const data = JSON.parse(decoded.slice(0, lastBrace + 1)) as JsonRecord
    return {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      expires_at: data.expiresAt,
    }
  } catch {
    return null
  }
}

export function createClineFlow(deps: { fetch?: typeof globalThis.fetch; now?: () => number }): OAuthProviderFlow<null> {
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  return {
    config: null,
    flowType: 'authorization_code',

    buildAuthUrl(_config, redirectUri) {
      const params = new URLSearchParams({ client_type: 'extension', callback_url: redirectUri, redirect_uri: redirectUri })
      return `${AUTHORIZE_URL}?${params.toString()}`
    },

    async exchangeToken(_config, code, redirectUri) {
      const embedded = decodeEmbeddedTokens(code)
      if (embedded) return embedded
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ grant_type: 'authorization_code', code, client_type: 'extension', redirect_uri: redirectUri }),
      })
      if (!response.ok) throw new Error(`Cline token exchange failed: ${await response.text()}`)
      const data = (await response.json()) as { data?: JsonRecord } & JsonRecord
      const inner = (data.data ?? {}) as JsonRecord
      return {
        access_token: inner.accessToken || data.accessToken,
        refresh_token: inner.refreshToken || data.refreshToken,
        email: (inner.userInfo as JsonRecord | undefined)?.email || '',
        expires_at: inner.expiresAt || data.expiresAt,
      }
    },

    mapTokens(tokens) {
      const fullName = [tokens.firstName || '', tokens.lastName || ''].filter(Boolean).join(' ').trim()
      const expiresAt = typeof tokens.expires_at === 'string' || typeof tokens.expires_at === 'number' ? new Date(tokens.expires_at).getTime() : null
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: expiresAt === null ? DEFAULT_EXPIRES_IN_SECONDS : Math.floor((expiresAt - now()) / MILLISECONDS_PER_SECOND),
        name: fullName || tokens.email || null,
        email: tokens.email,
        providerSpecificData: { firstName: tokens.firstName, lastName: tokens.lastName },
      }
    },
  }
}
