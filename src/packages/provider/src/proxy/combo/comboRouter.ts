/**
 * El orden de los destinos de un combo según su estrategia — porte de
 * `applyStrategyOrdering` de OmniRoute (`open-sse/services/combo/
 * applyStrategyOrdering.ts`, a58000c7, MIT), con el round-robin de
 * `roundRobinCombo.ts` y su estado de `rrState.ts`.
 *
 * Un combo es un modelo con varios destinos. La estrategia decide en qué orden
 * se prueban; la conmutación ante un fallo la hace quien recorre ese orden.
 * Tras cada petición, `recordOutcome` deja lo que la siguiente necesita: las
 * métricas del combo, el último destino bueno y el puntero del round-robin.
 *
 * Divergencias declaradas:
 * - Sin las estrategias que dependen de cuotas, reinicios, tarifas por
 *   suscripción o un catálogo de modelos con puntuación (`reset-aware`,
 *   `reset-window`, `headroom`, `quota-weighted`, `quota-share`, `auto`,
 *   `cache-optimized`) ni las que despachan a varios modelos a la vez
 *   (`fusion`, `pipeline`, `context-relay`).
 * - El precio de entrada y la ventana de contexto de un modelo se inyectan.
 * - El último destino bueno vive en memoria, no en la base de datos.
 * - El round-robin rota los destinos y deja la conmutación a quien los
 *   recorre; el de la referencia además gestiona colas, concurrencia y
 *   afinidad por conversación.
 */
import { fisherYatesShuffle, getNextFromDeck } from '../shuffleDeck.ts'
import {
  type BreakerStateOf,
  type OrderableTarget,
  orderTargetsByPowerOfTwoChoices,
  orderTargetsForWeightedFallback,
  selectWeightedTarget,
  sortTargetsByCost,
  sortTargetsByUsage,
} from '../targetSorters.ts'
import { ComboMetrics } from './comboMetrics.ts'

export const COMBO_STRATEGIES = [
  'priority', 'fill-first', 'weighted', 'round-robin', 'random', 'strict-random',
  'p2c', 'least-used', 'cost-optimized', 'context-optimized', 'lkgp',
] as const
export type ComboStrategy = (typeof COMBO_STRATEGIES)[number]

export function isComboStrategy(value: unknown): value is ComboStrategy {
  return typeof value === 'string' && (COMBO_STRATEGIES as readonly string[]).includes(value)
}

export type ComboRouterOptions = {
  metrics?: ComboMetrics
  inputPriceOf?: (modelStr: string) => Promise<number | undefined> | number | undefined
  contextWindowOf?: (provider: string, model: string) => number | undefined
  breakerStateOf?: BreakerStateOf
  /** Cuántos aciertos seguidos sirve un destino antes de rotar; 1 es round-robin estricto. */
  stickyRoundRobinLimit?: number
}

export type Outcome = { success: boolean; latencyMs: number; fallbackCount?: number }

/** Techo de combos con estado de round-robin; al pasarlo se desaloja el más antiguo. */
export const MAX_RR_COUNTERS = 500

function clampStickyLimit(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.min(Math.max(Math.floor(numeric), 1), 1000) : 1
}

export class ComboRouter {
  readonly metrics: ComboMetrics
  private readonly lastKnownGood = new Map<string, string>()
  private readonly rrCounters = new Map<string, number>()
  private readonly rrSticky = new Map<string, { executionKey: string; successCount: number }>()
  private readonly stickyLimit: number

  constructor(private readonly options: ComboRouterOptions = {}) {
    this.metrics = options.metrics ?? new ComboMetrics()
    this.stickyLimit = clampStickyLimit(options.stickyRoundRobinLimit)
  }

