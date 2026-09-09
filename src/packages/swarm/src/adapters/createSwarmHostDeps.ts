/**
 * `createSwarmHostDeps` — la fábrica que compone las dependencias de anfitrión
 * de swarm: un default completo por cada sub-superficie, y el override del
 * llamante encima.
 *
 * Procedencia: `ccnmt: packages/swarm/src/adapters/createSwarmHostDeps.ts`
 * (323 líneas, 1 export). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se REIMPLEMENTA a partir de su comportamiento y no se copia; lo
 * que se conserva con fidelidad es el contrato — el nombre y la firma del
 * export, las trece sub-superficies, el orden en que el override gana al
 * default, y el colapso de estado de tarea.
 *
 * QUÉ HACE, y por qué está construido así:
 *
 * 1. **Todo tiene default.** Un anfitrión que sólo trae la mitad no revienta al
 *    componer: revienta —o no— al tocar lo que no trajo. Las superficies sin
 *    implementación posible aquí (`api.stream`, `worktree.create/remove`)
 *    rehúsan NOMBRÁNDOSE, que es lo que distingue «el anfitrión olvidó
 *    instalarlo» de «esto no existe».
 * 2. **El override es parcial y gana.** Cada superficie se compone
 *    `{...default, ...options.x}`: sobrescribir `api.getModel` no borra
 *    `api.stream`. Invertir ese orden convertiría el override en un no-op
 *    silencioso, que es el defecto más caro de esta clase de fábrica.
 * 3. **Los bindings son perezosos.** Ninguna función del anfitrión se lee al
 *    componer, sólo al llamar al método que la usa. Así se puede construir la
 *    fábrica antes de que `installSwarmAppRuntime` haya corrido.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente tipa `execute` contra el
 * registro concreto de herramientas del anfitrión y salva la distancia con
 * `as never` en cuatro puntos. Aquí se conserva ese mismo puente —es la
 * frontera entre el `Tool<I,O>` genérico de swarm y el registro concreto—
 * porque eliminarlo exigiría acoplar este paquete al registro, que es
 * justamente lo que la inyección de dependencias existe para evitar.
 */
import { existsSync } from 'node:fs'
import {
  mkdir,
  readFile as fsReadFile,
  readdir as fsReaddir,
  rm as fsRm,
  writeFile as fsWriteFile,
} from 'node:fs/promises'
import type { ToolUseContext } from '../adapters/appRuntime.js'
import {
  CLAUDE_OPUS_4_7_CONFIG,
  claimTask,
  getAgentName,
  getMainLoopModelOverride,
  getSessionId,
  getTeamName,
  getTeammateColor,
  getTeamsDir,
  isInBundledMode,
  listTasks,
  updateTask,
  updateTaskState,
} from '../adapters/appRuntime.js'
import type {
  HostApiProvider,
  HostCompaction,
  HostContextProvider,
  HostEnvironment,
  HostEventSink,
  HostFileSystem,
  HostHookCallbacks,
  HostPermissionGate,
  HostSessionManager,
  HostTask,
  HostTaskSystem,
  HostTerminalBackend,
  HostToolRegistry,
  HostUIState,
  HostWorktreeManager,
  SwarmHostDeps,
} from '../types/deps.js'

type CreateSwarmHostDepsOptions = {
  context?: Partial<ToolUseContext>
  api?: Partial<HostApiProvider>
  tools?: Partial<HostToolRegistry>
  permissions?: Partial<HostPermissionGate>
  compaction?: Partial<HostCompaction>
  contextProvider?: Partial<HostContextProvider>
  session?: Partial<HostSessionManager>
  events?: Partial<HostEventSink>
  hooks?: Partial<HostHookCallbacks>
  fs?: Partial<HostFileSystem>
  terminal?: HostTerminalBackend
  tasks?: Partial<HostTaskSystem>
  ui?: Partial<HostUIState>
  worktree?: Partial<HostWorktreeManager>
  env?: Partial<HostEnvironment>
}

/**
 * Rehúsa nombrando la superficie que falta.
 *
 * El nombre en el mensaje no es cortesía: sin él, un anfitrión incompleto
 * produce un error que no dice cuál de las trece superficies hay que traer.
 */
function notImplemented(name: string): never {
  throw new Error(`Swarm host dependency not implemented: ${name}`)
}

function getToolsFromContext(
  context?: Partial<ToolUseContext>,
): readonly NonNullable<ToolUseContext['options']>['tools'] {
  return context?.options?.tools ?? []
}

/**
 * Colapsa los cinco estados de la fuente en los tres del anfitrión.
 *
 * `running`, `failed` y `killed` caen los tres en `in_progress`. NO es una
 * pérdida accidental: `HostTask` sólo distingue «no ha empezado», «en curso» y
 * «terminó bien», y una tarea muerta sigue siendo una tarea que empezó. Quien
 * necesite el desenlace lo lee del sistema de tareas, no de esta proyección.
 */
function toHostTask(task: {
  id: string
  subject: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'killed'
  owner?: string
  blockedBy?: string[]
}): HostTask {
  return {
    id: task.id,
    subject: task.subject,
    description: task.description,
    status:
      task.status === 'completed'
        ? 'completed'
        : task.status === 'pending'
          ? 'pending'
          : 'in_progress',
    owner: task.owner,
    // Lista vacía, no `undefined`: quien la recorra no tiene que guardarse.
    blockedBy: task.blockedBy ?? [],
  }
}

