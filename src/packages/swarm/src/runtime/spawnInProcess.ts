/**
 * Engendrar un compañero DENTRO de este proceso, sin panel ni subproceso.
 *
 * Procedencia: `ccnmt: packages/swarm/src/runtime/spawnInProcess.ts` (328
 * líneas, 5 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * Este módulo NO ejecuta al agente: crea su contexto, registra su tarea en el
 * estado de la aplicación, y devuelve las asas. Quien lo ejecuta es el
 * componente de tarea, que usa `runWithTeammateContext()` para aislar la
 * identidad de cada compañero.
 *
 * DIVERGENCIA DECLARADA: la fuente toma `sample` de `lodash-es`, que no está
 * en este árbol. Se reimplementa abajo en cinco líneas —es lo que
 * `porte-completo-no-parcial.md` manda hacer cuando el stack no trae el
 * mecanismo— en vez de añadir una dependencia por una función de una línea.
 */
import {
  createAbortController,
  createTaskStateBase,
  createTeammateContext,
  emitTaskTerminatedSdk,
  evictTaskOutput,
  evictTerminalTask,
  formatAgentId,
  generateTaskId,
  getSessionId,
  getSpinnerVerbs,
  isPerfettoTracingEnabled,
  logForDebugging,
  registerAgent as registerPerfettoAgent,
  registerCleanup,
  registerTask,
  STOPPED_DISPLAY_MS,
  TURN_COMPLETION_VERBS,
  unregisterAgent as unregisterPerfettoAgent,
} from '../adapters/appRuntime.js'
import type { AppState } from '../adapters/appRuntime.js'
import { removeMemberByAgentId } from '../core/teamHelpers.js'
import type {
  InProcessTeammateTaskState,
  TeammateIdentity,
} from '../tasks/types.js'

/**
 * Un elemento al azar, o `undefined` si no hay ninguno.
 *
 * Es la reimplementación del `sample` de `lodash-es` que la fuente importa —
 * ver la divergencia de la cabecera—. El `undefined` del arreglo vacío es
 * parte del contrato: quien llama recibe un verbo ausente en vez de un
 * índice fuera de rango.
 */
