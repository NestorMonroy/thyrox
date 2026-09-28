/**
 * El inicio de sesión nativo de Zed: en vez de un cliente OAuth registrado,
 * cada intento genera un par RSA, envía la clave pública a
 * `zed.dev/native_app_signin` y descifra con la privada el token que la
 * redirección local trae cifrado. La clave privada viaja por la ranura del
 * verificador PKCE y no sale de quien inicia sesión.
 *
 * Porte de la mitad de autenticación de `omniroute: open-sse/shared/zedAuth.ts`
 * (MIT).
 */
import { constants, generateKeyPairSync, privateDecrypt, randomUUID } from 'node:crypto'

import type { JsonRecord } from '../oauth/oauthFlows.ts'

export const ZED_WEB_BASE_URL = 'https://zed.dev'
export const ZED_CLOUD_BASE_URL = 'https://cloud.zed.dev'
export const ZED_DEFAULT_NATIVE_APP_PORT = 58443
export const ZED_SYSTEM_ID_HEADER = 'x-zed-system-id'

const PRIVATE_KEY_PREFIX = 'zed-rsa-pkcs1:'
const RSA_MODULUS_BITS = 2048

export interface ZedRequestConfig {
  webBaseUrl?: string
  cloudBaseUrl?: string
  defaultNativeAppPort?: number
}

export interface ZedCredentials {
  accessToken?: string
  apiKey?: string
  userId?: string
  systemId?: string
  providerSpecificData?: { userId?: string; systemId?: string; organizationId?: unknown; defaultOrganizationId?: unknown } | null
}

export interface ZedNativeAuthData {
  authUrl: string
  privateKeyVerifier: string
  nativeAppPort: number
  systemId: string
  publicKey: string
}

export interface ZedCallbackPayload {
  userId: string
  encryptedAccessToken: string
}

function normalizeBaseUrl(baseUrl: unknown, fallback: string): string {
  return String(baseUrl || fallback).replace(/\/+$/, '')
}

/** La clave privada en PEM como verificador opaco para la ranura del PKCE. */
export function encodeZedPrivateKeyVerifier(privateKeyPem: string): string {
  return `${PRIVATE_KEY_PREFIX}${Buffer.from(privateKeyPem).toString('base64url')}`
}

export function decodeZedPrivateKeyVerifier(verifier: unknown): string {
  const value = String(verifier || '')
  if (!value.startsWith(PRIVATE_KEY_PREFIX)) throw new Error('Missing Zed private key verifier; restart the login flow')
  return Buffer.from(value.slice(PRIVATE_KEY_PREFIX.length), 'base64url').toString('utf8')
}

/** Un par RSA nuevo y la URL de `native_app_signin` que lo presenta. */
export function createZedNativeAuthData(config: ZedRequestConfig = {}, options: { nativeAppPort?: number; systemId?: string } = {}): ZedNativeAuthData {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: RSA_MODULUS_BITS,
    publicKeyEncoding: { type: 'pkcs1', format: 'der' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  })
  const nativeAppPort = Number(options.nativeAppPort || config.defaultNativeAppPort || ZED_DEFAULT_NATIVE_APP_PORT)
  const systemId = options.systemId || randomUUID()
  // Base64 URL-safe con relleno: la forma que Zed espera en este parámetro.
  const publicKeyString = publicKey.toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
  const signInUrl = new URL(`${normalizeBaseUrl(config.webBaseUrl, ZED_WEB_BASE_URL)}/native_app_signin`)
  signInUrl.searchParams.set('native_app_port', String(nativeAppPort))
  signInUrl.searchParams.set('native_app_public_key', publicKeyString)
  signInUrl.searchParams.set('system_id', systemId)
  return { authUrl: signInUrl.toString(), privateKeyVerifier: encodeZedPrivateKeyVerifier(privateKey), nativeAppPort, systemId, publicKey: publicKeyString }
}

/** El usuario y el token cifrado de la redirección pegada: URL, consulta suelta o JSON. */
export function parseZedCallbackPayload(input: unknown): ZedCallbackPayload {
  const raw = String(input || '').trim()
  if (!raw) throw new Error('Missing Zed callback URL')
  let data: JsonRecord = {}
  try {
    data = JSON.parse(raw) as JsonRecord
  } catch {
    let url: URL
    try {
      url = new URL(raw)
    } catch {
      url = new URL(`http://127.0.0.1/?${raw.replace(/^\?/, '')}`)
    }
    url.searchParams.forEach((value, key) => {
      data[key] = value
    })
  }
  const userId = data.user_id || data.userId
  const encryptedAccessToken = data.access_token || data.accessToken || data.token
  if (!userId || !encryptedAccessToken) throw new Error('Zed callback must include user_id and access_token')
  return { userId: String(userId), encryptedAccessToken: String(encryptedAccessToken) }
}

/** Descifra con OAEP-SHA256, el relleno que Zed usa en su flujo nativo. */
export function decryptZedAccessToken(encryptedAccessToken: unknown, privateKeyVerifier: unknown): string {
  const key = decodeZedPrivateKeyVerifier(privateKeyVerifier)
  const encrypted = Buffer.from(String(encryptedAccessToken), 'base64url')
  try {
    return privateDecrypt({ key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, encrypted).toString('utf8')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to decrypt Zed access token: ${message}`)
  }
}

/** Zed autentica al usuario con `<userId> <token>`, no con `Bearer`. */
export function buildZedUserAuthHeader(credentials: ZedCredentials | null | undefined): string {
  const userId = credentials?.providerSpecificData?.userId || credentials?.userId
  const accessToken = credentials?.accessToken || credentials?.apiKey
  if (!userId || !accessToken) throw new Error('Zed credential is missing userId or accessToken')
  return `${userId} ${accessToken}`
}

export async function fetchZedAuthenticatedUser(fetch: typeof globalThis.fetch, credentials: ZedCredentials, config: ZedRequestConfig = {}): Promise<JsonRecord | null> {
  const headers: Record<string, string> = { Accept: 'application/json', Authorization: buildZedUserAuthHeader(credentials) }
  const systemId = String(credentials.providerSpecificData?.systemId || credentials.systemId || '')
  if (systemId) headers[ZED_SYSTEM_ID_HEADER] = systemId
  const response = await fetch(`${normalizeBaseUrl(config.cloudBaseUrl, ZED_CLOUD_BASE_URL)}/client/users/me`, { method: 'GET', headers })
  const text = await response.text()
  let data: JsonRecord | null = null
  if (text) {
    try {
      data = JSON.parse(text) as JsonRecord
    } catch {
      data = { raw: text }
    }
  }
  if (!response.ok) throw new Error(String(data?.message || data?.error || text || `HTTP ${response.status}`))
  return data
}

function normalizeOrganizationId(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const record = value as JsonRecord
    if (typeof record[0] === 'string') return record[0]
    if (typeof record.id === 'string') return record.id
  }
  return String(value)
}

/** La organización declarada; si no, la por defecto del usuario, la personal o la primera. */
export function resolveZedOrganizationId(credentials: ZedCredentials, userInfo: JsonRecord | null = null): string {
  const declared = credentials?.providerSpecificData
  const explicit = normalizeOrganizationId(declared?.organizationId || declared?.defaultOrganizationId)
  if (explicit) return explicit
  const fromUser = normalizeOrganizationId(userInfo?.default_organization_id || userInfo?.defaultOrganizationId)
  if (fromUser) return fromUser
  const organizations = (userInfo?.organizations ?? []) as JsonRecord[]
  const organization = organizations.find(item => item?.is_personal) || organizations[0]
  return normalizeOrganizationId(organization?.id)
}
