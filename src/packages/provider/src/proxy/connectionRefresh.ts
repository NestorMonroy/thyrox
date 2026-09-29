/**
 * El refresco de una conexión OAuth guardada, coordinado entre proxies por
 * el lease del estado compartido (ADR-THYROX-006, R5c). `startProxyServer`
 * crea UN `ConnectionRefresher` por proceso, con
 * `sharedState.forConsistency('requiresGlobalConsistency')`: en modo `multi`
 * con Redis caído la petición de refresco falla explícito
 * (`SharedStateUnavailableError`, `@thyrox/shared-state/consistency.ts`),
 * nunca degrada a un refresco sin coordinación entre proxies.
 *
 * El refrescador de bajo nivel es `createTokenRefresher`
 * (`../accounts/refresh/tokenRefresh.ts`), que ya sabe compartir el lease y
 * esperar al dueño ajeno; este módulo sólo decide QUÉ fila está vencida o
 * por vencer y CÓMO se persiste el resultado —por la API del store de
 * conexiones (`getById`/`update`, forma de `../accounts/connectionStore.ts`)—,
 * sin otro protocolo de lease propio.
 */
import type { SharedStateStore } from '@thyrox/shared-state/port.ts'

import { refreshedConnectionUpdate, type RefreshedTokensResult } from '../accounts/refresh/health/checkPlan.ts'
import { effectiveTokenExpiryMs, type HealthConnection } from '../accounts/refresh/health/connectionExpiry.ts'
import type { RefreshLogger } from '../accounts/refresh/refreshErrors.ts'
import { createTokenRefresher, type TokenRefresherDeps } from '../accounts/refresh/tokenRefresh.ts'

/** Sólo una conexión OAuth tiene un refresh token que coordinar; una de clave de API no. */
const OAUTH_AUTH_TYPE = 'oauth'
/** Una conexión que caduca antes de este margen ya se pide refrescada, no sólo cuando ya venció. */
const REFRESH_LOOKAHEAD_MS = 5 * 60_000

export type ConnectionRow = Record<string, unknown>

/** Lo mínimo del store de conexiones que el refresco necesita: leer por proveedor y persistir el resultado. */
export interface ConnectionRefreshStore {
  list(filter: { provider: string }): ConnectionRow[]
  getById(id: string): ConnectionRow | null
  update(id: string, data: ConnectionRow): unknown
}

export interface ConnectionRefresherDeps {
  /** El estado compartido ya resuelto para `requiresGlobalConsistency` — `sharedState.forConsistency(...)`, no `sharedState` a secas. */
  sharedState: SharedStateStore
  connections: ConnectionRefreshStore
  /** La llamada de red por proveedor; en producción, `createProviderRefreshDispatch(...).refresh`. */
  refresh: TokenRefresherDeps['refresh']
  now?: () => number
  log?: RefreshLogger
  /** El id de esta instancia como dueña del lease; por defecto, uno aleatorio por proceso. */
  leaseOwner?: string
}

export interface ConnectionRefresher {
  /** Refresca, si hace falta, cada conexión OAuth activa de los proveedores dados. */
  ensureFreshOAuthConnections(providers: readonly string[]): Promise<void>
}

/**
 * Vencida o por vencer: OAuth, activa y con una caducidad conocida dentro
 * del margen. Sin refresh token, `createTokenRefresher.getAccessToken` ya
 * rehúsa por su cuenta (`tokenRefresh.ts`) — comprobarlo aquí sería
 * duplicar esa guarda sin cambiar ningún resultado observable.
 */
function isDueForRefresh(row: ConnectionRow, nowMs: number): boolean {
  if (row.authType !== OAUTH_AUTH_TYPE) return false
  if (row.isActive === false) return false
  const expiresAtMs = effectiveTokenExpiryMs(row as HealthConnection)
  return expiresAtMs > 0 && expiresAtMs - nowMs < REFRESH_LOOKAHEAD_MS
}

export function createConnectionRefresher(deps: ConnectionRefresherDeps): ConnectionRefresher {
  const now = deps.now ?? Date.now
  const { connections } = deps
  const refresher = createTokenRefresher({
    refresh: deps.refresh,
    sharedState: deps.sharedState,
    leaseOwner: deps.leaseOwner,
    now: deps.now,
    log: deps.log,
    readConnection: id => connections.getById(id),
  })

  async function refreshConnection(row: ConnectionRow): Promise<void> {
    const connectionId = String(row.id)
    const provider = String(row.provider)
    const credentials = {
      connectionId,
      refreshToken: row.refreshToken as string,
      accessToken: (row.accessToken as string | undefined) ?? undefined,
      providerSpecificData: (row.providerSpecificData as Record<string, unknown> | null | undefined) ?? null,
      projectId: (row.projectId as string | null | undefined) ?? null,
    }
    const persist = async (result: Record<string, unknown>): Promise<void> => {
      // `createTokenRefresher` sólo llama a `persist` cuando `result` ya trae `accessToken`.
      connections.update(connectionId, refreshedConnectionUpdate(row as HealthConnection, result as unknown as RefreshedTokensResult, now()))
    }
    await refresher.getAccessToken(provider, credentials, persist)
  }

  return {
    async ensureFreshOAuthConnections(providers) {
      const nowMs = now()
      for (const provider of new Set(providers)) {
        for (const row of connections.list({ provider })) {
          if (isDueForRefresh(row, nowMs)) await refreshConnection(row)
        }
      }
    },
  }
}
