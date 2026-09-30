/**
 * El blob de credenciales que se pega en un inicio de sesión remoto. Los
 * clientes nativos de Google (Antigravity/agy) sólo sueltan el código si la
 * redirección de loopback es alcanzable, y en un anfitrión remoto no lo es:
 * el ayudante local completa el OAuth en la máquina de quien inicia sesión y
 * codifica la respuesta de tokens en una línea que sobrevive a copiar y pegar
 * — prefijo reconocible y base64url, sin `+`, `/`, `=` ni espacios.
 *
 * Porte de `omniroute: src/lib/oauth/credentialBlob.ts` (MIT).
 */
export const CREDENTIAL_BLOB_PREFIX = 'thyrox-cred-v1.'
const CREDENTIAL_BLOB_VERSION = 1
const BASE64URL = /^[A-Za-z0-9_-]+$/

export interface CredentialBlobTokens {
  access_token?: string
  refresh_token?: string
  id_token?: string
  expires_in?: number
  scope?: string
  [key: string]: unknown
}

export interface CredentialBlob {
  provider: string
  tokens: CredentialBlobTokens
}

export function encodeCredentialBlob(input: CredentialBlob): string {
  if (!input || typeof input.provider !== 'string' || !input.provider.trim()) throw new Error('encodeCredentialBlob: a non-empty provider is required')
  if (!input.tokens || typeof input.tokens !== 'object') throw new Error('encodeCredentialBlob: tokens object is required')
  const payload = { v: CREDENTIAL_BLOB_VERSION, provider: input.provider.trim(), tokens: input.tokens }
  return `${CREDENTIAL_BLOB_PREFIX}${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`
}

/** Valida prefijo, versión, forma y que haya `access_token`; cualquier otra cosa se rehúsa diciendo por qué. */
export function decodeCredentialBlob(blob: string): CredentialBlob {
  if (typeof blob !== 'string' || !blob.startsWith(CREDENTIAL_BLOB_PREFIX)) {
    throw new Error(`decodeCredentialBlob: invalid format — must start with "${CREDENTIAL_BLOB_PREFIX}"`)
  }
  const payload = blob.slice(CREDENTIAL_BLOB_PREFIX.length).trim()
  if (!BASE64URL.test(payload)) throw new Error('decodeCredentialBlob: invalid payload — not base64url')
  let parsed: { v?: unknown; provider?: unknown; tokens?: unknown }
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    throw new Error('decodeCredentialBlob: invalid payload — could not parse JSON')
  }
  if (parsed.v !== CREDENTIAL_BLOB_VERSION) {
    throw new Error(`decodeCredentialBlob: unsupported blob version ${String(parsed.v)} (expected ${CREDENTIAL_BLOB_VERSION})`)
  }
  if (typeof parsed.provider !== 'string' || !parsed.provider.trim()) throw new Error('decodeCredentialBlob: invalid payload — missing provider')
  const tokens = parsed.tokens as CredentialBlobTokens | undefined
  if (!tokens || typeof tokens !== 'object') throw new Error('decodeCredentialBlob: invalid payload — missing tokens')
  if (typeof tokens.access_token !== 'string' || !tokens.access_token) throw new Error('decodeCredentialBlob: invalid payload — missing access_token')
  return { provider: parsed.provider.trim(), tokens }
}
