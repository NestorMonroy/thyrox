/**
 * El limitador de peticiones de un upstream: lo que el gestor de límites de
 * OmniRoute (`open-sse/services/rateLimitManager.ts`, a58000c7) toma de
 * `bottleneck`, reimplementado en nativo.
 *
 * Tres frenos, que se suman:
 * - `maxConcurrent`: cuántas tareas corren a la vez (`null`, sin tope);
 * - `minTime`: la separación mínima entre dos arranques;
 * - `reservoir`: el cupo que queda; cada arranque gasta uno y con 0 nada
 *   arranca. `reservoirRefreshInterval` lo vuelve a fijar en
 *   `reservoirRefreshAmount` en cada intervalo (`null`, sin cupo).
 *
 * Las tareas arrancan en orden de llegada. Los temporizadores no retienen el
 * proceso.
 */

export interface RequestLimiterSettings {
  maxConcurrent?: number | null
  minTime?: number
  reservoir?: number | null
  reservoirRefreshAmount?: number | null
  reservoirRefreshInterval?: number | null
}

type Job = {
  run: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
  signal?: AbortSignal
  onAbort?: () => void
}

export class RequestLimiter {
  private settings: Required<RequestLimiterSettings>
  private readonly queue: Job[] = []
  private running = 0
  private lastStart = Number.NEGATIVE_INFINITY
  private wakeTimer: ReturnType<typeof setTimeout> | null = null
  private refreshTimer: ReturnType<typeof setInterval> | null = null

  constructor(settings: RequestLimiterSettings = {}) {
    this.settings = {
      maxConcurrent: null,
      minTime: 0,
      reservoir: null,
      reservoirRefreshAmount: null,
      reservoirRefreshInterval: null,
      ...settings,
    }
    this.restartRefresh()
  }

  /** Los ajustes vigentes. */
  current(): Readonly<Required<RequestLimiterSettings>> {
    return { ...this.settings }
  }

  /** Cambia los ajustes de un limitador vivo; lo encolado se reevalúa con ellos. */
  updateSettings(settings: RequestLimiterSettings): void {
    this.settings = { ...this.settings, ...settings }
    if ('reservoirRefreshAmount' in settings || 'reservoirRefreshInterval' in settings) this.restartRefresh()
    this.pump()
  }

  counts(): { QUEUED: number; RUNNING: number } {
    return { QUEUED: this.queue.length, RUNNING: this.running }
  }

  /**
   * Programa `task`. Con `signal`, una cancelación la saca de la cola si aún
   * espera, o rechaza su promesa si ya corre; en los dos casos con la razón
   * de la señal, sin tocarla.
   */
  schedule<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(signal.reason)
    return new Promise<T>((resolve, reject) => {
      const job: Job = { run: task, resolve: resolve as (value: unknown) => void, reject, signal }
      if (signal) {
        job.onAbort = () => {
          const index = this.queue.indexOf(job)
          if (index >= 0) this.queue.splice(index, 1)
          reject(signal.reason)
        }
        signal.addEventListener('abort', job.onAbort, { once: true })
      }
      this.queue.push(job)
      this.pump()
    })
  }

  /** Rechaza con `reason` todo lo que espera; lo que ya corre termina. */
  drop(reason: unknown): void {
    for (const job of this.queue.splice(0)) this.settle(job, () => job.reject(reason))
  }

  /** Suelta los temporizadores. Lo encolado se queda donde está. */
  disconnect(): void {
    if (this.wakeTimer) clearTimeout(this.wakeTimer)
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    this.wakeTimer = null
    this.refreshTimer = null
  }

  private restartRefresh(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    this.refreshTimer = null
    const { reservoirRefreshAmount: amount, reservoirRefreshInterval: interval } = this.settings
    if (amount == null || interval == null || interval <= 0) return
    this.refreshTimer = setInterval(() => {
      this.settings.reservoir = amount
      this.pump()
    }, interval)
    this.refreshTimer.unref?.()
  }

  /** Arranca todo lo que los tres frenos dejan; si sólo frena `minTime`, se despierta cuando pase. */
  private pump(): void {
    while (this.queue.length > 0) {
      const { maxConcurrent, minTime, reservoir } = this.settings
      if (maxConcurrent != null && this.running >= maxConcurrent) return
      if (reservoir != null && reservoir <= 0) return
      const gap = this.lastStart + minTime - Date.now()
      if (gap > 0) return this.wakeIn(gap)
      this.start(this.queue.shift()!)
    }
  }

  private wakeIn(ms: number): void {
    if (this.wakeTimer) return
    this.wakeTimer = setTimeout(() => {
      this.wakeTimer = null
      this.pump()
    }, ms)
    this.wakeTimer.unref?.()
  }

  private start(job: Job): void {
    this.running += 1
    this.lastStart = Date.now()
    if (this.settings.reservoir != null) this.settings.reservoir -= 1
    job.run().then(
      value => this.settle(job, () => job.resolve(value)),
      error => this.settle(job, () => job.reject(error)),
    ).finally(() => {
      this.running -= 1
      this.pump()
    })
  }

  private settle(job: Job, outcome: () => void): void {
    if (job.signal && job.onAbort) job.signal.removeEventListener('abort', job.onAbort)
    outcome()
  }
}
