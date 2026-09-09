/**
 * Ejecutar a un compañero DENTRO de este proceso, en un bucle de prompts.
 *
 * Procedencia: `ccnmt: packages/swarm/src/runtime/inProcessRunner.ts` (1289
 * líneas, 11 símbolos de nivel de módulo). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia: mismos
 * nombres, mismas firmas, mismo comportamiento, escrito aquí.
 *
 * Es el hermano de ejecución de `spawnInProcess.ts`: aquél crea el contexto y
 * registra la tarea; éste envuelve `runAgent()` y lo mantiene vivo entre
 * prompts. A diferencia de una tarea de fondo, un compañero no muere al
 * terminar su turno — queda en reposo, avisa al líder, y espera el siguiente
 * mensaje o la petición de apagado.
 *
 * DIVERGENCIAS DECLARADAS
 *
 * 1. `feature('BASH_CLASSIFIER')` de `bun:bundle` no resuelve fuera del build
 *    de ccnmt. Se sustituye por `process.env.CCB_FEATURE_BASH_CLASSIFIER ===
 *    '1'`, que es el sustituto ya establecido en este porte
 *    (`updater/src/nativeInstaller/download.ts:48-50`,
 *    `voice/src/voiceModeEnabled.ts`, `provider/src/betasConstants.ts`).
 *    **El default es APAGADO, y está medido**: `ccnmt:
 *    scripts/default-features.ts:16-67` declara 39 banderas en
 *    `STABLE_FEATURES` y BASH_CLASSIFIER **no** está entre ellas;
 *    `ccnmt: docs/feature-flags.md:98` la lista como bandera *registrada*, no
 *    como habilitada. Así que la comparación con `'1'` reproduce el default de
 *    la fuente, no lo invierte.
 *
 * 2. **Ocho imports de la fuente no se portan** porque su cuerpo no los
 *    referencia — medido con `grep -c` sobre las líneas 118-1289 del original:
 *    `claimTask`, `listTasks`, `updateTask`, `Task`, `count`, `sleep`
 *    (`appRuntime`) e `isShutdownRequest` (`mailbox/index.js`) dan **0 usos**
 *    cada uno; `Task` da 1, y es una palabra dentro de un comentario. El
 *    octavo es `Tool`, que aquí sobra por la divergencia 3. Se declara para
 *    que una comparación futura de símbolos no lea la ausencia como hueco.
 *
 * 3. `adapters/appRuntime.ts` ensancha los tipos del anfitrión a propósito
 *    (`Tool = unknown`, `AppState = unknown`, `CustomAgentDefinition =
 *    unknown`). Dos consecuencias:
 *
 *    - Los `as Tool` y el `input as never` de la fuente **se retiran**: aquí
 *      estrecharían a `unknown` y romperían la llamada. `CanUseToolFn` es
 *      `(...args: any[]) => Promise<any>`, así que los parámetros ya llegan
 *      laxos y el acceso a `tool.name` / `tool.description()` es directo.
 *    - Leer del `agentDefinition` del anfitrión exige nombrar los campos que
 *      este módulo lee. `AgentDefinitionFields` declara **los cuatro que
 *      lee**, no una forma completa inventada: eso último sería la promesa que
 *      el comentario del adaptador dice no sostener.
 *
 * 4. El acceso `prev.tasks[taskId]` sobre `AppState = unknown` produce TS18046,
 *    exactamente igual que en su hermano `spawnInProcess.ts:233`. Es la
 *    condición preexistente del paquete —medida antes de este porte: 321
 *    errores de `tsc --noEmit` bajo `src/packages/swarm/`, 8 de ellos en
 *    `spawnInProcess.ts`— y se reproduce el mismo modismo en vez de inventar
 *    un tercero, que es lo que dejaría dos formas de lo mismo conviviendo.
 *
 * 5. **Fuera de alcance del control**: todo lo que hay más allá de `runAgent`
 *    —la compactación, el bucle de mensajes, la espera del siguiente prompt—
 *    es integración con el anfitrión y no se puede ejercitar sin él. Se declara
 *    en vez de fabricarle un control que no discriminaría (sub-patrón D de
 *    `metrica-decide-la-conclusion.md`). Lo que sí se ejercita son las tres
 *    costuras puras: la forma del sobre, la guarda del actualizador de estado
 *    y la puerta de la bandera.
 */
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import {
  applyPermissionUpdates,
  asSystemPrompt,
  awaitClassifierAutoApproval,
  BASH_TOOL_NAME,
  buildPostCompactMessages,
  cloneFileStateCache,
  compactConversation,
  createAbortController,
  createActivityDescriptionResolver,
  createAssistantAPIErrorMessage,
  createContentReplacementState,
  createProgressTracker,
  createUserMessage,
  emitTaskTerminatedSdk,
  ERROR_MESSAGE_USER_ABORT,
  evictTaskOutput,
  evictTerminalTask,
  getAutoCompactThreshold,
  getProgressUpdate,
  getSystemPrompt,
  hasPermissionsToUseTool,
  jsonStringify,
  logEvent,
  logForDebugging,
  persistPermissionUpdates,
  processMailboxPermissionResponse,
  registerPermissionCallback,
  resetMicrocompactState,
  runAgent,
  runWithAgentContext,
  runWithTeammateContext,
  SEND_MESSAGE_TOOL_NAME,
  SUBAGENT_REJECT_MESSAGE,
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
  TASK_CREATE_TOOL_NAME,
  TASK_GET_TOOL_NAME,
  TASK_LIST_TOOL_NAME,
  TASK_UPDATE_TOOL_NAME,
  TEAM_CREATE_TOOL_NAME,
  TEAM_DELETE_TOOL_NAME,
  TEAMMATE_MESSAGE_TAG,
  tokenCountWithEstimation,
  unregisterAgent as unregisterPerfettoAgent,
  unregisterPermissionCallback,
  updateProgressFromMessage,
} from '../adapters/appRuntime.js'
import type {
  AgentContext,
  AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AppState,
  CanUseToolFn,
  CustomAgentDefinition,
  Message,
  ModelAlias,
  PermissionDecision,
  PermissionUpdate,
  TeammateContext,
  ToolUseContext,
} from '../adapters/appRuntime.js'
import { TEAM_LEAD_NAME } from '../core/constants.js'
import { TEAMMATE_SYSTEM_PROMPT_ADDENDUM } from '../core/teammatePromptAddendum.js'
import {
  createIdleNotification,
  getLastPeerDmSummary,
  isPermissionResponse,
  markMessageAsReadByIndex,
  readMailbox,
  writeToMailbox,
} from '../mailbox/index.js'
import {
  createPermissionRequest,
  sendPermissionRequestViaMailbox,
} from '../permissions/index.js'
import {
  getLeaderSetToolPermissionContext,
  getLeaderToolUseConfirmQueue,
} from '../permissions/leaderPermissionBridge.js'
import { appendTeammateMessage } from '../tasks/InProcessTeammateTask.js'
import {
  appendCappedMessage,
  type InProcessTeammateTaskState,
  type TeammateIdentity,
} from '../tasks/types.js'
import {
  tryClaimNextTask,
  waitForNextPromptOrShutdown,
} from './pollForPromptOrShutdown.js'

