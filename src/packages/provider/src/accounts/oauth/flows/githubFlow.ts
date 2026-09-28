/**
 * El flujo OAuth de GitHub Copilot en github.com: código de dispositivo.
 *
 * Porte de `omniroute: src/lib/oauth/providers/github.ts` y de `GITHUB_CONFIG`
 * en `constants/oauth.ts` (MIT).
 */
import type { OAuthProviderFlow } from '../oauthFlows.ts'
import { type Environment, readVariable } from './clientId.ts'
import { createGithubDeviceFlow, type GithubDeviceConfig } from './githubDeviceFlow.ts'

export function githubOAuthConfig(env: Environment = process.env): GithubDeviceConfig {
  return { clientId: readVariable(env, 'THYROX_GITHUB_OAUTH_CLIENT_ID'), clientIdVariable: 'THYROX_GITHUB_OAUTH_CLIENT_ID', scopes: 'read:user' }
}

const GITHUB_ENDPOINTS = {
  deviceCodeUrl: 'https://github.com/login/device/code',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  copilotTokenUrl: 'https://api.github.com/copilot_internal/v2/token',
  userInfoUrl: 'https://api.github.com/user',
}

export interface GithubFlowDeps {
  config: GithubDeviceConfig
  fetch?: typeof globalThis.fetch
  env?: Environment
}

export function createGithubFlow(deps: GithubFlowDeps): OAuthProviderFlow<GithubDeviceConfig> {
  return createGithubDeviceFlow({ ...deps, endpoints: () => GITHUB_ENDPOINTS })
}
