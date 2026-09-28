/**
 * El refresco proactivo de una conexión: relee la fila, decide con
 * `planConnectionCheck` y aplica la decisión al almacén. El refresco guarda
 * sus tokens dentro de la ventana del orquestador; un error de red espera
 * dos minutos y cualquier otro abre el circuito; un token muerto se trata
 * según si la fila cambió mientras tanto.
 *
 * Porte de `checkConnection` de `omniroute: src/lib/tokenHealthCheck.ts` (MIT).
 */
import type { Environment } from '../../oauth/flows/clientId.ts'
import type { RefreshPersistFn } from '../persistContext.ts'
import { isUnrecoverableRefreshError, type RefreshLogger } from '../refreshErrors.ts'
import { EXPIRED_RETRY_MAX, isTransientRefreshError, planConnectionCheck, refreshedConnectionUpdate, type RefreshedTokensResult, unrecoverableRefreshOutcome } from './checkPlan.ts'
import { envFlagEnabled, healthCheckSkipProviders } from './healthCheckScheduler.ts'
import { buildRefreshFailureUpdate, buildTransientRefreshRetryUpdate } from './refreshCircuit.ts'

type Row = Record<string, unknown>

export interface HealthCheckStore {
  getById: (id: string) => Row | null
  update: (id: string, data: Row) => unknown
}

/** Las comprobaciones que tienen su propio camino; sin una, la conexión se salta. */
export interface ProviderHealthChecks {
  cursor?: (connection: Row, now: string) => Promise<void>
  kimiWeb?: (connection: Row, now: string) => Promise<void>
  webCookie?: (connection: Row, intervalMin: number, now: string) => Promise<void>
  githubCopilot?: (connection: Row, now: string) => Promise<void>
  /** Tras refrescar GitHub, el subtoken de Copilot. */
  copilotSubToken?: (connection: Row, result: RefreshedTokensResult) => Promise<void>
}

export interface ConnectionHealthCheckDeps {
  store: HealthCheckStore
  tokens: { getAccessToken: (provider: string, credentials: Row, persist?: RefreshPersistFn) => Promise<unknown> }
  supportsTokenRefresh: (provider: string) => boolean
  providerChecks?: ProviderHealthChecks
  isWebCookieProvider?: (provider: string) => boolean
  env?: Environment
  now?: () => number
  log?: RefreshLogger
}

const LOG_TAG = 'HEALTH_CHECK'
const TRANSIENT_RETRY_MINUTES = 2
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))
/** La etiqueta de una conexión en el registro: su nombre, o su id; nunca su correo. */
const label = (connection: Row) => `${String(connection.provider)}/${String(connection.name || connection.id)}`

