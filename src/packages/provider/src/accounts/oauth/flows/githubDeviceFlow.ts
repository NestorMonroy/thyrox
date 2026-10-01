/**
 * El flujo de dispositivo de GitHub, común a github.com y a GitHub
 * Enterprise: pedir el código, sondear el token y, concedido, leer el token de
 * Copilot y el usuario. Cada variante sólo dice dónde están sus endpoints.
 *
 * Porte de la parte común de `omniroute: src/lib/oauth/providers/github.ts` y
 * `ghe-copilot.ts` (MIT).
 */
import type { JsonRecord, OAuthProviderFlow, PollResult } from '../oauthFlows.ts'
import { type ClientIdSource, type Environment, requireClientId } from './clientId.ts'
import { COPILOT_API_VERSION, copilotChatUserAgent } from './copilotIdentity.ts'

export interface GithubEndpoints {
  deviceCodeUrl: string
  tokenUrl: string
  copilotTokenUrl: string
  userInfoUrl: string
}

export interface GithubDeviceConfig extends ClientIdSource {
  scopes: string
}

const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'

export interface GithubDeviceFlowDeps<Config extends GithubDeviceConfig> {
  config: Config
  /** Dónde están los endpoints, para esta configuración y lo que el login aporte. */
  endpoints: (config: Config, extraData?: unknown) => GithubEndpoints
  /** Lo que la variante añade a los datos del proveedor, a partir de lo leído después del intercambio. */
  describeAccount?: (extra: JsonRecord) => JsonRecord
  fetch?: typeof globalThis.fetch
  env?: Environment
}

function formRequest(body: Record<string, string>): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(body),
  }
}

/** El cuerpo se lee una vez: una página de error que no es JSON vuelve como `invalid_response`, no rompe el sondeo. */
async function readPollBody(response: Response): Promise<JsonRecord> {
  const text = await response.text()
  try {
    return JSON.parse(text) as JsonRecord
  } catch {
    return { error: 'invalid_response', error_description: text }
  }
}

export function createGithubDeviceFlow<Config extends GithubDeviceConfig>(deps: GithubDeviceFlowDeps<Config>): OAuthProviderFlow<Config> {
  const fetch = deps.fetch ?? globalThis.fetch
  const env = deps.env ?? process.env

  const readJson = async (url: string, accessToken: string): Promise<JsonRecord> => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'X-GitHub-Api-Version': COPILOT_API_VERSION,
        'User-Agent': copilotChatUserAgent(env),
      },
    })
    return response.ok ? ((await response.json()) as JsonRecord) : {}
  }

  return {
    config: deps.config,
    flowType: 'device_code',

    async requestDeviceCode(config) {
      const { deviceCodeUrl } = deps.endpoints(config)
      const response = await fetch(deviceCodeUrl, formRequest({ client_id: requireClientId(config), scope: config.scopes }))
      if (!response.ok) throw new Error(`Device code request failed: ${await response.text()}`)
      return response.json()
    },

    async pollToken(config, deviceCode, _codeVerifier, extraData): Promise<PollResult> {
      const { tokenUrl } = deps.endpoints(config, extraData)
      const response = await fetch(tokenUrl, formRequest({ client_id: requireClientId(config), device_code: deviceCode, grant_type: DEVICE_GRANT }))
      return { ok: response.ok, data: await readPollBody(response) }
    },

    async postExchange(tokens, extraData) {
      const endpoints = deps.endpoints(deps.config, extraData)
      const accessToken = tokens.access_token as string
      const copilotToken = await readJson(endpoints.copilotTokenUrl, accessToken)
      const userInfo = await readJson(endpoints.userInfoUrl, accessToken)
      return { copilotToken, userInfo, ...(extraData && typeof extraData === 'object' ? (extraData as JsonRecord) : {}) }
    },

    mapTokens(tokens, extra) {
      const read = (extra ?? {}) as { copilotToken?: JsonRecord; userInfo?: JsonRecord }
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        providerSpecificData: {
          autoSync: true,
          ...deps.describeAccount?.(extra as JsonRecord),
          copilotToken: read.copilotToken?.token,
          copilotTokenExpiresAt: read.copilotToken?.expires_at,
          githubUserId: read.userInfo?.id,
          githubLogin: read.userInfo?.login,
          githubName: read.userInfo?.name,
          githubEmail: read.userInfo?.email,
        },
      }
    },
  }
}
