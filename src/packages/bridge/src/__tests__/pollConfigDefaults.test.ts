/**
 * Puerto fiel de
 * `ccnmt: packages/bridge/src/__tests__/pollConfigDefaults.test.ts`
 * (127 líneas fuente, 100% portado). Sin mocks — `DEFAULT_POLL_CONFIG`
 * es una constante sin dependencias.
 */
import { describe, expect, test } from 'bun:test'
import { DEFAULT_POLL_CONFIG } from '../pollConfigDefaults.js'

describe('DEFAULT_POLL_CONFIG — anclado contra restricciones operacionales', () => {
  // Los valores de este snapshot están atados a TTLs del lado servidor
  // documentados y a decisiones de margen operacional. Si algún valor
  // cambia, ops debe verificar contra:
  //
  //   - BRIDGE_LAST_POLL_TTL (expiración de clave Redis de 4h)
  //   - max_poll_stale_seconds (gate de salud de 24h)
  //   - work_service.py:24 (umbral de reclamo)
  //   - el TTL de heartbeat de 300s del servidor
  //
  // Mantener estas constantes en snapshot atrapa PRs de "ajusta esta
  // perilla para el test" que se envían sin revisión de ops.

  test('not-at-capacity poll = 2 seconds', () => {
    expect(DEFAULT_POLL_CONFIG.poll_interval_ms_not_at_capacity).toBe(2000)
  })

  test('at-capacity poll = 10 minutes (600,000 ms)', () => {
    expect(DEFAULT_POLL_CONFIG.poll_interval_ms_at_capacity).toBe(600_000)
  })

  test('non_exclusive_heartbeat_interval_ms = 0 (disabled by default)', () => {
    expect(DEFAULT_POLL_CONFIG.non_exclusive_heartbeat_interval_ms).toBe(0)
  })

  test('reclaim_older_than_ms = 5000 (matches server constant)', () => {
    expect(DEFAULT_POLL_CONFIG.reclaim_older_than_ms).toBe(5000)
  })

  test('session_keepalive_interval_v2_ms = 2 minutes', () => {
    expect(DEFAULT_POLL_CONFIG.session_keepalive_interval_v2_ms).toBe(120_000)
  })
})

describe('DEFAULT_POLL_CONFIG — multisession defaults match single-session', () => {
  test('multisession not-at-capacity == single-session not-at-capacity', () => {
    expect(
      DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_not_at_capacity,
    ).toBe(DEFAULT_POLL_CONFIG.poll_interval_ms_not_at_capacity)
  })

  test('multisession partial-capacity == not-at-capacity (no separate tier yet)', () => {
    expect(
      DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_partial_capacity,
    ).toBe(DEFAULT_POLL_CONFIG.poll_interval_ms_not_at_capacity)
  })

  test('multisession at-capacity == single-session at-capacity', () => {
    expect(DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_at_capacity).toBe(
      DEFAULT_POLL_CONFIG.poll_interval_ms_at_capacity,
    )
  })
})

describe('DEFAULT_POLL_CONFIG — relative ordering invariants', () => {
  test('at-capacity poll is much SLOWER than not-at-capacity', () => {
    expect(DEFAULT_POLL_CONFIG.poll_interval_ms_at_capacity).toBeGreaterThan(
      DEFAULT_POLL_CONFIG.poll_interval_ms_not_at_capacity,
    )
  })

  test('keepalive interval << at-capacity poll interval', () => {
    expect(DEFAULT_POLL_CONFIG.session_keepalive_interval_v2_ms).toBeLessThan(
      DEFAULT_POLL_CONFIG.poll_interval_ms_at_capacity,
    )
  })

  test('reclaim threshold is sub-second-scale (< 30s)', () => {
    expect(DEFAULT_POLL_CONFIG.reclaim_older_than_ms).toBeLessThan(30_000)
  })
})

describe('PollIntervalConfig — type contract', () => {
  test('all 8 documented fields are present', () => {
    const keys = Object.keys(DEFAULT_POLL_CONFIG).sort()
    expect(keys).toEqual([
      'multisession_poll_interval_ms_at_capacity',
      'multisession_poll_interval_ms_not_at_capacity',
      'multisession_poll_interval_ms_partial_capacity',
      'non_exclusive_heartbeat_interval_ms',
      'poll_interval_ms_at_capacity',
      'poll_interval_ms_not_at_capacity',
      'reclaim_older_than_ms',
      'session_keepalive_interval_v2_ms',
    ])
  })

  test('all values are non-negative integers (ms count)', () => {
    for (const value of Object.values(DEFAULT_POLL_CONFIG)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(value)).toBe(true)
    }
  })
})
