// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/compact/autoCompact.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 9 · líneas de código: 79
// Mencionado en: appendix/f-e2e-traces.md, part7/ch25.md, part7/ch26.md, part7/ch28.md, part7/ch30.md
// ══════════════════════════════════════════════════════════════════

// ─── part3/ch09.md · líneas 30 ───
const MAX_OUTPUT_TOKENS_FOR_SUMMARY = 20_000

// services/compact/autoCompact.ts:33-48
export function getEffectiveContextWindowSize(model: string): number {
  const reservedTokensForSummary = Math.min(
    getMaxOutputTokensForModel(model),
    MAX_OUTPUT_TOKENS_FOR_SUMMARY,
  )
  let contextWindow = getContextWindowForModel(model, getSdkBetas())

  const autoCompactWindow = process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW
  if (autoCompactWindow) {
    const parsed = parseInt(autoCompactWindow, 10)
    if (!isNaN(parsed) && parsed > 0) {
      contextWindow = Math.min(contextWindow, parsed)
    }
  }

  return contextWindow - reservedTokensForSummary
}

// ─── ausente: líneas 31-39 (9 líneas sin fragmento en el corpus) ───

// ─── part3/ch09.md · líneas 40-46 ───
const autoCompactWindow = process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW
if (autoCompactWindow) {
  const parsed = parseInt(autoCompactWindow, 10)
  if (!isNaN(parsed) && parsed > 0) {
    contextWindow = Math.min(contextWindow, parsed)
  }
}

// ─── ausente: líneas 47-50 (4 líneas sin fragmento en el corpus) ───

// ─── part3/ch09.md · líneas 51-60 ───
export type AutoCompactTrackingState = {
  compacted: boolean
  turnCounter: number
  turnId: string
  consecutiveFailures?: number  // Circuit breaker counter
}

// ─── ausente: líneas 61-61 (1 líneas sin fragmento en el corpus) ───

// ─── part3/ch09.md · líneas 62 ───
export const AUTOCOMPACT_BUFFER_TOKENS = 13_000

// services/compact/autoCompact.ts:72-91
export function getAutoCompactThreshold(model: string): number {
  const effectiveContextWindow = getEffectiveContextWindowSize(model)
  const autocompactThreshold =
    effectiveContextWindow - AUTOCOMPACT_BUFFER_TOKENS

  const envPercent = process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
  if (envPercent) {
    const parsed = parseFloat(envPercent)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      const percentageThreshold = Math.floor(
        effectiveContextWindow * (parsed / 100),
      )
      return Math.min(percentageThreshold, autocompactThreshold)
    }
  }

  return autocompactThreshold
}

// ─── ausente: líneas 63-66 (4 líneas sin fragmento en el corpus) ───

// ─── part7/ch30.md · líneas 67-70 ───
// Stop trying autocompact after this many consecutive failures.
// BQ 2026-03-10: 1,279 sessions had 50+ consecutive failures (up to 3,272)
// in a single session, wasting ~250K API calls/day globally.
const MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3

// ─── part3/ch09.md · líneas 70 ───
const MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3

// ─── ausente: líneas 71-78 (8 líneas sin fragmento en el corpus) ───

// ─── part3/ch09.md · líneas 79-87 ───
const envPercent = process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
if (envPercent) {
  const parsed = parseFloat(envPercent)
  if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
    const percentageThreshold = Math.floor(
      effectiveContextWindow * (parsed / 100),
    )
    return Math.min(percentageThreshold, autocompactThreshold)
  }
}

// ─── ausente: líneas 88-178 (91 líneas sin fragmento en el corpus) ───

// ─── part6/ch23.md · líneas 179 ───
if (feature('CONTEXT_COLLAPSE')) { ... }

// services/compact/autoCompact.ts:215
if (feature('CONTEXT_COLLAPSE')) { ... }

// ─── ausente: líneas 180-256 (77 líneas sin fragmento en el corpus) ───

// ─── part3/ch09.md · líneas 257-265 ───
if (
  tracking?.consecutiveFailures !== undefined &&
  tracking.consecutiveFailures >= MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES
) {
  return { wasCompacted: false }
}
