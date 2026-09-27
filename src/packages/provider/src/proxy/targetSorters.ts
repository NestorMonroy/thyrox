/**
 * Ordenadores de destinos — porte de OmniRoute `a58000c7`
 * `open-sse/services/combo/targetSorters.ts`.
 *
 * Divergencias declaradas, las tres de sustrato:
 * - las métricas del combo (`getComboMetrics(comboName)`) y el disyuntor por
 *   proveedor (`getCircuitBreaker`) se reciben como parámetros;
 * - el precio de entrada (`getPricingForModel` de la base de OmniRoute) es
 *   una función inyectada;
 * - `normalizeModelEntry` y `sortModelsByCost` sobre cadenas no se portan
 *   sueltos: el primero normaliza el formato de combos de OmniRoute, que
 *   thyrox no tiene; el segundo queda dentro de `sortTargetsByCost`.
 */
import { secureRandomFloat, secureRandomInt } from './shuffleDeck.js'

export type OrderableTarget = { executionKey: string; modelStr: string; provider: string; weight: number }

export type ComboMetrics = {
  byTarget?: Record<string, { requests?: number } | undefined>
  byModel?: Record<string, { successRate?: number; avgLatencyMs?: number } | undefined>
} | null

export type BreakerStateOf = (provider: string) => 'OPEN' | 'HALF_OPEN' | 'CLOSED' | undefined

/** Elige por peso; con peso total ≤ 0, uniforme. */
export function selectWeightedTarget<T extends { weight?: number }>(targets: T[]): T | null | undefined {
  if (targets.length === 0) return null
  const totalWeight = targets.reduce((sum, target) => sum + (target.weight || 0), 0)
  if (totalWeight <= 0) return targets[secureRandomInt(targets.length)]
  let random = secureRandomFloat() * totalWeight
  for (const target of targets) {
    random -= target.weight || 0
    if (random <= 0) return target
  }
  return targets.at(-1)
}

/** El elegido primero; el resto por peso descendente salvo que se preserve. */
export function orderTargetsForWeightedFallback<T extends { executionKey: string; weight: number }>(
  targets: T[],
  selectedExecutionKey: string,
  preserveExistingOrder = false,
): T[] {
  const selected = targets.find(t => t.executionKey === selectedExecutionKey)
  const rest = targets.filter(t => t.executionKey !== selectedExecutionKey)
  if (!preserveExistingOrder) rest.sort((a, b) => b.weight - a.weight)
  return selected ? [selected, ...rest] : rest
}

/** Más barato primero por precio de entrada; sin precio, al final. */
export async function sortTargetsByCost<T extends OrderableTarget>(
  targets: T[],
  inputPriceOf: (modelStr: string) => Promise<number | undefined> | number | undefined,
): Promise<T[]> {
  let orderedModels: string[]
  try {
    const withCost = await Promise.all(
      targets.map(async ({ modelStr }) => {
        try {
          const cost = Number(await inputPriceOf(modelStr))
          return { modelStr, cost: Number.isFinite(cost) ? cost : Infinity }
        } catch {
          return { modelStr, cost: Infinity }
        }
      }),
    )
    withCost.sort((a, b) => a.cost - b.cost)
    orderedModels = withCost.map(e => e.modelStr)
  } catch {
    orderedModels = targets.map(t => t.modelStr)
  }
  const byModel = new Map<string, T[]>()
  for (const target of targets) {
    const queue = byModel.get(target.modelStr) || []
    queue.push(target)
    byModel.set(target.modelStr, queue)
  }
  return orderedModels.map(m => byModel.get(m)?.shift() || null).filter((t): t is T => t !== null)
}

/** Menos usado primero, por `executionKey` (#7015: no agregar por modelo). */
export function sortTargetsByUsage<T extends OrderableTarget>(targets: T[], metrics: ComboMetrics): T[] {
  if (!metrics) return targets
  const withUsage = targets.map(target => ({
    target,
    requests: metrics.byTarget?.[target.executionKey]?.requests ?? 0,
  }))
  withUsage.sort((a, b) => a.requests - b.requests)
  return withUsage.map(e => e.target)
}

function p2cScore(target: OrderableTarget, metrics: ComboMetrics, breakerStateOf?: BreakerStateOf): number {
  const breakerState = breakerStateOf?.(target.provider)
  if (breakerState === 'OPEN') return -Infinity
  const modelMetric = metrics?.byModel?.[target.modelStr] || null
  const successRate = Number(modelMetric?.successRate)
  const avgLatency = Number(modelMetric?.avgLatencyMs)
  const successScore = Number.isFinite(successRate) ? successRate / 100 : 0.5
  const latencyScore = Number.isFinite(avgLatency) && avgLatency > 0 ? 1 / Math.log10(avgLatency + 10) : 0.25
  const breakerPenalty = breakerState === 'HALF_OPEN' ? 0.25 : 0
  return successScore + latencyScore - breakerPenalty
}

/** Potencia de dos opciones: sortea dos distintos y pone primero al de mejor puntuación. */
export function orderTargetsByPowerOfTwoChoices<T extends OrderableTarget>(
  targets: T[],
  metrics: ComboMetrics,
  breakerStateOf?: BreakerStateOf,
): T[] {
  if (targets.length <= 1) return targets
  const firstIndex = secureRandomInt(targets.length)
  let secondIndex = secureRandomInt(targets.length - 1)
  if (secondIndex >= firstIndex) secondIndex++
  const first = targets[firstIndex]!
  const second = targets[secondIndex]!
  const selectedIndex =
    p2cScore(second, metrics, breakerStateOf) > p2cScore(first, metrics, breakerStateOf) ? secondIndex : firstIndex
  return [targets[selectedIndex]!, ...targets.filter((_, index) => index !== selectedIndex)]
}
