/**
 * Las operaciones de cuenta de Kiro fuera del inicio de sesión: registrar un
 * cliente OIDC propio por conexión, refrescar por el camino que corresponde al
 * token (IdP de empresa, OIDC de AWS, servicio social de Kiro), validar un
 * refresh token pegado, descubrir el perfil y normalizar una clave de API.
 *
 * Porte de `omniroute: src/lib/oauth/services/kiro.ts` (MIT).
 */
import { readdir, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { decodeJwtPayload } from '../jwtPayload.ts'
import type { KiroOAuthConfig } from '../oauth/flows/kiroFlow.ts'
import { KIRO_AUTH_SERVICE } from '../oauth/flows/kiroSocialLogin.ts'
import type { JsonRecord } from '../oauth/oauthFlows.ts'
import { buildExternalIdpRefreshParams, isExternalIdpAuthMethod } from './kiroExternalIdp.ts'
import { assertValidAwsRegion, kiroRuntimeHost } from './kiroRegion.ts'

const DEFAULT_REGION = 'us-east-1'
const DEFAULT_EXPIRES_IN_SECONDS = 3600
/** Un refresh token de AWS SSO empieza así; los sociales y los del IdP de empresa no. */
const AWS_REFRESH_TOKEN_PREFIX = 'aorAAAAAG'
const MAX_PROFILES = 10
const API_KEY_PROFILE_DENIED = ['AccessDeniedException', 'API key authentication is not supported for this operation']

export interface KiroClientRegistration {
  clientId: string
  clientSecret: string
  clientSecretExpiresAt?: number
}

export interface KiroRefreshResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  profileArn?: string
  /** El cliente registrado de nuevo cuando el guardado ya no refrescaba; hay que persistirlo. */
  newClient?: KiroClientRegistration
}

export interface KiroImportValidation {
  accessToken: string
  refreshToken: string
  profileArn?: string
  expiresIn: number
  authMethod: 'builder-id' | 'imported'
  clientId?: string
  clientSecret?: string
  clientSecretExpiresAt?: number
}

export interface KiroApiKeyValidation {
  accessToken: string
  refreshToken: null
  profileArn: string | null
  region: string
  authMethod: 'api_key'
}

export interface KiroServiceDeps {
  config: KiroOAuthConfig
  fetch?: typeof globalThis.fetch
  /** La caché de AWS SSO donde un inicio con Builder ID dejó su cliente registrado. */
  ssoCacheDir?: string
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

function postJson(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

interface CachedClient extends KiroClientRegistration {
  region?: string
  expiresAt?: string
}

/**
 * El cliente que un inicio con Builder ID registró. El del propio token gana;
 * si no, uno de la región pedida; entre ellos, el de caducidad más tardía.
 */
export async function readCachedClientCredentials(cacheDir: string, region?: string, clientIdHint?: string): Promise<{ clientId: string; clientSecret: string } | null> {
  let files: string[]
  try {
    files = await readdir(cacheDir)
  } catch {
    return null
  }
  const candidates: CachedClient[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const data = JSON.parse(await readFile(join(cacheDir, file), 'utf8')) as JsonRecord
      if (data.clientId && data.clientSecret) {
        candidates.push({ clientId: data.clientId as string, clientSecret: data.clientSecret as string, region: data.region as string | undefined, expiresAt: (data.clientSecretExpiresAt || data.expiresAt) as string | undefined })
      }
    } catch {
      // un archivo ilegible no es un candidato
    }
  }
  if (candidates.length === 0) return null
  const exact = clientIdHint ? candidates.find(candidate => candidate.clientId === clientIdHint) : undefined
  const pick = (candidate: CachedClient) => ({ clientId: candidate.clientId, clientSecret: candidate.clientSecret })
  if (exact) return pick(exact)
  const matching = region ? candidates.filter(candidate => candidate.region === region) : []
  const ordered = (matching.length > 0 ? matching : candidates).slice().sort((a, b) => String(b.expiresAt || '').localeCompare(String(a.expiresAt || '')))
  return pick(ordered[0]!)
}

export function createKiroService(deps: KiroServiceDeps) {
  const fetch = deps.fetch ?? globalThis.fetch
  const ssoCacheDir = deps.ssoCacheDir ?? join(homedir(), '.aws', 'sso', 'cache')
  const { config } = deps

  async function registerClient(region: string = DEFAULT_REGION): Promise<KiroClientRegistration> {
    assertValidAwsRegion(region)
    const response = await fetch(
      `https://oidc.${region}.amazonaws.com/client/register`,
      postJson({ clientName: config.clientName, clientType: config.clientType, scopes: config.scopes, grantTypes: config.grantTypes, issuerUrl: config.issuerUrl }),
    )
    if (!response.ok) throw new Error(`Failed to register client: ${await response.text()}`)
    const data = (await response.json()) as JsonRecord
    return { clientId: data.clientId as string, clientSecret: data.clientSecret as string, clientSecretExpiresAt: data.clientSecretExpiresAt as number | undefined }
  }

  async function refreshExternalIdp(refreshToken: string, data: JsonRecord): Promise<KiroRefreshResult> {
    const request = buildExternalIdpRefreshParams(refreshToken, data)
    const response = await fetch(request.tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: request.body })
    if (!response.ok) throw new Error(`Token refresh failed: ${await response.text()}`)
    const tokens = (await response.json()) as JsonRecord
    return { accessToken: tokens.access_token as string, refreshToken: text(tokens.refresh_token) || refreshToken, expiresIn: (tokens.expires_in as number) || DEFAULT_EXPIRES_IN_SECONDS }
  }

