/**
 * Estado de tarea de un teammate in-process — porte de
 * `ccnmt: packages/swarm/src/tasks/types.ts`.
 *
 * Los tipos de los campos son los canónicos, como en la fuente:
 * `TaskStateBase` de `@thyrox/tool-registry/Task.js` (sus 11 campos, que el
 * productor `runtime/spawnInProcess.ts` rellena con `createTaskStateBase`), y
 * `AgentToolResult`, `AgentProgress` y `Message` de `adapters/appRuntime.ts`,
 * que los resuelve a los tipos reales de tool-registry y agent. Con el tipo
 * canónico la unión de estados de tarea de `repl/tasksTypes.ts` puede
 * estrechar `in_process_teammate`.
 *
 * `isInProcessTeammateTask` y `appendCappedMessage` se portan VERBATIM.
 * `@thyrox/agent: inProcessTeammateHelpers.ts` todavía declara su propia
 * copia del primero (H-DOCS-1170); retirarla es edición de ese paquete (#53).
 */
import type { TaskStateBase } from '@thyrox/tool-registry/Task.js'
import type { AgentProgress, AgentToolResult, Message } from '../adapters/appRuntime.js'

export type { TaskStateBase }

/**
 * Identidad de teammate guardada en el estado de la tarea. Misma forma
 * que `TeammateContext` (runtime) pero como dato plano. `TeammateContext`
 * es para AsyncLocalStorage; ésta es para persistencia en `AppState`.
 */
export type TeammateIdentity = {
  agentId: string // p.ej. "researcher@my-team"
  agentName: string // p.ej. "researcher"
  teamName: string
  color?: string
  planModeRequired: boolean
  parentSessionId: string // Session ID del líder
}

export type InProcessTeammateTaskState = TaskStateBase & {
  type: 'in_process_teammate'

  // Identidad como sub-objeto (coincide con la forma de TeammateContext
  // por consistencia). Se guarda como dato plano en AppState, NO como
  // referencia a AsyncLocalStorage.
  identity: TeammateIdentity

  // Ejecución
  prompt: string
  // Override opcional de modelo para este teammate
  model?: string
  // Opcional: sólo se fija si el teammate usa una definición de agente
  // específica. Muchos teammates corren como agentes general-purpose sin
  // definición predefinida.
  selectedAgent?: unknown
  abortController?: AbortController // Sólo runtime, no se serializa a disco — mata al teammate ENTERO
  currentWorkAbortController?: AbortController // Sólo runtime — aborta el turno actual sin matar al teammate
  unregisterCleanup?: () => void // Sólo runtime

  // Seguimiento de aprobación de plan mode (planModeRequired vive en identity)
  awaitingPlanApproval: boolean

  // Modo de permiso de este teammate (se cicla independientemente vía
  // Shift+Tab al verlo)
  permissionMode: string

  // Estado
  error?: string
  result?: AgentToolResult // Reusa el tipo existente ya que los teammates corren vía runAgent()
  progress?: AgentProgress

  // Historial de conversación para la vista con zoom (NO son mensajes de buzón)
  // Los mensajes de buzón se guardan aparte en teamContext.inProcessMailboxes
  messages?: Message[]

  // IDs de uso de herramienta en ejecución (para la animación en la
  // vista de transcript)
  inProgressToolUseIDs?: Set<string>

  // Cola de mensajes de usuario a entregar al ver el transcript del teammate
  pendingUserMessages: string[]

  // UI: verbos de spinner aleatorios (estables entre re-renders,
  // compartidos entre componentes)
  spinnerVerb?: string
  pastTenseVerb?: string

  // Ciclo de vida
  isIdle: boolean
  shutdownRequested: boolean

  // Callbacks a notificar cuando el teammate pasa a idle (sólo runtime)
  // Los usa el leader para esperar eficientemente sin polling.
  onIdleCallbacks?: Array<() => void>

  // Seguimiento de progreso (para computar deltas en notificaciones)
  lastReportedToolCount: number
  lastReportedTokenCount: number
}

export function isInProcessTeammateTask(
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
 * Cota del número de mensajes que se guardan en task.messages (el espejo
 * de UI de AppState).
 *
 * task.messages existe puramente para el diálogo de transcript con zoom,
 * que sólo necesita contexto reciente. La conversación completa vive en
 * el array local allMessages (inProcessRunner) y en disco, en el path de
 * transcript del agente.
 *
 * Análisis BQ (ronda 9, 2026-03-20) mostró ~20MB de RSS por agente en
 * sesiones de 500+ turnos y ~125MB por agente concurrente en ráfagas de
 * swarm. Una sesión ballena (9a990de8) lanzó 292 agentes en 2 minutos y
 * llegó a 36.8GB. El costo dominante es este array, que guarda una
 * segunda copia completa de cada mensaje.
 */
const TEAMMATE_MESSAGES_UI_CAP = 50

/**
 * Añade un elemento a un array de mensajes, acotando el resultado a
 * TEAMMATE_MESSAGES_UI_CAP entradas descartando las más viejas. Siempre
 * devuelve un array nuevo (inmutabilidad de AppState).
 */
export function appendCappedMessage<T>(
  prev: readonly T[] | undefined,
  item: T,
): T[] {
  if (prev === undefined || prev.length === 0) {
    return [item]
  }
  if (prev.length >= TEAMMATE_MESSAGES_UI_CAP) {
    const next = prev.slice(-(TEAMMATE_MESSAGES_UI_CAP - 1))
    next.push(item)
    return next
  }
  return [...prev, item]
}
