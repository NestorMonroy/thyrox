/**
 * El ejecutor de un compañero que corre DENTRO de este proceso.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/InProcessBackend.ts`
 * (339 líneas, 2 símbolos exportados). Ese árbol declara
 * `"license": "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se
 * copia.
 *
 * A diferencia de los respaldos de panel —`TmuxBackend`, `ITermBackend`—, un
 * compañero en proceso vive en el mismo Node.js que el líder: comparte con él
 * el cliente del API y las conexiones MCP, se comunica por el mismo buzón en
 * disco que los de panel, y se termina con un `AbortController` en vez de
 * matando un panel.
 *
 * PRECONDICIÓN: `setContext()` antes de `spawn()`. Sin contexto no hay acceso
 * al estado de la aplicación, y los cinco métodos que lo necesitan REHÚSAN
 * nombrándolo en vez de reventar con un `null` más adentro.
 *
 * DIVERGENCIA DECLARADA: ninguna en la conducta; una en el tipado, y es de la
 * capa, no de este archivo. Hay DOS declaraciones de `AppState` en este árbol
 * que no unifican:
 *
 * - `adapters/appRuntime.ts:240` lo ensancha a `unknown`;
 * - `@thyrox/tool-registry/appStateTypes.ts:15` —el que `ToolUseContext` usa—
 *   lo declara `Record<string, any>`.
 *
 * Con eso, el `setAppState` del contexto no es asignable al `SetAppState` del
 * adaptador: su retorno `Record<string, any>` no acepta el `unknown` que el
 * otro promete. Son tres sitios aquí —`spawnInProcessTeammate`,
 * `requestTeammateShutdown` y `killInProcessTeammate`—, y NO se tapan con un
 * `as`: el `as` haría desaparecer la marca dejando la causa en pie, y el
 * siguiente porte volvería a tropezar sin nada que se lo advirtiera. La causa
 * está en el ensanchamiento de `appRuntime`, que es el sujeto de la tarea #276.
 *
 * Medido antes de escribirlo: la clase entera son **27** errores en cuatro
 * archivos —14 en el hermano `runtime/inProcessRunner.ts`, 10 en
 * `__tests__/spawnInProcess.test.ts`, 2 aquí y 1 en
 * `tasks/InProcessTeammateTask.ts`—, así que es condición preexistente del
 * paquete y no algo que este archivo introduzca.
 *
 * Lo que sí resolvió limpio, y por eso no es divergencia:
 * `ToolUseContext` NO está ensanchado —se reexporta entero desde
 * `@thyrox/tool-registry/Tool.js`, con su `messages: Message[]`— así que el
 * `{ ...this.context, messages: [] }` del `spawn()` conserva su tipo, y
 * `state.tasks` resuelve sin el TS18046 que `spawnInProcess.ts:233` arrastra.
 */
import type { ToolUseContext } from '../adapters/appRuntime.js'
import {
  jsonStringify,
  logForDebugging,
  parseAgentId,
} from '../adapters/appRuntime.js'
import {
  createShutdownRequestMessage,
  writeToMailbox,
} from '../mailbox/index.js'
import { startInProcessTeammate } from '../runtime/inProcessRunner.js'
import {
  killInProcessTeammate,
  spawnInProcessTeammate,
} from '../runtime/spawnInProcess.js'
import {
  findTeammateTaskByAgentId,
  requestTeammateShutdown,
} from '../tasks/InProcessTeammateTask.js'
import type {
  TeammateExecutor,
  TeammateMessage,
  TeammateSpawnConfig,
  TeammateSpawnResult,
} from './types.js'

/**
 * El ejecutor en proceso, en la forma que `TeammateExecutor` declara.
 *
 * Se obtiene por la abstracción —`getTeammateExecutor()` de `registry.ts`—,
 * no construyéndolo a mano: el registro es quien lo cachea y quien decide si
 * el modo en proceso está habilitado.
 */
export class InProcessBackend implements TeammateExecutor {
  readonly type = 'in-process' as const

  /**
   * El contexto de uso de herramientas, para llegar al estado de la
   * aplicación. Lo fija `setContext()` antes del primer `spawn()`.
   */
  private context: ToolUseContext | null = null

