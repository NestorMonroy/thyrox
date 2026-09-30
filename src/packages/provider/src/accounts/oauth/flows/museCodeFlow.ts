/**
 * Muse Code (Meta): grant de dispositivo RFC 8628 y, al concederse, el canje
 * del token de dispositivo por la clave de inferencia. El canje es de mejor
 * esfuerzo: sin él se guarda el token de dispositivo y la clave se acuña en
 * la primera petición.
 *
 * Porte de `omniroute: src/lib/oauth/providers/muse-code.ts` y de
 * `MUSE_CODE_CONFIG` en `constants/oauth.ts` (MIT).
 */
import { MUSE_CODE_DEFAULT_POLL_INTERVAL_SEC, MUSE_CODE_DEVICE_GRANT, type MuseMintedKey, mintMuseApiKey, museCodeHeaders } from '../../muse/museCode.ts'
import type { JsonRecord, OAuthProviderFlow, PollResult } from '../oauthFlows.ts'
import { type ClientIdSource, type Environment, readVariable, requireClientId } from './clientId.ts'

const DEVICE_CODE_URL = 'https://auth.meta.com/oidc/device/authorization/'
const TOKEN_URL = 'https://auth.meta.com/oidc/device/token/'
const MILLISECONDS_PER_SECOND = 1000

export function museCodeOAuthConfig(env: Environment = process.env): ClientIdSource {
  return { clientId: readVariable(env, 'THYROX_MUSE_CODE_OAUTH_CLIENT_ID'), clientIdVariable: 'THYROX_MUSE_CODE_OAUTH_CLIENT_ID' }
}

interface MuseExtra {
  minted?: MuseMintedKey
  dcaToken?: string
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Muse Code device authorization response missing ${field}`)
  return value.trim()
}

export function createMuseCodeFlow(deps: { config: ClientIdSource; fetch?: typeof globalThis.fetch; now?: () => number }): OAuthProviderFlow<ClientIdSource> {
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now

  const postForm = async (url: string, params: Record<string, string>): Promise<PollResult> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: museCodeHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: new URLSearchParams(params),
    })
    const text = await response.text()
    let data: JsonRecord = {}
    try {
      data = text ? (JSON.parse(text) as JsonRecord) : {}
    } catch {
      data = { error: 'invalid_response', error_description: text }
    }
    return { ok: response.ok, data }
  }

  return {
    config: deps.config,
    flowType: 'device_code',

    async requestDeviceCode(config) {
      const { ok, data } = await postForm(DEVICE_CODE_URL, { client_id: requireClientId(config) })
      if (!ok) throw new Error('Muse Code device authorization request failed.')
      const expiresIn = Number(data.expires_in)
      if (!Number.isFinite(expiresIn) || expiresIn <= 0) throw new Error('Muse Code returned an invalid device code expiry.')
      const interval = Number(data.interval)
      return {
        device_code: requiredText(data.device_code, 'device_code'),
        user_code: requiredText(data.user_code, 'user_code'),
        verification_uri: typeof data.verification_uri === 'string' ? data.verification_uri : '',
        verification_uri_complete: typeof data.verification_uri_complete === 'string' ? data.verification_uri_complete : '',
        expires_in: expiresIn,
        interval: Number.isFinite(interval) && interval > 0 ? interval : MUSE_CODE_DEFAULT_POLL_INTERVAL_SEC,
      }
    },

    pollToken: (config, deviceCode) => postForm(TOKEN_URL, { client_id: requireClientId(config), device_code: deviceCode, grant_type: MUSE_CODE_DEVICE_GRANT }),

    async postExchange(tokens): Promise<MuseExtra> {
      const dcaToken = typeof tokens.access_token === 'string' ? tokens.access_token.trim() : ''
      if (!dcaToken) throw new Error('Muse Code device flow completed without an access token.')
      try {
        return { minted: await mintMuseApiKey(fetch, dcaToken), dcaToken }
      } catch {
        return { dcaToken }
      }
    },

    mapTokens: (tokens, extraData) => {
      const extra = (extraData ?? {}) as MuseExtra
      const dcaToken = extra.dcaToken || (typeof tokens.access_token === 'string' ? tokens.access_token : '')
      const minted = extra.minted
      const expiresIn = typeof tokens.expires_in === 'number' ? tokens.expires_in : undefined
      const dcaExpiresAt = expiresIn !== undefined && Number.isFinite(expiresIn) ? now() + expiresIn * MILLISECONDS_PER_SECOND : undefined
      return {
        accessToken: minted?.apiKey || dcaToken,
        refreshToken: dcaToken,
        // Una clave acuñada no hereda la caducidad del token de dispositivo: se vuelve a acuñar ante un 401.
        expiresIn: minted?.apiKey ? undefined : expiresIn,
        tokenType: typeof tokens.token_type === 'string' ? tokens.token_type : 'Bearer',
        email: minted?.email,
        displayName: minted?.name,
        providerSpecificData: {
          dcaToken,
          authKind: 'oauth',
          baseUrl: minted?.baseUrl,
          email: minted?.email,
          name: minted?.name,
          subsTierName: minted?.subsTierName,
          subsTierId: minted?.subsTierId,
          isSubsActive: minted?.isSubsActive,
          hasPaymentMethod: minted?.hasPaymentMethod,
          requirePayment: minted?.requirePayment,
          canSubscribe: minted?.canSubscribe,
          dcaExpiresAt: dcaExpiresAt ? new Date(dcaExpiresAt).toISOString() : undefined,
          lastRefresh: new Date(now()).toISOString(),
        },
      }
    },
  }
}
