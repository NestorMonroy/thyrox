/**
 * Límites de tasa adaptativos por upstream — porte de OmniRoute
 * (`open-sse/services/rateLimitManager.ts`, a58000c7, MIT).
 *
 * Un limitador por proveedor y credencial (y por modelo donde el cupo es por
 * modelo) que aprende el ritmo de lo que el upstream dice: sus cabeceras de
 * límite, la espera que pide un 429 y el tope que algunos escriben en prosa.
 * Una credencial sin protección activada pasa directa.
 *
 * Divergencias declaradas:
 * - El estado vive en la instancia, no en módulos globales ni en la base de
 *   datos: lo aprendido no persiste entre arranques.
 * - Los ajustes de cola (`RateLimitQueueSettings`) llegan al construir; la
 *   referencia los lee de sus ajustes de resiliencia, con límites por defecto.
 *   Aquí el defecto es sin límite, el mismo valor que la referencia da a un 0.
 * - Las claves por familia de cuota de `codex` y `antigravity` dependen de
 *   módulos que no se portan; esos proveedores usan la clave por credencial.
 * - No se portan las sobreescrituras por conexión, el tope de espera en cola,
 *   la vigilancia de colas atascadas ni la expulsión por inactividad: piezas
 *   de un servicio que vive semanas con miles de conexiones.
 */
import type { SharedStateStore } from '@thyrox/shared-state/port.ts'
import { requestCapSettings, parseRequestCapFromBody } from './requestCap.ts'
import { ANTHROPIC_HEADERS, parseResetTime, STANDARD_HEADERS, toPlainHeaders } from './rateLimitHeaders.ts'
import { RequestLimiter, type RequestLimiterSettings } from './requestLimiter.ts'
import { parseRetryAfterFromBody } from './retryHints.ts'

/** Los ajustes de cola de toda credencial protegida; 0 o ausente es sin límite. */
export interface RateLimitQueueSettings {
  requestsPerMinute?: number
  minTimeBetweenRequestsMs?: number
  concurrentRequests?: number
}

export interface LearnedLimit {
  provider: string
  credentialId: string
  lastUpdated: number
  limit?: number
  remaining?: number
  minTime?: number
  /** El tope que un 429 declaró; se aplica cada vez que el limitador se crea. */
  capRequests?: number
  capWindowMs?: number
}

export interface RateLimitStatus {
  enabled: boolean
  active: boolean
  queued: number
  running: number
}

/** El error con que se rechaza lo que esperaba cuando el upstream responde 429. */
export class RateLimitedByUpstreamError extends Error {
  readonly code = 'RATE_LIMITED_BY_UPSTREAM'
  constructor(readonly retryAfterMs: number) {
    super(`upstream rate limited; retry after ${Math.ceil(retryAfterMs / 1000)}s`)
    this.name = 'RateLimitedByUpstreamError'
  }
}

/** Proveedores cuyo cupo es por modelo: un 429 de un modelo no frena a los demás. */
const MODEL_SCOPED_PROVIDERS = new Set(['gemini', 'github'])
/** La espera de un 429 que no dice cuánto esperar. */
const DEFAULT_RETRY_AFTER_MS = 60_000
/** El cupo que se repone cuando el cuerpo pide una espera. */
const BODY_RETRY_REFRESH_AMOUNT = 60
/** Por debajo de esta fracción del límite el limitador se ciñe al cupo restante; por encima de la otra, lo suelta. */
const LOW_REMAINING = 0.1
const HIGH_REMAINING = 0.5
/** Margen restado al intervalo que sale del límite por minuto. */
const MIN_TIME_MARGIN_MS = 10
/** La separación que pide el aviso de exceso de Fireworks. */
const OVER_LIMIT_MIN_TIME_MS = 200

const positiveOrNull = (value: number | undefined) => (value && value > 0 ? value : null)

export class RateLimitManager {
  private readonly limiters = new Map<string, RequestLimiter>()
  private readonly enabled = new Set<string>()
  private readonly learned = new Map<string, LearnedLimit>()
  /** Ventanas locales de `checkGlobalWindow` cuando no hay `sharedState`: una por credencial, sin vista entre proxies. */
  private readonly localWindows = new Map<string, { windowIndex: number; count: number }>()

  constructor(
    private readonly queue: RateLimitQueueSettings = {},
    private readonly sharedState?: SharedStateStore,
  ) {}

  enable(credentialId: string): void {
    this.enabled.add(credentialId)
  }