export function createSwarmHostDeps(
  options: CreateSwarmHostDepsOptions = {},
): SwarmHostDeps {
  const { context } = options
  // El de tareas primero: un anfitrión que separa el estado de tareas del
  // estado general expone los dos, y el de tareas es el que manda aquí.
  const setAppState = context?.setAppStateForTasks ?? context?.setAppState

  return {
    api: {
      async *stream(_params) {
        notImplemented('api.stream')
      },
      getModel() {
        return (
          context?.options?.mainLoopModel ??
          getMainLoopModelOverride() ??
          CLAUDE_OPUS_4_7_CONFIG.name
        )
      },
      ...options.api,
    } satisfies HostApiProvider,

    tools: {
      find(name) {
        return getToolsFromContext(context).find(
          tool => tool.name === name || (tool.aliases?.includes(name) ?? false),
        )
      },
      list() {
        return [...getToolsFromContext(context)]
      },
      async execute(tool, input, toolContext) {
        // Sin puerta de permisos inyectada, el default permite: la decisión de
        // negar es del anfitrión, y fabricarla aquí la escondería.
        const canUseTool = options.permissions?.canUseTool
          ? async (
              requestedTool: typeof tool,
              requestedInput: unknown,
              requestedContext: typeof toolContext,
            ) => {
              const result = await options.permissions!.canUseTool(
                requestedTool,
                requestedInput,
                requestedContext,
              )
              return {
                behavior: result.allowed ? 'allow' : 'deny',
                message: result.reason,
                updatedInput: requestedInput,
              }
            }
          : async () => ({ behavior: 'allow' as const, updatedInput: input })

        if (!context) {
          notImplemented('tools.execute without ToolUseContext')
        }
        const parentMessage = {
          type: 'assistant',
          message: { id: 'swarm-host-deps', content: [] },
          uuid: '00000000-0000-0000-0000-000000000000',
        } as const
        const result = await tool.call(
          input as never,
          context as ToolUseContext,
          canUseTool as never,
          parentMessage as never,
        )
        return { content: result.data, metadata: result.mcpMeta } as never
      },
      ...options.tools,
    } satisfies HostToolRegistry,

    permissions: {
      async canUseTool() {
        return { allowed: true }
      },
      ...options.permissions,
    } satisfies HostPermissionGate,

    compaction: {
      async maybeCompact(messages) {
        return { compacted: false, messages }
      },
      ...options.compaction,
    } satisfies HostCompaction,

    context: {
      async getSystemPrompt() {
        return []
      },
      getUserContext() {
        return {}
      },
      getSystemContext() {
        return {}
      },
      ...options.contextProvider,
    } satisfies HostContextProvider,

    session: {
      async recordTranscript() {},
      getSessionId() {
        return getSessionId()
      },
      ...options.session,
    } satisfies HostSessionManager,

    events: {
      emit() {},
      ...options.events,
    } satisfies HostEventSink,

    hooks: {
      async onTurnStart() {},
      async onTurnEnd() {},
      async onStop() {
        return { blockingErrors: [], preventContinuation: false }
      },
      ...options.hooks,
    } satisfies HostHookCallbacks,

    fs: {
      readFile(path) {
        return fsReadFile(path, 'utf8')
      },
      writeFile(path, content) {
        return fsWriteFile(path, content)
      },
      mkdir(path, mkdirOptions) {
        return mkdir(path, mkdirOptions)
      },
      exists(path) {
        return Promise.resolve(existsSync(path))
      },
      rm(path, rmOptions) {
        return fsRm(path, rmOptions)
      },
      readdir(path) {
        return fsReaddir(path)
      },
      ...options.fs,
    } satisfies HostFileSystem,

    terminal: options.terminal,

    tasks: {
      async listTasks(listId) {
        const tasks = await listTasks(listId)
        return tasks.map(toHostTask)
      },
      async claimTask(listId, taskId, agentName) {
        return claimTask(listId, taskId, agentName)
      },
      async updateTask(listId, taskId, updates) {
        await updateTask(listId, taskId, updates as never)
      },
      ...options.tasks,
    } satisfies HostTaskSystem,

    ui: {
      updateTask(taskId, updater) {
        // Sin `setAppState` no hay estado que actualizar. La guarda convierte
        // eso en un no-op en vez de en un fallo del anfitrión: swarm corre
        // igual sin interfaz, y ésta es la superficie que lo permite.
        if (!setAppState) {
          return
        }
        updateTaskState(taskId, setAppState, task => updater(task) as never)
      },
      getAppState() {
        return context?.getAppState?.() ?? null
      },
      ...options.ui,
    } satisfies HostUIState,

    worktree: {
      async create() {
        notImplemented('worktree.create')
      },
      async remove() {
        notImplemented('worktree.remove')
      },
      async validate() {
        return false
      },
      ...options.worktree,
    } satisfies HostWorktreeManager,

    env: {
      getTeamsDir() {
        return getTeamsDir()
      },
      getTeamName() {
        return getTeamName()
      },
      getAgentName() {
        return getAgentName()
      },
      getAgentColor() {
        return getTeammateColor()
      },
      getSessionId() {
        return getSessionId()
      },
      isEnabled(feature) {
        switch (feature) {
          case 'bundled':
            return isInBundledMode()
          default:
            // Una bandera desconocida es `false`, no un throw: el consumidor
            // pregunta por capacidades opcionales y no debe romperse por una
            // que este anfitrión no conoce.
            return false
        }
      },
      ...options.env,
    } satisfies HostEnvironment,
  }
}
