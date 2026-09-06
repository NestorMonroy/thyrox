/**
 * Fachadas de session-id / cwd / presupuesto de tokens — porte de
 * `ccnmt: packages/agent/internal/sessionRuntime.ts`.
 *
 * `getCwdState` encadena tres niveles adrede: primero el cwd que el host
 * mantiene actualizado turno a turno (refleja un `/cd` reciente), luego el
 * cwd original de arranque, y sólo al final `process.cwd()`. Invertir el
 * orden serviría un directorio obsoleto tras un `cd` del propio turno.
 * `getOriginalCwd` no encadena — su semántica es "el de arranque", punto.
 */
import { getAgentHostBindings } from '../host.ts'

export function getSessionId(): string {
  return getAgentHostBindings().getSessionId?.() ?? 'unknown'
}

export function getSdkBetas(): string[] {
  return getAgentHostBindings().getSdkBetas?.() ?? []
}

export function getCurrentTurnTokenBudget(): number {
  return getAgentHostBindings().getCurrentTurnTokenBudget?.() ?? 0
}

export function getTurnOutputTokens(): number {
  return getAgentHostBindings().getTurnOutputTokens?.() ?? 0
}

export function incrementBudgetContinuationCount(): void {
  getAgentHostBindings().incrementBudgetContinuationCount?.()
}

export function getCwdState(): string {
  return (
    getAgentHostBindings().getCwdState?.() ??
    getAgentHostBindings().getOriginalCwd?.() ??
    process.cwd()
  )
}

export function setCwdState(cwd: string): void {
  getAgentHostBindings().setCwdState?.(cwd)
}

export function getOriginalCwd(): string {
  return getAgentHostBindings().getOriginalCwd?.() ?? process.cwd()
}

export function isSessionPersistenceDisabled(): boolean {
  return getAgentHostBindings().isSessionPersistenceDisabled?.() ?? false
}
