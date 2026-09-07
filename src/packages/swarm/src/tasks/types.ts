/**
 * Estado de tarea de un teammate in-process — porte de
 * `ccnmt: packages/swarm/src/tasks/types.ts`.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente tipa seis campos con
 * `TaskStateBase`, `AgentToolResult`, `AgentDefinition`, `Message`,
 * `PermissionMode` y `AgentProgress`, importados de
 * `adapters/appRuntime.ts`. Medido contra la PROPIA fuente de ese
 * adaptador (`ccnmt: packages/swarm/src/adapters/appRuntime.ts:44-63`):
 * de esos seis, CUATRO ya son type-bypass declarados a propósito por el
 * propio host (`AgentProgress`, `CustomAgentDefinition`, `AgentDefinition`
 * y `AgentToolResult` son los cuatro `unknown`; `PermissionMode` es
 * `string`) — sólo `Message` re-exporta un tipo real
 * (`@claude-code-how-works/agent/messageShapes.js`). Portar ese último
 * con fidelidad total exigiría depender de `@thyrox/agent` sólo por un
 * tipo de mensaje que ninguna función de ESTE archivo inspecciona (los
 * mensajes viajan opacos por `messages?: Message[]`); se reimplementa
 * localmente `TaskStateBase` con la forma mínima que el propio archivo
 * necesita (`id`+`status`+`type`, los tres campos que
 * `isInProcessTeammateTask`/`appendCappedMessage` — y sus consumidores en
 * `tasks/InProcessTeammateTask.tsx`, BLOQUEADO — leen), y los otros cinco
 * como `unknown`/`string`, igual que el propio adaptador de la fuente.
 * Ningún campo de datos se pierde: la forma completa de
 * `InProcessTeammateTaskState` se porta entera.
 *
 * `isInProcessTeammateTask` y `appendCappedMessage` se portan VERBATIM —
 * son el símbolo que resuelve el solape con
 * `api: agent/inProcessTeammateHelpers.ts`, que hasta hoy los
 * re-declaraba localmente porque «ninguno de los dos existe en este
 * árbol» (su propio docstring). Con este archivo puesto, esa declaración
 * ya no es cierta — queda registrado como hallazgo de solape
 * (`H-DOCS-1170`), pero NO se edita `agent/inProcessTeammateHelpers.ts`
 * en este pase (paquete ajeno, otro agente puede estar trabajándolo en
 * paralelo).
 */

/**
 * Envoltorio genérico mínimo de estado de tarea — el subconjunto de
 * `TaskStateBase` (adaptador de la fuente) que este archivo y sus
 * consumidores realmente leen. Ver la divergencia declarada arriba.
 */
interface TaskStateBase {
  id: string
  status: string
  type: string
}

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
  result?: unknown // Reusa el tipo existente ya que los teammates corren vía runAgent()
  progress?: unknown

  // Historial de conversación para la vista con zoom (NO son mensajes de buzón)
  // Los mensajes de buzón se guardan aparte en teamContext.inProcessMailboxes
  messages?: unknown[]

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
