/**
 * Topes de gasto y cabeceras de límite unificado — contrato de la pasarela
 * 2.1.283 (`chunk-wg7ts4cy.js`: `Y$`, `Tne`, `Ane`, `Ine`, `Cne`, y el
 * cierre `p` de `hD`).
 */
import { describe, expect, test } from 'bun:test'
import {
  evaluateSpendCaps,
  periodResetAt,
  pickBindingCap,
  spendBlockedResponse,
  unifiedRateLimitHeaders,
  type SpendCapState,
} from '../src/proxy/spendLimits.js'

// Miércoles 2026-09-23 15:30 UTC.
const now = new Date(Date.UTC(2026, 8, 23, 15, 30))

describe('periodResetAt (Y$)', () => {
  test('mensual: el día 1 del mes siguiente', () => {
    expect(periodResetAt('monthly', now).toISOString()).toBe('2026-10-01T00:00:00.000Z')
  })
  test('diario: la medianoche siguiente', () => {
    expect(periodResetAt('daily', now).toISOString()).toBe('2026-09-24T00:00:00.000Z')
  })
  test('semanal: el lunes siguiente; un domingo cuenta como 7', () => {
    expect(periodResetAt('weekly', now).toISOString()).toBe('2026-09-28T00:00:00.000Z')
    expect(periodResetAt('weekly', new Date(Date.UTC(2026, 8, 27))).toISOString()).toBe('2026-09-28T00:00:00.000Z')
    expect(periodResetAt('weekly', new Date(Date.UTC(2026, 8, 28))).toISOString()).toBe('2026-10-05T00:00:00.000Z')
  })
})

const cap = (over: Partial<SpendCapState>): SpendCapState => ({
  cap_cents: 100,
  spent_cents: 0,
  period: 'monthly',
  scope_type: 'user',
  exceeded: false,
  utilization: 0,
  resetsAt: now,
  ...over,
})

describe('pickBindingCap (Tne)', () => {
  test('uno excedido gana a uno no excedido', () => {
    const a = cap({ exceeded: true })
    expect(pickBindingCap(cap({ utilization: 0.9 }), a)).toBe(a)
  })
  test('entre excedidos gana el que se reinicia más tarde', () => {
    const late = cap({ exceeded: true, resetsAt: new Date(now.getTime() + 2) })
    expect(pickBindingCap(cap({ exceeded: true }), late)).toBe(late)
  })
  test('entre no excedidos gana la mayor utilización; empate, el segundo', () => {
    const b = cap({ utilization: 0.5 })
    expect(pickBindingCap(cap({ utilization: 0.4 }), b)).toBe(b)
    const c = cap({ utilization: 0.4 })
    expect(pickBindingCap(cap({ utilization: 0.4 }), c)).toBe(c)
  })
})

describe('evaluateSpendCaps (Ane)', () => {
  test('sin topes: sin tope que mande ni cabeceras', () => {
    expect(evaluateSpendCaps([], now)).toEqual({ binding: null, headers: {} })
  })
  test('tope 0 cuenta utilización 1 y excedido', () => {
    const { binding } = evaluateSpendCaps(
      [{ cap_cents: 0, spent_cents: 0, period: 'daily', scope_type: 'org' }],
      now,
    )
    expect(binding?.exceeded).toBe(true)
    expect(binding?.utilization).toBe(1)
  })
})

describe('unifiedRateLimitHeaders (Cne)', () => {
  const reset = String(Math.floor(Date.UTC(2026, 9, 1) / 1000))
  test('permitido bajo el 75 %', () => {
    const { headers } = evaluateSpendCaps([{ cap_cents: 100, spent_cents: 10, period: 'monthly', scope_type: 'user' }], now)
    expect(headers).toEqual({
      'anthropic-ratelimit-unified-status': 'allowed',
      'anthropic-ratelimit-unified-reset': reset,
      'anthropic-ratelimit-unified-overage-reset': reset,
      'anthropic-ratelimit-unified-overage-utilization': '0.1',
      'anthropic-ratelimit-unified-representative-claim': 'overage',
      'anthropic-ratelimit-unified-overage-status': 'allowed',
    })
  })
  test('aviso al pasar un umbral: nombra el mayor superado', () => {
    const { headers } = evaluateSpendCaps([{ cap_cents: 100, spent_cents: 96, period: 'monthly', scope_type: 'user' }], now)
    expect(headers['anthropic-ratelimit-unified-status']).toBe('allowed_warning')
    expect(headers['anthropic-ratelimit-unified-overage-surpassed-threshold']).toBe('0.95')
  })
  test('sin exceder la utilización publicada se recorta a 0.99', () => {
    const headers = unifiedRateLimitHeaders(cap({ utilization: 0.999 }), now)
    expect(headers['anthropic-ratelimit-unified-overage-utilization']).toBe('0.99')
  })
  test('excedido: rejected, periodo, motivo y retry-after de al menos 1 s', () => {
    const headers = unifiedRateLimitHeaders(
      cap({ exceeded: true, utilization: 1.2345, period: 'daily', resetsAt: new Date(now.getTime() + 1500) }),
      now,
    )
    expect(headers).toEqual({
      'anthropic-ratelimit-unified-status': 'rejected',
      'anthropic-ratelimit-unified-reset': String(Math.floor((now.getTime() + 1500) / 1000)),
      'anthropic-ratelimit-unified-overage-reset': String(Math.floor((now.getTime() + 1500) / 1000)),
      'anthropic-ratelimit-unified-overage-utilization': '1.23',
      'anthropic-ratelimit-unified-overage-surpassed-threshold': '1',
      'anthropic-ratelimit-unified-overage-period': 'daily',
      'anthropic-ratelimit-unified-overage-disabled-reason': 'org_spend_cap_reached',
      'retry-after': '2',
    })
  })
})

describe('spendBlockedResponse (hD.p)', () => {
  test('tope excedido: 429 billing_error con el reinicio y sin reintento', async () => {
    const binding = cap({ exceeded: true, period: 'monthly', resetsAt: new Date(Date.UTC(2026, 9, 1)) })
    const res = spendBlockedResponse(binding, { 'retry-after': '5' }, 'pide más a tu admin')
    expect(res.status).toBe(429)
    expect(res.headers.get('x-should-retry')).toBe('false')
    expect(res.headers.get('retry-after')).toBe('5')
    expect(await res.json()).toEqual({
      type: 'error',
      error: {
        type: 'billing_error',
        message: 'spend limit reached (monthly; resets 2026-10-01 00:00 UTC) — pide más a tu admin',
      },
    })
  })
  test('sin tope (fallo del almacén): spend limit unavailable', async () => {
    const res = spendBlockedResponse(null, {})
    expect((await res.json()).error.message).toBe('spend limit unavailable')
  })
})