  /** Declara el contexto con que este ejecutor lee y escribe el estado. */
  setContext(context: ToolUseContext): void {
    this.context = context
  }

  /** Siempre disponible: no depende de ningún programa externo. */
  async isAvailable(): Promise<boolean> {
    return true
  }

  /**
   * Engendra un compañero en proceso y arranca su bucle.
   *
   * Son dos pasos y el segundo es condicional:
   * `spawnInProcessTeammate()` crea el contexto del compañero, su
   * `AbortController` propio —no ligado al del padre— y su tarea en el estado;
   * `startInProcessTeammate()` arranca el bucle del agente, y sólo si las tres
   * piezas que necesita volvieron del primer paso.
   */
  async spawn(config: TeammateSpawnConfig): Promise<TeammateSpawnResult> {
    if (!this.context) {
      logForDebugging(
        `[InProcessBackend] spawn() called without context for ${config.name}`,
      )
      return {
        success: false,
        agentId: `${config.name}@${config.teamName}`,
        error:
          'InProcessBackend not initialized. Call setContext() before spawn().',
      }
    }

    logForDebugging(`[InProcessBackend] spawn() called for ${config.name}`)

    const result = await spawnInProcessTeammate(
      {
        name: config.name,
        teamName: config.teamName,
        prompt: config.prompt,
        color: config.color,
        planModeRequired: config.planModeRequired ?? false,
      },
      this.context,
    )

    // El bucle sólo arranca con las tres piezas del engendro: sin tarea, sin
    // contexto o sin controlador no hay nada que gobernar.
    if (
      result.success &&
      result.taskId &&
      result.teammateContext &&
      result.abortController
    ) {
      startInProcessTeammate({
        identity: {
          agentId: result.agentId,
          agentName: config.name,
          teamName: config.teamName,
          color: config.color,
          planModeRequired: config.planModeRequired ?? false,
          parentSessionId: result.teammateContext.parentSessionId,
        },
        taskId: result.taskId,
        prompt: config.prompt,
        teammateContext: result.teammateContext,
        // Se le quitan los mensajes a propósito: el compañero nunca lee
        // `toolUseContext.messages` —`runAgent` lo sobreescribe con el suyo—,
        // y pasarle la conversación del padre la dejaría fija en memoria
        // durante toda la vida del compañero.
        toolUseContext: { ...this.context, messages: [] },
        abortController: result.abortController,
        model: config.model,
        systemPrompt: config.systemPrompt,
        systemPromptMode: config.systemPromptMode,
        allowedTools: config.permissions,
        allowPermissionPrompts: config.allowPermissionPrompts,
      })

      logForDebugging(
        `[InProcessBackend] Started agent execution for ${result.agentId}`,
      )
    }

    return {
      success: result.success,
      agentId: result.agentId,
      taskId: result.taskId,
      abortController: result.abortController,
      error: result.error,
    }
  }

  /**
   * Le entrega un mensaje al compañero por su buzón en disco.
   *
   * El canal es el mismo que el de los compañeros de panel: no hay atajo en
   * memoria por vivir en el mismo proceso.
   */
  async sendMessage(agentId: string, message: TeammateMessage): Promise<void> {
    logForDebugging(
      `[InProcessBackend] sendMessage() to ${agentId}: ${message.text.substring(0, 50)}...`,
    )

    // El identificador tiene la forma `agentName@teamName`.
    const parsed = parseAgentId(agentId)
    if (!parsed) {
      logForDebugging(`[InProcessBackend] Invalid agentId format: ${agentId}`)
      throw new Error(
        `Invalid agentId format: ${agentId}. Expected format: agentName@teamName`,
      )
    }

    const { agentName, teamName } = parsed

    await writeToMailbox(
      agentName,
      {
        text: message.text,
        from: message.from,
        color: message.color,
        timestamp: message.timestamp ?? new Date().toISOString(),
      },
      teamName,
    )

    logForDebugging(`[InProcessBackend] sendMessage() completed for ${agentId}`)
  }

