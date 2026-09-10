/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/workflows/index.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO de la metadata; `isWorkflowsEnabled` pasa por
 * `internal/pendingCrossPackageDeps.ts` (símbolo ya existente en
 * `@thyrox/agent/goalStopHook.js` — ese paquete lo está portando otro
 * agente en paralelo, así que se referencia en diferido, nunca estático).
 *
 * Comando `/workflows` — navega el historial de workflows (en curso y
 * completados). El diálogo (`workflows.tsx`, no portado en este pase)
 * muestra corridas reales del motor de Workflow cuando está habilitado, y
 * si no, cae al historial de GOAL (la meta activa como única fila "en
 * curso" más cada registro de meta completada/fallida) — el otro
 * primitivo de trabajo autónomo de este proyecto.
 *
 * Gate: `isWorkflowsEnabled()` (habilitado por defecto, con kill-switch
 * `CLAUDE_CODE_WORKFLOWS=0` más el kill-switch de `/goal`). El comando se
 * registra incondicionalmente; este `isEnabled` es el único gate de
 * visibilidad.
 */
import type { Command } from '../../runtime.js'
import { requireAgentGoalStopHook } from '../../internal/pendingCrossPackageDeps.js'

const workflows: Command = {
  type: 'local-jsx',
  name: 'workflows',
  aliases: [],
  description: 'Browse workflow history (running and completed)',
  isEnabled: () => requireAgentGoalStopHook().isWorkflowsEnabled(),
  load: () => import('./workflows.js'),
}

export default workflows
