/**
 * El reposo de un compañero en proceso: qué lo despierta y en qué orden.
 *
 * Procedencia: `ccnmt: packages/swarm/src/runtime/pollForPromptOrShutdown.ts`
 * (370 líneas, 2 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * `waitForNextPromptOrShutdown` es el ÚNICO punto que reanuda a un compañero,
 * y su orden de prioridad es la decisión entera del módulo:
 *
 *   1. mensajes del usuario pendientes en memoria
 *   2. peticiones de apagado sin procesar
 *   3. mensajes del líder — por encima de los de otros compañeros
 *   4. el resto del buzón sin leer
 *   5. una tarea sin dueño de la lista del equipo
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import {
  claimTask,
  count,
  listTasks,
  logForDebugging,
  sleep,
  updateTask,
} from '../adapters/appRuntime.js'
import type {
  AppState as AppStateBinding,
  Task as TaskBinding,
} from '../adapters/appRuntime.js'
import { TEAM_LEAD_NAME } from '../core/constants.js'
import {
  isShutdownRequest,
  markMessageAsReadByIndex,
  readMailbox,
} from '../mailbox/index.js'
import type {
  InProcessTeammateTaskState,
  TeammateIdentity,
} from '../tasks/types.js'

/**
 * El estado de aplicación, reafinado para leer `appState.tasks[taskId]`.
 *
 * El binding del anfitrión es `unknown` a propósito —es lo que evita importar
 * su tipo completo y cerrar un ciclo—, así que el recorte se hace aquí y no
 * se propaga.
 */
type AppState = AppStateBinding & {
  tasks: Record<string, unknown>
}

/** Una tarea, reafinada por la misma razón que `AppState`. */
type Task = TaskBinding & {
  id: string
  status: string
  owner?: string
  blockedBy: string[]
  subject?: string
  description?: string
}

type SetAppStateFn = (updater: (prev: AppState) => AppState) => void

/** Qué despertó al compañero. */
type WaitResult =
  | {
      type: 'shutdown_request'
      request: ReturnType<typeof isShutdownRequest>
      originalMessage: string
    }
  | {
      type: 'new_message'
      message: string
      from: string
      color?: string
      summary?: string
    }
  | {
      type: 'aborted'
    }

/**
 * La primera tarea que se puede tomar: pendiente, sin dueño y desbloqueada.
 *
 * El bloqueo se mide contra las tareas SIN CERRAR, no contra la lista entera:
 * una dependencia ya cumplida bloquearía para siempre.
 */
function findAvailableTask(tasks: Task[]): Task | undefined {
  const unresolvedTaskIds = new Set(
    tasks.filter(t => t.status !== 'completed').map(t => t.id),
  )

  return tasks.find(task => {
    if (task.status !== 'pending') return false
    if (task.owner) return false
    return task.blockedBy.every(id => !unresolvedTaskIds.has(id))
  })
}

/** La tarea, escrita como encargo para el compañero. */
function formatTaskAsPrompt(task: Task): string {
  let prompt = `Complete all open tasks. Start with task #${task.id}: \n\n ${task.subject}`

  if (task.description) {
    prompt += `\n\n${task.description}`
  }

  return prompt
}

/**
 * Toma la siguiente tarea disponible, si la hay.
 *
 * Se exporta porque el arranque del compañero la usa antes de entrar al bucle
 * del agente: uno recién nacido reclama su primera tarea sin pasar por el
 * reposo.
 *
 * NUNCA lanza. El sondeo la llama en cada vuelta, y una excepción que suba
 * mataría al compañero por un fallo transitorio de la lista.
 */
export async function tryClaimNextTask(
  taskListId: string,
  agentName: string,
): Promise<string | undefined> {
  try {
    const tasks = await listTasks(taskListId)
    const availableTask = findAvailableTask(tasks)

    if (!availableTask) {
      return undefined
    }

    const result = await claimTask(taskListId, availableTask.id, agentName)

    if (!result.success) {
      logForDebugging(
        `[inProcessRunner] Failed to claim task #${availableTask.id}: ${result.reason}`,
      )
      return undefined
    }

    // Marcarla en curso es un paso APARTE del reclamo: sin él, la interfaz
    // sigue mostrando como pendiente algo que ya tiene quien lo haga.
    await updateTask(taskListId, availableTask.id, { status: 'in_progress' })

    logForDebugging(
      `[inProcessRunner] Claimed task #${availableTask.id}: ${availableTask.subject}`,
    )

    return formatTaskAsPrompt(availableTask)
  } catch (err) {
    logForDebugging(`[inProcessRunner] Error checking task list: ${err}`)
    return undefined
  }
}

/**
 * Espera a que algo despierte al compañero.
 *
 * Lo mantiene en reposo en vez de terminarlo, y NO aprueba el apagado por su
 * cuenta: la petición se devuelve al llamador para que el modelo decida.
 *
 * `processedRequestIds` es el registro EN MEMORIA de las peticiones que este
 * proceso ya entregó. Junto con el descarte por `(tipo, requestId)` del
 * buzón, garantiza que una petición llegue al modelo exactamente una vez
 * aunque el llamador la repita o aunque otro lector del archivo haya tocado
 * el `read`.
 */
