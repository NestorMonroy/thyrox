/**
 * Cursor en el refresco proactivo: una conexión cerca de caducar se renueva
 * desde las credenciales del anfitrión, una renovación a la vez por conexión.
 * Renovada, se guarda limpia; sin un token nuevo o con error, sigue activa y
 * avanza su circuito, para que la siguiente pasada espere más.
 *
 * Porte de `omniroute: src/lib/tokenHealthCheckCursor.ts` (MIT).
 */
import { createKeyedMutex } from '../../../concurrency/keyedMutex.ts'
import { buildCursorRenewedUpdate, type CursorRenewalResult, defaultCursorRenewalDeps, renewCursorConnection } from '../../cursor/cursorRenewal.ts'
import type { RefreshLogger } from '../refreshErrors.ts'
import type { HealthConnection } from './connectionExpiry.ts'
import type { HealthCheckStore } from './connectionHealthCheck.ts'
import { buildRefreshFailureUpdate } from './refreshCircuit.ts'

type Row = Record<string, unknown>

const LOG_TAG = 'HEALTH_CHECK'

export interface CursorHealthCheckDeps {
  store: HealthCheckStore
  renew?: (current: { accessToken: string; machineId: string | null }) => Promise<CursorRenewalResult>
  log?: RefreshLogger
}

const label = (connection: Row) => `${String(connection.provider)}/${String(connection.name || connection.id)}`

export function createCursorHealthCheck(deps: CursorHealthCheckDeps) {
  const renew = deps.renew ?? (() => {
    const renewalDeps = defaultCursorRenewalDeps()
    return (current: { accessToken: string; machineId: string | null }) => renewCursorConnection(current, renewalDeps)
  })()
  const mutex = createKeyedMutex<void>()
  const { store, log } = deps

  return function cursor(connection: Row, stamp: string): Promise<void> {
    return mutex.run(connection.id as string, async () => {
      const data = (connection.providerSpecificData ?? {}) as Row
      const result = await renew({ accessToken: connection.accessToken as string, machineId: (data.machineId as string | undefined) ?? null })
      if (result.status === 'renewed') {
        await store.update(connection.id as string, buildCursorRenewedUpdate(connection as { providerSpecificData?: Row | null }, result, stamp))
        log?.info?.(LOG_TAG, `${label(connection)} Cursor session renewed (source: ${result.source})`)
        return
      }
      const message = result.status === 'error' ? `Cursor session renewal failed: ${result.error}` : 'Cursor session unchanged — no newer token found on this host.'
      await store.update(connection.id as string, { ...buildRefreshFailureUpdate(connection as HealthConnection, stamp, { errorCode: 'cursor_session_stale', lastErrorType: 'cursor_session_stale', lastError: message, testStatus: 'active' }) })
      const report = result.status === 'error' ? log?.error : log?.warn
      report?.(LOG_TAG, `${label(connection)} Cursor session stale: ${message}`)
    })
  }
}
