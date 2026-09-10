/**
 * El adaptador que hace de un backend de panes un ejecutor de compañeros.
 *
 * Procedencia: `ccnmt: packages/swarm/src/backends/PaneBackendExecutor.ts`
 * (359 líneas, 2 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * POR QUÉ EXISTE. `TeammateExecutor` es la única interfaz que el resto del
 * paquete conoce, y `InProcessBackend` ya la cumple. Sin este adaptador,
 * `getTeammateExecutor()` devolvería algo útil sólo en el modo in-process y
 * nada en tmux o iTerm2 — o sea, el llamador tendría que ramificar por modo
 * de ejecución en cada sitio.
 *
 * La correspondencia `agentId → paneId` vive en este objeto y en ningún otro
 * sitio: es lo que permite matar el pane correcto, y por eso `kill()` de
 * alguien que este ejecutor no engendró devuelve `false` en vez de adivinar.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import {
  formatAgentId,
  getSessionId,
  jsonStringify,
  logForDebugging,
  parseAgentId,
  quote,
  registerCleanup,
} from '../adapters/appRuntime.js'
import type { ToolUseContext } from '../adapters/appRuntime.js'
import { assignTeammateColor } from '../core/teammateColors.js'
import { writeToMailbox } from '../mailbox/index.js'
import {
  buildInheritedCliFlags,
  buildInheritedEnvVars,
  getTeammateCommand,
} from '../runtime/spawnUtils.js'
import { isInsideTmux } from './detection.js'
import type {
  BackendType,
  PaneBackend,
  TeammateExecutor,
  TeammateMessage,
  TeammateSpawnConfig,
  TeammateSpawnResult,
} from './types.js'

/** Lo que hace falta recordar de cada compañero engendrado. */
type SpawnedTeammate = {
  paneId: string
  /**
   * Si el líder estaba DENTRO de tmux al engendrarlo.
   *
   * Decide por qué socket se le habla después: fuera de tmux el pane vive en
   * una sesión externa, y usar el socket equivocado deja el pane mudo sin
   * error visible.
   */
  insideTmux: boolean
}

export class PaneBackendExecutor implements TeammateExecutor {
  readonly type: BackendType

  private backend: PaneBackend
  private context: ToolUseContext | null = null
  private spawnedTeammates: Map<string, SpawnedTeammate>
  private cleanupRegistered = false

  constructor(backend: PaneBackend) {
    this.backend = backend
    this.type = backend.type
    this.spawnedTeammates = new Map()
  }

  /**
   * Fija el contexto de herramienta, del que sale el estado de la aplicación.
   *
   * Se llama ANTES de `spawn()`: sin él no se puede leer el modo de permisos
   * que el compañero debe heredar.
   */
  setContext(context: ToolUseContext): void {
    this.context = context
  }

  async isAvailable(): Promise<boolean> {
    return this.backend.isAvailable()
  }

  async spawn(config: TeammateSpawnConfig): Promise<TeammateSpawnResult> {
    const agentId = formatAgentId(config.name, config.teamName)

    // El contexto se comprueba ANTES de tocar el backend: crear el pane y
    // descubrir después que falta dejaría un pane huérfano en la pantalla del
    // usuario, sin proceso dentro y sin nadie que lo recuerde.
    if (!this.context) {
      logForDebugging(
        `[PaneBackendExecutor] spawn() called without context for ${config.name}`,
      )
      return {
        success: false,
        agentId,
        error:
          'PaneBackendExecutor not initialized. Call setContext() before spawn().',
      }
    }

    try {
      const teammateColor = config.color ?? assignTeammateColor(agentId)

      const { paneId, isFirstTeammate } =
        await this.backend.createTeammatePaneInSwarmView(
          config.name,
          teammateColor,
        )

      const insideTmux = await isInsideTmux()

      // El borde con estado es una opción de tmux: fuera de tmux no existe, y
      // sólo hace falta encenderla una vez por ventana.
      if (isFirstTeammate && insideTmux) {
        await this.backend.enablePaneBorderStatus()
      }

      const binaryPath = getTeammateCommand()

      const teammateArgs = [
        `--agent-id ${quote([agentId])}`,
        `--agent-name ${quote([config.name])}`,
        `--team-name ${quote([config.teamName])}`,
        `--agent-color ${quote([teammateColor])}`,
        // Sin sesión padre declarada se hereda la viva: un compañero sin
        // padre queda huérfano en el registro de sesiones y nadie puede
        // reconstruir de qué tanda salió.
        `--parent-session-id ${quote([config.parentSessionId || getSessionId()])}`,
        config.planModeRequired ? '--plan-mode-required' : '',
      ]
        .filter(Boolean)
        .join(' ')

      const appState = this.context.getAppState()
      let inheritedFlags = buildInheritedCliFlags({
        planModeRequired: config.planModeRequired,
        permissionMode: appState.toolPermissionContext.mode,
      })

      if (config.model) {
        // El modelo propio SUSTITUYE al heredado. Emitir los dos deja que el
        // analizador de argumentos del hijo decida cuál gana, y esa decisión
        // no es nuestra ni está declarada en ningún sitio.
        inheritedFlags = inheritedFlags
          .split(' ')
          .filter(
            (flag, i, arr) => flag !== '--model' && arr[i - 1] !== '--model',
          )
          .join(' ')
        inheritedFlags = inheritedFlags
          ? `${inheritedFlags} --model ${quote([config.model])}`
          : `--model ${quote([config.model])}`
      }

      const flagsStr = inheritedFlags ? ` ${inheritedFlags}` : ''
      const envStr = buildInheritedEnvVars()

      const spawnCommand = `cd ${quote([config.cwd])} && env ${envStr} ${quote([binaryPath])} ${teammateArgs}${flagsStr}`

      await this.backend.sendCommandToPane(paneId, spawnCommand, !insideTmux)

      this.spawnedTeammates.set(agentId, { paneId, insideTmux })

      // UNA sola limpieza para todos. Registrar una por compañero deja N
      // cierres compitiendo por el mismo mapa cuando el líder recibe SIGHUP.
      if (!this.cleanupRegistered) {
        this.cleanupRegistered = true
        registerCleanup(async () => {
          for (const [id, info] of this.spawnedTeammates) {
            logForDebugging(
              `[PaneBackendExecutor] Cleanup: killing pane for ${id}`,
            )
            await this.backend.killPane(info.paneId, !info.insideTmux)
          }
          this.spawnedTeammates.clear()
        })
      }

      // El encargo inicial viaja por el buzón, no por el pane: escribirlo en
      // la terminal lo dejaría a merced de lo que el proceso hijo hiciera con
      // su entrada estándar antes de estar listo.
      await writeToMailbox(
        config.name,
        {
          from: 'team-lead',
          text: config.prompt,
          timestamp: new Date().toISOString(),
        },
        config.teamName,
      )

      logForDebugging(
        `[PaneBackendExecutor] Spawned teammate ${agentId} in pane ${paneId}`,
      )

      return { success: true, agentId, paneId }
    } catch (error) {
      // El líder está en medio de una tanda: una excepción que sube aborta al
      // resto de los compañeros por el fallo de uno.
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logForDebugging(
        `[PaneBackendExecutor] Failed to spawn ${agentId}: ${errorMessage}`,
      )
      return { success: false, agentId, error: errorMessage }
    }
  }

