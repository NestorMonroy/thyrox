/**
 * Copilot en el refresco proactivo. Una conexión de GitHub o GHE Copilot no
 * tiene refresh token: su token de GitHub se valida pidiendo el subtoken de
 * Copilot, que dura media hora y se renueva cuando está por caducar; sólo un
 * rechazo de GitHub la marca expirada. Tras refrescar una conexión de GitHub
 * que sí lo tiene, el subtoken se renueva con el access token nuevo.
 *
 * Porte de la rama sin refresh token de `checkConnection` en
 * `omniroute: src/lib/tokenHealthCheck.ts` y de `src/lib/tokenHealthCheckCopilot.ts` (MIT).
 */
import type { Environment } from '../../oauth/flows/clientId.ts'
import { refreshCopilotToken } from '../providers/copilotRefresh.ts'
import type { RefreshLogger } from '../refreshErrors.ts'
import { canClearGithubNoRefreshTokenState, copilotTokenBaseUrl, type HealthConnection, parseTokenExpiryMs, providerData, withClearedExpiredRetry } from './connectionExpiry.ts'
import type { HealthCheckStore } from './connectionHealthCheck.ts'

type Row = Record<string, unknown>

const LOG_TAG = 'HEALTH_CHECK'
const UNAUTHORIZED = 401
/** Un subtoken que caduca antes de esto se renueva. */
const COPILOT_EXPIRY_BUFFER_MS = 5 * 60 * 1000

export interface CopilotHealthCheckDeps {
  store: HealthCheckStore
  fetch?: typeof globalThis.fetch
  env?: Environment
  now?: () => number
  log?: RefreshLogger
}

const label = (connection: Row) => `${String(connection.provider)}/${String(connection.name || connection.id)}`

export function createCopilotHealthChecks(deps: CopilotHealthCheckDeps) {
  const now = deps.now ?? Date.now
  const env = deps.env ?? process.env
  const { store, log } = deps
  const refresh = (accessToken: string, baseUrl?: string) => refreshCopilotToken(accessToken, { fetch: deps.fetch, log, env, baseUrl })
  const aboutToExpire = (expiresAt: unknown) => {
    const expiresAtMs = parseTokenExpiryMs(expiresAt)
    return !expiresAtMs || expiresAtMs - now() < COPILOT_EXPIRY_BUFFER_MS
  }

  /** Valida el token de GitHub de una conexión sin refresh token y renueva su subtoken si hace falta. */
  async function githubCopilot(connection: Row, stamp: string): Promise<void> {
    const data = providerData(connection as HealthConnection)
    const hasCopilotToken = typeof data.copilotToken === 'string' && data.copilotToken.trim().length > 0
    const needsRenewal = !hasCopilotToken || aboutToExpire(data.copilotTokenExpiresAt)
    const outcome = await refresh(connection.accessToken as string, copilotTokenBaseUrl(connection as HealthConnection))
    if ('status' in outcome && outcome.status === UNAUTHORIZED) {
      store.update(connection.id as string, { testStatus: 'expired', lastHealthCheckAt: stamp, lastError: 'GitHub rejected the access token', lastErrorAt: stamp, lastErrorType: 'github_access_token_invalid', lastErrorSource: 'oauth', errorCode: 'github_access_token_invalid' })
      return
    }
    const renewed = 'token' in outcome && outcome.token && needsRenewal ? { ...data, copilotToken: outcome.token, copilotTokenExpiresAt: outcome.expiresAt } : null
    const failed = needsRenewal && !renewed
    if (canClearGithubNoRefreshTokenState(connection as HealthConnection)) {
      store.update(connection.id as string, {
        lastHealthCheckAt: stamp,
        testStatus: 'active',
        lastError: failed ? 'Health check: Copilot token refresh failed' : null,
        lastErrorAt: failed ? stamp : null,
        lastErrorType: failed ? 'token_refresh_failed' : null,
        lastErrorSource: failed ? 'oauth' : null,
        errorCode: failed ? 'refresh_failed' : null,
        providerSpecificData: withClearedExpiredRetry(renewed ?? data),
      })
    } else {
      store.update(connection.id as string, { lastHealthCheckAt: stamp, ...(renewed ? { providerSpecificData: renewed } : {}) })
    }
    // Un barrido por minuto por conexión: sólo se registra cuando hubo que renovar.
    if (needsRenewal) {
      const message = `${label(connection)} Copilot token ${renewed ? 'refreshed' : 'refresh FAILED'} (no refresh token; connection stays active)`
      if (renewed) log?.info?.(LOG_TAG, message)
      else log?.warn?.(LOG_TAG, message)
    }
  }

  /** Tras refrescar una conexión de GitHub, renueva su subtoken de Copilot si está por caducar. */
  async function copilotSubToken(connection: Row, result: { accessToken?: string }): Promise<void> {
    let latest: Row = connection
    try {
      latest = store.getById(connection.id as string) ?? connection
    } catch {
      // Sin la fila releída vale la que se refrescó.
    }
    const accessToken = result.accessToken || (latest.accessToken as string | undefined)
    if (!accessToken) return
    const expiresAt = providerData(latest as HealthConnection).copilotTokenExpiresAt ?? providerData(connection as HealthConnection).copilotTokenExpiresAt
    if (!aboutToExpire(expiresAt)) return
    log?.info?.(LOG_TAG, `Refreshing GitHub Copilot sub-token for ${label(connection)}`)
    try {
      const outcome = await refresh(accessToken)
      if ('token' in outcome && outcome.token) {
        store.update(connection.id as string, { providerSpecificData: { ...providerData(latest as HealthConnection), copilotToken: outcome.token, copilotTokenExpiresAt: outcome.expiresAt } })
        log?.info?.(LOG_TAG, `GitHub Copilot sub-token refreshed for ${label(connection)}`)
      } else {
        log?.warn?.(LOG_TAG, `GitHub Copilot sub-token refresh failed for ${label(connection)}`)
      }
    } catch (error) {
      log?.error?.(LOG_TAG, `Error refreshing Copilot sub-token: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return { githubCopilot, copilotSubToken }
}
