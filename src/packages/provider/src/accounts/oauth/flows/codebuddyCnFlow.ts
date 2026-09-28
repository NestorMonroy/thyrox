/**
 * CodeBuddy CN (Tencent): se pide un estado, se abre su URL y se sondea por
 * GET con el estado en la consulta — no en el cuerpo, como hace el CLI
 * oficial. El código 11217 es la espera.
 *
 * Porte de `omniroute: src/lib/oauth/providers/codebuddy-cn.ts`, de
 * `CODEBUDDY_CN_CONFIG` en `constants/oauth.ts` y de `CODEBUDDY_CN_USER_AGENT`
 * en `open-sse/config/providerHeaderProfiles.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow, PollResult } from '../oauthFlows.ts'

const STATE_URL = 'https://copilot.tencent.com/v2/plugin/auth/state'
const TOKEN_URL = 'https://copilot.tencent.com/v2/plugin/auth/token'
const USER_AGENT = 'CLI/2.108.1 CodeBuddy/2.108.1'
const PLATFORM = 'CLI'
const STATE_EXPIRES_IN_SECONDS = 600
const POLL_INTERVAL_SECONDS = 5
const DEFAULT_TOKEN_LIFETIME_SECONDS = 86400
const SUCCESS = 0

/** Las cabeceras de anonimato que el servicio exige antes de haber sesión. */
const ANONYMOUS_HEADERS = {
  'User-Agent': USER_AGENT,
  'X-Requested-With': 'XMLHttpRequest',
  'X-Domain': 'copilot.tencent.com',
  'X-No-Authorization': 'true',
  'X-No-User-Id': 'true',
  'X-Product': 'SaaS',
}

interface CodebuddyEnvelope {
  code?: number
  data?: JsonRecord
  msg?: string
}

export function createCodebuddyCnFlow(deps: { fetch?: typeof globalThis.fetch }): OAuthProviderFlow<null> {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    config: null,
    flowType: 'device_code',

    async requestDeviceCode() {
      // La plataforma se lee de la consulta: sólo en el cuerpo el servicio responde 400.
      const response = await fetch(`${STATE_URL}?platform=${encodeURIComponent(PLATFORM)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...ANONYMOUS_HEADERS },
        body: JSON.stringify({ platform: PLATFORM }),
      })
      if (!response.ok) throw new Error(`CodeBuddy state request failed (${response.status})`)
      const json = (await response.json()) as CodebuddyEnvelope
      if (json.code !== SUCCESS || !json.data?.state) throw new Error(`CodeBuddy state error: ${json.msg || 'no state in response'}`)
      const state = String(json.data.state)
      const authUrl = String(json.data.authUrl || json.data.url || '')
      return {
        device_code: state,
        user_code: state,
        verification_uri: authUrl,
        verification_uri_complete: authUrl,
        expires_in: STATE_EXPIRES_IN_SECONDS,
        interval: POLL_INTERVAL_SECONDS,
      }
    },

    async pollToken(_config, deviceCode): Promise<PollResult> {
      const response = await fetch(`${TOKEN_URL}?state=${encodeURIComponent(deviceCode)}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...ANONYMOUS_HEADERS,
          'X-No-Enterprise-Id': 'true',
          'X-No-Department-Info': 'true',
        },
      })
      if (!response.ok) return { ok: false, data: { error: 'request_failed' } }
      const json = (await response.json()) as CodebuddyEnvelope
      if (json.code === SUCCESS && json.data?.accessToken) {
        return {
          ok: true,
          data: {
            access_token: json.data.accessToken,
            refresh_token: json.data.refreshToken || '',
            token_type: json.data.tokenType || 'Bearer',
            expires_in: json.data.expiresIn,
          },
        }
      }
      return { ok: false, data: { code: json.code, msg: json.msg } }
    },

    mapTokens: tokens => ({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in || DEFAULT_TOKEN_LIFETIME_SECONDS,
      providerSpecificData: {},
    }),
  }
}
