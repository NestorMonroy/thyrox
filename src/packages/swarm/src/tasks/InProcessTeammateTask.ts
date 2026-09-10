/**
 * Ciclo de vida de la tarea de un teammate in-process.
 *
 * Procedencia: `ccnmt: packages/swarm/src/tasks/InProcessTeammateTask.tsx`
 * (157 líneas, 6 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * Este archivo implementa la interfaz `Task` para teammates in-process. A
 * diferencia de `LocalAgentTask` (agentes de fondo), un teammate
 * in-process: corre en el MISMO proceso Node.js con aislamiento vía
 * AsyncLocalStorage; tiene identidad consciente de equipo
 * (`agentName@teamName`); soporta el flujo de aprobación de plan mode;
 * puede estar idle (esperando trabajo) o activo (procesando).
 *
 * DIVERGENCIA DECLARADA: pese a su extensión `.tsx` en la fuente, este
 * archivo **no contiene JSX**. Medido con `grep -c '</\|React'` sobre la
 * fuente: 0 hits — es un objeto `Task` literal más funciones puras sobre
 * `AppState`, sin ningún import de React ni de `ink`. Por eso NO es parte
 * del BLOQUEO de interfaz (TASK-THYROX-0006 sólo bloquea `adapters/appUi.ts`
 * y `core/It2SetupPrompt.tsx`), y se porta como `.ts` — no hace falta la
 * extensión `.tsx` porque no hay elemento JSX que compilar.
 *
 * DIVERGENCIA DECLARADA (llamada a `updateTaskState`): la fuente llama
 * `updateTaskState<InProcessTeammateTaskState>(taskId, setAppState, task => …)`
 * porque su `updateTaskState` es `missingBinding(...) as any`
 * (`ccnmt: packages/swarm/src/adapters/appRuntime.ts:153`) — un `any` acepta
 * argumentos de tipo arbitrarios. El adaptador de este árbol lo tipa como
 * `HostBinding = (...args: any[]) => any` (una firma de función, no `any`),
 * deliberadamente — el docstring de `adapters/appRuntime.ts` explica que
 * `never` dejaba los bindings sin poder invocarse. Una firma de función NO
 * admite argumentos de tipo (`tsc`: `TS2558: Expected 0 type arguments, but
 * got 1`), así que aquí se tipa el PARÁMETRO del callback en vez del sitio
 * de la llamada — `(task: InProcessTeammateTaskState) => …`, sin
 * `<InProcessTeammateTaskState>` — que typechecks igual y preserva el mismo
 * comportamiento en runtime (el binding real, una vez instalado, ignora
 * cualquier anotación de tipo).
 */

import {
  isTerminalTaskStatus,
  type SetAppState,
  type Task,
  createUserMessage,
  logForDebugging,
  updateTaskState,
} from '../adapters/appRuntime.js'
import type { Message } from '../adapters/appRuntime.js'
import { killInProcessTeammate } from '../runtime/spawnInProcess.js'
import type { InProcessTeammateTaskState, TaskStateBase } from './types.js'
import { appendCappedMessage, isInProcessTeammateTask } from './types.js'

/** Maneja la ejecución de un teammate in-process. */
export const InProcessTeammateTask: Task = {
  name: 'InProcessTeammateTask',
  type: 'in_process_teammate',
  async kill(taskId, setAppState) {
    killInProcessTeammate(taskId, setAppState)
  },
}

/** Pide el apagado de un teammate. */
export function requestTeammateShutdown(taskId: string, setAppState: SetAppState): void {
  updateTaskState(taskId, setAppState, (task: InProcessTeammateTaskState) => {
    if (task.status !== 'running' || task.shutdownRequested) {
      return task
    }

    return { ...task, shutdownRequested: true }
  })
}

/**
 * Añade un mensaje al historial de conversación de un teammate. Se usa
 * para la vista con zoom que muestra la conversación del teammate.
 */
export function appendTeammateMessage(
  taskId: string,
  message: Message,
  setAppState: SetAppState,
): void {
  updateTaskState(taskId, setAppState, (task: InProcessTeammateTaskState) => {
    if (task.status !== 'running') {
      return task
    }

    return { ...task, messages: appendCappedMessage(task.messages, message) }
  })
}

/**
 * Inyecta un mensaje de usuario a la cola pendiente de un teammate. Se
 * usa al ver el transcript de un teammate para enviarle mensajes
 * tecleados. También añade el mensaje a task.messages para que aparezca
 * de inmediato en el transcript.
 */
export function injectUserMessageToTeammate(
  taskId: string,
  message: string,
  setAppState: SetAppState,
): void {
  updateTaskState(taskId, setAppState, (task: InProcessTeammateTaskState) => {
    // Permite inyectar mensajes cuando el teammate está running o idle
    // (esperando input). Sólo rechaza si el teammate está en un estado
    // terminal.
    if (isTerminalTaskStatus(task.status)) {
      logForDebugging(
        `Dropping message for teammate task ${taskId}: task status is "${task.status}"`,
      )
      return task
    }

    return {
      ...task,
      pendingUserMessages: [...task.pendingUserMessages, message],
      messages: appendCappedMessage(task.messages, createUserMessage({ content: message })),
    }
  })
}

/**
 * Obtiene la tarea de teammate por ID de agente desde AppState. Prefiere
 * tareas corriendo sobre las matadas/completadas en caso de que existan
 * varias con el mismo agentId. Devuelve undefined si no se encuentra.
 */
export function findTeammateTaskByAgentId(
  agentId: string,
  tasks: Record<string, TaskStateBase>,
): InProcessTeammateTaskState | undefined {
  let fallback: InProcessTeammateTaskState | undefined
  for (const task of Object.values(tasks)) {
    if (isInProcessTeammateTask(task) && task.identity.agentId === agentId) {
      // Prefiere tareas corriendo en caso de que tareas matadas viejas
      // sigan en AppState junto a otras nuevas corriendo con el mismo
      // agentId.
      if (task.status === 'running') {
        return task
      }
      // Guarda la primera coincidencia como fallback por si no existe
      // ninguna tarea corriendo.
      if (!fallback) {
        fallback = task
      }
    }
  }
  return fallback
}

/** Obtiene todas las tareas de teammate in-process desde AppState. */
export function getAllInProcessTeammateTasks(
  tasks: Record<string, TaskStateBase>,
): InProcessTeammateTaskState[] {
  return Object.values(tasks).filter(isInProcessTeammateTask)
}

/**
 * Obtiene los teammates in-process corriendo, ordenados alfabéticamente
 * por agentName. Compartido entre TeammateSpinnerTree, el footer selector
 * de PromptInput, y useBackgroundTaskNavigation — selectedIPAgentIndex
 * mapea a este arreglo, así que los tres deben coincidir en el orden.
 */
export function getRunningTeammatesSorted(
  tasks: Record<string, TaskStateBase>,
): InProcessTeammateTaskState[] {
  return getAllInProcessTeammateTasks(tasks)
    .filter(t => t.status === 'running')
    .sort((a, b) => a.identity.agentName.localeCompare(b.identity.agentName))
}