type SetAppStateFn = (updater: (prev: AppState) => AppState) => void

/**
 * Los cuatro campos que este módulo LEE de la definición de agente que trae el
 * anfitrión. No es la forma completa de `CustomAgentDefinition` — ver la
 * divergencia 3 de la cabecera.
 */
type AgentDefinitionFields = {
  getSystemPrompt(): string | undefined
  memory?: string
  tools?: string[]
  model?: string
  agentType?: string
}

const PERMISSION_POLL_INTERVAL_MS = 500

/**
 * ¿Está encendida la aprobación automática por clasificador para Bash?
 *
 * Es la puerta que en la fuente abre `feature('BASH_CLASSIFIER')`. Se lee del
 * entorno en CADA llamada, no en un `const` de módulo: una constante congelaría
 * el valor al importar y haría inalcanzable la otra rama desde un control.
 */
function bashClassifierEnabled(): boolean {
  return process.env.CCB_FEATURE_BASH_CLASSIFIER === '1'
}

/**
 * La función de permiso de un compañero en proceso: resuelve el `ask` por la
 * interfaz del líder en vez de tratarlo como una negativa.
 *
 * Camino normal: el diálogo de confirmación del líder, con distintivo de
 * trabajador, de modo que el compañero obtiene la misma interfaz por
 * herramienta que las herramientas del propio líder.
 *
 * Camino de respaldo, cuando el puente con la interfaz no está: se manda la
 * petición al buzón del líder y se sondea el buzón propio esperando respuesta.
 */
