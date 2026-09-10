// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/tools/toolOrchestration.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 11
// Mencionado en: part1/ch04.md, part7/ch25.md
// ══════════════════════════════════════════════════════════════════

// ─── part7/ch25.md · líneas 98-108 ───
const isConcurrencySafe = parsedInput?.success
  ? (() => {
      try {
        return Boolean(tool?.isConcurrencySafe(parsedInput.data))
      } catch {
        // If isConcurrencySafe throws, treat as not concurrency-safe
        // to be conservative
        return false
      }
    })()
  : false
