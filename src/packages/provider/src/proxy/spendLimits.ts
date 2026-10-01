/**
 * Topes de gasto y cabeceras de límite unificado — porte de la pasarela del
 * ejecutable 2.1.283, `chunk-wg7ts4cy.js`: `Y$` [1066384), `Ine` [1085816),
 * `Ane` [1085832), `Tne` [1086064), `Cne` [1086237) y el cierre `p` de `hD`
 * [1083825).
 *
 * El almacén que da `spent_cents` (Postgres en la fuente) queda fuera: estas
 * funciones reciben el gasto medido y deciden, como hace la pasarela.
 */

export type SpendPeriod = 'monthly' | 'daily' | 'weekly'

export type SpendCap = {
  cap_cents: number | string
  spent_cents: number
  period: SpendPeriod
  scope_type: string
}

export type SpendCapState = SpendCap & { exceeded: boolean; utilization: number; resetsAt: Date }

/** `Ine`: umbrales de aviso, de mayor a menor. */
export const WARNING_THRESHOLDS = [0.95, 0.75] as const

/** `Y$`: el siguiente reinicio del periodo en UTC; la semana acaba el lunes. */
export function periodResetAt(period: SpendPeriod | string, now: Date = new Date()): Date {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()
  if (period === 'monthly') return new Date(Date.UTC(y, m + 1, 1))
  if (period === 'daily') return new Date(Date.UTC(y, m, d + 1))
  const daysToMonday = 8 - (now.getUTCDay() || 7)
  return new Date(Date.UTC(y, m, d + daysToMonday))
}

/** `Tne`: el tope que manda entre dos. */
export function pickBindingCap(a: SpendCapState, b: SpendCapState): SpendCapState {
  if (a.exceeded !== b.exceeded) return a.exceeded ? a : b
  if (a.exceeded) return a.resetsAt.getTime() > b.resetsAt.getTime() ? a : b
  return a.utilization > b.utilization ? a : b
}

/** `Cne`: las cabeceras `anthropic-ratelimit-unified-*` del tope que manda. */
export function unifiedRateLimitHeaders(binding: SpendCapState, now: Date): Record<string, string> {
  const reset = String(Math.floor(binding.resetsAt.getTime() / 1000))
  const threshold = binding.exceeded ? 1 : WARNING_THRESHOLDS.find(t => binding.utilization > t)
  const status = binding.exceeded ? 'rejected' : threshold ? 'allowed_warning' : 'allowed'
  const rounded = Math.round(binding.utilization * 100) / 100
  const shown = binding.exceeded ? rounded : Math.min(rounded, 0.99)
  const headers: Record<string, string> = {
    'anthropic-ratelimit-unified-status': status,
    'anthropic-ratelimit-unified-reset': reset,
    'anthropic-ratelimit-unified-overage-reset': reset,
    'anthropic-ratelimit-unified-overage-utilization': String(shown),
  }
  if (threshold) headers['anthropic-ratelimit-unified-overage-surpassed-threshold'] = String(threshold)
  if (binding.exceeded) {
    headers['anthropic-ratelimit-unified-overage-period'] = binding.period
    headers['anthropic-ratelimit-unified-overage-disabled-reason'] = 'org_spend_cap_reached'
    headers['retry-after'] = String(Math.max(1, Math.ceil((binding.resetsAt.getTime() - now.getTime()) / 1000)))
  } else {
    headers['anthropic-ratelimit-unified-representative-claim'] = 'overage'
    headers['anthropic-ratelimit-unified-overage-status'] = status
  }
  return headers
}

/** `Ane`: evalúa todos los topes y compone las cabeceras del que manda. */
export function evaluateSpendCaps(
  caps: readonly SpendCap[],
  now: Date = new Date(),
): { binding: SpendCapState | null; headers: Record<string, string> } {
  let binding: SpendCapState | null = null
  for (const capRow of caps) {
    const limit = Number(capRow.cap_cents)
    const state: SpendCapState = {
      ...capRow,
      exceeded: capRow.spent_cents >= limit,
      utilization: limit > 0 ? capRow.spent_cents / limit : 1,
      resetsAt: periodResetAt(capRow.period, now),
    }
    binding = binding ? pickBindingCap(binding, state) : state
  }
  return { binding, headers: binding ? unifiedRateLimitHeaders(binding, now) : {} }
}

/** El cierre `p` de `hD`: la respuesta 429 que el cliente no reintenta. */
export function spendBlockedResponse(
  binding: SpendCapState | null,
  headers: Record<string, string>,
  blockedMessage?: string,
): Response {
  const base = binding
    ? `spend limit reached (${binding.period}; resets ${binding.resetsAt.toISOString().slice(0, 16).replace('T', ' ')} UTC)`
    : 'spend limit unavailable'
  const message = blockedMessage ? `${base} — ${blockedMessage}` : base
  return Response.json(
    { type: 'error', error: { type: 'billing_error', message } },
    { status: 429, headers: { ...headers, 'x-should-retry': 'false' } },
  )
}
