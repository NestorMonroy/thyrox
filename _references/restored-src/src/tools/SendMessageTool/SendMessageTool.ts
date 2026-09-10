// ══════════════════════════════════════════════════════════════════
// restored-src/src/tools/SendMessageTool/SendMessageTool.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 16
// Mencionado en: part5/ch17b.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch20b.md · líneas 69-76 ───
to: z.string().describe(
  feature('UDS_INBOX')
    ? 'Recipient: teammate name, "*" for broadcast, "uds:<socket-path>" for a local peer, or "bridge:<session-id>" for a Remote Control peer'
    : 'Recipient: teammate name, or "*" for broadcast to all teammates',
),

// ─── ausente: líneas 77-584 (508 líneas sin fragmento en el corpus) ───

// ─── part5/ch17b.md · líneas 585-600 ───
if (feature('UDS_INBOX') && parseAddress(input.to).scheme === 'bridge') {
  return {
    behavior: 'ask' as const,
    message: `Send a message to Remote Control session ${input.to}?`,
    decisionReason: {
      type: 'safetyCheck',
      reason: 'Cross-machine bridge message requires explicit user consent',
      classifierApprovable: false,  // <- Key: ML classifier cannot auto-approve
    },
  }
}
