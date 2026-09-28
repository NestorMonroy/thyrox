/**
 * El flujo OAuth de `antigravity` y `agy` (la misma cuenta de Google con el
 * perfil IDE o el CLI): código sin PKCE con consentimiento offline, el
 * intercambio con el secreto del cliente, y después la cuenta y el proyecto
 * de Cloud Code, onboardando la cuenta si todavía no tiene uno.
 *
 * Porte de `omniroute: src/lib/oauth/providers/antigravity.ts`, `agy.ts` y de
 * `ANTIGRAVITY_CONFIG`/`AGY_CONFIG` en `constants/oauth.ts` (MIT).
 */
import { codeAssistHeaders, type ClientProfile, type ClientVersionsView, LOAD_CODE_ASSIST_ENDPOINTS, loadCodeAssistMetadata, oauthUserAgent, ONBOARD_USER_ENDPOINTS } from '../../antigravity/clientIdentity.ts'
import { createClientVersions } from '../../antigravity/clientVersion.ts'
import { codeAssistOnboardTierId } from '../../antigravity/codeAssistTier.ts'
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

/**
 * Por qué no hay proyecto de Cloud Code al conectar. `requires_manual_project`:
 * el onboarding respondió sin proyecto, la cuenta tiene que traer el suyo y
 * reintentar no lo arregla. `discovery_failed`: la consulta falló o no hubo
 * onboarding que la resolviera.
 */
export type ProjectDiscoveryOutcome = 'requires_manual_project' | 'discovery_failed'

interface PostExchange {
  projectId: string
  tierId: string
  userInfo: { email?: string }
  projectDiscoveryOutcome?: ProjectDiscoveryOutcome
  /** El cliente que emitió el refresh token: el refresco tiene que presentar el mismo. */
  oauthClient: string
}

const POST_EXCHANGE_TIMEOUT_MS = 8_000
// El onboarding en segundo plano: pocos intentos y espera con jitter, para no parecer automatización.
const MAX_ONBOARD_ATTEMPTS = 3
const ONBOARD_BASE_DELAY_MS = 3000
const ONBOARD_JITTER_MS = 4000
const DEFAULT_TIER = 'legacy-tier'

function extractProjectId(data: JsonRecord): string {
  const project = data.cloudaicompanionProject
  if (typeof project === 'string') return project
  if (!project || typeof project !== 'object' || Array.isArray(project)) return ''
  const id = (project as JsonRecord).id
  return typeof id === 'string' ? id : ''
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
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const random = deps.random ?? Math.random
  const [platform, arch] = deps.platform ?? [process.platform, process.arch]
  const { profile } = deps

  /** El primer endpoint que responde 2xx; si ninguno, el último error. */
  const fetchFirstOk = async (endpoints: readonly string[], init: RequestInit): Promise<Response> => {
    let lastError: unknown = new Error('No Antigravity endpoints configured')
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { ...init, signal: AbortSignal.timeout(POST_EXCHANGE_TIMEOUT_MS) })
        if (response.ok) return response
        lastError = new Error(`${response.status} ${await response.text()}`)
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  const onboardInBackground = async (config: AntigravityOAuthConfig, init: (tierId: string) => RequestInit, tierId: string) => {
    for (let attempt = 0; attempt < MAX_ONBOARD_ATTEMPTS; attempt += 1) {
      try {
        const result = (await (await fetchFirstOk(config.onboardUserEndpoints, init(tierId))).json()) as { done?: boolean }
        if (result.done === true) return
      } catch {
        return
      }
      await sleep(ONBOARD_BASE_DELAY_MS + random() * ONBOARD_JITTER_MS)
    }
  }

  const discoverProject = async (config: AntigravityOAuthConfig, accessToken: string): Promise<Omit<PostExchange, 'oauthClient'>> => {
    const headers = codeAssistHeaders(profile, versions, accessToken)
    const metadata = loadCodeAssistMetadata(platform, arch)
    const loadInit: RequestInit = { method: 'POST', headers, body: JSON.stringify({ metadata }) }
    const onboardInit = (tierId: string): RequestInit => ({ method: 'POST', headers, body: JSON.stringify({ tier_id: tierId, metadata }) })

    const userInfoResponse = await fetch(`${config.userInfoUrl}?alt=json`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(POST_EXCHANGE_TIMEOUT_MS),
    }).catch(() => null)
    const userInfo = userInfoResponse?.ok ? ((await userInfoResponse.json()) as { email?: string }) : {}

    let projectId = ''
    let tierId = DEFAULT_TIER
    let loadFailed = false
    try {
      const data = (await (await fetchFirstOk(config.loadCodeAssistEndpoints, loadInit)).json()) as JsonRecord
      projectId = extractProjectId(data)
      tierId = codeAssistOnboardTierId(data)
    } catch {
      loadFailed = true
    }

    if (projectId) {
      void onboardInBackground(config, onboardInit, tierId).catch(() => {})
      return { userInfo, projectId, tierId }
    }
    if (config.onboardUserEndpoints.length === 0) {
      return loadFailed ? { userInfo, projectId, tierId, projectDiscoveryOutcome: 'discovery_failed' } : { userInfo, projectId, tierId }
    }

    // Una cuenta sin proyecto necesita un onboarding antes de que la consulta lo encuentre.
    let onboardSucceeded = false
    try {
      const onboard = await fetchFirstOk(config.onboardUserEndpoints, onboardInit(tierId))
      onboardSucceeded = true
      const onboardBody = await onboard.text().catch(() => '')
      // La consulta se repite siempre: el proyecto puede crearse después de aceptar el onboarding.
      const retry = await fetchFirstOk(config.loadCodeAssistEndpoints, loadInit)
      projectId = extractProjectId((await retry.json()) as JsonRecord)
      if (!projectId && onboardBody) {
        projectId = extractProjectId(((await new Response(onboardBody).json().catch(() => ({}))) as JsonRecord))
      }
    } catch {
      // Sin onboarding o sin segunda consulta: lo decide `onboardSucceeded`.
    }
    if (projectId) return { userInfo, projectId, tierId }
    return { userInfo, projectId, tierId, projectDiscoveryOutcome: onboardSucceeded ? 'requires_manual_project' : 'discovery_failed' }
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
