/**
 * El código de dispositivo de Kilo Code: el mismo código es el de dispositivo
 * y el que ve quien inicia sesión, y el estado del sondeo va en el código
 * HTTP.
 *
 * Porte de `omniroute: src/lib/oauth/providers/kilocode.ts` y de
 * `KILOCODE_CONFIG` en `constants/oauth.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow, PollResult } from '../oauthFlows.ts'

const CODES_URL = 'https://api.kilo.ai/api/device-auth/codes'
const DEFAULT_EXPIRES_IN_SECONDS = 300
const POLL_INTERVAL_SECONDS = 3
const TOO_MANY_REQUESTS = 429

/** Los códigos HTTP del sondeo que no son éxito ni fallo genérico. */
const POLL_STATUS: Record<number, JsonRecord> = {
  202: { error: 'authorization_pending' },
  403: { error: 'access_denied', error_description: 'Authorization denied by user' },
  410: { error: 'expired_token', error_description: 'Authorization code expired' },
}

export function createKilocodeFlow(deps: { fetch?: typeof globalThis.fetch }): OAuthProviderFlow<null> {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    config: null,
    flowType: 'device_code',

    async requestDeviceCode() {
      const response = await fetch(CODES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (response.status === TOO_MANY_REQUESTS) throw new Error('Too many pending authorization requests. Please try again later.')
      if (!response.ok) throw new Error(`Device auth initiation failed: ${await response.text()}`)
      const data = (await response.json()) as JsonRecord
      return {
        device_code: data.code,
        user_code: data.code,
        verification_uri: data.verificationUrl,
        verification_uri_complete: data.verificationUrl,
        expires_in: data.expiresIn || DEFAULT_EXPIRES_IN_SECONDS,
        interval: POLL_INTERVAL_SECONDS,
      }
    },

    async pollToken(_config, deviceCode): Promise<PollResult> {
      const response = await fetch(`${CODES_URL}/${deviceCode}`)
      const known = POLL_STATUS[response.status]
      if (known) return { ok: false, data: known }
      if (!response.ok) return { ok: false, data: { error: 'poll_failed', error_description: `Poll failed: ${response.status}` } }
      const data = (await response.json()) as JsonRecord
      if (data.status === 'approved' && data.token) return { ok: true, data: { access_token: data.token, _userEmail: data.userEmail } }
      return { ok: false, data: { error: 'authorization_pending' } }
    },

    mapTokens: tokens => ({ accessToken: tokens.access_token, refreshToken: null, expiresIn: null, email: tokens._userEmail }),
  }
}