  /**
   * Le pide al compañero que se apague, y lo marca como pedido.
   *
   * No lo mata: le escribe la petición al buzón y deja que él decida —puede
   * aprobarla y salir, o rechazarla y seguir—. Por eso no hace falta ningún
   * `killPane()` como en los respaldos de panel.
   */
  async terminate(agentId: string, reason?: string): Promise<boolean> {
    logForDebugging(
      `[InProcessBackend] terminate() called for ${agentId}: ${reason}`,
    )

    if (!this.context) {
      logForDebugging(
        `[InProcessBackend] terminate() failed: no context set for ${agentId}`,
      )
      return false
    }

    const state = this.context.getAppState()
    const task = findTeammateTaskByAgentId(agentId, state.tasks)

    if (!task) {
      logForDebugging(
        `[InProcessBackend] terminate() failed: task not found for ${agentId}`,
      )
      return false
    }

    // Con una petición ya en vuelo no se manda otra: devuelve `true` porque el
    // apagado está pedido, que es lo que el llamador quería.
    if (task.shutdownRequested) {
      logForDebugging(
        `[InProcessBackend] terminate(): shutdown already requested for ${agentId}`,
      )
      return true
    }

    const requestId = `shutdown-${agentId}-${Date.now()}`

    const shutdownRequest = createShutdownRequestMessage({
      requestId,
      // Terminar es siempre cosa del líder.
      from: 'team-lead',
      reason,
    })

    const teammateAgentName = task.identity.agentName
    await writeToMailbox(
      teammateAgentName,
      {
        from: 'team-lead',
        text: jsonStringify(shutdownRequest),
        timestamp: new Date().toISOString(),
      },
      task.identity.teamName,
    )

    requestTeammateShutdown(task.id, this.context.setAppState)

    logForDebugging(
      `[InProcessBackend] terminate() sent shutdown request to ${agentId}`,
    )

    return true
  }

  /**
   * Lo mata de inmediato: aborta sus operaciones y deja su tarea en `killed`.
   *
   * Es la vía dura frente a `terminate()`, que negocia.
   */
  async kill(agentId: string): Promise<boolean> {
    logForDebugging(`[InProcessBackend] kill() called for ${agentId}`)

    if (!this.context) {
      logForDebugging(
        `[InProcessBackend] kill() failed: no context set for ${agentId}`,
      )
      return false
    }

    const state = this.context.getAppState()
    const task = findTeammateTaskByAgentId(agentId, state.tasks)

    if (!task) {
      logForDebugging(
        `[InProcessBackend] kill() failed: task not found for ${agentId}`,
      )
      return false
    }

    const killed = killInProcessTeammate(task.id, this.context.setAppState)

    logForDebugging(
      `[InProcessBackend] kill() ${killed ? 'succeeded' : 'failed'} for ${agentId}`,
    )

    return killed
  }

  /**
   * Si el compañero sigue vivo: existe, su tarea está `running`, y su
   * controlador no está abortado.
   *
   * Sin controlador se cuenta como abortado —`?? true`—, que es lo
   * conservador: un compañero cuyo controlador se perdió no se puede gobernar.
   */
  async isActive(agentId: string): Promise<boolean> {
    logForDebugging(`[InProcessBackend] isActive() called for ${agentId}`)

    if (!this.context) {
      logForDebugging(
        `[InProcessBackend] isActive() failed: no context set for ${agentId}`,
      )
      return false
    }

    const state = this.context.getAppState()
    const task = findTeammateTaskByAgentId(agentId, state.tasks)

    if (!task) {
      logForDebugging(
        `[InProcessBackend] isActive(): task not found for ${agentId}`,
      )
      return false
    }

    const isRunning = task.status === 'running'
    const isAborted = task.abortController?.signal.aborted ?? true

    const active = isRunning && !isAborted

    logForDebugging(
      `[InProcessBackend] isActive() for ${agentId}: ${active} (running=${isRunning}, aborted=${isAborted})`,
    )

    return active
  }
}

/** Construye un ejecutor en proceso. Lo consume `registry.ts`. */
export function createInProcessBackend(): InProcessBackend {
  return new InProcessBackend()
}
