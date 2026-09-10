/**
 * Cap de bloqueos consecutivos del Stop hook — porte de
 * `ccnmt: packages/agent/internal/stopHooksCore.ts` (port de ant
 * v2.1.143, 3999.js).
 *
 * Un Stop hook `/goal` cuya condición nunca puede satisfacerse bloquea
 * el turno de terminar en cada ciclo, inyectando un `blockingError` al
 * transcript cada vez. Sin cota, el transcript crece hasta que la
 * llamada principal a la API da 413 ("Prompt is too long"). Este cap
 * es el respaldo estructural: acota la racha por `maxTurns` Y por
 * `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` (default 8). El veredicto
 * `impossible` del evaluador (`execPromptHook`) puede cortar en corto
 * ALGUNOS casos, pero depende de que el evaluador lo proponga
 * voluntariamente — el cap es la garantía.
 *
 * `evaluateStopHookBlockOutcome` es una función de decisión pura:
 * `query.ts` (aguas arriba, no portado aquí) es dueño del yield y de
 * construir el estado; esta función es dueña de la aritmética, para
 * poder fijarla con un test unitario sin el loop del generador.
 *
 * PORTE PARCIAL declarado, mismo criterio que `internal/cronTasksCore.ts`
 * / `internal/loopSentinelCore.ts` (ver sus docstrings): se porta lo
 * que el test ejercita. `internal/stopHooksCore.ts` de la fuente tiene
 * 778 líneas y CINCO exports; el test de origen (`stopHookBlockCap.test.ts`)
 * importa exactamente DOS —`resolveStopHookBlockCap` y
 * `evaluateStopHookBlockOutcome`— y ninguno ejecuta código fuera de
 * esas dos funciones puras.
 *
 * PORTE COMPLETO desde 2026-09-08 (#262). El único símbolo que faltaba
 * —`handleStopHooks`, el generador de integración— entra en este pase, con
 * sus cuatro bloqueos cerrados en el mismo commit:
 *
 *   · las **once** llamadas que hace sobre `getAgentHostBindings()` están
 *     ahora declaradas en `../host.ts`, no sólo dos;
 *   · `getTotalOutputTokens` llegó a `@thyrox/app-host` con la slice E
 *     entera de `bootstrap/state.ts`;
 *   · `isBareMode` entró en `../internalUtils.ts` — su bloqueo era `readEnv`,
 *     que ya existe;
 *   · `@thyrox/memory` se declaró como dependencia y re-exporta
 *     `executeExtractMemories` / `isExtractModeActive` desde su raíz, que es
 *     de donde la fuente los importa.
 *
 * Lo que NO viaja, declarado: las tres banderas de compilación de la fuente
 * (`feature('TEMPLATES')`, `feature('EXTRACT_MEMORIES')`,
 * `feature('CHICAGO_MCP')`) provienen de `bun:bundle`, que este árbol no
 * usa. Aquí la guarda equivalente es la PRESENCIA del binding o de la
 * variable de entorno que cada rama ya consulta — sin bandera, la rama se
 * decide por su propia precondición, que es lo que la bandera protegía.
 */

/**
 * Resuelve el cap de bloqueos consecutivos del Stop hook. Ant v2.1.143
 * 3999.js: `parseInt(env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP) ?? 8`, y
 * luego `cap > 0 && n > cap`.
 *
 * - ausente / no-numérico → 8 (el respaldo por defecto)
 * - 0 o negativo          → deshabilitado (el guard `cap > 0` de abajo
 *   corta en corto)
 * - N positivo            → N
 */
