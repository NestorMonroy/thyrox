/**
 * El despachador de inicios de sesión OAuth: cada proveedor declara su flujo
 * (código con o sin PKCE, device code o importación de token) y sus pasos, y
 * aquí se componen en la URL de autorización, el intercambio del código y el
 * sondeo del device code.
 *
 * Porte de `getProvider`, `generateAuthData`, `exchangeTokens`,
 * `finalizeTokens`, `requestDeviceCode` y `pollForToken` de
 * `omniroute: src/lib/oauth/providers.ts` (MIT). Los flujos se reciben en vez
 * de salir de un registro global.
 */
import { generatePkce } from './pkce.ts'

export type JsonRecord = Record<string, unknown>
export type FlowType = 'authorization_code' | 'authorization_code_pkce' | 'device_code' | 'import_token'

export interface BuiltAuthUrl {
  authUrl: string
  /** Un verificador propio del proveedor (una clave RSA, por ejemplo) en vez del PKCE. */
  codeVerifier?: string
  redirectUri?: string
}

export interface PollResult {
  ok: boolean
  data: JsonRecord
}

export interface OAuthProviderFlow<Config = unknown> {
  config: Config
  flowType: FlowType
  pkceVerifierBytes?: number
  /** Un flujo de device code que además ofrece el inicio en el navegador con PKCE. */
  supportsBrowserPkce?: boolean
  fixedPort?: number
  callbackPath?: string
  callbackHost?: string
  /** Qué hacer en vez del navegador, para un flujo de importación de token. */
  importTokenHint?: string
  buildAuthUrl?(config: Config, redirectUri: string, state: string, codeChallenge?: string): string | BuiltAuthUrl
  exchangeToken?(config: Config, code: string, redirectUri: string, codeVerifier: string, state: string): Promise<JsonRecord>
  requestDeviceCode?(config: Config, codeChallenge: string): Promise<unknown>
  pollToken?(config: Config, deviceCode: string, codeVerifier?: string, extraData?: unknown): Promise<PollResult>
  postExchange?(tokens: JsonRecord, extraData?: unknown): Promise<unknown>
  /** Para un flujo de importación: si el token pegado se puede aceptar. */
  validateImportToken?(token: string): { valid: boolean; reason?: string }
  mapTokens(tokens: JsonRecord, extra: unknown): JsonRecord
}

export interface AuthData {
  authUrl: string | null | undefined
  state: string | undefined
  codeVerifier: string | undefined
  codeChallenge: string | undefined
  redirectUri: string
  flowType: FlowType
  fixedPort: number | undefined
  callbackPath: string
  callbackHost: string
  supported: boolean
  error?: string
}

export type PollOutcome =
  | { success: true; tokens: JsonRecord }
  | { success: false; error: unknown; errorDescription: unknown; pending?: boolean }

const PENDING_ERRORS = new Set(['authorization_pending', 'slow_down'])

export interface OAuthFlows {
  getFlow(provider: string): OAuthProviderFlow
  generateAuthData(provider: string, redirectUri: string): AuthData
  exchangeTokens(provider: string, code: string, redirectUri: string, codeVerifier: string, state: string): Promise<JsonRecord>
  /** Tokens obtenidos fuera de banda: el mismo final que el intercambio, sin petición de token. */
  finalizeTokens(provider: string, tokens: JsonRecord): Promise<JsonRecord>
  requestDeviceCode(provider: string, codeChallenge: string, configOverride?: unknown): Promise<unknown>
  pollForToken(provider: string, deviceCode: string, codeVerifier?: string, extraData?: unknown): Promise<PollOutcome>
}

function requireStep<T>(step: T | undefined, provider: string, name: string): T {
  if (!step) throw new Error(`Provider ${provider} does not declare ${name}`)
  return step
}

export function createOAuthFlows(flows: Record<string, OAuthProviderFlow<any>>): OAuthFlows {
  const getFlow = (provider: string): OAuthProviderFlow => {
    const flow = flows[provider]
    if (!flow) throw new Error(`Unknown provider: ${provider}`)
    return flow
  }

  const requireDeviceFlow = (provider: string): OAuthProviderFlow => {
    const flow = getFlow(provider)
    if (flow.flowType !== 'device_code') throw new Error(`Provider ${provider} does not support device code flow`)
    return flow
  }

  const finish = async (flow: OAuthProviderFlow, tokens: JsonRecord, extraData?: unknown) => {
    const extra = flow.postExchange ? await flow.postExchange(tokens, extraData) : null
    return flow.mapTokens(tokens, extra)
  }

  return {
    getFlow,

    generateAuthData(provider, redirectUri) {
      const flow = getFlow(provider)
      const callback = {
        flowType: flow.flowType,
        fixedPort: flow.fixedPort,
        callbackPath: flow.callbackPath || '/callback',
        callbackHost: flow.callbackHost || 'localhost',
      }
      if (flow.flowType === 'import_token') {
        return {
          authUrl: undefined, state: undefined, codeVerifier: undefined, codeChallenge: undefined, redirectUri,
          ...callback,
          supported: false,
          error: flow.importTokenHint ?? `Browser login is disabled for ${provider}. Use the import-token flow instead.`,
        }
      }

      const pkce = generatePkce(flow.pkceVerifierBytes)
      let codeVerifier = pkce.codeVerifier
      let authUrl: string | null
      if (flow.flowType === 'authorization_code_pkce' || flow.supportsBrowserPkce) {
        authUrl = requireStep(flow.buildAuthUrl, provider, 'buildAuthUrl')(flow.config, redirectUri, pkce.state, pkce.codeChallenge) as string
      } else if (flow.flowType === 'device_code') {
        authUrl = null
      } else {
        const built = requireStep(flow.buildAuthUrl, provider, 'buildAuthUrl')(flow.config, redirectUri, pkce.state)
        if (typeof built === 'string') authUrl = built
        else {
          authUrl = built.authUrl
          codeVerifier = built.codeVerifier || codeVerifier
          redirectUri = built.redirectUri || redirectUri
        }
      }
      return { authUrl, state: pkce.state, codeVerifier, codeChallenge: pkce.codeChallenge, redirectUri, ...callback, supported: true }
    },

    async exchangeTokens(provider, code, redirectUri, codeVerifier, state) {
      const flow = getFlow(provider)
      const tokens = await requireStep(flow.exchangeToken, provider, 'exchangeToken')(flow.config, code, redirectUri, codeVerifier, state)
      return finish(flow, tokens)
    },

    finalizeTokens: (provider, tokens) => finish(getFlow(provider), tokens),

    async requestDeviceCode(provider, codeChallenge, configOverride) {
      const flow = requireDeviceFlow(provider)
      return requireStep(flow.requestDeviceCode, provider, 'requestDeviceCode')(configOverride ?? flow.config, codeChallenge)
    },

    async pollForToken(provider, deviceCode, codeVerifier, extraData) {
      const flow = requireDeviceFlow(provider)
      const result = await requireStep(flow.pollToken, provider, 'pollToken')(flow.config, deviceCode, codeVerifier, extraData)
      const data = result.data
      if (!result.ok) return { success: false, error: data.error, errorDescription: data.error_description }
      if (data.access_token) return { success: true, tokens: await finish(flow, data, extraData) }
      if (PENDING_ERRORS.has(data.error as string)) {
        return {
          success: false,
          error: data.error,
          errorDescription: data.error_description || data.message,
          pending: data.error === 'authorization_pending',
        }
      }
      return {
        success: false,
        error: data.error || 'no_access_token',
        errorDescription: data.error_description || data.message || 'No access token received',
      }
    },
  }
}
