// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/agentContext.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 19
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch20.md · líneas 24 ───
import { AsyncLocalStorage } from 'async_hooks'

// utils/agentContext.ts:93
const agentContextStorage = new AsyncLocalStorage<AgentContext>()

// utils/agentContext.ts:108-109
export function runWithAgentContext<T>(context: AgentContext, fn: () => T): T {
  return agentContextStorage.run(context, fn)
}

// ─── ausente: líneas 25-59 (35 líneas sin fragmento en el corpus) ───

// ─── part6/ch20b.md · líneas 60-85 ───
export type TeammateAgentContext = {
  agentId: string          // Full ID, e.g., "researcher@my-team"
  agentName: string        // Display name, e.g., "researcher"
  teamName: string         // Team membership
  agentColor?: string      // UI color
  planModeRequired: boolean // Whether plan approval is needed
  parentSessionId: string  // Leader's session ID
  isTeamLead: boolean      // Whether this is the Leader
  agentType: 'teammate'
}