  const oidcRefreshBody = (client: { clientId: string; clientSecret: string }, refreshToken: string) => postJson({ clientId: client.clientId, clientSecret: client.clientSecret, refreshToken, grantType: 'refresh_token' })

  /** Un cliente guardado caducado o ajeno se registra de nuevo y se reintenta una vez. */
  async function refreshOidc(refreshToken: string, client: { clientId: string; clientSecret: string }, region: string): Promise<KiroRefreshResult> {
    assertValidAwsRegion(region)
    const endpoint = `https://oidc.${region}.amazonaws.com/token`
    const response = await fetch(endpoint, oidcRefreshBody(client, refreshToken))
    if (!response.ok) {
      let newClient: KiroClientRegistration | null = null
      try {
        newClient = await registerClient(region)
      } catch {
        // sin cliente nuevo, cuenta el rechazo original
      }
      if (newClient) {
        const retry = await fetch(endpoint, oidcRefreshBody(newClient, refreshToken))
        if (!retry.ok) throw new Error(`Token refresh retry failed after re-registration: ${await retry.text()}`)
        const tokens = (await retry.json()) as JsonRecord
        return { accessToken: tokens.accessToken as string, refreshToken: text(tokens.refreshToken) || refreshToken, expiresIn: (tokens.expiresIn as number) || DEFAULT_EXPIRES_IN_SECONDS, newClient }
      }
      throw new Error(`Token refresh failed: ${await response.text()}`)
    }
    const tokens = (await response.json()) as JsonRecord
    return { accessToken: tokens.accessToken as string, refreshToken: text(tokens.refreshToken) || refreshToken, expiresIn: (tokens.expiresIn as number) || DEFAULT_EXPIRES_IN_SECONDS }
  }

  async function refreshSocial(refreshToken: string): Promise<KiroRefreshResult> {
    const response = await fetch(`${KIRO_AUTH_SERVICE}/refreshToken`, postJson({ refreshToken }))
    if (!response.ok) throw new Error(`Token refresh failed: ${await response.text()}`)
    const tokens = (await response.json()) as JsonRecord
    return { accessToken: tokens.accessToken as string, refreshToken: text(tokens.refreshToken) || refreshToken, profileArn: tokens.profileArn as string | undefined, expiresIn: (tokens.expiresIn as number) || DEFAULT_EXPIRES_IN_SECONDS }
  }

  /**
   * El camino lo decide el token: IdP de empresa; OIDC de AWS si hay cliente
   * (salvo el token social importado, que ese cliente no sabe refrescar); si
   * no, el servicio social de Kiro.
   */
  async function refreshToken(refreshToken: string, data: JsonRecord = {}): Promise<KiroRefreshResult> {
    if (isExternalIdpAuthMethod(data.authMethod)) return refreshExternalIdp(refreshToken, data)
    const clientId = text(data.clientId)
    const clientSecret = text(data.clientSecret)
    if (clientId && clientSecret && data.authMethod !== 'imported') return refreshOidc(refreshToken, { clientId, clientSecret }, text(data.region) || DEFAULT_REGION)
    return refreshSocial(refreshToken)
  }

