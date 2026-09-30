import { afterEach, describe, expect, test } from 'bun:test'
import {
  SPARE_REFILL_MIN_GAP_MS,
  _resetSparePoolForTest,
  claimSpare,
  clearSpare,
  enableSparePool,
  getSpareSlot,
  isSparePoolEnabled,
  markSpareReady,
  recordSpareExit,
  recordSpareSpawn,
  setPrewarmInFlight,
  shouldPrewarm,
} from '../sparePool.js'

afterEach(() => _resetSparePoolForTest())

describe('sparePool gate', () => {
  test('disabled by default', () => {
    expect(isSparePoolEnabled()).toBe(false)
  })

  test('enableSparePool flips the gate', () => {
    enableSparePool()
    expect(isSparePoolEnabled()).toBe(true)
  })

  test('enableSparePool is idempotent', () => {
    enableSparePool()
    enableSparePool()
    expect(isSparePoolEnabled()).toBe(true)
  })
})

describe('claimSpare', () => {
  test('returns no-spare when disabled', () => {
    const r = claimSpare('/cwd')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no-spare')
  })

  test('returns no-spare when slot empty', () => {
    enableSparePool()
    const r = claimSpare('/cwd')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no-spare')
  })

  test('returns not-ready when slot exists but worker not booted', () => {
    enableSparePool()
    recordSpareSpawn('abc12345', '/cwd', 'sess-1', '/tmp/sock')
    const r = claimSpare('/cwd')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('not-ready')
  })

  test('returns cwd-mismatch when ready slot has different cwd', () => {
    enableSparePool()
    recordSpareSpawn('abc12345', '/spare/cwd', 'sess-1', '/tmp/sock')
    markSpareReady('abc12345')
    const r = claimSpare('/wrong/cwd')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('cwd-mismatch')
  })

  test('claims successfully when ready + cwd matches', () => {
    enableSparePool()
    recordSpareSpawn('abc12345', '/cwd', 'sess-1', '/tmp/sock')
    markSpareReady('abc12345')
    const r = claimSpare('/cwd')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.short).toBe('abc12345')
      expect(r.sessionId).toBe('sess-1')
      expect(r.ptySocket).toBe('/tmp/sock')
      // ant 4644.js I9n genera un claimAuth de 16 bytes hex por repuesto;
      // claimSpare lo entrega para que el emisor arme la trama con `auth`.
      expect(r.claimAuth).toMatch(/^[0-9a-f]{32}$/)
    }
    // Slot consumed.
    expect(getSpareSlot()).toBe(null)
  })

  test('claimAuth explícito (pasado por el llamador) se respeta tal cual', () => {
    enableSparePool()
    recordSpareSpawn('abc12345', '/cwd', 'sess-1', '/tmp/sock', 'fixed-auth')
    markSpareReady('abc12345')
    const r = claimSpare('/cwd')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.claimAuth).toBe('fixed-auth')
  })
})

describe('recordSpareSpawn', () => {
  test('returns false when disabled', () => {
    expect(recordSpareSpawn('a', '/c', 's', '/t')).toBe(false)
  })

  test('returns true on first record when enabled', () => {
    enableSparePool()
    expect(recordSpareSpawn('a', '/c', 's', '/t')).toBe(true)
  })

  test('returns false on second record (single-slot)', () => {
    enableSparePool()
    recordSpareSpawn('a', '/c', 's1', '/t1')
    expect(recordSpareSpawn('b', '/c', 's2', '/t2')).toBe(false)
  })

  test('clearSpare frees the slot for next spawn', () => {
    enableSparePool()
    recordSpareSpawn('a', '/c', 's1', '/t1')
    clearSpare()
    expect(recordSpareSpawn('b', '/c', 's2', '/t2')).toBe(true)
  })
})

describe('markSpareReady', () => {
  test('flips ready flag', () => {
    enableSparePool()
    recordSpareSpawn('a', '/c', 's1', '/t1')
    expect(getSpareSlot()?.ready).toBe(false)
    markSpareReady('a')
    expect(getSpareSlot()?.ready).toBe(true)
  })

  test('no-op for wrong short', () => {
    enableSparePool()
    recordSpareSpawn('a', '/c', 's1', '/t1')
    markSpareReady('different')
    expect(getSpareSlot()?.ready).toBe(false)
  })
})

describe('shouldPrewarm', () => {
  test('false when disabled', () => {
    expect(shouldPrewarm()).toBe(false)
  })

  test('true when enabled + no slot + no in-flight', () => {
    enableSparePool()
    expect(shouldPrewarm()).toBe(true)
  })

  test('false when slot exists', () => {
    enableSparePool()
    recordSpareSpawn('a', '/c', 's1', '/t1')
    expect(shouldPrewarm()).toBe(false)
  })

  test('false when prewarm in flight', () => {
    enableSparePool()
    setPrewarmInFlight(true)
    expect(shouldPrewarm()).toBe(false)
  })

  test('true again after clear + setPrewarmInFlight(false)', () => {
    enableSparePool()
    recordSpareSpawn('a', '/c', 's1', '/t1')
    expect(shouldPrewarm()).toBe(false)
    clearSpare()
    expect(shouldPrewarm()).toBe(true)
  })
})

describe('recordSpareExit + SPARE_REFILL_MIN_GAP_MS (ant 4644.js cr, min-gap de refill tras un exit)', () => {
  test('false justo tras un exit, true una vez pasado el hueco mínimo', () => {
    enableSparePool()
    recordSpareExit(1_000)
    expect(shouldPrewarm(1_000)).toBe(false)
    expect(shouldPrewarm(1_000 + SPARE_REFILL_MIN_GAP_MS - 1)).toBe(false)
    expect(shouldPrewarm(1_000 + SPARE_REFILL_MIN_GAP_MS)).toBe(true)
  })

  test('un slot existente sigue ganando aunque el hueco ya haya pasado', () => {
    enableSparePool()
    recordSpareExit(1_000)
    recordSpareSpawn('a', '/c', 's1', '/t1')
    expect(shouldPrewarm(1_000 + SPARE_REFILL_MIN_GAP_MS)).toBe(false)
  })
})
