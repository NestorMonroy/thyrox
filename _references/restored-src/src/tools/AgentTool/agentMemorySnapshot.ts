// ══════════════════════════════════════════════════════════════════
// restored-src/src/tools/AgentTool/agentMemorySnapshot.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 14
// Mencionado en: part6/ch24.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch24.md · líneas 31-33 ───
export function getSnapshotDirForAgent(agentType: string): string {
  return join(getCwd(), '.claude', SNAPSHOT_BASE, agentType)
}

// ─── ausente: líneas 34-97 (64 líneas sin fragmento en el corpus) ───

// ─── part6/ch24.md · líneas 98-144 ───
export async function checkAgentMemorySnapshot(
  agentType: string,
  scope: AgentMemoryScope,
): Promise<{
  action: 'none' | 'initialize' | 'prompt-update'
  snapshotTimestamp?: string
}> {
  // No snapshot → 'none'
  // No local memory → 'initialize' (copy snapshot to local)
  // Snapshot newer → 'prompt-update' (prompt model to merge)
}
