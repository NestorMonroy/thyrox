/**
 * Reintentar un refresco con espera creciente y un plazo por intento, con un
 * disyuntor por proveedor: cinco refrescos agotados seguidos lo pausan media
 * hora. Un error irrecuperable no se reintenta, para que la cuenta se marque
 * en vez de reintentarse cada minuto.
 *
 * Porte de `omniroute: open-sse/services/tokenRefresh/circuitBreaker.ts` (MIT).
 */
import { isUnrecoverableRefreshError, type RefreshLogger } from './refreshErrors.ts'

const DEFAULT_THRESHOLD = 5
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 3
const BACKOFF_STEP_MS = 1000
const MS_PER_MINUTE = 60_000

export interface CircuitBreakerStatusEntry {
  failures: number
  blocked: boolean
  blockedUntil: string | null
  remainingMs: number
}

export interface RefreshRetrierDeps {
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  timeoutMs?: number
  threshold?: number
  cooldownMs?: number
}

export interface RefreshWithRetryOptions {
  maxRetries?: number
  log?: RefreshLogger
  provider?: string
}

/** El intento, o `null` si no respondió a tiempo. */
function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    timer.unref?.()
    fn().then(
      result => {
        clearTimeout(timer)
        resolve(result)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export function createRefreshRetrier(deps: RefreshRetrierDeps = {}) {
  const now = deps.now ?? Date.now
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const threshold = deps.threshold ?? DEFAULT_THRESHOLD
  const cooldownMs = deps.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const breakers: Record<string, { failures: number; blockedUntil: number }> = {}

  /** Bloqueado mientras dure la pausa; al vencer, el contador vuelve a cero. */
  function isProviderBlocked(provider: string): boolean {
    const state = breakers[provider]
    if (!state || !state.blockedUntil) return false
    if (state.blockedUntil > now()) return true
    delete breakers[provider]
    return false
  }

  function status(): Record<string, CircuitBreakerStatusEntry> {
    const result: Record<string, CircuitBreakerStatusEntry> = {}
    for (const [provider, state] of Object.entries(breakers)) {
      const blocked = state.blockedUntil > now()
      result[provider] = { failures: state.failures, blocked, blockedUntil: blocked ? new Date(state.blockedUntil).toISOString() : null, remainingMs: Math.max(0, state.blockedUntil - now()) }
    }
    return result
  }

  function recordFailure(provider: string, log: RefreshLogger): void {
    const state = (breakers[provider] ??= { failures: 0, blockedUntil: 0 })
    state.failures++
    if (state.failures >= threshold) {
      state.blockedUntil = now() + cooldownMs
      log?.error?.('TOKEN_REFRESH', `Circuit breaker tripped for ${provider}: ${threshold} consecutive failures. Blocked for ${cooldownMs / MS_PER_MINUTE}min. Provider needs re-authentication.`)
    }
  }

  async function refreshWithRetry<T>(refreshFn: () => Promise<T>, options: RefreshWithRetryOptions = {}): Promise<T | null> {
    const { maxRetries = DEFAULT_MAX_RETRIES, log = null, provider = 'unknown' } = options
    if (isProviderBlocked(provider)) {
      log?.warn?.('TOKEN_REFRESH', `Circuit breaker active for ${provider}, skipping refresh`)
      return null
    }
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = attempt * BACKOFF_STEP_MS
        log?.debug?.('TOKEN_REFRESH', `Retry ${attempt}/${maxRetries} after ${delay}ms`)
        await sleep(delay)
      }
      try {
        const result = await withTimeout(refreshFn, timeoutMs)
        if (isUnrecoverableRefreshError(result)) {
          log?.warn?.('TOKEN_REFRESH', `Unrecoverable refresh error for ${provider}: ${(result as { error: string }).error} — skipping retries`)
          return result
        }
        if (result) {
          delete breakers[provider]
          return result
        }
      } catch (error) {
        log?.warn?.('TOKEN_REFRESH', `Attempt ${attempt + 1}/${maxRetries} failed: ${(error as Error).message}`)
      }
    }
    recordFailure(provider, log)
    log?.error?.('TOKEN_REFRESH', `All ${maxRetries} retry attempts failed for ${provider}`)
    return null
  }

  return { isProviderBlocked, status, refreshWithRetry }
}
