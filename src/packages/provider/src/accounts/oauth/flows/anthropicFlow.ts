/**
 * El flujo OAuth de `claude`: código con PKCE, intercambio en JSON y, después,
 * el bootstrap de la cuenta, que da el email, la organización y el plan.
 *
 * Porte de `omniroute: src/lib/oauth/providers/claude.ts` y de `CLAUDE_CONFIG`
 * en `src/lib/oauth/constants/oauth.ts` (MIT).
 */
import { randomBytes } from 'node:crypto'

import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'
import { type ClientIdSource, type Environment, readVariable, requireClientId } from './clientId.ts'

export interface AnthropicOAuthConfig extends ClientIdSource {
  authorizeUrl: string
  tokenUrl: string
  redirectUri: string
  scopes: string[]
  codeChallengeMethod: 'S256'
}

const DEFAULT_REDIRECT_URI = 'https://platform.claude.com/oauth/code/callback'
const BOOTSTRAP_URL = 'https://api.anthropic.com/api/claude_cli/bootstrap'
const BOOTSTRAP_TIMEOUT_MS = 10_000
const CLI_USER_ID_BYTES = 32

export function anthropicOAuthConfig(env: Environment = process.env): AnthropicOAuthConfig {
  return {
    clientId: readVariable(env, 'THYROX_CLAUDE_OAUTH_CLIENT_ID'),
    clientIdVariable: 'THYROX_CLAUDE_OAUTH_CLIENT_ID',
    authorizeUrl: 'https://claude.ai/oauth/authorize',
    tokenUrl: 'https://api.anthropic.com/v1/oauth/token',
    redirectUri: readVariable(env, 'THYROX_CODE_REDIRECT_URI') ?? DEFAULT_REDIRECT_URI,
    scopes: ['org:create_api_key', 'user:profile', 'user:inference', 'user:sessions:claude_code', 'user:mcp_servers'],
    codeChallengeMethod: 'S256',
  }
}

export interface AnthropicFlowDeps {
  config: AnthropicOAuthConfig
  fetch?: typeof globalThis.fetch
  /** El user agent del bootstrap: el servidor lo exige con la forma del cliente de línea de órdenes. */
  userAgent?: () => string
  randomHex?: () => string
}

function defaultUserAgent(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const version = (require('../../../../package.json') as { version: string }).version
  return `claude-cli/${version} (external, cli)`
}

interface AnthropicAccountBootstrap {
  account_uuid: string | null
  account_email: string | null
  organization_uuid: string | null
  organization_name: string | null
  organization_type: string | null
  organization_rate_limit_tier: string | null
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function planOf(payload: unknown): string | undefined {
  const data = toRecord(payload)
  return firstNonEmptyString(data.account_tier, data.plan, data.subscription_type, toRecord(data.billing).plan)
}

/** Separa un código pegado de la forma `código#state`. */
function splitPastedCode(code: string): { code: string; state: string } {
  const [authCode = '', pastedState = ''] = code.split('#')
  return { code: authCode, state: pastedState }
}

const BOOTSTRAP_FIELDS: ReadonlyArray<readonly [keyof AnthropicAccountBootstrap, string]> = [
  ['account_uuid', 'accountUUID'],
  ['organization_uuid', 'organizationUUID'],
  ['organization_name', 'organizationName'],
  ['organization_type', 'organizationType'],
  ['organization_rate_limit_tier', 'organizationRateLimitTier'],
]

export function createAnthropicFlow(deps: AnthropicFlowDeps): OAuthProviderFlow<AnthropicOAuthConfig> {
  const fetch = deps.fetch ?? globalThis.fetch
  const userAgent = deps.userAgent ?? defaultUserAgent
  const randomHex = deps.randomHex ?? (() => randomBytes(CLI_USER_ID_BYTES).toString('hex'))

  /** Lo que falle aquí no invalida el login: el token ya es válido. */
  const fetchBootstrap = async (accessToken: string): Promise<AnthropicAccountBootstrap | null> => {
    try {
      const response = await fetch(BOOTSTRAP_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'User-Agent': userAgent(),
          'anthropic-beta': 'oauth-2025-04-20',
        },
        signal: AbortSignal.timeout(BOOTSTRAP_TIMEOUT_MS),
      })
      if (!response.ok) return null
      const account = toRecord(toRecord(await response.json()).oauth_account)
      if (Object.keys(account).length === 0) return null
      const text = (key: string) => (account[key] as string) || null
      return {
        account_uuid: text('account_uuid'),
        account_email: text('account_email'),
        organization_uuid: text('organization_uuid'),
        organization_name: text('organization_name'),
        organization_type: text('organization_type'),
        organization_rate_limit_tier: text('organization_rate_limit_tier'),
      }
    } catch {
      return null
    }
  }

  return {
    config: deps.config,
    flowType: 'authorization_code_pkce',

    buildAuthUrl(config, _redirectUri, state, codeChallenge) {
      const params = new URLSearchParams({
        code: 'true',
        client_id: requireClientId(config),
        response_type: 'code',
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(' '),
        code_challenge: codeChallenge ?? '',
        code_challenge_method: config.codeChallengeMethod,
        state,
        // Reautenticar en cada flujo: reusar la sesión del navegador invalida los refresh tokens de otra cuenta con el mismo client id.
        prompt: 'login',
      })
      return `${config.authorizeUrl}?${params.toString()}`
    },

    async exchangeToken(config, code, _redirectUri, codeVerifier, state) {
      const pasted = splitPastedCode(code)
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          code: pasted.code,
          state: pasted.state || state,
          grant_type: 'authorization_code',
          client_id: requireClientId(config),
          redirect_uri: config.redirectUri,
          code_verifier: codeVerifier,
        }),
      })
      if (!response.ok) throw new Error(`Token exchange failed: ${await response.text()}`)
      return (await response.json()) as JsonRecord
    },

    postExchange: async tokens => (typeof tokens.access_token === 'string' ? fetchBootstrap(tokens.access_token) : null),

    mapTokens(tokens, extra) {
      const bootstrap = toRecord(extra) as Partial<AnthropicAccountBootstrap>
      const providerSpecificData: JsonRecord = { cliUserID: randomHex(), autoSync: true }
      for (const [field, key] of BOOTSTRAP_FIELDS) if (bootstrap[field]) providerSpecificData[key] = bootstrap[field]
      const plan = firstNonEmptyString(planOf(tokens), planOf(toRecord(extra).userInfo), planOf(extra))
      if (plan) providerSpecificData.plan = plan

      const result: JsonRecord = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        scope: tokens.scope,
      }
      if (bootstrap.account_email) {
        result.email = bootstrap.account_email
        result.displayName = bootstrap.account_email
      }
      result.providerSpecificData = providerSpecificData
      return result
    },
  }
}