  /**
   * Manda un mensaje por el buzón del compañero.
   *
   * Todos los compañeros —de pane y en proceso— comparten el mismo mensajero,
   * así que el remitente no tiene que saber en qué modo corre el destinatario.
   */
  async sendMessage(agentId: string, message: TeammateMessage): Promise<void> {
    logForDebugging(
      `[PaneBackendExecutor] sendMessage() to ${agentId}: ${message.text.substring(0, 50)}...`,
    )

    const parsed = parseAgentId(agentId)
    if (!parsed) {
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

    logForDebugging(
      `[PaneBackendExecutor] sendMessage() completed for ${agentId}`,
    )
  }

  /**
   * Pide al compañero que termine.
   *
   * Es una PETICIÓN, no una orden: el compañero cierra lo suyo y sale. Matarle
   * el pane aquí le quitaría la oportunidad de dejar su trabajo persistido,
   * que es justo lo que hace caro perderlo.
   */
  async terminate(agentId: string, reason?: string): Promise<boolean> {
    logForDebugging(
      `[PaneBackendExecutor] terminate() called for ${agentId}: ${reason}`,
    )

    const parsed = parseAgentId(agentId)
    if (!parsed) {
      logForDebugging(
        `[PaneBackendExecutor] terminate() failed: invalid agentId format`,
      )
      return false
    }

    const { agentName, teamName } = parsed

    const shutdownRequest = {
      type: 'shutdown_request',
      requestId: `shutdown-${agentId}-${Date.now()}`,
      from: 'team-lead',
      reason,
    }

    await writeToMailbox(
      agentName,
      {
        from: 'team-lead',
        text: jsonStringify(shutdownRequest),
        timestamp: new Date().toISOString(),
      },
      teamName,
    )

    logForDebugging(
      `[PaneBackendExecutor] terminate() sent shutdown request to ${agentId}`,
    )

    return true
  }

  /**
   * Mata el pane del compañero.
   *
   * Sólo alcanza a quien ESTE ejecutor engendró: el mapa es la única fuente de
   * la correspondencia, y adivinar un `paneId` mataría el de otro.
   */
  async kill(agentId: string): Promise<boolean> {
    logForDebugging(`[PaneBackendExecutor] kill() called for ${agentId}`)

    const teammateInfo = this.spawnedTeammates.get(agentId)
    if (!teammateInfo) {
      logForDebugging(
        `[PaneBackendExecutor] kill() failed: teammate ${agentId} not found in spawned map`,
      )
      return false
    }

    const { paneId, insideTmux } = teammateInfo

    const killed = await this.backend.killPane(paneId, !insideTmux)

    if (killed) {
      this.spawnedTeammates.delete(agentId)
      logForDebugging(`[PaneBackendExecutor] kill() succeeded for ${agentId}`)
    } else {
      // Olvidarlo tras un fallo lo volvería inalcanzable para siempre: el pane
      // sigue vivo y ya nadie sabe cuál es.
      logForDebugging(`[PaneBackendExecutor] kill() failed for ${agentId}`)
    }

    return killed
  }

  /**
   * ¿Sigue vivo el compañero?
   *
   * PARCIAL DECLARADO, igual que en la fuente: se responde desde el mapa, no
   * consultando al backend. El pane puede existir con el proceso muerto
   * dentro, así que esto es una cota superior. Cerrarlo exige un método nuevo
   * en `PaneBackend` —«¿existe este pane?»— que la fuente tampoco tiene.
   */
  async isActive(agentId: string): Promise<boolean> {
    logForDebugging(`[PaneBackendExecutor] isActive() called for ${agentId}`)

    if (!this.spawnedTeammates.has(agentId)) {
      logForDebugging(
        `[PaneBackendExecutor] isActive(): teammate ${agentId} not found`,
      )
      return false
    }

    return true
  }
}

/** Envuelve un backend de panes como ejecutor de compañeros. */
export function createPaneBackendExecutor(
  backend: PaneBackend,
): PaneBackendExecutor {
  return new PaneBackendExecutor(backend)
}
