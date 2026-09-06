/**
 * Porte de `ccnmt: packages/agent/__tests__/tokenBudget.test.ts`.
 * El presupuesto tiene dos condiciones de parada, y la segunda —el turno
 * que ya no avanza— es la que un porcentaje solo no puede ver.
 */
import { describe, expect, test } from 'bun:test'
import { checkTokenBudget, createBudgetTracker } from '../src/internal/tokenBudget.ts'

describe('tokenBudget', () => {
  test('createBudgetTracker devuelve el estado inicial', () => {
    const tracker = createBudgetTracker()
    expect(tracker.continuationCount).toBe(0)
    expect(tracker.lastDeltaTokens).toBe(0)
    expect(tracker.lastGlobalTurnTokens).toBe(0)
  })

  test('para de inmediato cuando hay agentId: el subagente tiene su propio presupuesto', () => {
    const result = checkTokenBudget(createBudgetTracker(), 'agent-123', 10000, 5000)
    expect(result.action).toBe('stop')
    if (result.action === 'stop') expect(result.completionEvent).toBeNull()
  })

  test('para de inmediato cuando el presupuesto es nulo', () => {
    expect(checkTokenBudget(createBudgetTracker(), undefined, null, 5000).action).toBe('stop')
  })

  test('para de inmediato cuando el presupuesto no es positivo', () => {
    expect(checkTokenBudget(createBudgetTracker(), undefined, 0, 5000).action).toBe('stop')
  })

  test('continua por debajo del noventa por ciento', () => {
    const result = checkTokenBudget(createBudgetTracker(), undefined, 10000, 5000)
    expect(result.action).toBe('continue')
    if (result.action === 'continue') {
      expect(result.pct).toBe(50)
      expect(result.nudgeMessage).toContain('50%')
    }
  })

  test('para al alcanzar el noventa por ciento', () => {
    expect(checkTokenBudget(createBudgetTracker(), undefined, 10000, 9000).action).toBe('stop')
  })

  test('para por rendimiento decreciente: dos deltas cortos seguidos tras tres continuaciones', () => {
    const tracker = createBudgetTracker()
    checkTokenBudget(tracker, undefined, 10000, 1000)
    checkTokenBudget(tracker, undefined, 10000, 1500)
    checkTokenBudget(tracker, undefined, 10000, 1800)
    const result = checkTokenBudget(tracker, undefined, 10000, 2000)
    expect(result.action).toBe('stop')
    if (result.action === 'stop' && result.completionEvent) {
      expect(result.completionEvent.diminishingReturns).toBe(true)
    }
  })

  // Este caso NO viene de la fuente: se anade porque sin el, anular el guard
  // `continuationCount >= MIN_CONTINUATIONS_FOR_DIMINISHING` no rompe ninguna
  // asercion — el verde no distinguiria «el minimo se respeta» de «nadie lo
  // mide». Con el, la anulacion cae aqui y solo aqui.
  test('dos deltas cortos con menos de tres continuaciones siguen continuando', () => {
    const tracker = createBudgetTracker()
    const first = checkTokenBudget(tracker, undefined, 10000, 100)
    expect(first.action).toBe('continue')
    const second = checkTokenBudget(tracker, undefined, 10000, 200)
    expect(second.action).toBe('continue')
    if (second.action === 'continue') expect(second.continuationCount).toBe(2)
  })

  test('sin continuacion previa no hay evento: el primer cheque ya venia por encima', () => {
    const result = checkTokenBudget(createBudgetTracker(), undefined, 10000, 9500)
    expect(result.action).toBe('stop')
    if (result.action === 'stop') expect(result.completionEvent).toBeNull()
  })
})