function createInProcessCanUseTool(
  identity: TeammateIdentity,
  abortController: AbortController,
  onPermissionWaitMs?: (waitMs: number) => void,
): CanUseToolFn {
  return async (
    tool,
    input,
    toolUseContext,
    assistantMessage,
    toolUseID,
    forceDecision,
  ) => {
    const result =
      forceDecision ??
      (await hasPermissionsToUseTool(
        tool,
        input,
        toolUseContext,
        assistantMessage,
        toolUseID,
      ))

    // Permitir y denegar pasan tal cual: sólo el `ask` necesita interfaz.
    if (result.behavior !== 'ask') {
      return result
    }

    // En Bash se intenta primero la aprobación automática por clasificador.
    // El compañero la ESPERA, en vez de correrla contra la interacción del
    // usuario como hace el agente principal.
    if (
      bashClassifierEnabled() &&
      tool.name === BASH_TOOL_NAME &&
      result.pendingClassifierCheck
    ) {
      const classifierDecision = await awaitClassifierAutoApproval(
        result.pendingClassifierCheck,
        abortController.signal,
        toolUseContext.options.isNonInteractiveSession,
      )
      if (classifierDecision) {
        return {
          behavior: 'allow',
          updatedInput: input as Record<string, unknown>,
          decisionReason: classifierDecision,
        }
      }
    }

    if (abortController.signal.aborted) {
      return { behavior: 'ask', message: SUBAGENT_REJECT_MESSAGE }
    }

    const appState = toolUseContext.getAppState()

    const description = await tool.description(input, {
      isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
      toolPermissionContext: appState.toolPermissionContext,
      tools: toolUseContext.options.tools,
    })

    // Se vuelve a mirar: describir la herramienta puede tardar, y en ese
    // hueco el compañero pudo abortar.
    if (abortController.signal.aborted) {
      return { behavior: 'ask', message: SUBAGENT_REJECT_MESSAGE }
    }

    const setToolUseConfirmQueue = getLeaderToolUseConfirmQueue()

    if (setToolUseConfirmQueue) {
      return new Promise<PermissionDecision>(resolve => {
        let decisionMade = false
        const permissionStartMs = Date.now()

        // Lo que el usuario tardó en decidir se le informa a quien llama para
        // que lo descuente del tiempo transcurrido que muestra.
        const reportPermissionWait = () => {
          onPermissionWaitMs?.(Date.now() - permissionStartMs)
        }

        const onAbortListener = () => {
          if (decisionMade) return
          decisionMade = true
          reportPermissionWait()
          resolve({ behavior: 'ask', message: SUBAGENT_REJECT_MESSAGE })
          setToolUseConfirmQueue((queue: { toolUseID: string }[]) =>
            queue.filter(item => item.toolUseID !== toolUseID),
          )
        }

        abortController.signal.addEventListener('abort', onAbortListener, {
          once: true,
        })

        setToolUseConfirmQueue((queue: unknown[]) => [
          ...queue,
          {
            assistantMessage,
            tool,
            description,
            input,
            toolUseContext,
            toolUseID,
            permissionResult: result,
            permissionPromptStartTimeMs: permissionStartMs,
            workerBadge: identity.color
              ? { name: identity.agentName, color: identity.color }
              : undefined,
            onUserInteraction() {
              // Sin efecto para un compañero: no hay aprobación automática por
              // clasificador que cancelar aquí.
            },
            onAbort() {
              if (decisionMade) return
              decisionMade = true
              abortController.signal.removeEventListener(
                'abort',
                onAbortListener,
              )
              reportPermissionWait()
              resolve({ behavior: 'ask', message: SUBAGENT_REJECT_MESSAGE })
            },
            async onAllow(
              updatedInput: Record<string, unknown>,
              permissionUpdates: PermissionUpdate[],
              feedback?: string,
              contentBlocks?: ContentBlockParam[],
            ) {
              if (decisionMade) return
              decisionMade = true
              abortController.signal.removeEventListener(
                'abort',
                onAbortListener,
              )
              reportPermissionWait()
              persistPermissionUpdates(permissionUpdates)
              // Los permisos concedidos vuelven al contexto compartido del
              // líder; si no, el compañero los perdería al terminar el turno.
              if (permissionUpdates.length > 0) {
                const setToolPermissionContext =
                  getLeaderSetToolPermissionContext()
                if (setToolPermissionContext) {
                  const currentAppState = toolUseContext.getAppState()
                  const updatedContext = applyPermissionUpdates(
                    currentAppState.toolPermissionContext,
                    permissionUpdates,
                  )
                  // El modo del líder se preserva: el contexto del trabajador
                  // llega transformado a 'acceptEdits' y no debe filtrarse de
                  // vuelta al coordinador.
                  setToolPermissionContext(updatedContext, {
                    preserveMode: true,
                  })
                }
              }
              const trimmedFeedback = feedback?.trim()
              resolve({
                behavior: 'allow',
                updatedInput,
                userModified: false,
                acceptFeedback: trimmedFeedback || undefined,
                ...(contentBlocks &&
                  contentBlocks.length > 0 && { contentBlocks }),
              })
            },
            onReject(feedback?: string, contentBlocks?: ContentBlockParam[]) {
              if (decisionMade) return
              decisionMade = true
              abortController.signal.removeEventListener(
                'abort',
                onAbortListener,
              )
              reportPermissionWait()
              const message = feedback
                ? `${SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX}${feedback}`
                : SUBAGENT_REJECT_MESSAGE
              resolve({ behavior: 'ask', message, contentBlocks })
            },
            async recheckPermission() {
              if (decisionMade) return
              const freshResult = await hasPermissionsToUseTool(
                tool,
                input,
                toolUseContext,
                assistantMessage,
                toolUseID,
              )
              if (freshResult.behavior === 'allow') {
                decisionMade = true
                abortController.signal.removeEventListener(
                  'abort',
                  onAbortListener,
                )
                reportPermissionWait()
                setToolUseConfirmQueue((queue: { toolUseID: string }[]) =>
                  queue.filter(item => item.toolUseID !== toolUseID),
                )
                resolve({
                  ...freshResult,
                  updatedInput: input,
                  userModified: false,
                })
              }
            },
          },
        ])
      })
    }

    // Respaldo: el buzón, cuando la cola de la interfaz del líder no está.
    return new Promise<PermissionDecision>(resolve => {
      const request = createPermissionRequest({
        toolName: tool.name,
        toolUseId: toolUseID,
        input,
        description,
        permissionSuggestions: result.suggestions,
        workerId: identity.agentId,
        workerName: identity.agentName,
        workerColor: identity.color,
        teamName: identity.teamName,
      })

      registerPermissionCallback({
        requestId: request.id,
        toolUseId: toolUseID,
        onAllow(
          updatedInput: Record<string, unknown> | undefined,
          permissionUpdates: PermissionUpdate[],
          _feedback?: string,
          contentBlocks?: ContentBlockParam[],
        ) {
          cleanup()
          persistPermissionUpdates(permissionUpdates)
          const finalInput =
            updatedInput && Object.keys(updatedInput).length > 0
              ? updatedInput
              : input
          resolve({
            behavior: 'allow',
            updatedInput: finalInput,
            userModified: false,
            ...(contentBlocks && contentBlocks.length > 0 && { contentBlocks }),
          })
        },
        onReject(feedback?: string, contentBlocks?: ContentBlockParam[]) {
          cleanup()
          const message = feedback
            ? `${SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX}${feedback}`
            : SUBAGENT_REJECT_MESSAGE
          resolve({ behavior: 'ask', message, contentBlocks })
        },
      })

      void sendPermissionRequestViaMailbox(request)

      const pollInterval = setInterval(async () => {
        if (abortController.signal.aborted) {
          cleanup()
          resolve({ behavior: 'ask', message: SUBAGENT_REJECT_MESSAGE })
          return
        }

        const allMessages = await readMailbox(
          identity.agentName,
          identity.teamName,
        )
        for (let i = 0; i < allMessages.length; i++) {
          const msg = allMessages[i]
          if (msg && !msg.read) {
            const parsed = isPermissionResponse(msg.text)
            if (parsed && parsed.request_id === request.id) {
              await markMessageAsReadByIndex(
                identity.agentName,
                identity.teamName,
                i,
              )
              if (parsed.subtype === 'success') {
                processMailboxPermissionResponse({
                  requestId: parsed.request_id,
                  decision: 'approved',
                  updatedInput: parsed.response?.updated_input,
                  permissionUpdates: parsed.response?.permission_updates,
                })
              } else {
                processMailboxPermissionResponse({
                  requestId: parsed.request_id,
                  decision: 'rejected',
                  feedback: parsed.error,
                })
              }
              // La promesa la resuelve la retrollamada registrada arriba.
              return
            }
          }
        }
      }, PERMISSION_POLL_INTERVAL_MS)

      const onAbortListener = () => {
        cleanup()
        resolve({ behavior: 'ask', message: SUBAGENT_REJECT_MESSAGE })
      }

      abortController.signal.addEventListener('abort', onAbortListener, {
        once: true,
      })

      function cleanup() {
        clearInterval(pollInterval)
        unregisterPermissionCallback(request.id)
        abortController.signal.removeEventListener('abort', onAbortListener)
      }
    })
  }
}