  /**
   * Un refresh token pegado vale si alguien lo refresca: primero el cliente de
   * Builder ID de la caché de SSO, después el servicio social. Una importación
   * social registra su propio cliente para no compartir sesión con otras cuentas.
   */
  async function validateImportToken(token: string, region: string = DEFAULT_REGION, clientIdHint?: string): Promise<KiroImportValidation> {
    assertValidAwsRegion(region)
    if (!token.startsWith(AWS_REFRESH_TOKEN_PREFIX)) throw new Error(`Invalid token format. Token should start with ${AWS_REFRESH_TOKEN_PREFIX}...`)

    const cachedClient = await readCachedClientCredentials(ssoCacheDir, region, clientIdHint)
    if (cachedClient) {
      try {
        const result = await refreshToken(token, { ...cachedClient, authMethod: 'builder-id', region })
        return { accessToken: result.accessToken, refreshToken: result.refreshToken || token, profileArn: result.profileArn, expiresIn: result.expiresIn, authMethod: 'builder-id', ...cachedClient }
      } catch {
        // el cliente de la caché no lo refresca: se prueba el camino social
      }
    }

    let result: KiroRefreshResult
    try {
      result = await refreshToken(token)
    } catch (error) {
      throw new Error(`Token validation failed: ${(error as Error).message}`)
    }
    let ownClient: KiroClientRegistration | null = null
    try {
      ownClient = await registerClient(region)
    } catch {
      // sin cliente propio, la conexión sigue con el camino social
    }
    return { accessToken: result.accessToken, refreshToken: result.refreshToken || token, profileArn: result.profileArn, expiresIn: result.expiresIn, authMethod: 'imported', ...(ownClient?.clientId ? ownClient : {}) }
  }

  /** El ARN del perfil de CodeWhisperer; el de la región pedida gana sobre el primero. */
  async function listAvailableProfiles(accessToken: string, region: string = DEFAULT_REGION): Promise<string | null> {
    assertValidAwsRegion(region)
    const response = await fetch(kiroRuntimeHost(region), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-amz-json-1.0',
        'x-amz-target': 'AmazonCodeWhispererService.ListAvailableProfiles',
        Accept: 'application/json',
        tokentype: 'API_KEY',
      },
      body: JSON.stringify({ maxResults: MAX_PROFILES }),
    })
    if (!response.ok) throw new Error(`Failed to list profiles: ${await response.text()}`)
    const data = (await response.json()) as JsonRecord
    const profiles = Array.isArray(data.profiles) ? (data.profiles as JsonRecord[]) : []
    const arnOf = (profile: JsonRecord | undefined) => (profile?.arn || profile?.profileArn || null) as string | null
    const match = profiles.find(profile => String(arnOf(profile) || '').includes(`:${region}:`)) || profiles[0]
    return arnOf(match)
  }

  /**
   * Una clave de API de larga duración. Algunas pueden generar pero no listar
   * perfiles: esa negativa concreta deja el perfil vacío en vez de invalidarla.
   */
  async function validateApiKey(apiKey: string, region: string = DEFAULT_REGION): Promise<KiroApiKeyValidation> {
    assertValidAwsRegion(region)
    const accessToken = apiKey.trim()
    if (!accessToken) throw new Error('API key is required')
    let profileArn: string | null = null
    try {
      profileArn = await listAvailableProfiles(accessToken, region)
    } catch (error) {
      const message = String((error as Error)?.message || error || '')
      if (!API_KEY_PROFILE_DENIED.every(fragment => message.includes(fragment))) throw error
    }
    return { accessToken, refreshToken: null, profileArn, region, authMethod: 'api_key' }
  }

  /** El nombre de la cuenta para mostrar: correo, nombre de usuario preferido o sujeto. */
  function extractEmailFromJwt(accessToken: string): string | null {
    const claims = decodeJwtPayload(accessToken)
    return (claims?.email || claims?.preferred_username || claims?.sub || null) as string | null
  }

  return { registerClient, refreshToken, validateImportToken, listAvailableProfiles, validateApiKey, extractEmailFromJwt }
}
