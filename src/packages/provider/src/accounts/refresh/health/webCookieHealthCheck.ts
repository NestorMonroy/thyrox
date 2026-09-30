/**
 * Las conexiones de cookie web en el refresco proactivo: sólo se verifican,
 * una vez por intervalo. Un rechazo inequívoco (401/403) las marca expiradas;
 * un fallo ambiguo —red, redirección, 5xx— sólo sella la marca de tiempo,
 * porque un parpadeo no puede dejar en estado terminal una cookie sana.
 *
 * Porte de `omniroute: src/lib/tokenHealthCheckWebCookie.ts` (MIT).
 */
import { validateWebCookieProvider, type WebCookieValidation, type WebCookieValidator } from '../../webCookie/webCookieProbe.ts'
import { isWebCookieProvider } from '../../webCookie/webCookieProviders.ts'
import type { RefreshLogger } from '../refreshErrors.ts'
import type { HealthCheckStore } from './connectionHealthCheck.ts'

type Row = Record<string, unknown>

const LOG_TAG = 'HEALTH_CHECK'
const MINUTE_MS = 60 * 1000
const SESSION_EXPIRED_CODE = 'AUTH_007'

export interface WebCookieHealthCheckDeps {
  store: HealthCheckStore
  probe?: WebCookieValidator
  log?: RefreshLogger
}

const label = (connection: Row) => `${String(connection.provider)}/${String(connection.name || connection.id)}`

function readCredential(connection: Row): string {
  const direct = typeof connection.apiKey === 'string' ? connection.apiKey.trim() : ''
  if (direct) return direct
  const data = connection.providerSpecificData
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ''
  const cookie = (data as Row).cookie
  return typeof cookie === 'string' ? cookie.trim() : ''
}

function isSessionExpired(result: WebCookieValidation): boolean {
  return result.valid === false && (result.errorCode === SESSION_EXPIRED_CODE || String(result.error || '').toUpperCase().includes('SESSION_EXPIRED'))
}

export function createWebCookieHealthCheck(deps: WebCookieHealthCheckDeps) {
  const probe = deps.probe ?? (request => validateWebCookieProvider(request))
  const { store, log } = deps

  return async function webCookie(connection: Row, intervalMin: number, stamp: string): Promise<void> {
    if (!isWebCookieProvider(connection.provider)) return
    const lastCheckMs = connection.lastHealthCheckAt ? new Date(connection.lastHealthCheckAt as string).getTime() : 0
    if (new Date(stamp).getTime() - lastCheckMs < intervalMin * MINUTE_MS) return
    const id = connection.id as string
    const credential = readCredential(connection)
    if (!credential) {
      await store.update(id, { lastHealthCheckAt: stamp })
      return
    }
    const result = await probe({ provider: String(connection.provider), apiKey: credential })
    if (result.valid || result.unsupported) {
      await store.update(id, { lastHealthCheckAt: stamp })
      return
    }
    if (isSessionExpired(result)) {
      log?.warn?.(LOG_TAG, `${label(connection)} cookie rejected by upstream (401/403); marking expired — re-paste the cookie to reactivate`)
      await store.update(id, {
        testStatus: 'expired',
        lastHealthCheckAt: stamp,
        lastError: 'Session cookie expired or was revoked by the upstream site.',
        lastErrorAt: stamp,
        lastErrorType: 'session_expired',
        lastErrorSource: 'webcookie',
        errorCode: 'session_expired',
      })
      return
    }
    log?.warn?.(LOG_TAG, `${label(connection)} probe inconclusive (${result.error}); will retry next interval`)
    await store.update(id, { lastHealthCheckAt: stamp })
  }
}
