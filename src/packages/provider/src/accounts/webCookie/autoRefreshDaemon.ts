/**
 * El demonio que vigila la vigencia de las credenciales de cookie web: cada
 * intervalo pide la página de inicio de cada proveedor registrado, y un
 * 401/403 la anota como caducada para que otra capa decida —cambiar de
 * proveedor, pedir un nuevo inicio de sesión—. No inicia sesión por su cuenta:
 * eso exige a una persona. Un fallo de red no condena la credencial.
 *
 * Porte de `omniroute: open-sse/services/autoRefreshDaemon.ts` (MIT).
 */
import type { RefreshLogger } from '../refresh/refreshErrors.ts'
import { TOKEN_EXTRACTION_CONFIGS, type TokenExtractionConfig } from './tokenExtractionConfig.ts'

const LOG_TAG = 'AUTO_REFRESH'
const DEFAULT_CHECK_INTERVAL_MS = 15 * 60 * 1000
const MIN_CHECK_INTERVAL_MS = 60 * 1000
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000
const UNAUTHORIZED = 401
const FORBIDDEN = 403
const BROWSER_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'

export interface DaemonStatus {
  running: boolean
  checkedProviderCount: number
  expiredCredentials: string[]
  lastRun: number | null
}

interface StoredCredential {
  providerId: string
  value: string
  storedAt: number
}

type IntervalHandle = { unref?: () => void } | unknown

export interface AutoRefreshDaemonDeps {
  checkIntervalMs?: number
  configs?: ReadonlyMap<string, TokenExtractionConfig>
  fetch?: typeof globalThis.fetch
  timers?: { setInterval: (fn: () => void, ms: number) => IntervalHandle; clearInterval: (handle: IntervalHandle) => void }
  now?: () => number
  requestTimeoutMs?: number
  log?: RefreshLogger
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function createAutoRefreshDaemon(deps: AutoRefreshDaemonDeps = {}) {
  const checkIntervalMs = Math.max(deps.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS, MIN_CHECK_INTERVAL_MS)
  const configs = deps.configs ?? TOKEN_EXTRACTION_CONFIGS
  const fetch = deps.fetch ?? globalThis.fetch
  const timers = deps.timers ?? { setInterval: (fn: () => void, ms: number) => setInterval(fn, ms), clearInterval: (handle: IntervalHandle) => clearInterval(handle as ReturnType<typeof setInterval>) }
  const now = deps.now ?? Date.now
  const requestTimeoutMs = deps.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  const log = deps.log
  const credentials = new Map<string, StoredCredential>()
  let expired: string[] = []
  let lastRun: number | null = null
  let running = false
  let timer: IntervalHandle | null = null

  /** Sólo un 401/403 dice que la credencial caducó; cualquier otra respuesta, y un fallo de red, no. */
  async function isStillValid(providerId: string, homeUrl: string): Promise<boolean> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
    try {
      const response = await fetch(homeUrl, { method: 'HEAD', signal: controller.signal, headers: { 'User-Agent': BROWSER_USER_AGENT } })
      return response.status !== UNAUTHORIZED && response.status !== FORBIDDEN
    } catch (error) {
      log?.warn?.(LOG_TAG, `Network error validating credential for "${providerId}" — treated as valid (fail-open), will retry next cycle: ${reason(error)}`)
      return true
    } finally {
      clearTimeout(timeout)
    }
  }

  async function check(): Promise<void> {
    lastRun = now()
    for (const providerId of [...credentials.keys()]) {
      const config = configs.get(providerId)
      if (!config) {
        credentials.delete(providerId)
        continue
      }
      if (!(await isStillValid(providerId, config.homeUrl))) {
        log?.warn?.(LOG_TAG, `Credential expired for "${providerId}" (${config.displayName})`)
        if (!expired.includes(providerId)) expired.push(providerId)
      }
    }
  }

  function start(): void {
    if (running) return
    running = true
    void check().catch(() => {})
    timer = timers.setInterval(() => void check().catch(() => {}), checkIntervalMs)
    // Un demonio periódico no mantiene vivo el proceso por sí solo.
    ;(timer as { unref?: () => void })?.unref?.()
    log?.info?.(LOG_TAG, `Started — checking ${credentials.size} credentials every ${checkIntervalMs / 1000}s`)
  }

  function stop(): void {
    if (!running) return
    running = false
    if (timer) {
      timers.clearInterval(timer)
      timer = null
    }
    log?.info?.(LOG_TAG, 'Stopped')
  }

  return {
    registerCredential(providerId: string, value: string): void {
      credentials.set(providerId, { providerId, value, storedAt: now() })
    },
    unregisterCredential(providerId: string): void {
      credentials.delete(providerId)
    },
    start,
    stop,
    check,
    getStatus(): DaemonStatus {
      return { running, checkedProviderCount: credentials.size, expiredCredentials: [...expired], lastRun }
    },
    clearExpired(): void {
      expired = []
    },
    restart(): void {
      stop()
      start()
    },
  }
}
