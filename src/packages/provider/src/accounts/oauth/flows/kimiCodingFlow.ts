/**
 * Kimi Coding: código de dispositivo firmado con la identidad del
 * dispositivo, que se guarda con la cuenta para que el refresco use la misma.
 *
 * Porte de `omniroute: src/lib/oauth/providers/kimi-coding.ts` y de
 * `KIMI_CODING_CONFIG` en `constants/oauth.ts` (MIT).
 */
import { buildKimiCodeIdentityHeaders, kimiCliVersion, type KimiDeviceIdentity, sanitizeKimiHeaderValue } from '../../kimi/kimiIdentity.ts'
import type { JsonRecord, OAuthProviderFlow, PollResult } from '../oauthFlows.ts'
import { type ClientIdSource, type Environment, readVariable, requireClientId } from './clientId.ts'

const DEVICE_CODE_URL = 'https://auth.kimi.com/api/oauth/device_authorization'
const TOKEN_URL = 'https://auth.kimi.com/api/oauth/token'
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'
const DEFAULT_POLL_INTERVAL_SECONDS = 5

export function kimiCodingOAuthConfig(env: Environment = process.env): ClientIdSource {
  return { clientId: readVariable(env, 'THYROX_KIMI_CODING_OAUTH_CLIENT_ID'), clientIdVariable: 'THYROX_KIMI_CODING_OAUTH_CLIENT_ID' }
}

export interface KimiCodingFlowDeps {
  config: ClientIdSource
  /** La identidad del dispositivo con que se firma cada petición. */
  identity: () => KimiDeviceIdentity
  fetch?: typeof globalThis.fetch
  env?: Environment
}

function requireField(data: JsonRecord, field: string): unknown {
  if (!data[field]) throw new Error(`Device authorization response missing ${field}`)
  return data[field]
}

export function createKimiCodingFlow(deps: KimiCodingFlowDeps): OAuthProviderFlow<ClientIdSource> {
  const fetch = deps.fetch ?? globalThis.fetch
  const headers = () => ({
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    ...buildKimiCodeIdentityHeaders(deps.identity(), kimiCliVersion(deps.env)),
  })

  return {
    config: deps.config,
    flowType: 'device_code',

    async requestDeviceCode(config) {
      const response = await fetch(DEVICE_CODE_URL, {
        method: 'POST',
        headers: headers(),
        body: new URLSearchParams({ client_id: requireClientId(config) }),
      })
      if (!response.ok) throw new Error(`Device code request failed: ${await response.text()}`)
      const data = (await response.json()) as JsonRecord
      return {
        device_code: requireField(data, 'device_code'),
        user_code: requireField(data, 'user_code'),
        verification_uri: data.verification_uri || '',
        verification_uri_complete: requireField(data, 'verification_uri_complete'),
        expires_in: data.expires_in,
        interval: data.interval || DEFAULT_POLL_INTERVAL_SECONDS,
      }
    },

    async pollToken(config, deviceCode): Promise<PollResult> {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: headers(),
        body: new URLSearchParams({ client_id: requireClientId(config), device_code: deviceCode, grant_type: DEVICE_GRANT }),
      })
      // Una sola lectura del cuerpo: una página de error vuelve como su texto.
      const text = await response.text()
      let data: JsonRecord
      try {
        data = JSON.parse(text) as JsonRecord
      } catch {
        data = { error: 'invalid_response', error_description: text }
      }
      return { ok: response.ok, data }
    },

    mapTokens: tokens => {
      const identity = deps.identity()
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        providerSpecificData: {
          deviceId: identity.deviceId,
          deviceName: sanitizeKimiHeaderValue(identity.deviceName),
          deviceModel: sanitizeKimiHeaderValue(identity.deviceModel),
          osVersion: sanitizeKimiHeaderValue(identity.osVersion),
        },
      }
    },
  }
}
