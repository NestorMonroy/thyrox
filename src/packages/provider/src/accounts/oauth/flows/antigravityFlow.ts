/**
 * El flujo OAuth de `antigravity` y `agy` (la misma cuenta de Google con el
 * perfil IDE o el CLI): código sin PKCE con consentimiento offline, el
 * intercambio con el secreto del cliente, y después la cuenta y el proyecto
 * de Cloud Code, onboardando la cuenta si todavía no tiene uno.
 *
 * Porte de `omniroute: src/lib/oauth/providers/antigravity.ts`, `agy.ts` y de
 * `ANTIGRAVITY_CONFIG`/`AGY_CONFIG` en `constants/oauth.ts` (MIT).
 */
import { type ClientProfile, type ClientVersionsView, LOAD_CODE_ASSIST_ENDPOINTS, oauthUserAgent, ONBOARD_USER_ENDPOINTS } from '../../antigravity/clientIdentity.ts'
import { createClientVersions } from '../../antigravity/clientVersion.ts'
import { CODE_ASSIST_TIMEOUT_MS, createProjectDiscovery, type DiscoveredProject } from '../../antigravity/projectDiscovery.ts'
import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'
import { type ClientIdSource, type Environment, readVariable, requireClientId } from './clientId.ts'

export interface AntigravityOAuthConfig extends ClientIdSource {
  clientSecret: string | null
  clientSecretVariable: string
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
  scopes: string[]
  loadCodeAssistEndpoints: readonly string[]
  onboardUserEndpoints: readonly string[]
}

export function antigravityOAuthConfig(env: Environment = process.env): AntigravityOAuthConfig {
  return {
    clientId: readVariable(env, 'THYROX_ANTIGRAVITY_OAUTH_CLIENT_ID'),
    clientIdVariable: 'THYROX_ANTIGRAVITY_OAUTH_CLIENT_ID',
    clientSecret: readVariable(env, 'THYROX_ANTIGRAVITY_OAUTH_CLIENT_SECRET'),
    clientSecretVariable: 'THYROX_ANTIGRAVITY_OAUTH_CLIENT_SECRET',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
    // Sin `openid`: con él Google lleva a un consentimiento de aplicación nativa que no vuelve.
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/cclog',
      'https://www.googleapis.com/auth/experimentsandconfigs',
    ],
    loadCodeAssistEndpoints: LOAD_CODE_ASSIST_ENDPOINTS,
    onboardUserEndpoints: ONBOARD_USER_ENDPOINTS,
  }
}

function requireClientSecret(config: AntigravityOAuthConfig): string {
  if (!config.clientSecret) throw new Error(`${config.clientSecretVariable} is not set: declare the OAuth client secret of this provider to log in.`)
  return config.clientSecret
}

export type { ProjectDiscoveryOutcome } from '../../antigravity/projectDiscovery.ts'

interface PostExchange extends DiscoveredProject {
  userInfo: { email?: string }
  /** El cliente que emitió el refresh token: el refresco tiene que presentar el mismo. */
  oauthClient: string
}

export interface AntigravityFlowDeps {
  config: AntigravityOAuthConfig
  profile: ClientProfile
  fetch?: typeof globalThis.fetch
  versions?: ClientVersionsView
  sleep?: (ms: number) => Promise<void>
  random?: () => number
  /** Plataforma y arquitectura que se declaran en los metadatos de Code Assist. */
  platform?: readonly [string, string]
}

export function createAntigravityFlow(deps: AntigravityFlowDeps): OAuthProviderFlow<AntigravityOAuthConfig> {
  const fetch = deps.fetch ?? globalThis.fetch
  const versions = deps.versions ?? createClientVersions({ fetch })
  const { profile } = deps
  const projects = createProjectDiscovery({ ...deps, fetch, versions })

  const discoverProject = async (config: AntigravityOAuthConfig, accessToken: string): Promise<Omit<PostExchange, 'oauthClient'>> => {
    const userInfoResponse = await fetch(`${config.userInfoUrl}?alt=json`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(CODE_ASSIST_TIMEOUT_MS),
    }).catch(() => null)
    const userInfo = userInfoResponse?.ok ? ((await userInfoResponse.json()) as { email?: string }) : {}
    return { userInfo, ...(await projects.discover(config, accessToken)) }
  }

  return {
    config: deps.config,
    flowType: 'authorization_code',

    buildAuthUrl(config, redirectUri, state, codeChallenge) {
      const params = new URLSearchParams({
        client_id: requireClientId(config),
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: config.scopes.join(' '),
        state,
        access_type: 'offline',
        prompt: 'consent',
      })
      if (codeChallenge) {
        params.set('code_challenge', codeChallenge)
        params.set('code_challenge_method', 'S256')
      }
      return `${config.authorizeUrl}?${params.toString()}`
    },

    async exchangeToken(config, code, redirectUri) {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': oauthUserAgent(profile, versions),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: requireClientId(config),
          code,
          redirect_uri: redirectUri,
          client_secret: requireClientSecret(config),
        }),
      })
      if (!response.ok) throw new Error(`Token exchange failed: ${await response.text()}`)
      return (await response.json()) as JsonRecord
    },

    async postExchange(tokens): Promise<PostExchange> {
      const discovered = await discoverProject(deps.config, tokens.access_token as string)
      return { ...discovered, oauthClient: `custom:${requireClientId(deps.config)}` }
    },

    mapTokens(tokens, extra) {
      const post = extra as PostExchange | undefined
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        scope: tokens.scope,
        email: post?.userInfo?.email,
        projectId: post?.projectId,
        projectDiscoveryOutcome: post?.projectDiscoveryOutcome,
        providerSpecificData: {
          clientProfile: profile,
          projectId: post?.projectId,
          tier: post?.tierId,
          oauthClient: post?.oauthClient,
          // El backend publica modelos nuevos a menudo: la cuenta nace con la sincronización diaria del catálogo.
          autoSync: true,
        },
      }
    },
  }
}