export function createConnectionHealthCheck(deps: ConnectionHealthCheckDeps) {
  const env = deps.env ?? process.env
  const now = deps.now ?? Date.now
  const log = envFlagEnabled(env, 'THYROX_HIDE_HEALTHCHECK_LOGS') ? null : deps.log
  const checks = deps.providerChecks ?? {}
  const { store } = deps

  /** Una escritura que falla se avisa y no interrumpe el barrido. */
  const tryUpdate = (connection: Row, data: Row, context: string) => {
    try {
      store.update(connection.id as string, data)
    } catch (error) {
      log?.warn?.(LOG_TAG, `${label(connection)} DB write failed after ${context} (${errorText(error)}); state not persisted`)
    }
  }

  async function refresh(connection: Row, reason: string, retryAttempt: number | undefined): Promise<void> {
    if (retryAttempt !== undefined) log?.info?.(LOG_TAG, `Retrying expired ${label(connection)} (attempt ${retryAttempt}/${EXPIRED_RETRY_MAX})`)
    log?.info?.(LOG_TAG, `Refreshing ${label(connection)} (${reason})`)
    const attempted = { refreshToken: connection.refreshToken as string, accessToken: (connection.accessToken as string | undefined) || null }
    const credentials = { connectionId: connection.id, refreshToken: attempted.refreshToken, accessToken: attempted.accessToken, expiresAt: connection.tokenExpiresAt || connection.expiresAt || null, providerSpecificData: connection.providerSpecificData }

    let persisted = false
    const persist: RefreshPersistFn = async result => {
      try {
        store.update(connection.id as string, refreshedConnectionUpdate(connection, result as unknown as RefreshedTokensResult, now()))
      } catch (error) {
        log?.warn?.(LOG_TAG, `${label(connection)} DB write failed after successful refresh (${errorText(error)}); token not persisted`)
        return
      }
      persisted = true
    }

    let result: unknown
    try {
      result = await deps.tokens.getAccessToken(String(connection.provider), credentials, persist)
    } catch (error) {
      if (persisted) {
        log?.warn?.(LOG_TAG, `${label(connection)} refresh error after successful persist (${errorText(error)}); ignoring`)
        return
      }
      const stamp = new Date(now()).toISOString()
      if (isTransientRefreshError(error)) {
        tryUpdate(connection, buildTransientRefreshRetryUpdate(connection, stamp) as unknown as Row, 'transient error')
        log?.warn?.(LOG_TAG, `${label(connection)} refresh transient error (${errorText(error)}); retry in ${TRANSIENT_RETRY_MINUTES}min`)
      } else {
        tryUpdate(connection, buildRefreshFailureUpdate(connection, stamp) as unknown as Row, 'permanent error')
        log?.warn?.(LOG_TAG, `${label(connection)} refresh error (${errorText(error)}); applying exponential backoff`)
      }
      return
    }

    if (isUnrecoverableRefreshError(result)) {
      const outcome = unrecoverableRefreshOutcome(connection, result as { error: string; code?: string }, store.getById(connection.id as string), attempted, now())
      store.update(connection.id as string, outcome.update)
      if (outcome.kind === 'changed') log?.warn?.(LOG_TAG, `${label(connection)} changed during refresh; skipping stale deactivation`)
      else if (outcome.kind === 'still-valid') log?.warn?.(LOG_TAG, `${label(connection)} refresh token is invalid (${(result as { error: string }).error}), but the current access token is still valid; keeping connection active`)
      else {
        const code = (outcome.update.errorCode as string) ?? ''
        log?.error?.(LOG_TAG, `${label(connection)} — Refresh token is permanently invalid (${code}). ${outcome.exhausted ? 'Connection deactivated. Re-authenticate to restore.' : `Retry ${outcome.retry}/${EXPIRED_RETRY_MAX} used; keeping connection active for retry.`}`)
      }
      return
    }

    const refreshed = result as RefreshedTokensResult | null
    if (refreshed?.accessToken) {
      store.update(connection.id as string, persisted ? { lastHealthCheckAt: new Date(now()).toISOString() } : refreshedConnectionUpdate(connection, refreshed, now()))
      log?.info?.(LOG_TAG, `${label(connection)} refreshed`)
      if (String(connection.provider).toLowerCase() === 'github') await checks.copilotSubToken?.(connection, refreshed)
      return
    }
    const update = buildRefreshFailureUpdate(connection, new Date(now()).toISOString())
    store.update(connection.id as string, update as unknown as Row)
    log?.warn?.(LOG_TAG, `${label(connection)} refresh failed${connection.testStatus === 'expired' ? ` (${update.expiredRetryCount}/${EXPIRED_RETRY_MAX} expired retries used)` : ''}`)
  }

  async function checkConnection(given: Row): Promise<void> {
    if (!given?.id) return
    const connection = store.getById(given.id as string) ?? given
    const nowMs = now()
    const stamp = new Date(nowMs).toISOString()
    const plan = planConnectionCheck(connection as never, {
      nowMs,
      skipProviders: healthCheckSkipProviders(env),
      supportsTokenRefresh: deps.supportsTokenRefresh,
      isWebCookieProvider: deps.isWebCookieProvider ?? (() => false),
    })
    switch (plan.action) {
      case 'skip':
        return
      case 'mark':
        store.update(connection.id as string, plan.update)
        log?.info?.(LOG_TAG, `${label(connection)} marked ${String(plan.update.testStatus)} (${String(plan.update.errorCode)})`)
        return
      case 'touch':
        store.update(connection.id as string, { lastHealthCheckAt: stamp })
        log?.info?.(LOG_TAG, `Skipping ${label(connection)} (refresh unsupported)`)
        return
      case 'deactivate':
        store.update(connection.id as string, { isActive: false })
        return
      case 'cursor':
        return checks.cursor?.(connection, stamp)
      case 'kimi-web':
        return checks.kimiWeb?.(connection, stamp)
      case 'web-cookie':
        return checks.webCookie?.(connection, plan.intervalMin, stamp)
      case 'github-copilot':
        return checks.githubCopilot?.(connection, stamp)
      case 'refresh':
        return refresh(connection, plan.reason, plan.retryAttempt)
    }
  }

  return { checkConnection }
}
