// ══════════════════════════════════════════════════════════════════
// restored-src/src/constants/systemPromptSections.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 13
// Mencionado en: part2/ch05.md, part7/ch30.md
// ══════════════════════════════════════════════════════════════════

// ─── part7/ch30.md · líneas 20-24 ───
export function systemPromptSection(
  name: string,
  compute: ComputeFn,
): SystemPromptSection {
  return { name, compute, cacheBreak: false }
}

// ─── ausente: líneas 25-31 (7 líneas sin fragmento en el corpus) ───

// ─── part7/ch30.md · líneas 32-38 ───
export function DANGEROUS_uncachedSystemPromptSection(
  name: string,
  compute: ComputeFn,
  _reason: string,
): SystemPromptSection {
  return { name, compute, cacheBreak: true }
}
