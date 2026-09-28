/**
 * Grok Build: el código de dispositivo del CLI es el flujo principal, el
 * inicio en el navegador con PKCE es la alternativa sobre su propio puerto, y
 * el `auth.json` o el JWT pegados son el último recurso. Las tres formas
 * convergen en `mapTokens`.
 *
 * Porte de `omniroute: src/lib/oauth/providers/grok-cli.ts`,
 * `grok-cli-oauth.ts` y de `GROK_CLI_CONFIG`/`GROK_BUILD_OAUTH_CONFIG` en
 * `constants/oauth.ts` (MIT).
 */
import { encodeQuery, GROK_BUILD_AUTHORIZE_URL, GROK_BUILD_DEVICE_CODE_URL, GROK_BUILD_DEVICE_SCOPES, GROK_BUILD_OAUTH_REFERRER, GROK_BUILD_TOKEN_URL, grokBuildOAuthHeaders } from '../../grok/grokBuild.ts'
import { GROK_BUILD_BROWSER_SCOPE, isGrokBuildBrowserTokens, mapGrokBuildBrowserTokens, mapImportedGrokToken } from '../../grok/grokTokens.ts'
import type { JsonRecord, OAuthProviderFlow, PollResult } from '../oauthFlows.ts'
import { type ClientIdSource, requireClientId } from './clientId.ts'
import { exchangeXaiCode } from './xaiOAuthFlow.ts'

export { grokOAuthConfig } from '../../grok/grokBuild.ts'

const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'
const LOOPBACK_PORT = 56122
const PKCE_VERIFIER_BYTES = 96
const DEFAULT_DEVICE_EXPIRES_IN_SECONDS = 1800
const DEFAULT_POLL_INTERVAL_SECONDS = 5
const USER_CODE = /^[A-Za-z0-9-]+$/
const DELETE_CHARACTER = 0x7f
const LAST_CONTROL_CHARACTER = 0x1f

async function parseOAuthResponse(response: Response): Promise<JsonRecord> {
  try {
    const value = (await response.json()) as unknown
    return value && typeof value === 'object' ? (value as JsonRecord) : {}
  } catch {
    return { error: 'invalid_response', error_description: 'xAI returned a non-JSON OAuth response' }
  }
}

/** Sólo HTTPS, o HTTP a loopback, y sin caracteres de control. */
function validateVerificationUri(value: string): void {
  const hasControl = [...value].some(character => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= LAST_CONTROL_CHARACTER || codePoint === DELETE_CHARACTER
  })
  if (hasControl) throw new Error('Grok returned an invalid verification URL')
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Grok returned an invalid verification URL')
  }
  const isLocalHttp = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if (url.protocol !== 'https:' && !isLocalHttp) throw new Error('Grok returned an unsupported verification URL')
}

export function createGrokCliFlow(deps: { config: ClientIdSource; fetch?: typeof globalThis.fetch; now?: () => number }): OAuthProviderFlow<ClientIdSource> {
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  return {
    config: deps.config,
    flowType: 'device_code',
    supportsBrowserPkce: true,
    fixedPort: LOOPBACK_PORT,
    callbackPath: '/callback',
    callbackHost: '127.0.0.1',
    pkceVerifierBytes: PKCE_VERIFIER_BYTES,

    async requestDeviceCode(config) {
      const response = await fetch(GROK_BUILD_DEVICE_CODE_URL, {
        method: 'POST',
        headers: grokBuildOAuthHeaders('ui'),
        body: new URLSearchParams({ client_id: requireClientId(config), scope: GROK_BUILD_DEVICE_SCOPES.join(' '), referrer: GROK_BUILD_OAUTH_REFERRER }),
      })
      const data = await parseOAuthResponse(response)
      if (!response.ok) throw new Error(typeof data.error_description === 'string' ? data.error_description : 'Grok device authorization failed')
      if (typeof data.device_code !== 'string' || typeof data.user_code !== 'string' || typeof data.verification_uri !== 'string') {
        throw new Error('Grok device authorization response is incomplete')
      }
      if (!USER_CODE.test(data.user_code)) throw new Error('Grok returned an invalid device code')
      validateVerificationUri(data.verification_uri)
      if (typeof data.verification_uri_complete === 'string') validateVerificationUri(data.verification_uri_complete)
      return {
        device_code: data.device_code,
        user_code: data.user_code,
        verification_uri: data.verification_uri,
        verification_uri_complete: typeof data.verification_uri_complete === 'string' ? data.verification_uri_complete : data.verification_uri,
        expires_in: typeof data.expires_in === 'number' ? data.expires_in : DEFAULT_DEVICE_EXPIRES_IN_SECONDS,
        interval: typeof data.interval === 'number' ? data.interval : DEFAULT_POLL_INTERVAL_SECONDS,
      }
    },

    async pollToken(config, deviceCode): Promise<PollResult> {
      const response = await fetch(GROK_BUILD_TOKEN_URL, {
        method: 'POST',
        headers: grokBuildOAuthHeaders('ui'),
        body: new URLSearchParams({ client_id: requireClientId(config), device_code: deviceCode, grant_type: DEVICE_GRANT }),
      })
      return { ok: response.ok, data: await parseOAuthResponse(response) }
    },

    buildAuthUrl: (config, redirectUri, state, codeChallenge) => `${GROK_BUILD_AUTHORIZE_URL}?${encodeQuery({
      response_type: 'code',
      client_id: requireClientId(config),
      redirect_uri: redirectUri,
      scope: GROK_BUILD_BROWSER_SCOPE,
      code_challenge: codeChallenge ?? '',
      code_challenge_method: 'S256',
      state,
    })}`,

    exchangeToken: (config, code, redirectUri, codeVerifier) => exchangeXaiCode(fetch, config, code, redirectUri, codeVerifier, 'Grok Build'),

    mapTokens: (token: unknown) => isGrokBuildBrowserTokens(token)
      ? mapGrokBuildBrowserTokens(token)
      : mapImportedGrokToken(token, { clientId: deps.config.clientId, now: now() }),
  }
}
