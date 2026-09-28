/**
 * El flujo OAuth de GitHub Copilot en un GitHub Enterprise: el mismo flujo de
 * dispositivo, con los endpoints derivados del host que declara cada login
 * (`gheUrl`), y las URLs de Copilot que devuelve su token.
 *
 * Porte de `omniroute: src/lib/oauth/providers/ghe-copilot.ts` y de
 * `GHE_COPILOT_CONFIG` en `constants/oauth.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow } from '../oauthFlows.ts'
import { type Environment, readVariable } from './clientId.ts'
import { createGithubDeviceFlow, type GithubDeviceConfig, type GithubEndpoints } from './githubDeviceFlow.ts'

export interface GheCopilotConfig extends GithubDeviceConfig {
  /** El host de este login; lo fija la configuración por login, no el entorno. */
  gheUrl?: string
}

export function gheCopilotOAuthConfig(env: Environment = process.env): GheCopilotConfig {
  const own = readVariable(env, 'THYROX_GHE_COPILOT_OAUTH_CLIENT_ID')
  return {
    clientId: own ?? readVariable(env, 'THYROX_GITHUB_OAUTH_CLIENT_ID'),
    clientIdVariable: own ? 'THYROX_GHE_COPILOT_OAUTH_CLIENT_ID' : 'THYROX_GHE_COPILOT_OAUTH_CLIENT_ID or THYROX_GITHUB_OAUTH_CLIENT_ID',
    scopes: 'read:user',
  }
}

function normalizeGheUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('gheUrl is required for GHE Copilot OAuth')
  return value.trim().replace(/\/+$/, '')
}

function gheEndpoints(config: GheCopilotConfig, extraData?: unknown): GithubEndpoints {
  const host = normalizeGheUrl((extraData as { gheUrl?: unknown } | undefined)?.gheUrl || config.gheUrl)
  return {
    deviceCodeUrl: `${host}/login/device/code`,
    tokenUrl: `${host}/login/oauth/access_token`,
    copilotTokenUrl: `${host}/api/v3/copilot_internal/v2/token`,
    userInfoUrl: `${host}/api/v3/user`,
  }
}

/** `endpoints.api` sirve el chat y el catálogo; `endpoints.proxy`, sólo el autocompletado. */
function describeGheAccount(extra: JsonRecord): JsonRecord {
  const copilotEndpoints = ((extra?.copilotToken as JsonRecord | undefined)?.endpoints ?? {}) as JsonRecord
  return { gheUrl: extra?.gheUrl, copilotApiUrl: copilotEndpoints.api, copilotProxyUrl: copilotEndpoints.proxy }
}

export interface GheCopilotFlowDeps {
  config: GheCopilotConfig
  fetch?: typeof globalThis.fetch
  env?: Environment
}

export function createGheCopilotFlow(deps: GheCopilotFlowDeps): OAuthProviderFlow<GheCopilotConfig> {
  return createGithubDeviceFlow({ ...deps, endpoints: gheEndpoints, describeAccount: describeGheAccount })
}