import { executeExtractMemories, isExtractModeActive } from '@thyrox/memory'
import { readEnv } from '@thyrox/config/env/utils'
import { logEvent as obsLogEvent } from '@thyrox/local-observability'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getTotalOutputTokens } from '@thyrox/app-host/bootstrap/state.js'
import { getAgentHostBindings } from '../host.js'
import type { HostTask, StopHookExecutionResult } from '../host.js'
import {
  addSessionHook,
  getSessionHooks,
  removeSessionHook,
} from '../hooks/sessionHooks.js'
import { errorMessage, isBareMode, isEnvDefinedFalsy } from '../internalUtils.js'
import type {
  AgentAssistantMessage,
  AgentMessage,
  AgentQuerySource,
  AgentREPLHookContext,
  AgentStopHookInfo,
  AgentSystemPrompt,
  AgentToolUseContext,
} from '../internalTypes.js'

type StopHookResult = {
  blockingErrors: AgentMessage[]
  preventContinuation: boolean
}

export function resolveStopHookBlockCap(envValue: string | undefined): number {
  const parsed = Number.parseInt(envValue ?? '', 10)
  return Number.isNaN(parsed) ? 8 : parsed
}

/**
 * Decide qué pasa después de que un Stop hook bloquea al turno de
 * terminar — el guard de bloqueo consecutivo de ant v2.1.143 3999.js.
 */
export type StopHookBlockDecision =
  | { kind: 'continue'; nextTurnCount: number; nextBlockingCount: number }
  | { kind: 'max_turns'; nextTurnCount: number; nextBlockingCount: number }
  | { kind: 'cap_exceeded'; nextBlockingCount: number }

export function evaluateStopHookBlockOutcome(params: {
  turnCount: number
  blockingCount: number
  maxTurns: number | undefined
  blockCapEnv: string | undefined
}): StopHookBlockDecision {
  const nextTurnCount = params.turnCount + 1
  const nextBlockingCount = params.blockingCount + 1

  // maxTurns también acota los loops de bloqueo — sin esto, un Stop
  // hook que bloquea re-consultaría para siempre en modo headless sin
  // importar --max-turns.
  if (params.maxTurns && nextTurnCount > params.maxTurns) {
    return { kind: 'max_turns', nextTurnCount, nextBlockingCount }
  }

  const blockCap = resolveStopHookBlockCap(params.blockCapEnv)
  if (blockCap > 0 && nextBlockingCount > blockCap) {
    return { kind: 'cap_exceeded', nextBlockingCount }
  }

  return { kind: 'continue', nextTurnCount, nextBlockingCount }
}

/**
 * El mensaje de override que el cap emite al dispararse.
 *
 * Es CONTRATO con quien escribe un hook, no prosa: le dice exactamente qué
 * mirar en su entrada (`stop_hook_active`) y qué variable subir para levantar
 * el límite. Por eso su suite pincha la cadena verbatim.
 *
 * Su único consumidor en la fuente es `handleStopHooks`, que aquí sigue sin
 * portar (ver arriba). Se porta igual porque no depende de nada, y porque
 * omitir un símbolo autocontenido «por no tener consumidor» es la forma de
 * porte parcial que se paga después.
 */
export function stopHookBlockCapMessage(blockingCount: number): string {
  return (
    `A hook blocked the turn from ending ${blockingCount} consecutive times — overriding and ending turn. ` +
    "For Stop/SubagentStop hooks, check stop_hook_active in the input and return success while it's true. Set CLAUDE_CODE_STOP_HOOK_BLOCK_CAP to raise this limit."
  )
}

/**
 * ¿Está activa la extracción de memoria? En la fuente esta rama va detrás de
 * `feature('EXTRACT_MEMORIES')`, una bandera de compilación que la ELIMINA
 * del binario cuando no aplica. Aquí no hay bandera, así que la rama se
 * decide por su propia precondición: `isExtractModeActive()` lee los host
 * bindings de `@thyrox/memory` y LANZA si nadie los instaló.
 *
 * Sin esta guarda, un host que no cablea memoria tumbaría el pipeline de
 * Stop entero — peor que la fuente, donde la rama ni existía. El `catch`
 * traduce «memoria no cableada» a «extracción inactiva», que es exactamente
 * lo que la bandera apagada significaba.
 */
function extraccionDeMemoriaActiva(): boolean {
  try {
    return isExtractModeActive()
  } catch {
    return false
  }
}

