/**
 * El flujo de dispositivo de Kiro (AWS Builder ID o IAM Identity Center):
 * registrar un cliente OIDC, pedir la autorización del dispositivo, sondear el
 * token en la región del Identity Center y, para una cuenta de Identity
 * Center, descubrir el ARN de su perfil de Amazon Q.
 *
 * Porte de `omniroute: src/lib/oauth/providers/kiro.ts` y de `KIRO_CONFIG` en
 * `constants/oauth.ts` (MIT).
 */
import { assertValidAwsRegion, AWS_REGION_PATTERN, discoverKiroProfileArn } from '../../kiro/kiroRegion.ts'
import type { JsonRecord, OAuthProviderFlow, PollResult } from '../oauthFlows.ts'

export interface KiroOAuthConfig {
  registerClientUrl: string
  deviceAuthUrl: string
  tokenUrl: string
  startUrl: string
  clientName: string
  clientType: string
  scopes: string[]
  grantTypes: string[]
  issuerUrl: string
  /** Un Identity Center de empresa tiene su propio issuer: enviar el fijo rompe la autorización. */
  skipIssuerUrlForRegistration?: boolean
}

const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'
const DEFAULT_REGION = 'us-east-1'
const DEFAULT_INTERVAL_SECONDS = 5

export function kiroOAuthConfig(): KiroOAuthConfig {
  return {
    registerClientUrl: 'https://oidc.us-east-1.amazonaws.com/client/register',
    deviceAuthUrl: 'https://oidc.us-east-1.amazonaws.com/device_authorization',
    tokenUrl: 'https://oidc.us-east-1.amazonaws.com/token',
    startUrl: 'https://view.awsapps.com/start',
    clientName: 'kiro-oauth-client',
    clientType: 'public',
    scopes: ['codewhisperer:completions', 'codewhisperer:analysis', 'codewhisperer:conversations'],
    grantTypes: [DEVICE_GRANT, 'refresh_token'],
    issuerUrl: 'https://identitycenter.amazonaws.com/ssoins-722374e8c3c8e6c6',
  }
}

function postJson(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }
}

/** La región del token sale de la URL fija de la configuración, y se revalida antes de usarla. */
function regionOfTokenUrl(tokenUrl: string): string {
  const candidate = tokenUrl.match(/oidc\.([a-z0-9-]+)\.amazonaws\.com/i)?.[1] ?? DEFAULT_REGION
  return AWS_REGION_PATTERN.test(candidate) ? candidate : DEFAULT_REGION
}

export interface KiroFlowDeps {
  config: KiroOAuthConfig
  fetch?: typeof globalThis.fetch
}

export function createKiroFlow(deps: KiroFlowDeps): OAuthProviderFlow<KiroOAuthConfig> {
  const fetch = deps.fetch ?? globalThis.fetch
  return {
    config: deps.config,
    flowType: 'device_code',

    async requestDeviceCode(config) {
      const registration: JsonRecord = { clientName: config.clientName, clientType: config.clientType, scopes: config.scopes, grantTypes: config.grantTypes }
      if (config.issuerUrl && !config.skipIssuerUrlForRegistration) registration.issuerUrl = config.issuerUrl
      const registered = await fetch(config.registerClientUrl, postJson(registration))
      if (!registered.ok) throw new Error(`Client registration failed: ${await registered.text()}`)
      const client = (await registered.json()) as JsonRecord

      const authorized = await fetch(config.deviceAuthUrl, postJson({ clientId: client.clientId, clientSecret: client.clientSecret, startUrl: config.startUrl }))
      if (!authorized.ok) throw new Error(`Device authorization failed: ${await authorized.text()}`)
      const device = (await authorized.json()) as JsonRecord
      return {
        device_code: device.deviceCode,
        user_code: device.userCode,
        verification_uri: device.verificationUri,
        verification_uri_complete: device.verificationUriComplete,
        expires_in: device.expiresIn,
        interval: device.interval || DEFAULT_INTERVAL_SECONDS,
        _clientId: client.clientId,
        _clientSecret: client.clientSecret,
        _region: regionOfTokenUrl(config.tokenUrl),
        _authMethod: config.skipIssuerUrlForRegistration ? 'idc' : 'builder-id',
      }
    },

    async pollToken(_config, deviceCode, _codeVerifier, extraData): Promise<PollResult> {
      const extra = (extraData ?? {}) as JsonRecord
      const region = assertValidAwsRegion(String(extra._region || DEFAULT_REGION).toLowerCase())
      const response = await fetch(
        `https://oidc.${region}.amazonaws.com/token`,
        postJson({ clientId: extra._clientId, clientSecret: extra._clientSecret, deviceCode, grantType: DEVICE_GRANT }),
      )
      const text = await response.text()
      let data: JsonRecord
      try {
        data = JSON.parse(text) as JsonRecord
      } catch {
        data = { error: 'invalid_response', error_description: text }
      }
      if (!data.accessToken) {
        return { ok: false, data: { error: data.error || 'authorization_pending', error_description: data.error_description || data.message } }
      }
      return {
        ok: true,
        data: {
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
          expires_in: data.expiresIn,
          _clientId: extra._clientId,
          _clientSecret: extra._clientSecret,
          _region: region,
          _authMethod: extra._authMethod || 'builder-id',
        },
      }
    },

    // Una cuenta de Identity Center necesita el ARN de su perfil en cada llamada; una Builder ID no tiene.
    async postExchange(tokens) {
      if (!tokens.access_token || tokens._authMethod === 'builder-id') return null
      const arn = await discoverKiroProfileArn(tokens.access_token as string, typeof tokens._region === 'string' ? tokens._region : undefined, fetch)
      return arn ? { profileArn: arn } : null
    },

    mapTokens(tokens, extra) {
      const profileArn = (extra as { profileArn?: string } | null)?.profileArn
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        providerSpecificData: {
          clientId: tokens._clientId,
          clientSecret: tokens._clientSecret,
          region: tokens._region,
          authMethod: tokens._authMethod || (profileArn ? 'idc' : 'builder-id'),
          ...(profileArn ? { profileArn } : {}),
        },
      }
    },
  }
}
