// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/permissions/permissionSetup.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 4 · líneas de código: 52
// Mencionado en: part1/ch04b.md
// ══════════════════════════════════════════════════════════════════

// ─── part5/ch16.md · líneas 94-107 ───
export function isDangerousBashPermission(
  toolName: string,
  ruleContent: string | undefined,
): boolean {
  if (toolName !== BASH_TOOL_NAME) { return false }
  if (ruleContent === undefined || ruleContent === '') { return true }
  const content = ruleContent.trim().toLowerCase()
  if (content === '*') { return true }
  // ...check DANGEROUS_BASH_PATTERNS
}

// ─── ausente: líneas 108-1461 (1354 líneas sin fragmento en el corpus) ───

// ─── part1/ch04b.md · líneas 1462-1492 ───
export function prepareContextForPlanMode(
  context: ToolPermissionContext,
): ToolPermissionContext {
  const currentMode = context.mode
  if (currentMode === 'plan') return context
  if (feature('TRANSCRIPT_CLASSIFIER')) {
    const planAutoMode = shouldPlanUseAutoMode()
    if (currentMode === 'auto') {
      if (planAutoMode) {
        return { ...context, prePlanMode: 'auto' }
      }
      // ... deactivate auto mode and restore permissions stripped by auto
    }
    if (planAutoMode && currentMode !== 'bypassPermissions') {
      autoModeStateModule?.setAutoModeActive(true)
      return {
        ...stripDangerousPermissionsForAutoMode(context),
        prePlanMode: currentMode,
      }
    }
  }
  return { ...context, prePlanMode: currentMode }
}

// ─── part1/ch04b.md · líneas 1469-1486 ───
if (currentMode === 'auto') {
  if (planAutoMode) {
    // Keep auto active → classifier continues working during plan
    return { ...context, prePlanMode: 'auto' }
  }
  // Deactivate auto → strip dangerous permissions
  // ...
}

// ─── ausente: líneas 1487-1501 (15 líneas sin fragmento en el corpus) ───

// ─── part1/ch04b.md · líneas 1502-1517 ───
export function transitionPlanAutoMode(
  context: ToolPermissionContext,
): ToolPermissionContext {
  if (context.mode !== 'plan') return context
  // Plan entered from bypassPermissions doesn't allow auto activation
  if (context.prePlanMode === 'bypassPermissions') return context
  
  const want = shouldPlanUseAutoMode()
  const have = autoModeStateModule?.isAutoModeActive() ?? false
  // Activate or deactivate auto based on want/have
}