/**
 * El pipeline de hooks Stop, entero: la contabilidad de fin de turno, la
 * ejecución de los hooks del usuario y la resolución del objetivo `/goal`.
 *
 * Es un GENERADOR porque cada mensaje que produce —progreso de un hook, el
 * error que bloquea, el adjunto de estado del objetivo— tiene que llegar al
 * consumidor **mientras** los hooks corren, no al final: un hook lento con
 * salida útil no debe quedarse mudo hasta que termine el último.
 *
 * Su valor de retorno es la decisión: `blockingErrors` no vacío significa
 * «el turno sigue, con estos mensajes inyectados»; `preventContinuation`
 * significa «el turno se cierra aquí».
 */
export async function* handleStopHooks(
  messagesForQuery: AgentMessage[],
  assistantMessages: AgentAssistantMessage[],
  systemPrompt: AgentSystemPrompt,
  userContext: { [k: string]: string },
  systemContext: { [k: string]: string },
  toolUseContext: AgentToolUseContext,
  querySource: AgentQuerySource,
  stopHookActive?: boolean,
): AsyncGenerator<unknown, StopHookResult> {
  const hookStartTime = Date.now()
  const host = () => getAgentHostBindings()

  const stopHookContext: AgentREPLHookContext = {
    messages: [...messagesForQuery, ...assistantMessages],
    systemPrompt,
    userContext,
    systemContext,
    toolUseContext,
    querySource,
  }

  // El snapshot de params sólo se guarda para consultas del hilo principal:
  // un subagente NO debe pisar el del principal. Va fuera de la guarda de
  // sugerencia de prompt porque `/btw` y el `side_question` del SDK lo leen,
  // y ninguno depende de que la sugerencia esté activa.
  if (querySource === 'repl_main_thread' || querySource === 'sdk') {
    const params = host().createCacheSafeParams?.(stopHookContext)
    if (params !== undefined) host().saveCacheSafeParams?.(params)
  }

  // Clasificación del trabajo despachado: corriendo como job, se clasifica
  // el estado tras cada turno. La guarda por `repl_main_thread` evita que
  // una bifurcación de fondo ensucie la línea de tiempo con sus propios
  // mensajes. Se espera al clasificador para que el estado quede escrito
  // antes de que el turno vuelva — si no, un listado muestra estado rancio.
  const jobDir = readEnv('CLAUDE_JOB_DIR')
  if (jobDir && querySource.startsWith('repl_main_thread') && !toolUseContext.agentId) {
    // Historia completa del turno: `assistantMessages` se reinicia en cada
    // iteración del bucle, así que las llamadas de iteraciones anteriores
    // sólo son visibles a través de `messagesForQuery`.
    const delTurno = stopHookContext.messages.filter(
      (m): m is AgentAssistantMessage => m.type === 'assistant',
    )
    const p =
      host()
        .classifyJobState?.(jobDir, delTurno)
        ?.catch((err: unknown) => {
          host().logDebug?.(`[job] error del clasificador: ${errorMessage(err)}`)
        }) ?? Promise.resolve()
    await Promise.race([
      p,
      new Promise<void>(r => setTimeout(r, 60_000).unref?.()),
    ])
  }

  // `--bare` / SIMPLE salta la contabilidad de fondo. Una llamada `-p`
  // guionizada no quiere auto-memoria ni agentes bifurcados peleándose
  // recursos mientras el proceso se apaga.
  if (!isBareMode()) {
    if (!isEnvDefinedFalsy(readEnv('CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION'))) {
      void host().executePromptSuggestion?.(stopHookContext)
    }
    if (!toolUseContext.agentId && extraccionDeMemoriaActiva()) {
      // Se lanza y no se espera, tanto en interactivo como fuera de él.
      void executeExtractMemories(
        stopHookContext as never,
        (toolUseContext as { appendSystemMessage?: unknown }).appendSystemMessage as never,
      )
    }
  }

  // Limpieza de uso de computadora al cierre del turno. Sólo hilo principal:
  // el cerrojo es una variable de módulo del proceso, así que si lo soltara
  // un subagente, la limpieza del principal vería el cerrojo libre.
  if (!toolUseContext.agentId) {
    try {
      await host().cleanupComputerUseAfterTurn?.(toolUseContext)
    } catch {
      // Silencioso a propósito: es limpieza, no camino crítico.
    }
  }

  // Si hay un hook de `/goal` activo Y trabajo de fondo en vuelo, se retira
  // el hook temporalmente antes de evaluar. Si no, cada Stop reevaluaría un
  // objetivo inacabado mientras los subagentes siguen trabajando, quemando
  // llamadas y produciendo adjuntos ruidosos. Se restaura en el `finally`.
  let deferredGoalHook: { type: 'prompt'; prompt: string } | undefined
  try {
    const blockingErrors: AgentMessage[] = []
    const appState = toolUseContext.getAppState() as {
      toolPermissionContext: { mode: string }
      activeGoal?: {
        condition: string
        iterations: number
        setAt: number
        tokensAtStart?: number
        lastReason?: string
        paused?: boolean
      }
    }
    const permissionMode = appState.toolPermissionContext.mode

    if (appState.activeGoal) {
      try {
        const taskListId = host().getTaskListId?.()
        const tasks: HostTask[] = (await host().listTasks?.(taskListId)) ?? []
        const hayTrabajoDeFondo = tasks.some(
          t =>
            (t.status === 'in_progress' || t.status === 'running') &&
            t.owner !== undefined,
        )
        if (hayTrabajoDeFondo) {
          const sessionId = host().getSessionId?.() ?? ''
          const hooksMap = getSessionHooks(appState as never, sessionId, 'Stop')
          for (const matcher of hooksMap.get('Stop') ?? []) {
            if (matcher.matcher !== '' || matcher.skillRoot !== undefined) continue
            for (const entrada of matcher.hooks) {
              const h = entrada as { hook?: { type: string; prompt?: string } }
              if (
                h.hook?.type === 'prompt' &&
                h.hook.prompt === appState.activeGoal.condition
              ) {
                deferredGoalHook = { type: 'prompt', prompt: h.hook.prompt }
                removeSessionHook(
                  toolUseContext.setAppState as never,
                  sessionId,
                  'Stop',
                  deferredGoalHook as never,
                )
                break
              }
            }
            if (deferredGoalHook) break
          }
        }
      } catch {
        // Diferir es una optimización: si el tablero falla, se sigue con la
        // evaluación normal en vez de tumbar el pipeline entero.
      }
    }

    const generator =
      host().executeStopHooks?.(
        permissionMode,
        toolUseContext.abortController.signal,
        undefined,
        stopHookActive ?? false,
        toolUseContext.agentId,
        toolUseContext,
        [...messagesForQuery, ...assistantMessages],
        toolUseContext.agentType,
      ) ?? (async function* (): AsyncGenerator<StopHookExecutionResult, void> {})()

    let stopHookToolUseID = ''
    let hookCount = 0
    let preventedContinuation = false
    let stopReason = ''
    let hasOutput = false
    const hookErrors: string[] = []
    const hookInfos: AgentStopHookInfo[] = []

    for await (const result of generator) {
      if (result.message) {
        yield result.message
        const msg = result.message as {
          type: string
          toolUseID?: string
          data?: { command?: string; promptText?: string }
          attachment?: Record<string, unknown>
        }
        if (msg.type === 'progress' && msg.toolUseID) {
          stopHookToolUseID = msg.toolUseID
          hookCount++
          if (msg.data?.command) {
            hookInfos.push({
              command: msg.data.command,
              promptText: msg.data.promptText,
            } as AgentStopHookInfo)
          }
        }
        if (msg.type === 'attachment' && msg.attachment) {
          const a = msg.attachment
          if (a.hookEvent === 'Stop' || a.hookEvent === 'SubagentStop') {
            if (a.type === 'hook_non_blocking_error') {
              hookErrors.push((a.stderr as string) || `Exit code ${a.exitCode}`)
              hasOutput = true
            } else if (a.type === 'hook_error_during_execution') {
              hookErrors.push(a.content as string)
              hasOutput = true
            } else if (a.type === 'hook_success') {
              if (
                (a.stdout && (a.stdout as string).trim()) ||
                (a.stderr && (a.stderr as string).trim())
              ) {
                hasOutput = true
              }
              yield* resolverObjetivoAlcanzado(result, toolUseContext)
            }
            // Duración por hook. Corren en paralelo, así que se casa por
            // comando con la primera entrada aún sin asignar.
            if ('durationMs' in a && 'command' in a) {
              const info = hookInfos.find(
                i => i.command === a.command && i.durationMs === undefined,
              )
              if (info) info.durationMs = a.durationMs as number
            }
          }
        }
      }

      if (result.blockingError) {
        const userMessage = host().createUserMessage?.({
          content: host().getStopHookMessage?.(result.blockingError) ?? '',
          isMeta: true, // Oculto en la interfaz — sale en el resumen.
        })
        if (userMessage) {
          blockingErrors.push(userMessage)
          yield userMessage
        }
        hasOutput = true

        // Un bloqueo de `/goal` NO contribuye a `hookErrors`: se renderiza
        // con su propio adjunto tenue, no con el bloque de resumen.
        let esBloqueoDeObjetivo = false
        const hook = result.hook as { type?: string; prompt?: string } | undefined
        if (hook?.type === 'prompt') {
          const estado = toolUseContext.getAppState() as {
            activeGoal?: {
              condition: string
              iterations: number
              paused?: boolean
            }
          }
          const activo = estado.activeGoal
          if (activo && !activo.paused && activo.condition === hook.prompt) {
            esBloqueoDeObjetivo = true
            const reason = result.stopReason
            toolUseContext.setAppState((prev: unknown) => ({
              ...(prev as object),
              activeGoal: {
                ...((prev as { activeGoal: object }).activeGoal),
                iterations: activo.iterations + 1,
                lastReason: reason,
              },
            }))
            const noAlcanzado = host().createAttachmentMessage?.({
              type: 'goal_status',
              met: false,
              condition: hook.prompt,
              reason,
            })
            if (noAlcanzado) yield noAlcanzado
          }
        }

        if (!esBloqueoDeObjetivo) {
          hookErrors.push(result.blockingError.blockingError)
        }
      }

      if (result.preventContinuation) {
        preventedContinuation = true
        stopReason = result.stopReason || 'Stop hook prevented continuation'
        const detenido = host().createAttachmentMessage?.({
          type: 'hook_stopped_continuation',
          message: stopReason,
          hookName: 'Stop',
          toolUseID: stopHookToolUseID,
          hookEvent: 'Stop',
        })
        if (detenido) yield detenido
      }

      if (toolUseContext.abortController.signal.aborted) {
        host().logEvent?.('tengu_pre_stop_hooks_cancelled', {})
        const interrupcion = host().createUserInterruptionMessage?.({
          toolUse: false,
        })
        if (interrupcion) yield interrupcion
        return { blockingErrors: [], preventContinuation: true }
      }
    }

    if (hookCount > 0) {
      const resumen = host().createStopHookSummaryMessage?.(
        hookCount,
        hookInfos,
        hookErrors,
        preventedContinuation,
        stopReason,
        hasOutput,
        'suggestion',
        stopHookToolUseID,
      )
      if (resumen) yield resumen

      if (hookErrors.length > 0) {
        const atajo =
          host().getShortcutDisplay?.('app:toggleTranscript', 'Global', 'ctrl+o') ??
          'ctrl+o'
        toolUseContext.addNotification?.({
          key: 'stop-hook-error',
          text: `Stop hook error occurred · ${atajo} to see`,
          priority: 'immediate',
        })
      }
    }

    if (preventedContinuation) {
      return { blockingErrors: [], preventContinuation: true }
    }
    if (blockingErrors.length > 0) {
      return { blockingErrors, preventContinuation: false }
    }

    // Pasados los hooks Stop, si esto es un teammate corren TaskCompleted y
    // TeammateIdle.
    if (host().isTeammate?.()) {
      return yield* hooksDeTeammate(permissionMode, toolUseContext)
    }

    return { blockingErrors: [], preventContinuation: false }
  } catch (error) {
    host().logEvent?.('tengu_stop_hook_error', {
      duration: Date.now() - hookStartTime,
    })
    // Un mensaje de sistema que el modelo NO ve, para que el usuario pueda
    // depurar su hook.
    const sys = host().createSystemMessage?.(
      `Stop hook failed: ${errorMessage(error)}`,
      'warning',
    )
    if (sys) yield sys
    return { blockingErrors: [], preventContinuation: false }
  } finally {
    // Se restaura el hook de objetivo diferido para que el turno siguiente
    // reevalúe cuando el trabajo de fondo termine. Envuelto en `try` porque
    // el `finally` corre también al abortar, y un fallo aquí nunca debe
    // enmascarar el error original.
    if (deferredGoalHook) {
      try {
        const actual = (
          toolUseContext.getAppState() as { activeGoal?: { condition: string } }
        ).activeGoal
        if (actual?.condition === deferredGoalHook.prompt) {
          addSessionHook(
            toolUseContext.setAppState as never,
            host().getSessionId?.() ?? '',
            'Stop',
            '',
            deferredGoalHook as never,
          )
        }
      } catch {
        // Mejor esfuerzo.
      }
    }
  }
}

