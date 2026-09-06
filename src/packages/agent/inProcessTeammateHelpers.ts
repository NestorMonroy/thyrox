/**
 * Helpers de teammate in-process — porte PARCIAL de
 * `ccnmt: packages/agent/inProcessTeammateHelpers.ts` (100 líneas en la
 * fuente).
 *
 * Recorte declarado: la fuente completa importa
 * `InProcessTeammateTaskState`, `isInProcessTeammateTask`,
 * `isPermissionResponse`, `isSandboxPermissionResponse` y
 * `PlanApprovalResponseMessage` de `@claude-code-how-works/swarm`, y
 * `updateTaskState` de `./task/framework.js` — ninguno de los dos existe en
 * este árbol. Se portan sólo `findInProcessTeammateTaskId` y su
 * discriminador de tipo `isInProcessTeammateTask`, porque son el único
 * símbolo que ejercita el test que este archivo porta
 * (`__tests__/findInProcessTeammateTaskId.test.ts`).
 *
 * NO se portan: `setAwaitingPlanApproval`, `handlePlanApprovalResponse`
 * (dependen de `updateTaskState` y de `InProcessTeammateTaskState` como
 * tipo genérico) ni `isPermissionRelatedResponse` (depende de
 * `isPermissionResponse`/`isSandboxPermissionResponse`, ausentes).
 *
 * `isInProcessTeammateTask` se re-declara aquí, verbatim en su
 * comportamiento, desde su definición real en
 * `ccnmt: packages/swarm/src/tasks/types.ts:78-87` (no desde la fuente de
 * `inProcessTeammateHelpers.ts`, que sólo la importa). Es deliberadamente
 * ciega a la forma de `identity`: sólo chequea `type`. Ese es el bug FIJADO
 * (locked) que `findInProcessTeammateTaskId.test.ts` pin-ea — una tarea con
 * `type: 'in_process_teammate'` y sin `identity` pasa el predicado y
 * después revienta con `TypeError` al leer `task.identity.agentName`.
 */

type AppState = { tasks: Record<string, unknown> }

type InProcessTeammateTaskState = {
  type: 'in_process_teammate'
  id: string
  identity: { agentName: string; teamName: string }
}

/**
 * Discrimina si una tarea es un teammate in-process. Deliberadamente sólo
 * chequea `type` — no la forma de `identity` — porque así lo define la
 * fuente (`ccnmt: packages/swarm/src/tasks/types.ts:78-87`).
 */
function isInProcessTeammateTask(
  task: unknown,
): task is InProcessTeammateTaskState {
  return (
    typeof task === 'object' &&
    task !== null &&
    'type' in task &&
    task.type === 'in_process_teammate'
  )
}

/**
 * Encuentra el task ID de un teammate in-process por nombre de agente.
 *
 * @param agentName - El nombre del agente (p.ej. "researcher")
 * @param appState - AppState actual
 * @returns El task ID si se encuentra, undefined si no
 */
export function findInProcessTeammateTaskId(
  agentName: string,
  appState: AppState,
): string | undefined {
  for (const task of Object.values(appState.tasks)) {
    if (
      isInProcessTeammateTask(task) &&
      task.identity.agentName === agentName
    ) {
      return task.id
    }
  }
  return undefined
}
