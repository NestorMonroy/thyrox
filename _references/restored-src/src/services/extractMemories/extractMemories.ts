// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/extractMemories/extractMemories.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 16
// Mencionado en: part6/ch24.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch24.md · líneas 121-148 ───
function hasMemoryWritesSince(
  messages: Message[],
  sinceUuid: string | undefined,
): boolean {
  // ... checks assistant messages for Edit/Write tool calls targeting autoMemPath
}

// ─── ausente: líneas 149-376 (228 líneas sin fragmento en el corpus) ───

// ─── part6/ch24.md · líneas 377-385 ───
if (!isTrailingRun) {
  turnsSinceLastExtraction++
  if (
    turnsSinceLastExtraction <
    (getFeatureValue_CACHED_MAY_BE_STALE('tengu_bramble_lintel', null) ?? 1)
  ) {
    return
  }
}
turnsSinceLastExtraction = 0
