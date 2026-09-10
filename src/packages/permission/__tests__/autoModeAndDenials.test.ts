/**
 * Tests de los tres módulos de estado puro: `autoModeDenials.ts`,
 * `autoModeState.ts`, `denialTracking.ts`.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { getAutoModeDenials, recordAutoModeDenial } from '../src/autoModeDenials.ts'
import {
  _resetForTesting,
  getAutoModeFlagCli,
  isAutoModeActive,
  isAutoModeCircuitBroken,
  setAutoModeActive,
  setAutoModeCircuitBroken,
  setAutoModeFlagCli,
} from '../src/autoModeState.ts'
import {
  DENIAL_LIMITS,
  createDenialTrackingState,
  recordDenial,
  recordSuccess,
  shouldFallbackToPrompting,
} from '../src/denialTracking.ts'

describe('autoModeDenials', () => {
  test('sin TRANSCRIPT_CLASSIFIER, recordAutoModeDenial es un no-op', () => {
    const before = getAutoModeDenials().length
    recordAutoModeDenial({
      toolName: 'Bash',
      display: 'rm -rf /',
      reason: 'dangerous',
      timestamp: Date.now(),
    })
    // El feature-flag está OFF en este árbol (sin build ANT que lo
    // encienda) — el guard `if (!feature(...)) return` de la fuente hace
    // que la lista nunca crezca aquí.
    expect(getAutoModeDenials().length).toBe(before)
  })
})

describe('autoModeState', () => {
  beforeEach(() => {
    _resetForTesting()
  })

  test('estado inicial: todo apagado', () => {
    expect(isAutoModeActive()).toBe(false)
    expect(getAutoModeFlagCli()).toBe(false)
    expect(isAutoModeCircuitBroken()).toBe(false)
  })

  test('los setters mutan sólo su propio flag', () => {
    setAutoModeActive(true)
    expect(isAutoModeActive()).toBe(true)
    expect(getAutoModeFlagCli()).toBe(false)

    setAutoModeFlagCli(true)
    expect(getAutoModeFlagCli()).toBe(true)

    setAutoModeCircuitBroken(true)
    expect(isAutoModeCircuitBroken()).toBe(true)
  })

  test('_resetForTesting apaga los tres flags', () => {
    setAutoModeActive(true)
    setAutoModeFlagCli(true)
    setAutoModeCircuitBroken(true)
    _resetForTesting()
    expect(isAutoModeActive()).toBe(false)
    expect(getAutoModeFlagCli()).toBe(false)
    expect(isAutoModeCircuitBroken()).toBe(false)
  })
})

describe('denialTracking', () => {
  test('createDenialTrackingState arranca en cero', () => {
    expect(createDenialTrackingState()).toEqual({
      consecutiveDenials: 0,
      totalDenials: 0,
    })
  })

  test('recordDenial incrementa ambos contadores', () => {
    let state = createDenialTrackingState()
    state = recordDenial(state)
    expect(state).toEqual({ consecutiveDenials: 1, totalDenials: 1 })
    state = recordDenial(state)
    expect(state).toEqual({ consecutiveDenials: 2, totalDenials: 2 })
  })

  test('recordSuccess resetea sólo las consecutivas, no el total', () => {
    let state = createDenialTrackingState()
    state = recordDenial(state)
    state = recordDenial(state)
    state = recordSuccess(state)
    expect(state).toEqual({ consecutiveDenials: 0, totalDenials: 2 })
  })

  test('recordSuccess sin denegaciones previas devuelve el MISMO objeto', () => {
    const state = createDenialTrackingState()
    expect(recordSuccess(state)).toBe(state)
  })

  test('shouldFallbackToPrompting — umbral de consecutivas', () => {
    let state = createDenialTrackingState()
    for (let i = 0; i < DENIAL_LIMITS.maxConsecutive - 1; i++) {
      state = recordDenial(state)
      expect(shouldFallbackToPrompting(state)).toBe(false)
    }
    state = recordDenial(state)
    expect(shouldFallbackToPrompting(state)).toBe(true)
  })

  test('shouldFallbackToPrompting — umbral de totales, con éxitos intercalados', () => {
    let state = createDenialTrackingState()
    for (let i = 0; i < DENIAL_LIMITS.maxTotal; i++) {
      state = recordDenial(state)
      state = recordSuccess(state) // nunca deja subir las consecutivas
    }
    expect(state.consecutiveDenials).toBe(0)
    expect(state.totalDenials).toBe(DENIAL_LIMITS.maxTotal)
    expect(shouldFallbackToPrompting(state)).toBe(true)
  })
})
