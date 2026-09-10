/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/goal/index.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO; `isGoalCommandEnabled`/`GOAL_CONDITION_MAX_LENGTH`
 * (de `@thyrox/agent/goalStopHook.js`) y `getIsNonInteractiveSession`/
 * `getIsRemoteMode` (de `@thyrox/app-host/bootstrap/state.js`) pasan por
 * `internal/pendingCrossPackageDeps.ts` — ver ese archivo para el estado
 * de cada uno.
 *
 * Comando `/goal`. Expone DOS variantes bajo el mismo nombre `goal`:
 *   - `goalJsxCommand` (local-jsx) — REPL interactivo: muestra estado,
 *     limpia o fija la meta vía un `LocalJSXCommand` (`immediate:true`,
 *     no pasa por el pipeline normal de input de prompt).
 *   - `goalLocalCommand` (local) — despacho no-interactivo / modo remoto:
 *     devuelve un `LocalCommandResult`. `isHidden` es dinámico (visible
 *     sólo corriendo no-interactivo); `isEnabled` exige el feature flag Y
 *     (no-interactivo O workspace remoto).
 *
 * El comando queda habilitado por defecto (CLI local, sin GrowthBook).
 * `isGoalCommandEnabled()` es un kill-switch de emergencia sobre
 * `CLAUDE_CODE_DISABLE_GOAL`.
 */
import type { Command } from '../../runtime.js'
import {
  requireAgentGoalStopHook,
  requireAppHostBootstrapSessionMode,
} from '../../internal/pendingCrossPackageDeps.js'

/**
 * Divergencia declarada: la fuente hace
 * `export { GOAL_CONDITION_MAX_LENGTH } from '@claude-code-how-works/agent/goalStopHook.js'`
 * — un re-export ESTÁTICO. Aquí no puede serlo: `command-runtime` no
 * resuelve `@thyrox/agent` de forma estática (ver
 * `pendingCrossPackageDeps.ts`), y una constante evaluada en el cuerpo del
 * módulo llamaría al `require()` diferido EN CARGA, no en uso — justo lo
 * que el patrón diferido existe para evitar. Se expone como función.
 */
export function getGoalConditionMaxLength(): number {
  return requireAgentGoalStopHook().GOAL_CONDITION_MAX_LENGTH
}

const goalJsxCommand: Command = {
  type: 'local-jsx',
  name: 'goal',
  description: 'Set, pause, resume, or view a goal — keep working until it is met',
  argumentHint: '[<condition> | clear | pause | resume]',
  immediate: true,
  isEnabled: () => requireAgentGoalStopHook().isGoalCommandEnabled(),
  load: () => import('./goal.js'),
}

export default goalJsxCommand

export const goalLocalCommand: Command = {
  type: 'local',
  name: 'goal',
  supportsNonInteractive: true,
  description: 'Set, pause, resume, or view a goal — keep working until it is met',
  argumentHint: '[<condition> | clear | pause | resume]',
  // Visible sólo corriendo no-interactivo (headless/SDK/thinClient); en
  // el REPL la variante local-jsx de arriba se encarga.
  get isHidden() {
    return !requireAppHostBootstrapSessionMode().getIsNonInteractiveSession()
  },
  // Feature flag Y (no-interactivo O workspace remoto).
  isEnabled: () => {
    const { isGoalCommandEnabled } = requireAgentGoalStopHook()
    const { getIsNonInteractiveSession, getIsRemoteMode } =
      requireAppHostBootstrapSessionMode()
    return isGoalCommandEnabled() && (getIsNonInteractiveSession() || getIsRemoteMode())
  },
  load: () => import('./goalLocal.js'),
}