  /** Quita la protección y olvida los limitadores y lo aprendido de la credencial. */
  disable(credentialId: string): void {
    this.enabled.delete(credentialId)
    for (const [key, limiter] of this.limiters) {
      if (this.credentialOf(key) === credentialId) this.retire(key, limiter)
    }
    for (const [key, entry] of this.learned) {
      if (entry.credentialId === credentialId) this.learned.delete(key)
    }
  }

  isEnabled(credentialId: string): boolean {
    return this.enabled.has(credentialId)
  }

  /** Corre `task` dentro del limitador de la credencial, o directa si no está protegida. */
  withRateLimit<T>(provider: string, credentialId: string, model: string | null, task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!this.isEnabled(credentialId)) return task()
    return this.limiterFor(provider, credentialId, model).schedule(task, signal)
  }

  /**
   * Cuenta una petición de `credentialId` en la ventana fija de `windowMs`
   * y dice si con ella ya se pasó `limit`. Con `sharedState` la cuenta es
   * global entre proxies (ADR-THYROX-006); sin él, local a esta instancia,
   * con la misma semántica de ventana fija.
   */
  async checkGlobalWindow(credentialId: string, limit: number, windowMs: number): Promise<boolean> {
    const key = `rate-window:${credentialId}`
    const count = this.sharedState
      ? await this.sharedState.incrementWindow(key, windowMs)
      : this.incrementLocalWindow(key, windowMs)
    return count > limit
  }

  /** Aprende de las cabeceras de una respuesta; un 429 retira el limitador. */
  updateFromHeaders(provider: string, credentialId: string, headers: unknown, status: number, model: string | null = null): void {
    if (!this.isEnabled(credentialId) || !headers) return
    const plain = toPlainHeaders(headers)
    const names = provider === 'anthropic' || provider === 'claude' ? ANTHROPIC_HEADERS : STANDARD_HEADERS
    const read = (name: string) => plain[name.toLowerCase()] || null
    const key = this.keyOf(provider, credentialId, model)

    if (status === 429) {
      // Retirar, no pausar: la ronda siguiente crea un limitador nuevo, que
      // vuelve a aplicar lo aprendido; lo que esperaba en éste iba a chocar
      // con el mismo 429.
      const limiter = this.limiters.get(key)
      if (limiter) this.retire(key, limiter, new RateLimitedByUpstreamError(parseResetTime(read(names.retryAfter)) || DEFAULT_RETRY_AFTER_MS))
      return
    }

    const limiter = this.limiterFor(provider, credentialId, model)
    if (read(STANDARD_HEADERS.overLimit) === 'yes') {
      limiter.updateSettings({ minTime: OVER_LIMIT_MIN_TIME_MS })
      return
    }

    const limit = Number.parseInt(read(names.limit) ?? '', 10)
    if (Number.isNaN(limit) || limit <= 0) return
    const remaining = Number.parseInt(read(names.remaining) ?? '', 10)
    const resetMs = parseResetTime(read(names.reset)) || DEFAULT_RETRY_AFTER_MS
    const updates: RequestLimiterSettings = { minTime: Math.max(0, Math.floor(60_000 / limit) - MIN_TIME_MARGIN_MS) }
    if (!Number.isNaN(remaining)) {
      if (remaining < limit * LOW_REMAINING) {
        Object.assign(updates, { reservoir: remaining, reservoirRefreshAmount: limit, reservoirRefreshInterval: resetMs })
      } else if (remaining > limit * HIGH_REMAINING) {
        Object.assign(updates, { minTime: this.minTimeFloor(), reservoir: null, reservoirRefreshAmount: null, reservoirRefreshInterval: null })
      }
    }
    limiter.updateSettings(updates)
    this.record(key, provider, credentialId, { limit, remaining, minTime: updates.minTime })
  }

  /** Aprende de un cuerpo de error: la espera que pide y el tope que declara un 429. */
  updateFromResponseBody(provider: string, credentialId: string, body: unknown, status: number, model: string | null = null): void {
    if (!this.isEnabled(credentialId)) return
    const { retryAfterMs } = parseRetryAfterFromBody(body)
    if (retryAfterMs && retryAfterMs > 0) {
      this.limiterFor(provider, credentialId, model).updateSettings({
        reservoir: 0,
        reservoirRefreshAmount: BODY_RETRY_REFRESH_AMOUNT,
        reservoirRefreshInterval: retryAfterMs,
      })
    }
    if (status !== 429) return
    const cap = parseRequestCapFromBody(body)
    if (!cap) return
    const key = this.keyOf(provider, credentialId, model)
    const existing = this.limiters.get(key)
    if (existing) this.retire(key, existing)
    const settings = this.withFloor(requestCapSettings(cap))
    this.record(key, provider, credentialId, {
      limit: Math.max(1, Math.round((cap.requests * 60_000) / cap.windowMs)),
      minTime: settings.minTime,
      capRequests: cap.requests,
      capWindowMs: cap.windowMs,
    })
    // El 429 dice que la ventana ya se gastó: el cupo empieza vacío y se
    // repone `requests` al cerrarse.
    this.limiterFor(provider, credentialId, model).updateSettings({ reservoir: 0, ...settings })
  }

  status(provider: string, credentialId: string, model: string | null = null): RateLimitStatus {
    const limiter = this.limiters.get(this.keyOf(provider, credentialId, model))
    const counts = limiter?.counts() ?? { QUEUED: 0, RUNNING: 0 }
    return { enabled: this.isEnabled(credentialId), active: Boolean(limiter), queued: counts.QUEUED, running: counts.RUNNING }
  }

  allStatus(): Record<string, { queued: number; running: number }> {
    const all: Record<string, { queued: number; running: number }> = {}
    for (const [key, limiter] of this.limiters) {
      const counts = limiter.counts()
      all[key] = { queued: counts.QUEUED, running: counts.RUNNING }
    }
    return all
  }

  learnedLimits(): Record<string, LearnedLimit> {
    return Object.fromEntries([...this.learned].map(([key, entry]) => [key, { ...entry }]))
  }

  /** Los ajustes vigentes del limitador, o `null` si no hay ninguno. */
  settingsOf(provider: string, credentialId: string, model: string | null = null): Readonly<Required<RequestLimiterSettings>> | null {
    return this.limiters.get(this.keyOf(provider, credentialId, model))?.current() ?? null
  }

  private keyOf(provider: string, credentialId: string, model: string | null): string {
    return MODEL_SCOPED_PROVIDERS.has(provider) && model ? `${provider}:${credentialId}:${model}` : `${provider}:${credentialId}`
  }

  /** La cuenta local de `checkGlobalWindow` cuando no hay `sharedState`, con la misma ventana fija que `incrementWindow`. */
  private incrementLocalWindow(key: string, windowMs: number): number {
    const windowIndex = Math.floor(Date.now() / windowMs)
    const existing = this.localWindows.get(key)
    const count = existing !== undefined && existing.windowIndex === windowIndex ? existing.count + 1 : 1
    this.localWindows.set(key, { windowIndex, count })
    return count
  }

  private credentialOf(key: string): string {
    return key.split(':')[1] ?? ''
  }

  private minTimeFloor(): number {
    return Math.max(0, this.queue.minTimeBetweenRequestsMs ?? 0)
  }

  private withFloor<S extends { minTime: number }>(settings: S): S {
    return { ...settings, minTime: Math.max(settings.minTime, this.minTimeFloor()) }
  }

  /** El limitador de la clave, creado con los ajustes de cola y el tope aprendido si lo hay. */
  private limiterFor(provider: string, credentialId: string, model: string | null): RequestLimiter {
    const key = this.keyOf(provider, credentialId, model)
    let limiter = this.limiters.get(key)
    if (limiter) return limiter
    const rpm = positiveOrNull(this.queue.requestsPerMinute)
    const settings: RequestLimiterSettings = {
      maxConcurrent: positiveOrNull(this.queue.concurrentRequests),
      minTime: this.minTimeFloor(),
      reservoir: rpm,
      reservoirRefreshAmount: rpm,
      reservoirRefreshInterval: rpm ? 60_000 : null,
    }
    const learned = this.learned.get(key)
    if (learned?.capRequests && learned.capWindowMs) {
      const cap = this.withFloor(requestCapSettings({ requests: learned.capRequests, windowMs: learned.capWindowMs }))
      Object.assign(settings, { ...cap, reservoir: cap.reservoirRefreshAmount })
    }
    limiter = new RequestLimiter(settings)
    this.limiters.set(key, limiter)
    return limiter
  }

  private retire(key: string, limiter: RequestLimiter, reason: unknown = new RateLimitedByUpstreamError(DEFAULT_RETRY_AFTER_MS)): void {
    this.limiters.delete(key)
    limiter.drop(reason)
    limiter.disconnect()
  }

  private record(key: string, provider: string, credentialId: string, values: Partial<LearnedLimit>): void {
    const previous = this.learned.get(key)
    this.learned.set(key, { ...previous, ...values, provider, credentialId, lastUpdated: Date.now() })
  }
}
