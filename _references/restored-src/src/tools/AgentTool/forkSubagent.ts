// ══════════════════════════════════════════════════════════════════
// restored-src/src/tools/AgentTool/forkSubagent.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 18
// Mencionado en: part2/ch06.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch20.md · líneas 32-39 ───
export function isForkSubagentEnabled(): boolean {
  if (feature('FORK_SUBAGENT')) {
    if (isCoordinatorMode()) return false
    if (getIsNonInteractiveSession()) return false
    return true
  }
  return false
}

// ─── ausente: líneas 40-59 (20 líneas sin fragmento en el corpus) ───

// ─── part6/ch20.md · líneas 60-71 ───
export const FORK_AGENT = {
  agentType: FORK_SUBAGENT_TYPE,
  tools: ['*'],
  maxTurns: 200,
  model: 'inherit',
  permissionMode: 'bubble',
  source: 'built-in',
  baseDir: 'built-in',
  getSystemPrompt: () => '',  // Not used -- inherits parent's system prompt
} satisfies BuiltInAgentDefinition
