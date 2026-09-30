/**
 * ¿Es la cuenta que llega la misma que una fila ya guardada? Los criterios
 * que no son sólo una igualdad de columnas: la identidad OAuth desambiguada,
 * el usuario de Codex dentro de su workspace y el servidor de un proveedor
 * local.
 *
 * Porte de `omniroute: src/lib/db/webSessionDedup.ts`,
 * `src/lib/oauth/utils/codexConnectionSelection.ts` y de `isLocalProviderId`
 * y `normalizeBaseUrlForDedup` en `src/lib/db/providers.ts` (MIT).
 */
import type { JsonRecord } from './connectionColumns.ts'

/**
 * Proveedores autoalojados: su clave suele ser un marcador que se repite
 * entre servidores distintos. `omniroute: src/shared/constants/providers/local.ts`.
 */
const LOCAL_PROVIDERS = new Set([
  'mlx-gemma', 'mlx-qwen', 'ollama-local', 'lm-studio', 'vllm', 'lemonade', 'llamafile',
  'llama-cpp', 'triton', 'docker-model-runner', 'xinference', 'oobabooga', 'sdwebui', 'comfyui',
])

export function isLocalProvider(providerId: unknown): boolean {
  return typeof providerId === 'string' && LOCAL_PROVIDERS.has(providerId)
}

/** Sin espacios ni barra final: una diferencia cosmética no separa dos servidores. */
export function normalizeBaseUrl(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : ''
}

export function parseProviderSpecificData(raw: unknown): JsonRecord | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as JsonRecord
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as JsonRecord) : null
  } catch {
    return null
  }
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Decide si los dos lados lo traen; si sólo uno lo trae, son cuentas distintas. */
function eitherSideMatch(incoming: string | null, existing: string | null): boolean | undefined {
  if (incoming && existing) return incoming === existing
  if (incoming || existing) return false
  return undefined
}

/**
 * Decide sólo si los dos lados lo traen: una fila guardada antes de que el
 * campo existiera no se bifurca en un duplicado al siguiente login.
 */
function bothSidesMatch(incoming: string | null, existing: string | null): boolean | undefined {
  return incoming && existing ? incoming === existing : undefined
}

export interface OauthDisambiguators {
  username: string | null
  profileArn: string | null
  organizationUuid: string | null
}

/**
 * Con el mismo email, tres campos pueden probar que son cuentas distintas:
 * el `username` del IdP, el `profileArn` de un perfil AWS y el
 * `organizationUUID`, que separa el espacio personal de cada organización.
 */
export function isMatchingOauthIdentity(row: { provider_specific_data?: unknown }, incoming: OauthDisambiguators): boolean {
  const existing = parseProviderSpecificData(row.provider_specific_data)
  const verdicts = [
    eitherSideMatch(incoming.username, nonEmptyString(existing?.username)),
    eitherSideMatch(incoming.profileArn, nonEmptyString(existing?.profileArn)),
    bothSidesMatch(incoming.organizationUuid, nonEmptyString(existing?.organizationUUID)),
  ]
  return !verdicts.includes(false)
}

interface CodexIdentity {
  userId: string | null
  email: string | null
}

function readCodexIdentity(row: JsonRecord): CodexIdentity {
  const data = parseProviderSpecificData(row.providerSpecificData ?? row.provider_specific_data) ?? {}
  return { userId: nonEmptyString(data.chatgptUserId), email: nonEmptyString(row.email) }
}

/**
 * Entre las filas del mismo workspace, la del mismo usuario; si ninguna
 * guarda usuario todavía, la del mismo email o, en su defecto, una sin email.
 * Si alguna guarda otro usuario, la cuenta es nueva.
 */
export function pickCodexConnectionForUser(workspaceMatches: JsonRecord[], userId: string, email: string | null): JsonRecord | null {
  const identities = workspaceMatches.map(row => ({ row, identity: readCodexIdentity(row) }))
  const exact = identities.find(({ identity }) => identity.userId === userId)
  if (exact) return exact.row
  if (identities.some(({ identity }) => identity.userId !== null)) return null
  const normalizedEmail = nonEmptyString(email)
  const sameEmail = normalizedEmail ? identities.find(({ identity }) => identity.email === normalizedEmail) : undefined
  return sameEmail?.row ?? identities.find(({ identity }) => identity.email === null)?.row ?? null
}

/** Las claves donde una sesión web guarda su secreto, en orden de preferencia. */
const WEB_SESSION_CREDENTIAL_KEYS = ['cookie', 'token', 'sessionToken', 'session-token', 'sso', 'access_token', 'accessToken']

function firstNonEmptyString(record: JsonRecord, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = nonEmptyString(record[key])
    if (value) return value
  }
  return null
}

/**
 * El secreto que identifica una sesión web (cookie o token), sea cual sea la
 * clave donde el proveedor lo guarde: la misma sesión reimportada con otro
 * nombre es la misma cuenta.
 */
export function webSessionCredentialKey(providerSpecificData: unknown): string | null {
  if (!providerSpecificData || typeof providerSpecificData !== 'object') return null
  const record = providerSpecificData as JsonRecord
  return firstNonEmptyString(record, WEB_SESSION_CREDENTIAL_KEYS) ?? firstNonEmptyString(record, Object.keys(record).sort())
}