function sample<T>(items: readonly T[] | undefined): T | undefined {
  if (!items || items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

type SetAppStateFn = (updater: (prev: AppState) => AppState) => void

/**
 * Lo mínimo que hace falta para engendrar.
 *
 * Es un recorte de `ToolUseContext`: pedirlo entero ataría este módulo a todo
 * lo que aquel arrastra, y de ahí sólo se usan dos campos.
 */
export type SpawnContext = {
  setAppState: SetAppStateFn
  toolUseId?: string
}

/** La configuración del compañero que se va a engendrar. */
export type InProcessSpawnConfig = {
  /** El nombre visible, p. ej. «researcher». */
  name: string
  /** El equipo al que pertenece. */
  teamName: string
  /** El encargo inicial. */
  prompt: string
  /** El color en la interfaz. */
  color?: string
  /** Si tiene que planificar antes de tocar nada. */
  planModeRequired: boolean
  /** El modelo propio, si difiere del heredado. */
  model?: string
}

/** El desenlace del engendro. */
export type InProcessSpawnOutput = {
  success: boolean
  /** `nombre@equipo`. */
  agentId: string
  /** Con qué seguirle la pista en el estado de la aplicación. */
  taskId?: string
  /** Su propio controlador de aborto. */
  abortController?: AbortController
  /** El contexto que aísla su identidad durante la ejecución. */
  teammateContext?: ReturnType<typeof createTeammateContext>
  error?: string
}

/**
 * Engendra un compañero en proceso.
 *
 * NUNCA lanza: el líder está en medio de una tanda, y una excepción que suba
 * abortaría al resto por el fallo de uno.
 */
export async function spawnInProcessTeammate(
  config: InProcessSpawnConfig,
  context: SpawnContext,
): Promise<InProcessSpawnOutput> {
  const { name, teamName, prompt, color, planModeRequired, model } = config
  const { setAppState } = context

  const agentId = formatAgentId(name, teamName)
  const taskId = generateTaskId('in_process_teammate')

  logForDebugging(
    `[spawnInProcessTeammate] Spawning ${agentId} (taskId: ${taskId})`,
  )

  try {
    // Controlador PROPIO, no encadenado al del líder: interrumpir la consulta
    // del líder no debe matar a los compañeros que ya están trabajando.
    const abortController = createAbortController()

    const parentSessionId = getSessionId()

    const identity: TeammateIdentity = {
      agentId,
      agentName: name,
      teamName,
      color,
      planModeRequired,
      parentSessionId,
    }

    const teammateContext = createTeammateContext({
      agentId,
      agentName: name,
      teamName,
      color,
      planModeRequired,
      parentSessionId,
      abortController,
    })

    if (isPerfettoTracingEnabled()) {
      registerPerfettoAgent(agentId, name, parentSessionId)
    }

    // El recorte lleva su marca: sin ella, un encargo cortado se lee como uno
    // corto y el lector no distingue «esto es todo» de «esto es el principio».
    const description = `${name}: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`

    const taskState: InProcessTeammateTaskState = {
      ...createTaskStateBase(
        taskId,
        'in_process_teammate',
        description,
        context.toolUseId,
      ),
      type: 'in_process_teammate',
      status: 'running',
      identity,
      prompt,
      model,
      abortController,
      awaitingPlanApproval: false,
      spinnerVerb: sample(getSpinnerVerbs()),
      pastTenseVerb: sample(TURN_COMPLETION_VERBS),
      permissionMode: planModeRequired ? 'plan' : 'default',
      isIdle: false,
      shutdownRequested: false,
      lastReportedToolCount: 0,
      lastReportedTokenCount: 0,
      pendingUserMessages: [],
      // Arranca como arreglo vacío, no `undefined`: así el lector de mensajes
      // funciona desde el primer instante sin comprobar la ausencia.
      messages: [],
    }

    // La limpieza aborta al compañero cuando el líder sale. Sin ella, el
    // compañero sobrevive gastando contexto contra un turno que nadie lee.
    const unregisterCleanup = registerCleanup(async () => {
      logForDebugging(`[spawnInProcessTeammate] Cleanup called for ${agentId}`)
      abortController.abort()
    })
    taskState.unregisterCleanup = unregisterCleanup

    registerTask(taskState, setAppState)

    logForDebugging(
      `[spawnInProcessTeammate] Registered ${agentId} in AppState`,
    )

    return {
      success: true,
      agentId,
      taskId,
      abortController,
      teammateContext,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during spawn'
    logForDebugging(
      `[spawnInProcessTeammate] Failed to spawn ${agentId}: ${errorMessage}`,
    )
    return {
      success: false,
      agentId,
      error: errorMessage,
    }
  }
}

/**
 * Mata a un compañero en proceso abortando su controlador.
 *
 * Es lo que `InProcessBackend.kill()` acaba llamando.
 */
export function killInProcessTeammate(
  taskId: string,
  setAppState: SetAppStateFn,
): boolean {
  let killed = false
  let teamName: string | null = null
  let agentId: string | null = null
  let toolUseId: string | undefined
  let description: string | undefined

  setAppState((prev: AppState) => {
    const task = prev.tasks[taskId]
    if (!task || task.type !== 'in_process_teammate') {
      return prev
    }

    const teammateTask = task as InProcessTeammateTaskState

    // La guarda es sobre el ESTADO, no sobre la existencia: la tarea sigue
    // ahí después de morir, y volver a matarla emitiría un segundo cierre.
    if (teammateTask.status !== 'running') {
      return prev
    }

    // La identidad se captura aquí para usarla FUERA del actualizador: la
    // escritura del archivo de equipo no va dentro de una función de estado.
    teamName = teammateTask.identity.teamName
    agentId = teammateTask.identity.agentId
    toolUseId = teammateTask.toolUseId
    description = teammateTask.description

    teammateTask.abortController?.abort()
    teammateTask.unregisterCleanup?.()

    killed = true

    // Quien llamó a «espera a que esté en reposo» se quedaría colgado para
    // siempre: este compañero ya no va a llegar a reposo nunca.
    teammateTask.onIdleCallbacks?.forEach(cb => cb())

    let updatedTeamContext = prev.teamContext
    if (prev.teamContext && prev.teamContext.teammates && agentId) {
      const { [agentId]: _, ...remainingTeammates } = prev.teamContext.teammates
      updatedTeamContext = {
        ...prev.teamContext,
        teammates: remainingTeammates,
      }
    }

    return {
      ...prev,
      teamContext: updatedTeamContext,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...teammateTask,
          status: 'killed' as const,
          notified: true,
          endTime: Date.now(),
          // Se vacían las asas que ya no sirven: dejarlas mantiene vivas
          // referencias a un trabajo que terminó.
          onIdleCallbacks: [],
          messages: teammateTask.messages?.length
            ? [teammateTask.messages[teammateTask.messages.length - 1]!]
            : undefined,
          pendingUserMessages: [],
          inProgressToolUseIDs: undefined,
          abortController: undefined,
          unregisterCleanup: undefined,
          currentWorkAbortController: undefined,
        },
      },
    }
  })

  if (teamName && agentId) {
    void removeMemberByAgentId(teamName, agentId)
  }

  if (killed) {
    void evictTaskOutput(taskId)
    // `notified: true` ya evitó la notificación en XML, así que el cierre del
    // SDK se emite aquí a mano. El bucle en proceso sólo emite mientras el
    // estado sea `running`, de modo que no habrá un segundo cierre.
    emitTaskTerminatedSdk(taskId, 'stopped', {
      toolUseId,
      summary: description,
    })
    setTimeout(
      evictTerminalTask.bind(null, taskId, setAppState),
      STOPPED_DISPLAY_MS,
    )
  }

  // La baja del rastreo va SIEMPRE, encendido o no: el registro es un mapa en
  // memoria y dejar la entrada lo hace crecer sin fin.
  if (agentId) {
    unregisterPerfettoAgent(agentId)
  }

  return killed
}
