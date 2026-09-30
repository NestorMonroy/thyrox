/**
 * El flujo OAuth de GitLab Duo: código con PKCE contra la instancia declarada
 * (gitlab.com por defecto), con un cliente que registra el operador; después,
 * el usuario y el acceso directo al gateway de IA, que es opcional al
 * conectar.
 *
 * Porte de `omniroute: src/lib/oauth/providers/gitlab-duo.ts`, de
 * `GITLAB_DUO_CONFIG` en `constants/oauth.ts` y de `normalizeGitLabBaseUrl`,
 * `buildGitLabOAuthEndpoints` y `parseGitLabDirectAccessDetails` de
 * `src/lib/oauth/gitlab.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'
import { type ClientIdSource, type Environment, readVariable, requireClientId } from './clientId.ts'

const DEFAULT_BASE_URL = 'https://gitlab.com'
const MILLISECONDS_PER_SECOND = 1000

export interface GitlabDuoConfig extends ClientIdSource {
  clientSecret: string | null
  baseUrl: string
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
  directAccessUrl: string
  scope: string
}

function normalizeBaseUrl(value: string | null): string {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

export function gitlabDuoOAuthConfig(env: Environment = process.env): GitlabDuoConfig {
  const root = normalizeBaseUrl(readVariable(env, 'THYROX_GITLAB_DUO_BASE_URL') ?? readVariable(env, 'THYROX_GITLAB_BASE_URL'))
  return {
    clientId: readVariable(env, 'THYROX_GITLAB_DUO_OAUTH_CLIENT_ID') ?? readVariable(env, 'THYROX_GITLAB_OAUTH_CLIENT_ID'),
    clientIdVariable: 'THYROX_GITLAB_DUO_OAUTH_CLIENT_ID',
    clientSecret: readVariable(env, 'THYROX_GITLAB_DUO_OAUTH_CLIENT_SECRET') ?? readVariable(env, 'THYROX_GITLAB_OAUTH_CLIENT_SECRET'),
    baseUrl: root,
    authorizeUrl: `${root}/oauth/authorize`,
    tokenUrl: `${root}/oauth/token`,
    userInfoUrl: `${root}/api/v4/user`,
    directAccessUrl: `${root}/api/v4/code_suggestions/direct_access`,
    scope: 'ai_features read_user',
  }
}

export interface GitlabDirectAccess {
  token: string
  baseUrl: string
  expiresAt: string | null
  headers: Record<string, string>
}

/** Sin token o sin URL base no hay acceso directo; las cabeceras que no son texto se descartan. */
export function parseGitlabDirectAccess(payload: unknown): GitlabDirectAccess | null {
  const data = payload && typeof payload === 'object' ? (payload as JsonRecord) : {}
  const token = typeof data.token === 'string' ? data.token.trim() : ''
  const baseUrl = typeof data.base_url === 'string' ? data.base_url.trim() : ''
  if (!token || !baseUrl) return null
  const rawHeaders = data.headers && typeof data.headers === 'object' ? (data.headers as JsonRecord) : {}
  const headers = Object.fromEntries(Object.entries(rawHeaders).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  const expiresAt = typeof data.expires_at === 'number' && Number.isFinite(data.expires_at)
    ? new Date(data.expires_at * MILLISECONDS_PER_SECOND).toISOString()
    : null
  return { token, baseUrl: normalizeBaseUrl(baseUrl), expiresAt, headers }
}

function firstNonEmpty(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

export interface GitlabDuoFlowDeps {
  config: GitlabDuoConfig
  fetch?: typeof globalThis.fetch
}

export function createGitlabDuoFlow(deps: GitlabDuoFlowDeps): OAuthProviderFlow<GitlabDuoConfig> {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    config: deps.config,
    flowType: 'authorization_code_pkce',

    buildAuthUrl(config, redirectUri, state, codeChallenge) {
      const params = new URLSearchParams({
        client_id: requireClientId(config),
        redirect_uri: redirectUri,
        response_type: 'code',
        state,
        scope: config.scope,
        code_challenge: codeChallenge ?? '',
        code_challenge_method: 'S256',
      })
      return `${config.authorizeUrl}?${params.toString()}`
    },

    async exchangeToken(config, code, redirectUri, codeVerifier) {
      const body = new URLSearchParams({
        client_id: requireClientId(config),
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      })
      if (config.clientSecret) body.set('client_secret', config.clientSecret)
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
      })
      if (!response.ok) throw new Error(`GitLab Duo token exchange failed: ${await response.text()}`)
      return (await response.json()) as JsonRecord
    },

    async postExchange(tokens) {
      const headers = { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' }
      const userResponse = await fetch(deps.config.userInfoUrl, { headers })
      const userInfo = userResponse.ok ? ((await userResponse.json()) as JsonRecord) : {}
      let directAccess: GitlabDirectAccess | null = null
      try {
        const directResponse = await fetch(deps.config.directAccessUrl, { method: 'POST', headers })
        if (directResponse.ok) directAccess = parseGitlabDirectAccess(await directResponse.json())
      } catch {
        // Opcional al conectar: el ejecutor lo vuelve a pedir al usarlo.
      }
      return { userInfo, directAccess }
    },

    mapTokens(tokens, extra) {
      const read = (extra ?? {}) as { userInfo?: JsonRecord; directAccess?: GitlabDirectAccess | null }
      const userInfo = read.userInfo ?? {}
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        email: firstNonEmpty(userInfo.email, userInfo.public_email),
        name: firstNonEmpty(userInfo.name, userInfo.username, userInfo.email, userInfo.public_email),
        providerSpecificData: {
          baseUrl: deps.config.baseUrl,
          gitlabUserId: userInfo.id,
          gitlabUsername: userInfo.username,
          gitlabName: userInfo.name,
          ...(read.directAccess ? { gitlabDirectAccess: read.directAccess } : {}),
        },
      }
    },
  }
}
