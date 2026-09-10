// ══════════════════════════════════════════════════════════════════
// restored-src/src/tools/EnterPlanModeTool/prompt.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 5
// Mencionado en: part1/ch04b.md
// ══════════════════════════════════════════════════════════════════

// ─── part1/ch04b.md · líneas 166-170 ───
export function getEnterPlanModeToolPrompt(): string {
  return process.env.USER_TYPE === 'ant'
    ? getEnterPlanModeToolPromptAnt()
    : getEnterPlanModeToolPromptExternal()
}