/**
 * El sobre XML `<teammate-message>` con que un mensaje entra a la conversación.
 *
 * Es lo que hace que el modelo vea los mensajes de un compañero en proceso con
 * la misma forma que los de un compañero en panel: el sobre es el contrato, no
 * el transporte.
 */
function formatAsTeammateMessage(
  from: string,
  content: string,
  color?: string,
  summary?: string,
): string {
  const colorAttr = color ? ` color="${color}"` : ''
  const summaryAttr = summary ? ` summary="${summary}"` : ''
  return `<${TEAMMATE_MESSAGE_TAG} teammate_id="${from}"${colorAttr}${summaryAttr}>\n${content}\n</${TEAMMATE_MESSAGE_TAG}>`
}

/**
 * Lo que hace falta para ejecutar a un compañero en proceso.
 */
export type InProcessRunnerConfig = {
  /** Identidad del compañero, para su contexto */
  identity: TeammateIdentity
  /** Identificador de la tarea en el estado de la aplicación */
  taskId: string
  /** Prompt inicial */
  prompt: string
  /** Definición de agente, si es un agente especializado */
  agentDefinition?: CustomAgentDefinition
  /** Contexto del compañero, para el almacenamiento asíncrono local */
  teammateContext: TeammateContext
  /** Contexto de uso de herramientas del padre */
  toolUseContext: ToolUseContext
  /** Controlador de aborto ligado al padre */
  abortController: AbortController
  /** Modelo que sobreescribe al de la sesión, si se declara */
  model?: string
  /** Prompt de sistema que sobreescribe al de la sesión, si se declara */
  systemPrompt?: string
  /** Cómo se aplica ese prompt: reemplazar el default, o añadirse a él */
  systemPromptMode?: 'default' | 'replace' | 'append'
  /** Herramientas que este compañero puede usar sin preguntar */
  allowedTools?: string[]
  /** Si puede pedir permiso para una herramienta fuera de la lista. Con
   * `false` (el default) las de fuera se deniegan solas. */
  allowPermissionPrompts?: boolean
  /** Descripción corta de la tarea; es el resumen del sobre del prompt inicial */
  description?: string
  /** `request_id` de la llamada al API que lo engendró, para trazar el linaje
   *  en los eventos `tengu_api_*`. */
  invokingRequestId?: string
}

/**
 * Lo que devuelve la ejecución de un compañero en proceso.
 */
export type InProcessRunnerResult = {
  /** Si la ejecución terminó bien */
  success: boolean
  /** El mensaje de error, si falló */
  error?: string
  /** Los mensajes que el agente produjo */
  messages: Message[]
}

/**
 * Actualiza el estado de una tarea de compañero en proceso.
 *
 * Las tres guardas devuelven el estado ANTERIOR sin tocarlo: la tarea no
 * existe, no es de este tipo, o el actualizador devolvió la misma referencia.
 * La tercera es la que evita un renderizado por cada iteración del bucle que no
 * cambió nada.
 *
 * El nombre coincide con un enlace del anfitrión (`appRuntime.updateTaskState`)
 * y por eso ESE no se importa: son dos mecanismos distintos con el mismo
 * nombre, y traerlos juntos haría que uno tapara al otro en silencio.
 */
