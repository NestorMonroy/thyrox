/**
 * Guardar el resultado de un inicio de sesión OAuth como cuenta del store:
 * actualiza la cuenta que ya es la misma —por id explícito, o por email con
 * la desambiguación de `codex` y de `claude`— o crea una nueva.
 *
 * Porte de `omniroute: src/lib/oauth/connectionPersistence.ts` (MIT).
 */
import { timingSafeEqual } from 'node:crypto'

import type { JsonRecord } from '../connectionColumns.ts'
import type { ConnectionStore } from '../connectionStore.ts'
import { degradedProjectState, persistStatus } from './antigravityProjectGate.ts'

const MILLISECONDS_PER_SECOND = 1000

/** Comparación en tiempo constante; dos ausentes son iguales. */
export function safeEqual(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a === b
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && timingSafeEqual(left, right)
}

function specificData(record: JsonRecord): JsonRecord | undefined {
  const value = record.providerSpecificData
  return value && typeof value === 'object' ? (value as JsonRecord) : undefined
}

/**
 * En `codex` decide el workspace si alguno de los dos lo trae; si ninguno, el
 * mismo email no basta y tiene que coincidir el usuario.
 */
function isSameWorkspaceAccount(existing?: JsonRecord, incoming?: JsonRecord): boolean {
  if (incoming?.workspaceId || existing?.workspaceId) return safeEqual(existing?.workspaceId, incoming?.workspaceId)
  return Boolean(incoming?.chatgptUserId) && safeEqual(existing?.chatgptUserId, incoming?.chatgptUserId)
}

/** En `claude` separa la organización, sólo si los dos lados la traen. */
function isSameOrganizationAccount(existing?: JsonRecord, incoming?: JsonRecord): boolean {
  if (incoming?.organizationUUID && existing?.organizationUUID) return safeEqual(existing.organizationUUID, incoming.organizationUUID)
  return true
}

const SAME_ACCOUNT_BY_PROVIDER: Record<string, (existing?: JsonRecord, incoming?: JsonRecord) => boolean> = {
  codex: isSameWorkspaceAccount,
  claude: isSameOrganizationAccount,
}

export function findExistingOAuthConnection(
  existing: JsonRecord[],
  provider: string,
  tokenData: JsonRecord,
  connectionId?: string,
): JsonRecord | undefined {
  const sameAccount = SAME_ACCOUNT_BY_PROVIDER[provider]
  return existing.find(connection => {
    if (connection.id && safeEqual(connectionId, connection.id)) return true
    // Sin email en lo que llega, `safeEqual(undefined, undefined)` casaría con la primera cuenta sin email.
    if (!tokenData.email) return false
    if (!safeEqual(connection.email, tokenData.email) || connection.authType !== 'oauth') return false
    return sameAccount ? sameAccount(specificData(connection), specificData(tokenData)) : true
  })
}

export interface PersistOptions {
  /** Una cuenta concreta que actualizar: re-autenticación o refresco de una conocida. */
  connectionId?: string
  now?: () => number
}

export function persistOAuthConnection(
  store: ConnectionStore,
  provider: string,
  tokenData: JsonRecord,
  options: PersistOptions = {},
): JsonRecord | null {
  const now = options.now ?? Date.now
  const data: JsonRecord = { ...tokenData }
  if (!data.name && (data.email || data.displayName)) data.name = data.email || data.displayName
  const expiresAt = typeof data.expiresIn === 'number' && data.expiresIn
    ? new Date(now() + data.expiresIn * MILLISECONDS_PER_SECOND).toISOString()
    : null

  // El estado gana sobre el payload: un error viejo que traiga no se cuela.
  const status = persistStatus(degradedProjectState(provider, data))

  if (options.connectionId || data.email) {
    const match = findExistingOAuthConnection(store.list({ provider }), provider, data, options.connectionId)
    if (typeof match?.id === 'string') return store.update(match.id, { ...data, expiresAt, ...status, isActive: true })
  }
  return store.create({ provider, authType: 'oauth', ...data, expiresAt, tokenExpiresAt: expiresAt, ...status })
}
