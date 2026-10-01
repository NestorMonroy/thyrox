/**
 * Muse Code (Meta): el grant de dispositivo entrega un token de cliente
 * (`dca:`) que se canjea por la clave de inferencia de la suscripción.
 *
 * Porte de `omniroute: open-sse/config/museCode.ts` y
 * `open-sse/services/museCodeAuth.ts` (MIT).
 */
import type { JsonRecord } from '../oauth/oauthFlows.ts'

export const MUSE_CODE_USER_AGENT = 'muse-code/1.0.2'
export const MUSE_CODE_MINT_URL = 'https://api.meta.ai/muse-code/key'
export const MUSE_CODE_API_BASE_URL = 'https://api.meta.ai/v1'
export const MUSE_CODE_DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'
export const MUSE_CODE_DEFAULT_POLL_INTERVAL_SEC = 5

export interface MuseMintedKey {
  apiKey: string
  baseUrl: string
  email?: string
  name?: string
  subsTierName?: string
  subsTierId?: string
  isSubsActive?: boolean
  hasPaymentMethod?: boolean
  requirePayment?: boolean
  canSubscribe?: boolean
}

/** Meta exige el User-Agent del CLI de Muse. */
export function museCodeHeaders(extra?: Record<string, string>): Record<string, string> {
  return { Accept: 'application/json', 'User-Agent': MUSE_CODE_USER_AGENT, ...extra }
}

export function isMuseDcaToken(token: string | null | undefined): boolean {
  return typeof token === 'string' && token.trim().startsWith('dca:')
}

export function normalizeMuseBaseUrl(raw: string | null | undefined): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) return MUSE_CODE_API_BASE_URL
  return trimmed.replace(/\/+$/, '')
}

const text = (value: unknown) => (typeof value === 'string' && value.trim()) || undefined
const flag = (value: unknown) => (typeof value === 'boolean' ? value : undefined)
const label = (value: unknown) => (typeof value === 'string' ? value : undefined)

/** Canjea el token de dispositivo por la clave de inferencia de la suscripción. */
export async function mintMuseApiKey(fetch: typeof globalThis.fetch, dcaToken: string, mintUrl = MUSE_CODE_MINT_URL): Promise<MuseMintedKey> {
  const token = dcaToken.trim()
  if (!token) throw new Error('Muse Code mint requires a device access token.')
  const response = await fetch(mintUrl, {
    method: 'POST',
    headers: museCodeHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    body: JSON.stringify({ dca_token: token }),
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`Muse Code key mint failed (HTTP ${response.status}).`)
  let data: JsonRecord
  try {
    data = body ? (JSON.parse(body) as JsonRecord) : {}
  } catch {
    throw new Error('Muse Code key mint response was not JSON.')
  }
  const apiKey = text(data.api_key) || text(data.apiKey) || ''
  if (!apiKey) throw new Error('Muse Code key mint response missing api_key.')
  return {
    apiKey,
    baseUrl: normalizeMuseBaseUrl(label(data.base_url) || label(data.baseUrl) || ''),
    email: text(data.user_email) || text(data.email),
    name: text(data.user_full_name) || text(data.name),
    subsTierName: label(data.subs_tier_name),
    subsTierId: label(data.subs_tier_id),
    isSubsActive: flag(data.is_subs_active),
    hasPaymentMethod: flag(data.has_payment_method),
    requirePayment: flag(data.require_payment),
    canSubscribe: flag(data.can_subscribe),
  }
}