function updateTaskState(
  taskId: string,
  updater: (task: InProcessTeammateTaskState) => InProcessTeammateTaskState,
  setAppState: SetAppStateFn,
): void {
  setAppState((prev: AppState) => {
    const task = prev.tasks[taskId]
    if (!task || task.type !== 'in_process_teammate') {
      return prev
    }
    const updated = updater(task as InProcessTeammateTaskState)
    if (updated === task) {
      return prev
    }
    return {
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: updated,
      },
    }
  })
}

/**
 * Escribe en el buzón del líder — el mismo que usan los compañeros en panel.
 */
async function sendMessageToLeader(
  from: string,
  text: string,
  color: string | undefined,
  teamName: string,
): Promise<void> {
  await writeToMailbox(
    TEAM_LEAD_NAME,
    {
      from,
      text,
      timestamp: new Date().toISOString(),
      color,
    },
    teamName,
  )
}

/**
 * Avisa al líder de que este compañero quedó en reposo.
 *
 * Va con `agentName` y no con `agentId` para que el líder lo lea igual venga de
 * un compañero en proceso o de uno en panel.
 */
async function sendIdleNotification(
  agentName: string,
  agentColor: string | undefined,
  teamName: string,
  options?: {
    idleReason?: 'available' | 'interrupted' | 'failed'
    summary?: string
    completedTaskId?: string
    completedStatus?: 'resolved' | 'blocked' | 'failed'
    failureReason?: string
  },
): Promise<void> {
  const notification = createIdleNotification(agentName, options)

  await sendMessageToLeader(
    agentName,
    jsonStringify(notification),
    agentColor,
    teamName,
  )
}

/**
 * Ejecuta a un compañero en proceso con un bucle continuo de prompts.
 *
 * Llama a `runAgent()` dentro del contexto aislado del compañero, sigue su
 * progreso, actualiza el estado de su tarea, avisa al líder al quedar en
 * reposo, y espera el siguiente prompt o la petición de apagado.
 *
 * A diferencia de una tarea de fondo, el compañero sigue vivo y admite varios
 * prompts: el bucle sólo termina al abortar, o cuando el modelo aprueba el
 * apagado.
 */
