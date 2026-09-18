import { describe, expect, test } from 'bun:test'
import {
  createDenialTrackingState,
  DENIAL_LIMITS,
  recordDenial,
  recordSuccess,
  shouldFallbackToPrompting,
} from '../denialTracking.js'

describe('createDenialTrackingState', () => {
  test('starts with zero counters', () => {
    const s = createDenialTrackingState()
    expect(s.consecutiveDenials).toBe(0)
    expect(s.totalDenials).toBe(0)
  })
})

describe('recordDenial', () => {
  test('increments both counters', () => {
    const s1 = createDenialTrackingState()
    const s2 = recordDenial(s1)
    expect(s2.consecutiveDenials).toBe(1)
    expect(s2.totalDenials).toBe(1)
  })
  test('returns a new object (immutability)', () => {
    const s1 = createDenialTrackingState()
    const s2 = recordDenial(s1)
    expect(s2).not.toBe(s1)
    expect(s1.consecutiveDenials).toBe(0) // original unchanged
  })
  test('multiple denials accumulate', () => {
    let s = createDenialTrackingState()
    for (let i = 0; i < 5; i++) s = recordDenial(s)
    expect(s.consecutiveDenials).toBe(5)
    expect(s.totalDenials).toBe(5)
  })
})

describe('recordSuccess', () => {
  test('resets consecutiveDenials but preserves totalDenials', () => {
    let s = createDenialTrackingState()
    s = recordDenial(s)
    s = recordDenial(s)
    s = recordSuccess(s)
    expect(s.consecutiveDenials).toBe(0)
    expect(s.totalDenials).toBe(2)
  })
  test('returns same reference when consecutiveDenials is already 0 (perf optimization)', () => {
    const s = createDenialTrackingState()
    expect(recordSuccess(s)).toBe(s)
  })
})

describe('shouldFallbackToPrompting', () => {
  test('false at zero', () => {
    expect(shouldFallbackToPrompting(createDenialTrackingState())).toBe(false)
  })
  test('true at consecutive limit', () => {
    let s = createDenialTrackingState()
    for (let i = 0; i < DENIAL_LIMITS.maxConsecutive; i++) {
      s = recordDenial(s)
    }
    expect(shouldFallbackToPrompting(s)).toBe(true)
  })
  test('false just below consecutive limit', () => {
    let s = createDenialTrackingState()
    for (let i = 0; i < DENIAL_LIMITS.maxConsecutive - 1; i++) {
      s = recordDenial(s)
    }
    expect(shouldFallbackToPrompting(s)).toBe(false)
  })
  test('total limit triggers even after consecutive reset', () => {
    // El patron: denegar 3, tener exito (lo que reinicia el consecutivo),
    // denegar 17 más. total = 20, consecutive = 17: debería caer de vuelta
    // igualmente por el total. Pero maxConsecutive = 3, así que consecutive=17
    // También dispara; se busca alcanzar el total sin cruzar el consecutivo.
    let s = createDenialTrackingState()
    for (let cycle = 0; cycle < 10; cycle++) {
      // 2 denegaciones por ciclo y luego un exito: el consecutivo se queda
      // en 0.
      s = recordDenial(s)
      s = recordDenial(s)
      s = recordSuccess(s)
    }
    // Tras 10 ciclos: total=20, consecutive=0.
    expect(s.consecutiveDenials).toBe(0)
    expect(s.totalDenials).toBe(20)
    expect(shouldFallbackToPrompting(s)).toBe(true)
  })
})

describe('DENIAL_LIMITS', () => {
  test('declared as const (compile-time invariant)', () => {
    // Forma con const assertion: los valores quedan fijos al cargar el
    // módulo.
    expect(DENIAL_LIMITS.maxConsecutive).toBeGreaterThan(0)
    expect(DENIAL_LIMITS.maxTotal).toBeGreaterThan(DENIAL_LIMITS.maxConsecutive)
  })
})
