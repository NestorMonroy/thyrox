// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/planModeV2.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 20
// Mencionado en: part1/ch04b.md
// ══════════════════════════════════════════════════════════════════

// ─── part1/ch04b.md · líneas 5-29 ───
export function getPlanModeV2AgentCount(): number {
  // Environment variable override
  if (process.env.CLAUDE_CODE_PLAN_V2_AGENT_COUNT) { /* ... */ }
  // Max 20x subscription → 3 agents
  if (subscriptionType === 'max' && rateLimitTier === 'default_claude_max_20x') return 3
  // Enterprise/Team → 3 agents
  if (subscriptionType === 'enterprise' || subscriptionType === 'team') return 3
  // Others → 1 agent
  return 1
}

// ─── ausente: líneas 30-65 (36 líneas sin fragmento en el corpus) ───

// ─── part1/ch04b.md · líneas 66-95 ───
// Baseline (control, 14d ending 2026-03-02, N=26.3M):
//   p50 4,906 chars | p90 11,617 | mean 6,207 | 82% Opus 4.6
//   Reject rate monotonic with size: 20% at <2K → 50% at 20K+
//
// Primary: session-level Avg Cost
export function getPewterLedgerVariant(): PewterLedgerVariant {
  const raw = getFeatureValue_CACHED_MAY_BE_STALE('tengu_pewter_ledger', null)
  if (raw === 'trim' || raw === 'cut' || raw === 'cap') return raw
  return null
}