/**
 * La rama de objetivo `/goal` ALCANZADO: el hook de prompt volvió con éxito,
 * así que la condición se satisfizo. Se extrae del bucle principal porque es
 * la única parte con dos desenlaces —alcanzado e imposible— y meterla en
 * línea escondía cuál de los dos estaba tomando el bucle.
 */
async function* resolverObjetivoAlcanzado(
  result: StopHookExecutionResult,
  toolUseContext: AgentToolUseContext,
): AsyncGenerator<unknown, void> {
  const host = getAgentHostBindings()
  const hook = result.hook as { type?: string; prompt?: string } | undefined
  if (hook?.type !== 'prompt' || !hook.prompt) return

  const estado = toolUseContext.getAppState() as {
    activeGoal?: {
      condition: string
      iterations: number
      setAt: number
      tokensAtStart?: number
      paused?: boolean
    }
  }
  const activo = estado.activeGoal
  if (!activo || activo.paused || activo.condition !== hook.prompt) return

  const iterations = activo.iterations + 1
  const durationMs = Date.now() - activo.setAt
  const tokens = getTotalOutputTokens() - (activo.tokensAtStart ?? 0)
  // Cuando el evaluador juzga el objetivo IMPOSIBLE el hook devuelve éxito
  // igual —para que el Stop hook se retire y el objetivo se limpie— pero el
  // desenlace es el de fallo, no el de logro.
  const imposible = result.impossible === true
  const stopReason = result.stopReason

  try {
    removeSessionHook(
      toolUseContext.setAppState as never,
      host.getSessionId?.() ?? '',
      'Stop',
      result.hook as never,
    )
  } catch {
    // Limpieza de mejor esfuerzo.
  }
  toolUseContext.setAppState((prev: unknown) => ({
    ...(prev as object),
    activeGoal: undefined,
  }))

  const carga = {
    type: 'goal_status',
    met: !imposible,
    ...(imposible ? { failed: true } : {}),
    condition: hook.prompt,
    reason: stopReason,
    iterations,
    durationMs,
    tokens,
  }
  const adjunto = host.createAttachmentMessage?.(carga)
  if (adjunto) yield adjunto

  try {
    obsLogEvent(imposible ? 'tengu_goal_failed' : 'tengu_goal_achieved', {
      promptLength: hook.prompt.length,
      ...(imposible ? { reasonLength: stopReason?.length ?? 0 } : {}),
      iterations,
      durationMs,
      tokens,
    })
  } catch {
    // El sumidero de telemetría puede no estar instalado — es aceptable.
  }
  try {
    logForDebugging(imposible ? 'goal_met:impossible' : 'goal_met')
  } catch {
    // Diagnóstico de mejor esfuerzo.
  }
}

