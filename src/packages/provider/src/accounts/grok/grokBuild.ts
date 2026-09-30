/**
 * El servidor de autorización de xAI que comparten Grok Build y xAI OAuth, y
 * la identidad de cliente que Grok Build presenta en sus peticiones OAuth.
 *
 * Porte de la parte OAuth de `omniroute: open-sse/config/grokBuild.ts` (MIT).
 */
import { type ClientIdSource, type Environment, readVariable } from '../oauth/flows/clientId.ts'

export const GROK_BUILD_OAUTH_ISSUER = 'https://auth.x.ai'
export const GROK_BUILD_AUTHORIZE_URL = `${GROK_BUILD_OAUTH_ISSUER}/oauth2/authorize`
export const GROK_BUILD_DEVICE_CODE_URL = `${GROK_BUILD_OAUTH_ISSUER}/oauth2/device/code`
export const GROK_BUILD_TOKEN_URL = `${GROK_BUILD_OAUTH_ISSUER}/oauth2/token`
export const GROK_BUILD_OAUTH_REFERRER = 'grok-build'
export const GROK_BUILD_CLIENT_VERSION = '1.0.41'

/** El alcance amplio del código de dispositivo del CLI. */
export const GROK_BUILD_DEVICE_SCOPES = Object.freeze([
  'openid', 'profile', 'email', 'offline_access', 'grok-cli:access', 'api:access',
  'conversations:read', 'conversations:write', 'workspaces:read', 'workspaces:write',
])

export type GrokBuildClientSurface = 'ui' | 'cli' | 'headless'

export function grokBuildOAuthHeaders(surface: GrokBuildClientSurface = 'ui'): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'x-grok-client-version': GROK_BUILD_CLIENT_VERSION,
    'x-grok-client-surface': surface,
  }
}

/** El cliente OAuth público que comparten Grok Build y xAI OAuth. */
export function grokOAuthConfig(env: Environment = process.env): ClientIdSource {
  return { clientId: readVariable(env, 'THYROX_GROK_OAUTH_CLIENT_ID'), clientIdVariable: 'THYROX_GROK_OAUTH_CLIENT_ID' }
}

/** Una consulta con `encodeURIComponent`: los espacios del alcance van como `%20`, no como `+`. */
export function encodeQuery(params: Record<string, string>): string {
  return Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
}
