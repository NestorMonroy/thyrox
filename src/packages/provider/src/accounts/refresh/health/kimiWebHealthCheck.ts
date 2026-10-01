/**
 * Kimi web en el refresco proactivo: cada barrido renueva en segundo plano el
 * token al que le quedan menos segundos que una ventana repartida en
 * [60, 240), para que una flota de conexiones no pida el refresco a la vez.
 *
 * Porte de `omniroute: src/lib/tokenHealthCheckKimi.ts` (MIT).
 */
import { exchangeKimiWebRefreshToken, type KimiWebExchange, kimiWebRefreshedUpdate, kimiWebRefreshToken } from '../../kimi/kimiWebRefresh.ts'
import { isKimiTokenExpiringSoon } from '../../kimi/kimiJwt.ts'
import type { RefreshLogger } from '../refreshErrors.ts'
import type { HealthCheckStore } from './connectionHealthCheck.ts'

type Row = Record<string, unknown>

const LOG_TAG = 'HEALTH_CHECK'
const KIMI_WEB_PROVIDERS = new Set(['kimi-web', 'kimi_web'])
const WINDOW_MIN_SEC = 60
const WINDOW_SPREAD_SEC = 180

export function kimiRefreshJitterSec(random: () => number = Math.random): number {
  return WINDOW_MIN_SEC + Math.floor(random() * WINDOW_SPREAD_SEC)
}

export interface KimiWebHealthCheckDeps {
  store: HealthCheckStore
  exchange?: KimiWebExchange
  /** Los segundos antes de caducar en que se renueva; por defecto, la ventana repartida. */
  jitterSec?: () => number
  now?: () => number
  log?: RefreshLogger
}

const label = (connection: Row) => `${String(connection.provider)}/${String(connection.name || connection.id)}`

export function createKimiWebHealthCheck(deps: KimiWebHealthCheckDeps) {
  const exchange = deps.exchange ?? exchangeKimiWebRefreshToken
  const jitterSec = deps.jitterSec ?? kimiRefreshJitterSec
  const now = deps.now ?? Date.now
  const { store, log } = deps

  return async function kimiWeb(connection: Row, _stamp: string): Promise<void> {
    if (!KIMI_WEB_PROVIDERS.has(String(connection.provider ?? '').toLowerCase())) return
    const refreshToken = kimiWebRefreshToken(connection)
    if (!refreshToken) return
    if (!isKimiTokenExpiringSoon(connection.apiKey || connection.accessToken, jitterSec(), now())) return
    log?.info?.(LOG_TAG, `${label(connection)} token expiring soon; refreshing in background`)
    const result = await exchange(refreshToken)
    if (!result.success || !result.accessToken) {
      log?.warn?.(LOG_TAG, `Failed to auto-refresh Kimi web token: ${result.error}`)
      return
    }
    log?.info?.(LOG_TAG, `${label(connection)} token refreshed`)
    await store.update(connection.id as string, kimiWebRefreshedUpdate(result))
  }
}