  /** Los destinos en el orden en que se prueban. No altera la lista recibida. */
  async order<T extends OrderableTarget>(strategy: ComboStrategy, comboName: string, targets: readonly T[]): Promise<T[]> {
    const list = [...targets]
    if (list.length <= 1) return list
    switch (strategy) {
      case 'weighted': {
        const chosen = selectWeightedTarget(list)
        return chosen ? orderTargetsForWeightedFallback(list, chosen.executionKey) : list
      }
      case 'round-robin':
        return this.roundRobinOrder(comboName, list)
      case 'random':
        return fisherYatesShuffle(list)
      case 'strict-random': {
        const picked = await getNextFromDeck(`combo:${comboName}`, list.map(t => t.executionKey))
        const first = list.find(t => t.executionKey === picked)
        return first ? [first, ...fisherYatesShuffle(list.filter(t => t !== first))] : fisherYatesShuffle(list)
      }
      case 'p2c':
        return orderTargetsByPowerOfTwoChoices(list, this.metrics.get(comboName), this.options.breakerStateOf)
      case 'least-used':
        return sortTargetsByUsage(list, this.metrics.get(comboName))
      case 'cost-optimized':
        return sortTargetsByCost(list, this.options.inputPriceOf ?? (() => undefined))
      case 'context-optimized':
        return this.byContextSize(list)
      case 'lkgp': {
        const key = this.lastKnownGood.get(comboName)
        const index = key ? list.findIndex(t => t.executionKey === key) : -1
        return index > 0 ? [list[index]!, ...list.filter((_, i) => i !== index)] : list
      }
      default:
        return list
    }
  }

  /** Lo que el desenlace de una petición deja para la siguiente. `served` es el destino que respondió, o el último probado. */
  recordOutcome<T extends OrderableTarget>(strategy: ComboStrategy, comboName: string, targets: readonly T[], served: T | null, outcome: Outcome): void {
    this.metrics.record(comboName, served?.modelStr ?? null, {
      ...outcome,
      strategy,
      target: served && { executionKey: served.executionKey, provider: served.provider },
    })
    if (!outcome.success || !served) return
    this.lastKnownGood.set(comboName, served.executionKey)
    if (strategy === 'round-robin') this.recordRoundRobinSuccess(comboName, targets, served)
  }

  /** Mayor ventana primero; si no se conoce ninguna, el orden declarado. */
  private byContextSize<T extends OrderableTarget>(list: T[]): T[] {
    const windowOf = (t: T) => this.options.contextWindowOf?.(t.provider, t.modelStr)
    if (!list.some(t => windowOf(t) != null)) return list
    return list.map(t => ({ t, size: windowOf(t) ?? 0 })).sort((a, b) => b.size - a.size).map(e => e.t)
  }

  private roundRobinOrder<T extends OrderableTarget>(comboName: string, list: T[]): T[] {
    if (!this.rrCounters.has(comboName)) {
      if (this.rrCounters.size >= MAX_RR_COUNTERS) {
        const oldest = this.rrCounters.keys().next().value
        if (oldest !== undefined) { this.rrCounters.delete(oldest); this.rrSticky.delete(oldest) }
      }
      this.rrCounters.set(comboName, 0)
    }
    const counter = this.rrCounters.get(comboName)!
    const sticky = this.rrSticky.get(comboName)
    const stickyIndex = sticky ? list.findIndex(t => t.executionKey === sticky.executionKey) : -1
    const stickyHolds = this.stickyLimit > 1 && sticky !== undefined && stickyIndex >= 0 && sticky.successCount < this.stickyLimit
    const start = stickyHolds ? stickyIndex : counter % list.length
    // Sin lote pegajoso el puntero avanza al programar; un acierto lo corrige después.
    if (this.stickyLimit <= 1) this.rrCounters.set(comboName, counter + 1)
    return [...list.slice(start), ...list.slice(0, start)]
  }

  /** El puntero sigue al destino que de verdad sirvió; con lote, tras N aciertos seguidos. */
  private recordRoundRobinSuccess<T extends OrderableTarget>(comboName: string, targets: readonly T[], served: T): void {
    const servedIndex = targets.findIndex(t => t.executionKey === served.executionKey)
    const next = servedIndex >= 0 ? servedIndex + 1 : (this.rrCounters.get(comboName) ?? 0) + 1
    if (this.stickyLimit <= 1) {
      this.rrCounters.set(comboName, next)
      return
    }
    const sticky = this.rrSticky.get(comboName)
    const successCount = sticky?.executionKey === served.executionKey ? sticky.successCount + 1 : 1
    if (successCount >= this.stickyLimit) {
      this.rrCounters.set(comboName, next)
      this.rrSticky.delete(comboName)
      return
    }
    this.rrSticky.set(comboName, { executionKey: served.executionKey, successCount })
  }
}