export async function runInProcessTeammate(
  config: InProcessRunnerConfig,
): Promise<InProcessRunnerResult> {
  const {
    identity,
    taskId,
    prompt,
    description,
    agentDefinition,
    teammateContext,
    toolUseContext,
    abortController,
    model,
    systemPrompt,
    systemPromptMode,
    allowedTools,
    allowPermissionPrompts,
    invokingRequestId,
  } = config
  const { setAppState } = toolUseContext
  const definition = agentDefinition as AgentDefinitionFields | undefined

  logForDebugging(
    `[inProcessRunner] Starting agent loop for ${identity.agentId}`,
  )

  // El contexto de agente es lo que atribuye la analítica a este compañero.
  const agentContext: AgentContext = {
    agentId: identity.agentId,
    parentSessionId: identity.parentSessionId,
    agentName: identity.agentName,
    teamName: identity.teamName,
    agentColor: identity.color,
    planModeRequired: identity.planModeRequired,
    isTeamLead: false,
    agentType: 'teammate',
    invokingRequestId,
    invocationKind: 'spawn',
    invocationEmitted: false,
  }

  let teammateSystemPrompt: string
  if (systemPromptMode === 'replace' && systemPrompt) {
    teammateSystemPrompt = systemPrompt
  } else {
    const fullSystemPromptParts = await getSystemPrompt(
      toolUseContext.options.tools,
      toolUseContext.options.mainLoopModel,
      undefined,
      toolUseContext.options.mcpClients,
    )

    const systemPromptParts: string[] = [
      ...fullSystemPromptParts,
      TEAMMATE_SYSTEM_PROMPT_ADDENDUM,
    ]

    if (definition) {
      const customPrompt = definition.getSystemPrompt()
      if (customPrompt) {
        systemPromptParts.push(`\n# Custom Agent Instructions\n${customPrompt}`)
      }

      if (definition.memory) {
        logEvent('tengu_agent_memory_loaded', {
          ...(process.env.USER_TYPE === 'ant'
            ? {
                agent_type:
                  definition.agentType as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
              }
            : {}),
          scope:
            definition.memory as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          source:
            'in-process-teammate' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
      }
    }

    if (systemPromptMode === 'append' && systemPrompt) {
      systemPromptParts.push(systemPrompt)
    }

    teammateSystemPrompt = systemPromptParts.join('\n')
  }

  // El modo de permiso se fija en 'default' A PROPÓSITO: un compañero tiene
  // acceso completo a sus herramientas sea cual sea el modo del líder.
  const resolvedAgentDefinition: CustomAgentDefinition = {
    agentType: identity.agentName,
    whenToUse: `In-process teammate: ${identity.agentName}`,
    getSystemPrompt: () => teammateSystemPrompt,
    // Las herramientas de equipo se inyectan siempre, incluso con una lista
    // explícita: sin ellas el compañero no podría responder a un apagado, ni
    // mandar un mensaje, ni coordinarse por la lista de tareas.
    tools: definition?.tools
      ? [
          ...new Set([
            ...definition.tools,
            SEND_MESSAGE_TOOL_NAME,
            TEAM_CREATE_TOOL_NAME,
            TEAM_DELETE_TOOL_NAME,
            TASK_CREATE_TOOL_NAME,
            TASK_GET_TOOL_NAME,
            TASK_LIST_TOOL_NAME,
            TASK_UPDATE_TOOL_NAME,
          ]),
        ]
      : ['*'],
    source: 'projectSettings',
    permissionMode: 'default',
    // El modelo de la definición se propaga para que la resolución del modelo
    // lo tenga como respaldo cuando la herramienta no declare uno.
    ...(definition?.model ? { model: definition.model } : {}),
  }

  const allMessages: Message[] = []
  const wrappedInitialPrompt = formatAsTeammateMessage(
    'team-lead',
    prompt,
    undefined,
    description,
  )
  let currentPrompt = wrappedInitialPrompt
  let shouldExit = false

  // Se reclama una tarea disponible de inmediato para que la interfaz muestre
  // actividad desde el principio; de las siguientes se ocupa el bucle de
  // reposo. La lista es la de `parentSessionId`, no la del equipo: el líder
  // crea sus tareas bajo el identificador de su sesión.
  await tryClaimNextTask(identity.parentSessionId, identity.agentName)

  try {
    updateTaskState(
      taskId,
      task => ({
        ...task,
        messages: appendCappedMessage(
          task.messages,
          createUserMessage({ content: wrappedInitialPrompt }),
        ),
      }),
      setAppState,
    )

    // El estado de reemplazo de contenido es POR COMPAÑERO y persiste entre
    // iteraciones. Sin eso, cada llamada a runAgent recibiría un estado vacío
    // y tomaría decisiones globales distintas de las incrementales que tomaron
    // las iteraciones previas: el prefijo enviado cambiaría y la caché fallaría.
    // Se condiciona al del padre para heredar su bandera apagada.
    let teammateReplacementState = toolUseContext.contentReplacementState
      ? createContentReplacementState()
      : undefined

    // Registro de las peticiones de apagado que ya se le entregaron al modelo.
    // Junto con la deduplicación del propio buzón, garantiza que una misma
    // petición llegue exactamente una vez aunque el emisor reintente, la marca
    // de leído se pierda, o el sondeo despierte de más.
    const processedShutdownRequestIds = new Set<string>()

    while (!abortController.signal.aborted && !shouldExit) {
      logForDebugging(
        `[inProcessRunner] ${identity.agentId} processing prompt: ${currentPrompt.substring(0, 50)}...`,
      )

      // Un controlador de aborto POR TURNO: así Escape detiene el trabajo en
      // curso sin matar al compañero. El del ciclo de vida sigue pudiendo
      // matarlo entero.
      const currentWorkAbortController = createAbortController()

      updateTaskState(
        taskId,
        task => ({ ...task, currentWorkAbortController }),
        setAppState,
      )

      const userMessage = createUserMessage({ content: currentPrompt })
      const promptMessages: Message[] = [userMessage]

      let contextMessages = allMessages
      const tokenCount = tokenCountWithEstimation(allMessages)
      if (
        tokenCount >
        getAutoCompactThreshold(toolUseContext.options.mainLoopModel)
      ) {
        logForDebugging(
          `[inProcessRunner] ${identity.agentId} compacting history (${tokenCount} tokens)`,
        )
        // El contexto se aísla para que la compactación no vacíe la caché de
        // archivos leídos de la sesión principal ni dispare sus retrollamadas
        // de interfaz.
        const isolatedContext: ToolUseContext = {
          ...toolUseContext,
          readFileState: cloneFileStateCache(toolUseContext.readFileState),
          onCompactProgress: undefined,
          setStreamMode: undefined,
        }
        const compactedSummary = await compactConversation(
          allMessages,
          isolatedContext,
          {
            systemPrompt: asSystemPrompt([]),
            userContext: {},
            systemContext: {},
            toolUseContext: isolatedContext,
            forkContextMessages: [],
          },
          true, // suppressFollowUpQuestions
          undefined, // customInstructions
          true, // isAutoCompact
        )
        contextMessages = buildPostCompactMessages(compactedSummary)
        // La compactación reemplaza TODOS los mensajes, así que los
        // identificadores de uso de herramienta antiguos ya no existen.
        resetMicrocompactState()
        if (teammateReplacementState) {
          teammateReplacementState = createContentReplacementState()
        }
        allMessages.length = 0
        allMessages.push(...contextMessages)

        // La compactación se refleja también en los mensajes de la tarea: si
        // no, el espejo del estado crece sin tope.
        updateTaskState(
          taskId,
          task => ({ ...task, messages: [...contextMessages, userMessage] }),
          setAppState,
        )
      }

      const forkContextMessages =
        contextMessages.length > 0 ? [...contextMessages] : undefined

      allMessages.push(userMessage)

      const tracker = createProgressTracker()
      const resolveActivity = createActivityDescriptionResolver(
        toolUseContext.options.tools,
      )
      const iterationMessages: Message[] = []

      // El modo de permiso se relee del estado: el líder pudo cambiarlo.
      const currentAppState = toolUseContext.getAppState()
      const currentTask = currentAppState.tasks[taskId]
      const currentPermissionMode =
        currentTask && currentTask.type === 'in_process_teammate'
          ? currentTask.permissionMode
          : 'default'
      const iterationAgentDefinition = {
        ...(resolvedAgentDefinition as Record<string, unknown>),
        permissionMode: currentPermissionMode,
      }

      // Distingue el aborto del TURNO del aborto del ciclo de vida.
      let workWasAborted = false

      await runWithTeammateContext(teammateContext, async () => {
        return runWithAgentContext(agentContext, async () => {
          updateTaskState(
            taskId,
            task => ({ ...task, status: 'running', isIdle: false }),
            setAppState,
          )

          // Es el mismo `runAgent()` que usan la herramienta de agente y los
          // subagentes, así que se comparte la infraestructura del API.
          for await (const message of runAgent({
            agentDefinition: iterationAgentDefinition,
            promptMessages,
            toolUseContext,
            canUseTool: createInProcessCanUseTool(
              identity,
              currentWorkAbortController,
              (waitMs: number) => {
                updateTaskState(
                  taskId,
                  task => ({
                    ...task,
                    totalPausedMs: (task.totalPausedMs ?? 0) + waitMs,
                  }),
                  setAppState,
                )
              },
            ),
            isAsync: true,
            canShowPermissionPrompts: allowPermissionPrompts ?? true,
            forkContextMessages,
            querySource: 'agent:custom',
            override: { abortController: currentWorkAbortController },
            model: model as ModelAlias | undefined,
            preserveToolUseResults: true,
            availableTools: toolUseContext.options.tools,
            allowedTools,
            contentReplacementState: teammateReplacementState,
          })) {
            // Primero el del ciclo de vida: mata al compañero entero.
            if (abortController.signal.aborted) {
              logForDebugging(
                `[inProcessRunner] ${identity.agentId} lifecycle aborted`,
              )
              break
            }

            // Después el del turno: detiene sólo el trabajo en curso.
            if (currentWorkAbortController.signal.aborted) {
              logForDebugging(
                `[inProcessRunner] ${identity.agentId} current work aborted (Escape pressed)`,
              )
              workWasAborted = true
              break
            }

            iterationMessages.push(message)
            allMessages.push(message)

            updateProgressFromMessage(
              tracker,
              message,
              resolveActivity,
              toolUseContext.options.tools,
            )
            const progress = getProgressUpdate(tracker)

            updateTaskState(
              taskId,
              task => {
                // Los usos de herramienta en vuelo se siguen para animarlos en
                // la vista de transcripción.
                let inProgressToolUseIDs = task.inProgressToolUseIDs
                if (message.type === 'assistant') {
                  const blocks = Array.isArray(message.message.content)
                    ? message.message.content
                    : []
                  for (const block of blocks) {
                    if (typeof block !== 'string' && block.type === 'tool_use') {
                      inProgressToolUseIDs = new Set([
                        ...(inProgressToolUseIDs ?? []),
                        block.id,
                      ])
                    }
                  }
                } else if (message.type === 'user') {
                  const content = message.message.content
                  if (Array.isArray(content)) {
                    for (const block of content) {
                      if (
                        typeof block === 'object' &&
                        'type' in block &&
                        block.type === 'tool_result'
                      ) {
                        if (inProgressToolUseIDs) {
                          inProgressToolUseIDs = new Set(inProgressToolUseIDs)
                          inProgressToolUseIDs.delete(block.tool_use_id)
                        }
                      }
                    }
                  }
                }

                return {
                  ...task,
                  progress,
                  messages: appendCappedMessage(task.messages, message),
                  inProgressToolUseIDs,
                }
              },
              setAppState,
            )
          }

          return { success: true, messages: iterationMessages }
        })
      })

      updateTaskState(
        taskId,
        task => ({ ...task, currentWorkAbortController: undefined }),
        setAppState,
      )

      if (abortController.signal.aborted) {
        break
      }

      // Aborto del turno: se deja constancia en la transcripción y se vuelve a
      // reposo, sin terminar al compañero.
      if (workWasAborted) {
        logForDebugging(
          `[inProcessRunner] ${identity.agentId} work interrupted, returning to idle`,
        )

        const interruptMessage = createAssistantAPIErrorMessage({
          content: ERROR_MESSAGE_USER_ABORT,
        })
        updateTaskState(
          taskId,
          task => ({
            ...task,
            messages: appendCappedMessage(task.messages, interruptMessage),
          }),
          setAppState,
        )
      }

      // Se mira ANTES de marcar: si ya estaba en reposo, el aviso al líder
      // sería un duplicado.
      const prevAppState = toolUseContext.getAppState()
      const prevTask = prevAppState.tasks[taskId]
      const wasAlreadyIdle =
        prevTask?.type === 'in_process_teammate' && prevTask.isIdle

      updateTaskState(
        taskId,
        task => {
          task.onIdleCallbacks?.forEach(cb => cb())
          return { ...task, isIdle: true, onIdleCallbacks: [] }
        },
        setAppState,
      )

      // La respuesta del compañero NO se le manda al líder automáticamente:
      // para eso está la herramienta de mensajería. Es lo mismo que ocurre con
      // un compañero en panel, cuya salida el líder tampoco ve.

      if (!wasAlreadyIdle) {
        await sendIdleNotification(
          identity.agentName,
          identity.color,
          identity.teamName,
          {
            idleReason: workWasAborted ? 'interrupted' : 'available',
            summary: getLastPeerDmSummary(allMessages),
          },
        )
      } else {
        logForDebugging(
          `[inProcessRunner] Skipping duplicate idle notification for ${identity.agentName}`,
        )
      }

      logForDebugging(
        `[inProcessRunner] ${identity.agentId} finished prompt, waiting for next`,
      )

      const waitResult = await waitForNextPromptOrShutdown(
        identity,
        abortController,
        taskId,
        toolUseContext.getAppState,
        setAppState,
        identity.parentSessionId,
        processedShutdownRequestIds,
      )

      switch (waitResult.type) {
        case 'shutdown_request':
          // La petición se le pasa AL MODELO para que decida: él usa la
          // herramienta de aprobar o rechazar el apagado.
          logForDebugging(
            `[inProcessRunner] ${identity.agentId} received shutdown request - passing to model`,
          )
          currentPrompt = formatAsTeammateMessage(
            waitResult.request?.from || 'team-lead',
            waitResult.originalMessage,
          )
          appendTeammateMessage(
            taskId,
            createUserMessage({ content: currentPrompt }),
            setAppState,
          )
          break

        case 'new_message':
          logForDebugging(
            `[inProcessRunner] ${identity.agentId} received new message from ${waitResult.from}`,
          )
          // Lo que viene del usuario va en texto llano; lo que viene de otro
          // compañero va en su sobre, que es lo que lo identifica.
          if (waitResult.from === 'user') {
            currentPrompt = waitResult.message
          } else {
            currentPrompt = formatAsTeammateMessage(
              waitResult.from,
              waitResult.message,
              waitResult.color,
              waitResult.summary,
            )
            // Sólo los que no vienen del usuario se añaden aquí: los del
            // usuario llegan de los mensajes pendientes, que ya los añadió
            // quien los inyectó.
            appendTeammateMessage(
              taskId,
              createUserMessage({ content: currentPrompt }),
              setAppState,
            )
          }
          break

        case 'aborted':
          logForDebugging(
            `[inProcessRunner] ${identity.agentId} aborted while waiting`,
          )
          shouldExit = true
          break
      }
    }

    let alreadyTerminal = false
    let toolUseId: string | undefined
    updateTaskState(
      taskId,
      task => {
        // Matar al compañero pudo dejar la tarea en 'killed' con su cierre ya
        // emitido. Sobreescribirla la volvería 'completed' y emitiría un
        // segundo cierre por el mismo suceso.
        if (task.status !== 'running') {
          alreadyTerminal = true
          return task
        }
        toolUseId = task.toolUseId
        task.onIdleCallbacks?.forEach(cb => cb())
        task.unregisterCleanup?.()
        return {
          ...task,
          status: 'completed' as const,
          notified: true,
          endTime: Date.now(),
          messages: task.messages?.length ? [task.messages.at(-1)!] : undefined,
          pendingUserMessages: [],
          inProgressToolUseIDs: undefined,
          abortController: undefined,
          unregisterCleanup: undefined,
          currentWorkAbortController: undefined,
          onIdleCallbacks: [],
        }
      },
      setAppState,
    )
    void evictTaskOutput(taskId)
    evictTerminalTask(taskId, setAppState)
    // Con `notified` ya en true no hay aviso XML, así que el cierre del
    // marcador de tarea se emite aquí directamente.
    if (!alreadyTerminal) {
      emitTaskTerminatedSdk(taskId, 'completed', {
        toolUseId,
        summary: identity.agentId,
      })
    }

    unregisterPerfettoAgent(identity.agentId)
    return { success: true, messages: allMessages }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    logForDebugging(
      `[inProcessRunner] Agent ${identity.agentId} failed: ${errorMessage}`,
    )

    let alreadyTerminal = false
    let toolUseId: string | undefined
    updateTaskState(
      taskId,
      task => {
        if (task.status !== 'running') {
          alreadyTerminal = true
          return task
        }
        toolUseId = task.toolUseId
        task.onIdleCallbacks?.forEach(cb => cb())
        task.unregisterCleanup?.()
        return {
          ...task,
          status: 'failed' as const,
          notified: true,
          error: errorMessage,
          isIdle: true,
          endTime: Date.now(),
          onIdleCallbacks: [],
          messages: task.messages?.length ? [task.messages.at(-1)!] : undefined,
          pendingUserMessages: [],
          inProgressToolUseIDs: undefined,
          abortController: undefined,
          unregisterCleanup: undefined,
          currentWorkAbortController: undefined,
        }
      },
      setAppState,
    )
    void evictTaskOutput(taskId)
    evictTerminalTask(taskId, setAppState)
    if (!alreadyTerminal) {
      emitTaskTerminatedSdk(taskId, 'failed', {
        toolUseId,
        summary: identity.agentId,
      })
    }

    await sendIdleNotification(
      identity.agentName,
      identity.color,
      identity.teamName,
      {
        idleReason: 'failed',
        completedStatus: 'failed',
        failureReason: errorMessage,
      },
    )

    unregisterPerfettoAgent(identity.agentId)
    return {
      success: false,
      error: errorMessage,
      messages: allMessages,
    }
  }
}

/**
 * Arranca a un compañero en proceso y no espera su resultado.
 *
 * Es el punto de entrada tras engendrarlo. El identificador se extrae ANTES de
 * la clausura para que el manejador de error no retenga el objeto de
 * configuración entero —con su contexto de herramientas dentro— durante todo lo
 * que el compañero viva, que pueden ser horas.
 */
export function startInProcessTeammate(config: InProcessRunnerConfig): void {
  const agentId = config.identity.agentId
  void runInProcessTeammate(config).catch(error => {
    logForDebugging(`[inProcessRunner] Unhandled error in ${agentId}: ${error}`)
  })
}
