/**
 * La política de reintentos del proveedor: cuántas veces se reintenta y cuánto se
 * espera entre intentos. Es la autoridad que comparten `withRetry` (el cliente del SDK)
 * y `AnthropicHttpProvider` (el cliente propio de `thyrox -p`).
 *
 * Vive aparte de `withRetry.ts` porque ese módulo arrastra el SDK y el grafo del agente
 * (medido: 1 073 ms al importarlo, contra 24 ms de `anthropicHttp.ts`); este módulo sólo
 * depende de la lectura del entorno.
 */
import { readEnv } from '@thyrox/config/env'
import { isEnvTruthy } from '@thyrox/config/env/utils'

export const DEFAULT_MAX_RETRIES = 10
export const BASE_DELAY_MS = 500
/** El tope de la espera exponencial, antes del jitter. */
export const MAX_RETRY_DELAY_MS = 32_000
const WATCHDOG_MAX_RETRIES = 300

/** Los reintentos por defecto: `THYROX_CODE_MAX_RETRIES` si se declara; si no, 300 con el watchdog, o 10. */
export function getDefaultMaxRetries(): number {
  const maxRetriesEnv = readEnv('THYROX_CODE_MAX_RETRIES')
  if (maxRetriesEnv) {
    return parseInt(maxRetriesEnv, 10)
  }
  if (isEnvTruthy(readEnv('THYROX_CODE_RETRY_WATCHDOG'))) return WATCHDOG_MAX_RETRIES
  return DEFAULT_MAX_RETRIES
}

/**
 * La espera antes del intento `attempt` (desde 1): la de `retry-after` si el servidor la
 * da en segundos; si no, exponencial desde `BASE_DELAY_MS` con tope y hasta 25 % de jitter.
 */
export function getRetryDelay(
  attempt: number,
  retryAfterHeader?: string | null,
  maxDelayMs = MAX_RETRY_DELAY_MS,
): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10)
    if (!isNaN(seconds)) {
      return seconds * 1000
    }
  }

  const baseDelay = Math.min(
    BASE_DELAY_MS * 2 ** (attempt - 1),
    maxDelayMs,
  )
  const jitter = Math.random() * 0.25 * baseDelay
  return baseDelay + jitter
}
