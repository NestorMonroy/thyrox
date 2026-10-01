/**
 * Métricas por combo — porte de `open-sse/services/comboMetrics.ts` de
 * OmniRoute (a58000c7, MIT). Por cada combo lleva los totales de peticiones,
 * éxitos, fallos, conmutaciones y latencia, y los mismos contadores por modelo
 * y por destino. Las estrategias que eligen por uso o por calidad
 * (`least-used`, `p2c`) leen de aquí.
 *
 * Divergencias declaradas:
 * - Es una instancia y no un almacén del proceso: cada proxy lleva la suya, y
 *   las pruebas no comparten estado.
 * - El vencimiento de una hora sin uso se aplica al leer, no con un
 *   temporizador; el reloj se inyecta.
 * - Sin las métricas en sombra, la cuenta de intenciones ni el registro de
 *   diversidad de proveedores: el proxy no tiene tráfico en sombra, ni
 *   clasificador de intención, ni panel que los lea.
 */

export const MAX_METRICS_ENTRIES = 500
export const METRICS_TTL_MS = 60 * 60 * 1000

export type ModelMetrics = {
  requests: number
  successes: number
  failures: number
  totalLatencyMs: number
  lastStatus: 'ok' | 'error' | null
  lastUsedAt: string | null
}

export type TargetMetrics = ModelMetrics & {
  executionKey: string
  model: string
  provider: string | null
  connectionId: string | null
}

type ComboEntry = {
  totalRequests: number
  totalSuccesses: number
  totalFailures: number
  totalFallbacks: number
  totalLatencyMs: number
  strategy: string
  lastUsedAt: string | null
  byModel: Record<string, ModelMetrics>
  byTarget: Record<string, TargetMetrics>
}

type WithRates<T> = T & { avgLatencyMs: number; successRate: number }

export type ComboMetricsView = Omit<ComboEntry, 'byModel' | 'byTarget'> & {
  avgLatencyMs: number
  successRate: number
  fallbackRate: number
  byModel: Record<string, WithRates<ModelMetrics>>
  byTarget: Record<string, WithRates<TargetMetrics>>
}

/** Qué destino sirvió la petición: su clave de ejecución, su proveedor y su credencial. */
export type RequestTarget = { executionKey?: string | null; provider?: string | null; connectionId?: string | null }

export type RequestOutcome = {
  success: boolean
  latencyMs: number
  fallbackCount?: number
  strategy?: string
  target?: RequestTarget | null
}

const emptyMetrics = (): ModelMetrics => ({ requests: 0, successes: 0, failures: 0, totalLatencyMs: 0, lastStatus: null, lastUsedAt: null })

const nonEmpty = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)

function applyOutcome(metric: ModelMetrics, success: boolean, latencyMs: number, usedAt: string): void {
  metric.requests += 1
  metric.totalLatencyMs += latencyMs
  metric.lastUsedAt = usedAt
  if (success) metric.successes += 1
  else metric.failures += 1
  metric.lastStatus = success ? 'ok' : 'error'
}

const rate = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

function withRates<T extends ModelMetrics>(metric: T): WithRates<T> {
  return {
    ...metric,
    avgLatencyMs: metric.requests > 0 ? Math.round(metric.totalLatencyMs / metric.requests) : 0,
    successRate: rate(metric.successes, metric.requests),
  }
}

export class ComboMetrics {
  private readonly combos = new Map<string, ComboEntry>()

  constructor(private readonly now: () => number = Date.now) {}

  /** Registra el desenlace de una petición. Sin modelo cuenta sólo en los totales. */
  record(comboName: string, modelStr: string | null, outcome: RequestOutcome): void {
    let combo = this.combos.get(comboName)
    if (!combo) {
      if (this.combos.size >= MAX_METRICS_ENTRIES) this.evictOldest()
      combo = { totalRequests: 0, totalSuccesses: 0, totalFailures: 0, totalFallbacks: 0, totalLatencyMs: 0, strategy: 'priority', lastUsedAt: null, byModel: {}, byTarget: {} }
      this.combos.set(comboName, combo)
    }
    const usedAt = new Date(this.now()).toISOString()
    combo.totalRequests += 1
    combo.totalLatencyMs += outcome.latencyMs
    combo.totalFallbacks += outcome.fallbackCount ?? 0
    combo.lastUsedAt = usedAt
    combo.strategy = outcome.strategy ?? 'priority'
    if (outcome.success) combo.totalSuccesses += 1
    else combo.totalFailures += 1

    const model = nonEmpty(modelStr)
    if (!model) return
    applyOutcome((combo.byModel[model] ??= emptyMetrics()), outcome.success, outcome.latencyMs, usedAt)
    const key = nonEmpty(outcome.target?.executionKey) ?? model
    const target = (combo.byTarget[key] ??= { executionKey: key, model, provider: null, connectionId: null, ...emptyMetrics() })
    target.provider = nonEmpty(outcome.target?.provider) ?? target.provider
    target.connectionId = nonEmpty(outcome.target?.connectionId) ?? target.connectionId
    applyOutcome(target, outcome.success, outcome.latencyMs, usedAt)
  }

  /** La vista de un combo con sus tasas derivadas, o `null` si no hay registro vigente. */
  get(comboName: string): ComboMetricsView | null {
    this.expire()
    const combo = this.combos.get(comboName)
    if (!combo) return null
    const mapValues = <T extends ModelMetrics>(record: Record<string, T>) =>
      Object.fromEntries(Object.entries(record).map(([key, metric]) => [key, withRates(metric)]))
    return {
      ...combo,
      avgLatencyMs: combo.totalRequests > 0 ? Math.round(combo.totalLatencyMs / combo.totalRequests) : 0,
      successRate: rate(combo.totalSuccesses, combo.totalRequests),
      fallbackRate: rate(combo.totalFallbacks, combo.totalRequests),
      byModel: mapValues(combo.byModel),
      byTarget: mapValues(combo.byTarget),
    }
  }

  all(): Record<string, ComboMetricsView> {
    this.expire()
    return Object.fromEntries([...this.combos.keys()].map(name => [name, this.get(name)!]))
  }

  reset(comboName: string): void {
    this.combos.delete(comboName)
  }

  resetAll(): void {
    this.combos.clear()
  }

  private lastUsedMs(entry: ComboEntry): number {
    return entry.lastUsedAt ? Date.parse(entry.lastUsedAt) : this.now()
  }

  private evictOldest(): void {
    let oldest: string | null = null
    let oldestMs = Infinity
    for (const [name, entry] of this.combos) {
      const used = this.lastUsedMs(entry)
      if (used < oldestMs) { oldestMs = used; oldest = name }
    }
    if (oldest !== null) this.combos.delete(oldest)
  }

  private expire(): void {
    const now = this.now()
    for (const [name, entry] of this.combos) if (now - this.lastUsedMs(entry) > METRICS_TTL_MS) this.combos.delete(name)
  }
}
