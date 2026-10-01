/**
 * El resultado de una llamada a un registry OCI, clasificado para que el
 * consumidor no confunda las causas (TASK-THYROX-0728): un 429 es un límite
 * de uso, no un artefacto inexistente, un digest inválido ni un formato no
 * soportado.
 *
 * Los números de un límite —tope, restante, ventana, espera— salen de las
 * cabeceras de cada respuesta. El provider los cambia por plan, ruta y
 * momento, así que este módulo no lleva ninguno escrito.
 */

/**
 * `pull-rate`: el provider publicó cabeceras de cuota de pulls.
 * `unclassified`: un 429 sin esas cabeceras; puede ser el límite de abuso del
 * provider u otro, y no se afirma cuál.
 */
export type RateLimitKind = 'pull-rate' | 'unclassified'

export interface RateLimit {
  readonly kind: RateLimitKind
  readonly limit?: number
  readonly remaining?: number
  readonly windowSeconds?: number
  readonly retryAfterSeconds?: number
  /** Origen que el provider atribuye al consumo (p. ej. una IP); sólo diagnóstico, nunca identidad. */
  readonly source?: string
}

export type RegistryResult<T = void> =
  | { readonly status: 'success'; readonly value: T }
  | { readonly status: 'unauthorized'; readonly httpStatus: number; readonly detail: string }
  | { readonly status: 'not_found'; readonly detail: string }
  | { readonly status: 'rate_limited'; readonly rateLimit: RateLimit; readonly detail: string }
  | { readonly status: 'provider_error'; readonly httpStatus: number; readonly detail: string }

export type RegistryFailure = Exclude<RegistryResult<never>, { status: 'success' }>

/** Clasifica una respuesta HTTP; el éxito no lleva valor, lo añade quien la interpreta. */
export function classifyResponse(response: Response, now: () => number = Date.now, detail = ''): RegistryResult {
  const status = response.status
  if (status >= 200 && status < 300) return { status: 'success', value: undefined }
  if (status === 401 || status === 403) return { status: 'unauthorized', httpStatus: status, detail }
  if (status === 404) return { status: 'not_found', detail }
  if (status === 429) return { status: 'rate_limited', rateLimit: rateLimitOf(response.headers, now), detail }
  return { status: 'provider_error', httpStatus: status, detail }
}

function rateLimitOf(headers: Headers, now: () => number): RateLimit {
  const limit = quotaHeader(headers, 'ratelimit-limit')
  const remaining = quotaHeader(headers, 'ratelimit-remaining')
  const source = headers.get('docker-ratelimit-source') ?? undefined
  return {
    kind: limit === undefined && remaining === undefined ? 'unclassified' : 'pull-rate',
    limit: limit?.value,
    remaining: remaining?.value,
    windowSeconds: limit?.windowSeconds ?? remaining?.windowSeconds,
    retryAfterSeconds: retryAfterSeconds(headers.get('retry-after'), now),
    source,
  }
}

/** `<n>;w=<segundos>` en la cabecera estándar o en su variante `x-`. */
function quotaHeader(headers: Headers, name: string): { value: number; windowSeconds?: number } | undefined {
  const raw = headers.get(name) ?? headers.get(`x-${name}`)
  const match = raw?.match(/^\s*(\d+)\s*(?:;\s*w=(\d+))?/)
  if (!match) return undefined
  return { value: Number(match[1]), windowSeconds: match[2] === undefined ? undefined : Number(match[2]) }
}

/** `Retry-After` en segundos, o como fecha HTTP relativa a `now`. */
function retryAfterSeconds(raw: string | null, now: () => number): number | undefined {
  if (raw === null) return undefined
  if (/^\s*\d+\s*$/.test(raw)) return Number(raw)
  const date = Date.parse(raw)
  return Number.isNaN(date) ? undefined : Math.max(0, Math.round((date - now()) / 1000))
}
