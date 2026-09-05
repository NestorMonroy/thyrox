// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/tasks.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 12
// Mencionado en: appendix/f-e2e-traces.md
// ══════════════════════════════════════════════════════════════════

// ─── appendix/f-e2e-traces.md · líneas sin rango declarado ───
{
  id: "auth",
  status: "pending",
  blocks: ["integration-test"],
  blockedBy: [],
}
{
  id: "integration-test",
  status: "pending",
  blocks: [],
  blockedBy: ["auth", "payment"],
}
