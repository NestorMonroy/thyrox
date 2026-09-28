/**
 * El flujo OAuth de `codex`: código con PKCE en un puerto fijo, intercambio
 * form-encoded, y el workspace y el email que trae el id_token.
 *
 * Porte de `omniroute: src/lib/oauth/providers/codex.ts` y de `CODEX_CONFIG`
 * en `src/lib/oauth/constants/oauth.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'
import { type ClientIdSource, type Environment, readVariable, requireClientId } from './clientId.ts'

export interface CodexOAuthConfig extends ClientIdSource {
  authorizeUrl: string
  tokenUrl: string
  scope: string
  codeChallengeMethod: 'S256'
  extraParams: Record<string, string>
}

const AUTH_CLAIM = 'https://api.openai.com/auth'
const FIXED_PORT = 1455
const JWT_PARTS = 3

export function codexOAuthConfig(env: Environment = process.env): CodexOAuthConfig {
  return {
    clientId: readVariable(env, 'THYROX_CODEX_OAUTH_CLIENT_ID'),
    clientIdVariable: 'THYROX_CODEX_OAUTH_CLIENT_ID',
    authorizeUrl: 'https://auth.openai.com/oauth/authorize',
    tokenUrl: 'https://auth.openai.com/oauth/token',
    scope: 'openid profile email offline_access',
    codeChallengeMethod: 'S256',
    extraParams: {
      id_token_add_organizations: 'true',
      codex_cli_simplified_flow: 'true',
      originator: 'codex_cli_rs',
      // Cada flujo en su propia sesión: reusar la del navegador invalida la familia de refresh tokens de otra cuenta.
      prompt: 'login',
    },
  }
}

interface CodexOrganization {
  id: string
  is_default: boolean
  role: string
  title: string
}

interface CodexAuthInfo {
  chatgpt_account_id?: string
  chatgpt_plan_type?: string
  chatgpt_user_id?: string
  organizations?: CodexOrganization[]
}

/**
 * Lee los claims del id_token sin verificar su firma: el servidor de OpenAI
 * acaba de emitirlo en el intercambio, y sólo se leen metadatos.
 */
function parseIdToken(idToken: string): { email: string | null; authInfo: CodexAuthInfo | null } {
  const parts = idToken.split('.')
  if (parts.length !== JWT_PARTS) return { email: null, authInfo: null }
  try {
    const claims = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as JsonRecord
    return { email: (claims.email as string) || null, authInfo: (claims[AUTH_CLAIM] as CodexAuthInfo) || null }
  } catch {
    return { email: null, authInfo: null }
  }
}

/** Un workspace de equipo: no el de por defecto, con título u rol de organización. */
function isTeamOrganization(organization: CodexOrganization): boolean {
  const title = (organization.title || '').toLowerCase()
  const role = (organization.role || '').toLowerCase()
  const teamTitle = ['team', 'business', 'workspace', 'org'].some(word => title.includes(word))
  return !organization.is_default && (teamTitle || role === 'admin' || role === 'member')
}

/**
 * El `chatgpt_account_id` del token no siempre es el workspace elegido: un
 * plan gratuito con una organización de equipo se vincula al equipo.
 */
function selectWorkspace(authInfo: CodexAuthInfo | null): { workspaceId: string | null; planType: string } {
  const workspaceId = authInfo?.chatgpt_account_id || null
  const planType = (authInfo?.chatgpt_plan_type || '').toLowerCase()
  const team = (authInfo?.organizations ?? []).find(isTeamOrganization)
  if (team && (planType === 'free' || planType === '')) return { workspaceId: team.id, planType: 'team' }
  return { workspaceId, planType }
}

export interface CodexFlowDeps {
  config: CodexOAuthConfig
  fetch?: typeof globalThis.fetch
}

export function createCodexFlow(deps: CodexFlowDeps): OAuthProviderFlow<CodexOAuthConfig> {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    config: deps.config,
    flowType: 'authorization_code_pkce',
    fixedPort: FIXED_PORT,
    callbackPath: '/auth/callback',

    buildAuthUrl(config, redirectUri, state, codeChallenge) {
      const params: Record<string, string> = {
        response_type: 'code',
        client_id: requireClientId(config),
        redirect_uri: redirectUri,
        scope: config.scope,
        code_challenge: codeChallenge ?? '',
        code_challenge_method: config.codeChallengeMethod,
        ...config.extraParams,
        state,
      }
      const query = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
      return `${config.authorizeUrl}?${query}`
    },

    async exchangeToken(config, code, redirectUri, codeVerifier) {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: requireClientId(config),
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      })
      if (!response.ok) throw new Error(`Token exchange failed: ${await response.text()}`)
      return (await response.json()) as JsonRecord
    },

    mapTokens(tokens) {
      const idToken = typeof tokens.id_token === 'string' ? tokens.id_token : null
      const { email, authInfo } = idToken ? parseIdToken(idToken) : { email: null, authInfo: null }
      const { workspaceId, planType } = selectWorkspace(authInfo)
      const organizations = authInfo?.organizations ?? []
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiresIn: tokens.expires_in,
        email,
        providerSpecificData: {
          autoSync: true,
          workspaceId,
          workspacePlanType: planType,
          chatgptUserId: authInfo?.chatgpt_user_id || null,
          organizations: organizations.length > 0 ? organizations : null,
        },
      }
    },
  }
}
