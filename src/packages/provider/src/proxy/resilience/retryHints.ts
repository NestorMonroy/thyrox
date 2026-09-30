/**
 * La espera que el cuerpo de un error pide antes de reintentar — porte de
 * OmniRoute (`parseRetryAfterFromBody` de `open-sse/services/accountFallback.ts`
 * y `parseDelayString` de `open-sse/services/retryAfterJson.ts`, a58000c7, MIT).
 *
 * Divergencia declarada: cuando el cuerpo no trae espera ni es un
 * `rate_limit_error`, la referencia clasifica el texto con `classifyErrorText`;
 * aquí esa rama devuelve `unknown` hasta que esa clasificación se porte.
 */

export type RateLimitReason = 'rate_limit_exceeded' | 'unknown'

const RETRY_AFTER = /retry\s+after\s+(\d+)\s*s/i

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

/**
 * Una espera escrita como `33s`, `26.66s`, `2m`, `1h`, `1500ms` o segundos
 * sueltos, en milisegundos; `null` si no se lee.
 */
export function parseDelayString(value: unknown): number | null {
  if (!value) return null
  const text = String(value).trim()
  const units: Array<[RegExp, number]> = [
    [/^(\d+(?:\.\d+)?)\s*ms$/i, 1],
    [/^(\d+(?:\.\d+)?)\s*s$/i, 1000],
    [/^(\d+(?:\.\d+)?)\s*m$/i, 60_000],
    [/^(\d+(?:\.\d+)?)\s*h$/i, 3_600_000],
  ]
  for (const [pattern, factor] of units) {
    const match = pattern.exec(text)
    if (match) return Math.round(Number.parseFloat(match[1]!) * factor)
  }
  const seconds = Number.parseFloat(text)
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null
}

/**
 * La espera que pide el cuerpo de un error, y si es un límite de tasa. Lee el
 * `retryDelay` de Gemini (`error.details[]`), el «retry after Ns» del mensaje
 * de OpenAI y el `rate_limit_error` de Anthropic, que no trae espera.
 */
export function parseRetryAfterFromBody(responseBody: unknown): { retryAfterMs: number | null; reason: RateLimitReason } {
  let body: JsonRecord
  try {
    body = record(typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody)
  } catch {
    return { retryAfterMs: null, reason: 'unknown' }
  }
  if (Object.keys(body).length === 0) return { retryAfterMs: null, reason: 'unknown' }

  const error = record(body.error)
  const details = error.details ?? body.details ?? []
  for (const detail of Array.isArray(details) ? details : []) {
    const delay = record(detail).retryDelay
    if (delay) return { retryAfterMs: parseDelayString(delay), reason: 'rate_limit_exceeded' }
  }

  const retry = RETRY_AFTER.exec(String(error.message ?? body.message ?? ''))
  if (retry) return { retryAfterMs: Number.parseInt(retry[1]!, 10) * 1000, reason: 'rate_limit_exceeded' }

  if (String(error.type ?? body.type ?? '') === 'rate_limit_error') return { retryAfterMs: null, reason: 'rate_limit_exceeded' }
  return { retryAfterMs: null, reason: 'unknown' }
}
