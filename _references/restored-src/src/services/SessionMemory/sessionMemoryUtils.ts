// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/SessionMemory/sessionMemoryUtils.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 5
// Mencionado en: part6/ch24.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch24.md · líneas 32-36 ───
export const DEFAULT_SESSION_MEMORY_CONFIG: SessionMemoryConfig = {
  minimumMessageTokensToInit: 10000,   // First trigger: 10K tokens
  minimumTokensBetweenUpdate: 5000,    // Update interval: 5K tokens
  toolCallsBetweenUpdates: 3,          // Minimum tool calls: 3
}
