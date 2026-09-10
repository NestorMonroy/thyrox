// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/billing.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 10
// Mencionado en: appendix/g-auth-subscription.md
// ══════════════════════════════════════════════════════════════════

// ─── appendix/g-auth-subscription.md · líneas sin rango declarado ───
// Console billing access
function hasConsoleBillingAccess(): boolean {
  // Requires: non-subscription user + admin or billing role
}

// Claude.ai billing access
function hasClaudeAiBillingAccess(): boolean {
  // Max/Pro automatically have access
  // Team/Enterprise require admin, billing, owner, or primary_owner
}
