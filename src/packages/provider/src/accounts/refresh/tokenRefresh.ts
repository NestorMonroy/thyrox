/**
 * El access token de una conexión, refrescado una sola vez aunque lo pidan
 * varios a la vez. Con conexión, los que llegan mientras hay un refresco en
 * curso lo comparten aunque cada uno haya cargado un refresh token distinto;
 * sin ella, se comparte por refresh token. Cada refresco pasa por el carril
 * de su familia; antes de presentar un token se comprueba que no se haya
 * rotado ya y que la fila guardada no tenga uno más nuevo. El guardado ocurre
 * dentro de la misma ventana, antes de que nadie más vea el resultado, y no
 * pisa una fila que otro escritor ya rotó.
 *
 * Porte de `getAccessToken`, `_getAccessTokenWithStalenessCheck`,
 * `_refreshWithFreshCredentials`, `getAllAccessTokens` y
 * `getConnectionRefreshMutexStatus` de `omniroute: open-sse/services/tokenRefresh.ts` (MIT).
 */
import { casGuardShouldSkipPersist } from './casGuard.ts'
import { activePersist, type RefreshPersistFn } from './persistContext.ts'
import type { ProviderRefreshOutcome, RefreshCredentials } from './providerRefreshDispatch.ts'
import type { RefreshLogger } from './refreshErrors.ts'
import { createRefreshSerializer, type RefreshSerializer } from './refreshSerializer.ts'
import { createRotationMap, refreshCacheKey, type RotatedTokens } from './rotationMap.ts'

/** Una fila guardada vigente al menos este margen se usa tal cual. */
const STORED_TOKEN_MIN_VALIDITY_MS = 60_000

export interface StoredConnectionTokens {
  refreshToken?: string | null
  accessToken?: string | null
  expiresAt?: string | null
}

export interface AccessTokenCredentials extends RefreshCredentials {
  accessToken?: string
}

export interface TokenRefresherDeps {
  refresh: (provider: string, credentials: RefreshCredentials) => Promise<ProviderRefreshOutcome>
  serialize?: RefreshSerializer
  rotations?: ReturnType<typeof createRotationMap>
  /** La fila guardada de una conexión, descifrada. */
  readConnection?: (connectionId: string) => StoredConnectionTokens | null | undefined | Promise<StoredConnectionTokens | null | undefined>
  now?: () => number
  log?: RefreshLogger
}

export interface ConnectionTokenSource {
  provider?: string
  refreshToken?: string
  isActive?: boolean
}

