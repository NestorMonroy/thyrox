/**
 * Adaptación de `ccnmt: packages/app-host/src/state/selectors.ts`
 * (1 línea fuente: `export * from '@claude-code-how-works/repl/selectors.js'`).
 * El paquete `repl` no existe en absoluto en este árbol — medido:
 * `ls /home/user/thyrox/src/packages/ | grep repl` → vacío — así que un
 * `export * from` fiel rompería la carga de ESTE archivo, no sólo al
 * invocar una función; no es el caso "capa colgante con require()
 * diferido", porque aquí no hay ninguna llamada que diferir: es un
 * re-export estático. Mismo criterio ya aplicado por el hermano de este
 * directorio, `state/store.ts`.
 *
 * `repl/src/selectors.ts` (los selectores puros que reexporta) depende
 * de UN solo paquete hermano — `@claude-code-how-works/swarm`
 * (`InProcessTeammateTaskState`, `isInProcessTeammateTask`) — y ese
 * hermano SÍ está portado y SÍ exporta ambos símbolos
 * (`@thyrox/swarm: src/index.ts:105,107`, reexportados desde
 * `tasks/types.ts`). El TIPO se importa directo (type-only, se borra al
 * transpilar — no exige que `@thyrox/swarm` esté enlazado). La FUNCIÓN
 * `isInProcessTeammateTask` NO: `@thyrox/swarm` no está declarado como
 * dependencia de `@thyrox/app-host` (sin symlink en
 * `node_modules/@thyrox/swarm`; verificado con `require.resolve`), así
 * que un import de valor rompería la carga del módulo. Se usa el
 * sustituto local de `internal/pendingCrossPackageDeps.ts` — ver ese
 * archivo para la divergencia exacta y la condición de retiro.
 */
import type { InProcessTeammateTaskState } from '@thyrox/swarm'
import { isInProcessTeammateTask } from '../internal/pendingCrossPackageDeps.js'

// Minimal structural shapes — the full task/state types still live in src/.
// Selectors here only access a narrow field set; stricter types stay at
// call sites that import from AppStateStore directly.
type LocalAgentTaskState = { type: 'local_agent'; [key: string]: unknown }
type AppStateShape = {
  viewingAgentTaskId: string | null | undefined
  tasks: Record<string, { type: string; [key: string]: unknown }>
}

/**
 * Get the currently viewed teammate task, if any.
 * Returns undefined if:
 * - No teammate is being viewed (viewingAgentTaskId is undefined)
 * - The task ID doesn't exist in tasks
 * - The task is not an in-process teammate task
 */
export function getViewedTeammateTask(
  appState: Pick<AppStateShape, 'viewingAgentTaskId' | 'tasks'>,
): InProcessTeammateTaskState | undefined {
  const { viewingAgentTaskId, tasks } = appState

  // Not viewing any teammate
  if (!viewingAgentTaskId) {
    return undefined
  }

  // Look up the task
  const task = tasks[viewingAgentTaskId]
  if (!task) {
    return undefined
  }

  // Verify it's an in-process teammate task
  if (!isInProcessTeammateTask(task)) {
    return undefined
  }

  return task
}

/**
 * Return type for getActiveAgentForInput selector.
 * Discriminated union for type-safe input routing.
 */
export type ActiveAgentForInput =
  | { type: 'leader' }
  | { type: 'viewed'; task: InProcessTeammateTaskState }
  | { type: 'named_agent'; task: LocalAgentTaskState }

/**
 * Determine where user input should be routed.
 * Returns:
 * - { type: 'leader' } when not viewing a teammate (input goes to leader)
 * - { type: 'viewed', task } when viewing an agent (input goes to that agent)
 *
 * Used by input routing logic to direct user messages to the correct agent.
 */
export function getActiveAgentForInput(
  appState: AppStateShape,
): ActiveAgentForInput {
  const viewedTask = getViewedTeammateTask(appState)
  if (viewedTask) {
    return { type: 'viewed', task: viewedTask }
  }

  const { viewingAgentTaskId, tasks } = appState
  if (viewingAgentTaskId) {
    const task = tasks[viewingAgentTaskId]
    if (task?.type === 'local_agent') {
      return { type: 'named_agent', task: task as LocalAgentTaskState }
    }
  }

  return { type: 'leader' }
}
