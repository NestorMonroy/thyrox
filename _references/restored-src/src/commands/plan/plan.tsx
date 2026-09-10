// ══════════════════════════════════════════════════════════════════
// restored-src/src/commands/plan/plan.tsx
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 28
// Mencionado en: part1/ch04b.md
// ══════════════════════════════════════════════════════════════════

// ─── part1/ch04b.md · líneas 64-121 ───
export async function call(onDone, context, args) {
  const currentMode = appState.toolPermissionContext.mode
  
  // If not in plan mode, enable it
  if (currentMode !== 'plan') {
    handlePlanModeTransition(currentMode, 'plan')
    setAppState(prev => ({
      ...prev,
      toolPermissionContext: applyPermissionUpdate(
        prepareContextForPlanMode(prev.toolPermissionContext),
        { type: 'setMode', mode: 'plan', destination: 'session' },
      ),
    }))
    const description = args.trim()
    if (description && description !== 'open') {
      onDone('Enabled plan mode', { shouldQuery: true })  // with description → trigger query
    } else {
      onDone('Enabled plan mode')
    }
    return null
  }
  
  // Already in plan mode — show current plan or open in editor
  if (argList[0] === 'open') {
    const result = await editFileInEditor(planPath)
    // ...
  }
}
