// ══════════════════════════════════════════════════════════════════
// restored-src/src/tools/AgentTool/AgentTool.tsx
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 5 · líneas de código: 21
// Mencionado en: appendix/f-e2e-traces.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch20.md · líneas 82-88 ───
const baseInputSchema = lazySchema(() => z.object({
  description: z.string().describe('A short (3-5 word) description of the task'),
  prompt: z.string().describe('The task for the agent to perform'),
  subagent_type: z.string().optional(),
  model: z.enum(['sonnet', 'opus', 'haiku']).optional(),
  run_in_background: z.boolean().optional()
}));

// ─── ausente: líneas 89-271 (183 líneas sin fragmento en el corpus) ───

// ─── part6/ch20b.md · líneas 272-274 ───
if (isTeammate() && teamName && name) {
  throw new Error('Teammates cannot spawn other teammates — the team roster is flat.');
}

// ─── ausente: líneas 275-321 (47 líneas sin fragmento en el corpus) ───

// ─── part6/ch20.md · líneas 322-323 ───
const effectiveType = subagent_type
  ?? (isForkSubagentEnabled() ? undefined : GENERAL_PURPOSE_AGENT.agentType);

// ─── ausente: líneas 324-331 (8 líneas sin fragmento en el corpus) ───

// ─── part6/ch20.md · líneas 332-334 ───
if (toolUseContext.options.querySource === `agent:builtin:${FORK_AGENT.agentType}`
    || isInForkChild(toolUseContext.messages)) {
  throw new Error('Fork is not available inside a forked worker.');
}

// ─── ausente: líneas 335-572 (238 líneas sin fragmento en el corpus) ───

// ─── part6/ch20.md · líneas 573-577 ───
const workerPermissionContext = {
  ...appState.toolPermissionContext,
  mode: selectedAgent.permissionMode ?? 'acceptEdits'
};
const workerTools = assembleToolPool(workerPermissionContext, appState.mcp.tools);
