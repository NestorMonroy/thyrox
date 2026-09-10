// ══════════════════════════════════════════════════════════════════
// restored-src/src/services/api/dumpPrompts.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 12
// Mencionado en: part7/ch29.md
// ══════════════════════════════════════════════════════════════════

// ─── part7/ch29.md · líneas 146-167 ───
export function createDumpPromptsFetch(
  agentIdOrSessionId: string,
): ClientOptions['fetch'] {
  const filePath = getDumpPromptsPath(agentIdOrSessionId)
  return async (input, init?) => {
    // ...
    // Defer so it doesn't block the actual API call —
    // this is debug tooling for /issue, not on the critical path.
    setImmediate(dumpRequest, init.body as string, timestamp, state, filePath)
    // ...
  }
}
