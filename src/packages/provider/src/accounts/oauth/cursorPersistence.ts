/**
 * Guardar las credenciales de Cursor como cuenta: la misma cuenta (`sub` del
 * JWT) se actualiza y vuelve a estar activa; si no, se crea.
 *
 * Porte de `omniroute: src/lib/oauth/services/persistCursorConnection.ts` (MIT).
 */
import type { JsonRecord } from '../connectionColumns.ts'
import type { ConnectionStore } from '../connectionStore.ts'
import type { CursorTokenCredentials } from './flows/cursorLogin.ts'

export type CursorAuthMethod = 'deep_control' | 'imported' | 'cursor-agent'

export interface PersistCursorInput extends CursorTokenCredentials {
  machineId?: string | null
  authMethod: CursorAuthMethod
}

function accountIdOf(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  for (const key of ['accountId', 'userId']) {
    const value = (data as JsonRecord)[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

export function persistCursorConnection(store: ConnectionStore, input: PersistCursorInput): JsonRecord | null {
  const providerSpecificData = {
    machineId: input.machineId || null,
    authMethod: input.authMethod,
    provider: input.authMethod === 'deep_control' ? 'Deep Control' : 'Imported',
    accountId: input.accountId || null,
    userId: input.accountId || null,
    ...(input.accountId ? { username: input.accountId } : {}),
  }
  const expiresAt = input.expiresAt.toISOString()

  const match = input.accountId ? store.list({ provider: 'cursor' }).find(row => accountIdOf(row.providerSpecificData) === input.accountId) : undefined
  if (typeof match?.id === 'string') {
    return store.update(match.id, {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt,
      email: input.email || undefined,
      providerSpecificData,
      testStatus: 'active',
      lastError: null,
      lastErrorType: null,
      errorCode: null,
    })
  }
  return store.create({
    provider: 'cursor',
    authType: 'oauth',
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt,
    email: input.email || null,
    providerSpecificData,
    testStatus: 'active',
  })
}
