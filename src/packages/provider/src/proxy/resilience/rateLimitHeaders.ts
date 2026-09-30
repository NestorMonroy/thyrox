/**
 * Las cabeceras de límite de tasa de un upstream — porte de OmniRoute
 * (`open-sse/services/rateLimitManager/headers.ts`, a58000c7, MIT).
 *
 * Dos familias: la estándar (`x-ratelimit-*`, la de OpenAI y la mayoría) y la
 * de Anthropic (`anthropic-ratelimit-*`). `parseResetTime` lee cualquiera de
 * las formas en que un proveedor dice cuándo se repone su cupo.
 */

/** Las cabeceras estándar, las de la mayoría de proveedores. */
export const STANDARD_HEADERS = {
  limit: 'x-ratelimit-limit-requests',
  remaining: 'x-ratelimit-remaining-requests',
  reset: 'x-ratelimit-reset-requests',
  limitTokens: 'x-ratelimit-limit-tokens',
  remainingTokens: 'x-ratelimit-remaining-tokens',
  resetTokens: 'x-ratelimit-reset-tokens',
  retryAfter: 'retry-after',
  overLimit: 'x-ratelimit-over-limit',
}

/** Las cabeceras propias de Anthropic. */
export const ANTHROPIC_HEADERS = {
  limit: 'anthropic-ratelimit-requests-limit',
  remaining: 'anthropic-ratelimit-requests-remaining',
  reset: 'anthropic-ratelimit-requests-reset',
  limitTokens: 'anthropic-ratelimit-input-tokens-limit',
  remainingTokens: 'anthropic-ratelimit-input-tokens-remaining',
  resetTokens: 'anthropic-ratelimit-input-tokens-reset',
  retryAfter: 'retry-after',
}

const DURATION = /^(?:(\d+)h)?(?:(\d+)m(?!s))?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$/
const PLAIN_NUMBER = /^\d+(?:\.\d+)?$/
/** Un número mayor que esto es una marca de tiempo Unix en segundos, no una espera. */
const UNIX_SECONDS_FLOOR = 1_700_000_000

/**
 * Los milisegundos hasta que el cupo se repone, o `null` si el texto no dice
 * nada legible. Admite duraciones (`30s`, `500ms`, `2m59.56s`), segundos
 * sueltos, una marca de tiempo Unix y una fecha RFC 3339, que es como las da
 * Anthropic.
 */
export function parseResetTime(value: string | null | undefined): number | null {
  const text = value?.trim()
  if (!text) return null

  const duration = text.match(DURATION)
  if (duration) {
    const [, h, m, s, ms] = duration
    return Math.round(
      (Number.parseInt(h ?? '0') * 3600 + Number.parseInt(m ?? '0') * 60 + Number.parseFloat(s ?? '0')) * 1000
        + Number.parseFloat(ms ?? '0'),
    )
  }

  // El texto entero tiene que ser un número: `parseFloat` a secas también lee
  // el año inicial de una fecha ISO.
  if (PLAIN_NUMBER.test(text)) {
    const seconds = Number.parseFloat(text)
    if (seconds > 0) return seconds > UNIX_SECONDS_FLOOR ? Math.max(0, seconds * 1000 - Date.now()) : seconds * 1000
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : Math.max(0, date.getTime() - Date.now())
}

/** Las cabeceras como registro de texto con nombres en minúscula, vengan como vengan. */
export function toPlainHeaders(headers: unknown): Record<string, string> {
  if (!headers) return {}
  const plain: Record<string, string> = {}
  const source = headers as Record<string, unknown>
  if (typeof source.forEach === 'function') {
    try {
      ;(source.forEach as (cb: (v: string, k: string) => void) => void)((v, k) => {
        plain[k.toLowerCase()] = v
      })
      return plain
    } catch {}
  }
  if (typeof source.entries === 'function') {
    try {
      for (const [k, v] of (source.entries as () => Iterable<[string, string]>)()) plain[k.toLowerCase()] = v
      return plain
    } catch {}
  }
  for (const [k, v] of Object.entries(source)) plain[k.toLowerCase()] = v == null ? '' : String(v)
  return plain
}