export async function waitForNextPromptOrShutdown(
  identity: TeammateIdentity,
  abortController: AbortController,
  taskId: string,
  getAppState: () => AppState,
  setAppState: SetAppStateFn,
  taskListId: string,
  processedRequestIds: Set<string>,
): Promise<WaitResult> {
  const POLL_INTERVAL_MS = 500

  logForDebugging(
    `[inProcessRunner] ${identity.agentName} starting poll loop (abort=${abortController.signal.aborted})`,
  )

  let pollCount = 0
  while (!abortController.signal.aborted) {
    const appState = getAppState()
    const task = appState.tasks[taskId] as
      | InProcessTeammateTaskState
      | undefined
    if (
      task &&
      task.type === 'in_process_teammate' &&
      task.pendingUserMessages.length > 0
    ) {
      const message = task.pendingUserMessages[0]!
      // Consumirlo es la mitad que importa: sin sacarlo de la cola, la vuelta
      // siguiente devuelve el mismo mensaje para siempre.
      setAppState(prev => {
        const prevTask = prev.tasks[taskId] as
          | InProcessTeammateTaskState
          | undefined
        if (!prevTask || prevTask.type !== 'in_process_teammate') {
          return prev
        }
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [taskId]: {
              ...prevTask,
              pendingUserMessages: prevTask.pendingUserMessages.slice(1),
            },
          },
        }
      })
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} found pending user message (poll #${pollCount})`,
      )
      return {
        type: 'new_message',
        message,
        from: 'user',
      }
    }

    // La PRIMERA vuelta no espera: dormir antes de la primera lectura añade
    // medio segundo a cada mensaje, incluidos los que ya estaban ahí.
    if (pollCount > 0) {
      await sleep(POLL_INTERVAL_MS)
    }
    pollCount++

    if (abortController.signal.aborted) {
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} aborted while waiting (poll #${pollCount})`,
      )
      return { type: 'aborted' }
    }

    logForDebugging(
      `[inProcessRunner] ${identity.agentName} poll #${pollCount}: checking mailbox`,
    )
    try {
      const allMessages = await readMailbox(
        identity.agentName,
        identity.teamName,
      )

      // NO se filtra por `m.read`. Esa marca la escribe cualquier lector del
      // archivo —incluido el generador de adjuntos— y filtrarla por ahí fue
      // la causa del compañero que se quedaba colgado tras cuatro peticiones
      // de apagado: cada una llegaba ya marcada y el bucle no veía ninguna.
      // Lo autoritativo es `processedRequestIds`, que es de este proceso.
      let shutdownIndex = -1
      let shutdownParsed: ReturnType<typeof isShutdownRequest> = null
      for (let i = 0; i < allMessages.length; i++) {
        const m = allMessages[i]
        if (!m) continue
        const parsed = isShutdownRequest(m.text)
        if (parsed && !processedRequestIds.has(parsed.requestId)) {
          shutdownIndex = i
          shutdownParsed = parsed
          break
        }
      }

      if (shutdownIndex !== -1) {
        const msg = allMessages[shutdownIndex]!
        const skippedUnread = count(
          allMessages.slice(0, shutdownIndex),
          m => !m.read,
        )
        logForDebugging(
          `[inProcessRunner] ${identity.agentName} received shutdown request from ${shutdownParsed?.from} (prioritized over ${skippedUnread} unread messages)`,
        )
        // Se registra ANTES de entregarla: ante una caída a mitad de la
        // entrega es preferible perder una petición a aprobar el apagado dos
        // veces.
        if (shutdownParsed?.requestId) {
          processedRequestIds.add(shutdownParsed.requestId)
        }
        await markMessageAsReadByIndex(
          identity.agentName,
          identity.teamName,
          shutdownIndex,
        )
        return {
          type: 'shutdown_request',
          request: shutdownParsed,
          originalMessage: msg.text,
        }
      }

      // El líder representa la intención del usuario y la coordinación del
      // equipo: dejarlo detrás de la charla entre pares lo mata de inanición.
      // Entre pares, el orden es el de llegada.
      let selectedIndex = -1

      for (let i = 0; i < allMessages.length; i++) {
        const m = allMessages[i]
        if (m && !m.read && m.from === TEAM_LEAD_NAME) {
          selectedIndex = i
          break
        }
      }

      if (selectedIndex === -1) {
        selectedIndex = allMessages.findIndex(m => !m.read)
      }

      if (selectedIndex !== -1) {
        const msg = allMessages[selectedIndex]
        if (msg) {
          logForDebugging(
            `[inProcessRunner] ${identity.agentName} received new message from ${msg.from} (index ${selectedIndex})`,
          )
          await markMessageAsReadByIndex(
            identity.agentName,
            identity.teamName,
            selectedIndex,
          )
          return {
            type: 'new_message',
            message: msg.text,
            from: msg.from,
            color: msg.color,
            summary: msg.summary,
          }
        }
      }
    } catch (err) {
      // Se sigue sondeando: un buzón ilegible en una vuelta no es razón para
      // dejar al compañero sin despertar nunca.
      logForDebugging(
        `[inProcessRunner] ${identity.agentName} poll error: ${err}`,
      )
    }

    const taskPrompt = await tryClaimNextTask(taskListId, identity.agentName)
    if (taskPrompt) {
      return {
        type: 'new_message',
        message: taskPrompt,
        from: 'task-list',
      }
    }
  }

  logForDebugging(
    `[inProcessRunner] ${identity.agentName} exiting poll loop (abort=${abortController.signal.aborted}, polls=${pollCount})`,
  )
  return { type: 'aborted' }
}