/**
 * Los hooks de teammate: `TaskCompleted` por cada tarea en curso suya, y
 * `TeammateIdle` al final. Se extrae del generador principal porque es un
 * pipeline completo con su propia acumulación y sus propios cortes.
 */
async function* hooksDeTeammate(
  permissionMode: string,
  toolUseContext: AgentToolUseContext,
): AsyncGenerator<unknown, StopHookResult> {
  const host = () => getAgentHostBindings()
  const teammateName = host().getAgentName?.() ?? ''
  const teamName = host().getTeamName?.() ?? ''
  const bloqueos: AgentMessage[] = []
  let corta = false
  // Cada ejecutor genera su propio id de uso: se captura de sus mensajes de
  // progreso, no del id del pipeline de Stop.
  let toolUseID = ''

  const consumir = async function* (
    gen: AsyncGenerator<StopHookExecutionResult, void>,
    nombreDelHook: 'TaskCompleted' | 'TeammateIdle',
    mensajeDeBloqueo: (e: unknown) => string,
  ): AsyncGenerator<unknown, boolean> {
    for await (const result of gen) {
      if (result.message) {
        const msg = result.message as { type: string; toolUseID?: string }
        if (msg.type === 'progress' && msg.toolUseID) toolUseID = msg.toolUseID
        yield result.message
      }
      if (result.blockingError) {
        const userMessage = host().createUserMessage?.({
          content: mensajeDeBloqueo(result.blockingError),
          isMeta: true,
        })
        if (userMessage) {
          bloqueos.push(userMessage)
          yield userMessage
        }
      }
      if (result.preventContinuation) {
        corta = true
        const detenido = host().createAttachmentMessage?.({
          type: 'hook_stopped_continuation',
          message:
            result.stopReason || `${nombreDelHook} hook prevented continuation`,
          hookName: nombreDelHook,
          toolUseID,
          hookEvent: nombreDelHook,
        })
        if (detenido) yield detenido
      }
      if (toolUseContext.abortController.signal.aborted) return true
    }
    return false
  }

  const taskListId = host().getTaskListId?.()
  const tasks: HostTask[] = (await host().listTasks?.(taskListId)) ?? []
  for (const task of tasks.filter(
    t => t.status === 'in_progress' && t.owner === teammateName,
  )) {
    const gen =
      host().executeTaskCompletedHooks?.(
        task.id,
        task.subject,
        task.description,
        teammateName,
        teamName,
        permissionMode,
        toolUseContext.abortController.signal,
        undefined,
        toolUseContext,
      ) ?? (async function* (): AsyncGenerator<StopHookExecutionResult, void> {})()
    const abortado = yield* consumir(gen, 'TaskCompleted', e =>
      host().getTaskCompletedHookMessage?.(e) ?? '',
    )
    if (abortado) return { blockingErrors: [], preventContinuation: true }
  }

  const idle =
    host().executeTeammateIdleHooks?.(
      teammateName,
      teamName,
      permissionMode,
      toolUseContext.abortController.signal,
    ) ?? (async function* (): AsyncGenerator<StopHookExecutionResult, void> {})()
  const abortado = yield* consumir(idle, 'TeammateIdle', e =>
    host().getTeammateIdleHookMessage?.(e) ?? '',
  )
  if (abortado) return { blockingErrors: [], preventContinuation: true }

  if (corta) return { blockingErrors: [], preventContinuation: true }
  if (bloqueos.length > 0) {
    return { blockingErrors: bloqueos, preventContinuation: false }
  }
  return { blockingErrors: [], preventContinuation: false }
}