const hasAccessToken = (result: ProviderRefreshOutcome | StoredConnectionTokens): result is Record<string, unknown> & { accessToken: string } => Boolean(result && 'accessToken' in result && result.accessToken)
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function createTokenRefresher(deps: TokenRefresherDeps) {
  const serialize = deps.serialize ?? createRefreshSerializer()
  const rotations = deps.rotations ?? createRotationMap({ now: deps.now })
  const now = deps.now ?? Date.now
  const { log } = deps
  const connectionMutex = new Map<string, { promise: Promise<ProviderRefreshOutcome>; waiters: number }>()
  const inFlightByToken = new Map<string, Promise<ProviderRefreshOutcome>>()

  /** La fila guardada gana si tiene otro refresh token: vigente, se usa; por caducar, es la que se refresca. */
  async function refreshWithFreshCredentials(provider: string, credentials: AccessTokenCredentials): Promise<ProviderRefreshOutcome> {
    const rotated = rotations.lookup(provider, credentials.refreshToken)
    if (rotated) {
      log?.info?.('TOKEN_REFRESH', `Rotation map hit for ${provider}. Returning cached rotated tokens (avoids family-revoke).`)
      return rotated.result as ProviderRefreshOutcome
    }
    let current = credentials
    if (credentials.connectionId && deps.readConnection) {
      try {
        const stored = await deps.readConnection(credentials.connectionId)
        if (stored?.refreshToken && stored.refreshToken !== credentials.refreshToken) {
          log?.info?.('TOKEN_REFRESH', `Stale token detected in memory for ${provider}. Using refreshed token from DB.`)
          const storedExpiresAt = stored.expiresAt ? new Date(stored.expiresAt).getTime() : 0
          if (storedExpiresAt > now() + STORED_TOKEN_MIN_VALIDITY_MS) {
            log?.info?.('TOKEN_REFRESH', 'DB token is still valid. Skipping OAuth refresh.')
            return { accessToken: stored.accessToken as string, refreshToken: stored.refreshToken, expiresAt: stored.expiresAt }
          }
          current = { ...credentials, refreshToken: stored.refreshToken, accessToken: stored.accessToken ?? undefined }
        }
      } catch (error) {
        log?.warn?.('TOKEN_REFRESH', `Failed to check DB for stale token: ${errorMessage(error)}`)
      }
    }
    const result = await deps.refresh(provider, current)
    if (hasAccessToken(result) && result.refreshToken && !('error' in result)) rotations.record(provider, current.refreshToken, result as unknown as RotatedTokens)
    return result
  }

  /** El refresco en el carril de su familia: la comprobación de frescura va dentro, justo antes de la red. */
  const refreshInLane = (provider: string, credentials: AccessTokenCredentials) => serialize(provider, () => refreshWithFreshCredentials(provider, credentials))

  async function persistResult(result: ProviderRefreshOutcome, persist: RefreshPersistFn | undefined, failureContext: string): Promise<ProviderRefreshOutcome> {
    if (!hasAccessToken(result) || !persist) return result
    if (await casGuardShouldSkipPersist(log)) return result
    try {
      await persist(result)
    } catch (error) {
      log?.error?.('TOKEN_REFRESH', `${failureContext}: ${errorMessage(error)}`)
      throw error
    }
    return result
  }

  async function getAccessToken(provider: string, credentials: AccessTokenCredentials | null | undefined, persist?: RefreshPersistFn): Promise<ProviderRefreshOutcome> {
    if (!credentials || typeof credentials.refreshToken !== 'string' || !credentials.refreshToken) {
      log?.warn?.('TOKEN_REFRESH', `No valid refresh token available for provider: ${provider}`)
      return null
    }
    const effectivePersist = persist ?? activePersist()
    const { connectionId } = credentials

    if (connectionId && typeof connectionId === 'string') {
      const existing = connectionMutex.get(connectionId)
      if (existing) {
        existing.waiters++
        log?.info?.('TOKEN_REFRESH', 'Concurrent refresh detected — sharing in-flight refresh', { provider, connectionId, waiters: existing.waiters })
        return existing.promise
      }
      const promise = refreshInLane(provider, credentials)
        .then(result => persistResult(result, effectivePersist, `onPersist callback failed for ${provider}/${connectionId}`))
        .finally(() => connectionMutex.delete(connectionId))
      connectionMutex.set(connectionId, { promise, waiters: 0 })
      return promise
    }

    const cacheKey = refreshCacheKey(provider, credentials.refreshToken)
    const inFlight = inFlightByToken.get(cacheKey)
    if (inFlight) {
      log?.info?.('TOKEN_REFRESH', `Reusing in-flight refresh for ${provider}`)
      return inFlight
    }
    const promise = refreshInLane(provider, credentials)
      .then(result => {
        if (hasAccessToken(result) && !effectivePersist) {
          log?.warn?.('TOKEN_REFRESH', `Layer 2 refresh succeeded for ${provider} without onPersist — DB row will not be updated with rotated token. Callers should pass connectionId for Layer 1 atomicity.`)
        }
        return persistResult(result, effectivePersist, `Layer 2 onPersist callback failed for ${provider}`)
      })
      .finally(() => inFlightByToken.delete(cacheKey))
    inFlightByToken.set(cacheKey, promise)
    return promise
  }

  /** El token de cada conexión activa con proveedor, por proveedor. */
  async function getAllAccessTokens(connections: readonly ConnectionTokenSource[] | null | undefined): Promise<Record<string, ProviderRefreshOutcome>> {
    const results: Record<string, ProviderRefreshOutcome> = {}
    for (const connection of connections ?? []) {
      if (!connection.isActive || !connection.provider) continue
      const token = await getAccessToken(connection.provider, { refreshToken: connection.refreshToken as string })
      if (token) results[connection.provider] = token
    }
    return results
  }

  function connectionMutexStatus(): Record<string, { waiters: number }> {
    return Object.fromEntries([...connectionMutex].map(([connectionId, entry]) => [connectionId, { waiters: entry.waiters }]))
  }

  return { getAccessToken, getAllAccessTokens, connectionMutexStatus }
}
