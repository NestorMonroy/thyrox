/**
 * El login de Qoder por navegador: experimental, y sólo existe si el
 * operador declara las tres URLs y su cliente. Sin ellas se usa un token
 * personal de acceso.
 *
 * Porte de `omniroute: src/lib/oauth/providers/qoder.ts` y de `QODER_CONFIG`
 * en `constants/oauth.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'
import { type Environment, readVariable } from './clientId.ts'

const VARIABLES = {
  authorizeUrl: 'THYROX_QODER_OAUTH_AUTHORIZE_URL',
  tokenUrl: 'THYROX_QODER_OAUTH_TOKEN_URL',
  userInfoUrl: 'THYROX_QODER_OAUTH_USERINFO_URL',
  clientId: 'THYROX_QODER_OAUTH_CLIENT_ID',
  clientSecret: 'THYROX_QODER_OAUTH_CLIENT_SECRET',
} as const

type Declared = { [Key in keyof typeof VARIABLES]: string | null }

export interface QoderOAuthConfig extends Declared {
  enabled: boolean
  missing: string[]
}

export function qoderOAuthConfig(env: Environment = process.env): QoderOAuthConfig {
  const declared = Object.fromEntries(Object.entries(VARIABLES).map(([key, name]) => [key, readVariable(env, name)])) as Declared
  const missing = Object.entries(VARIABLES).filter(([key]) => !declared[key as keyof Declared]).map(([, name]) => name)
  return { ...declared, enabled: missing.length === 0, missing }
}

function requireEnabled(config: QoderOAuthConfig): Required<Declared> & { [Key in keyof Declared]: string } {
  if (!config.enabled) {
    throw new Error(`Qoder browser OAuth is experimental and disabled: declare ${config.missing.join(', ')}, or use a Personal Access Token.`)
  }
  return config as Required<Declared> & { [Key in keyof Declared]: string }
}

export function createQoderFlow(deps: { config: QoderOAuthConfig; fetch?: typeof globalThis.fetch }): OAuthProviderFlow<QoderOAuthConfig> {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    config: deps.config,
    flowType: 'authorization_code',

    buildAuthUrl(config, redirectUri, state) {
      const declared = requireEnabled(config)
      const params = new URLSearchParams({ loginMethod: 'phone', type: 'phone', redirect: redirectUri, state, client_id: declared.clientId })
      return `${declared.authorizeUrl}?${params.toString()}`
    },

    async exchangeToken(config, code, redirectUri) {
      const declared = requireEnabled(config)
      const response = await fetch(declared.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(`${declared.clientId}:${declared.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: declared.clientId,
          client_secret: declared.clientSecret,
        }),
      })
      if (!response.ok) throw new Error(`Token exchange failed: ${await response.text()}`)
      return (await response.json()) as JsonRecord
    },

    async postExchange(tokens) {
      const declared = requireEnabled(deps.config)
      const response = await fetch(`${declared.userInfoUrl}?accessToken=${encodeURIComponent(String(tokens.access_token))}`, {
        headers: { Accept: 'application/json' },
      })
      const result = response.ok ? ((await response.json()) as { success?: boolean; data?: JsonRecord }) : {}
      return { userInfo: result.success ? result.data : {} }
    },

    mapTokens(tokens, extra) {
      const userInfo = ((extra as { userInfo?: JsonRecord } | null)?.userInfo ?? {}) as JsonRecord
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        apiKey: userInfo.apiKey,
        email: userInfo.email || userInfo.phone,
        displayName: userInfo.nickname || userInfo.name,
      }
    },
  }
}
