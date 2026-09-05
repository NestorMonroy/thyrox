// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/hooks/skillImprovement.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 12
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch22.md · líneas 84-87 ───
const userCount = count(context.messages, m => m.type === 'user')
if (userCount - lastAnalyzedCount < TURN_BATCH_SIZE) {
  return false
}

// ─── ausente: líneas 88-175 (88 líneas sin fragmento en el corpus) ───

// ─── part6/ch22.md · líneas 176-181 ───
export function initSkillImprovement(): void {
  if (
    feature('SKILL_IMPROVEMENT') &&
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_copper_panda', false)
  ) {
    registerPostSamplingHook(createSkillImprovementHook())
  }
}
