/**
 * Porte de `ccnmt: packages/agent/__tests__/compactWarningState.test.ts`
 * contra `ccnmt: packages/agent/compaction/compactWarningState.ts`.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import {
  clearCompactWarningSuppression,
  compactWarningStore,
  suppressCompactWarning,
} from '../compaction/compactWarningState.ts'

beforeEach(() => {
  clearCompactWarningSuppression()
})

afterEach(() => {
  clearCompactWarningSuppression()
})

describe('compactWarningStore — estado inicial', () => {
  test('arranca en false', () => {
    expect(compactWarningStore.getState()).toBe(false)
  })
})

describe('suppressCompactWarning / clearCompactWarningSuppression', () => {
  test('suppress pone el estado en true', () => {
    suppressCompactWarning()
    expect(compactWarningStore.getState()).toBe(true)
  })

  test('clear devuelve el estado a false', () => {
    suppressCompactWarning()
    clearCompactWarningSuppression()
    expect(compactWarningStore.getState()).toBe(false)
  })

  test('suppress repetido es idempotente', () => {
    suppressCompactWarning()
    suppressCompactWarning()
    suppressCompactWarning()
    expect(compactWarningStore.getState()).toBe(true)
  })

  test('clear repetido es idempotente', () => {
    clearCompactWarningSuppression()
    clearCompactWarningSuppression()
    expect(compactWarningStore.getState()).toBe(false)
  })
})

describe('subscribe — notificación a listeners', () => {
  test('el listener dispara cuando el estado cambia', () => {
    const listener = mock(() => {})
    const unsubscribe = compactWarningStore.subscribe(listener)
    suppressCompactWarning()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  test('el listener NO dispara cuando el estado se fija al mismo valor (guard Object.is)', () => {
    // El store tiene un guard `Object.is(next, prev) → skip`. Evita
    // re-renders innecesarios cuando se fija un valor idéntico.
    suppressCompactWarning() // false → true (notificaría, pero aún no hay listener)
    const listener = mock(() => {})
    const unsubscribe = compactWarningStore.subscribe(listener)
    suppressCompactWarning() // true → true (sin cambio)
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })

  test('varios listeners disparan todos al cambiar el estado', () => {
    const a = mock(() => {})
    const b = mock(() => {})
    const c = mock(() => {})
    const unsubA = compactWarningStore.subscribe(a)
    const unsubB = compactWarningStore.subscribe(b)
    const unsubC = compactWarningStore.subscribe(c)
    suppressCompactWarning()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    expect(c).toHaveBeenCalledTimes(1)
    unsubA()
    unsubB()
    unsubC()
  })

  test('unsubscribe detiene a un listener de futuras notificaciones', () => {
    const listener = mock(() => {})
    const unsubscribe = compactWarningStore.subscribe(listener)
    suppressCompactWarning()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    clearCompactWarningSuppression()
    expect(listener).toHaveBeenCalledTimes(1) // sigue en 1
  })

  test('el listener dispara en ambas direcciones (suppress Y clear)', () => {
    const listener = mock(() => {})
    const unsubscribe = compactWarningStore.subscribe(listener)
    suppressCompactWarning() // false → true
    clearCompactWarningSuppression() // true → false
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  test('desuscribir un listener no afecta a los demás', () => {
    const a = mock(() => {})
    const b = mock(() => {})
    const unsubA = compactWarningStore.subscribe(a)
    const unsubB = compactWarningStore.subscribe(b)
    unsubA()
    suppressCompactWarning()
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
    unsubB()
  })
})
