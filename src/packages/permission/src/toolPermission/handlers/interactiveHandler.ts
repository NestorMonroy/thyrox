import { feature } from 'bun:bundle'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import { randomUUID } from 'crypto'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getAllowedChannels } from '@thyrox/app-host/bootstrap/state.js'
import type { BridgePermissionCallbacks } from '@thyrox/bridge/bridgePermissionCallbacks.js'
import { getTerminalFocused } from '@anthropic/ink'
import {
  CHANNEL_PERMISSION_REQUEST_METHOD,
  type ChannelPermissionRequestParams,
  findChannelEntry,
} from '@thyrox/mcp-runtime/channelNotification.js'
import type { ChannelPermissionCallbacks } from '@thyrox/mcp-runtime/channelPermissions.js'
import {
  filterPermissionRelayClients,
  shortRequestId,
  truncateForPreview,
} from '@thyrox/mcp-runtime/channelPermissions.js'
import { executeAsyncClassifierCheck } from '@thyrox/tool-registry/tools/BashTool/bashPermissions.js'
import { BASH_TOOL_NAME } from '@thyrox/tool-registry/tools/BashTool/toolName.js'
import {
  clearClassifierChecking,
  setClassifierApproval,
  setClassifierChecking,
  setYoloClassifierApproval,
} from '../../classifierApprovals.js'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import type { PermissionDecision } from '../../PermissionResult.js'
import type { PermissionUpdate } from '../../PermissionUpdateSchema.js'
import { hasPermissionsToUseTool } from '../../permissions.js'
import type { PermissionContext } from '../PermissionContext.js'
import { createResolveOnce } from '../PermissionContext.js'

type InteractivePermissionParams = {
  ctx: PermissionContext
  description: string
  result: PermissionDecision & { behavior: 'ask' }
  awaitAutomatedChecksBeforeDialog: boolean | undefined
  bridgeCallbacks?: BridgePermissionCallbacks
  channelCallbacks?: ChannelPermissionCallbacks
}

/**
 * Copia de `ccnmt: packages/permission/src/toolPermission/handlers/interactiveHandler.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Atiende el flujo interactivo de permiso, el del agente principal.
 *
 * Empuja una entrada `ToolUseConfirm` a la cola de confirmación con sus
 * callbacks: `onAbort`, `onAllow`, `onReject`, `recheckPermission` y
 * `onUserInteraction`.
 *
 * Ejecuta los hooks de permiso y las comprobaciones del clasificador de bash
 * de forma asíncrona, en segundo plano, haciéndolos competir contra la
 * interacción del usuario. Usa una guarda de resolver-una-sola-vez y la
 * bandera `userInteracted` para impedir resoluciones múltiples.
 *
 * Esta función NO devuelve una promesa — monta callbacks que acaban llamando
 * a `resolve()` para resolver la promesa exterior, que es de quien la llama.
 */
function handleInteractivePermission(
  params: InteractivePermissionParams,
  resolve: (decision: PermissionDecision) => void,
): void {
  const {
    ctx,
    description,
    result,
    awaitAutomatedChecksBeforeDialog,
    bridgeCallbacks,
    channelCallbacks,
  } = params

  const { resolve: resolveOnce, isResolved, claim } = createResolveOnce(resolve)
  let userInteracted = false
  let checkmarkTransitionTimer: ReturnType<typeof setTimeout> | undefined
  // Izado para que `onDismissCheckmark` (Esc durante la ventana del
  // checkmark) también pueda retirar el listener de abort — no sólo el
  // callback del temporizador.
  let checkmarkAbortHandler: (() => void) | undefined
  const bridgeRequestId = bridgeCallbacks ? randomUUID() : undefined
  // Izado para que una victoria local, de hook o del clasificador pueda
  // retirar la entrada de canal pendiente. No hay equivalente de «dile al
  // remoto que la descarte» — el mensaje está en el teléfono, y un «yes
  // abc123» rancio posterior a la resolución local cae por
  // `tryConsumeReply` (la entrada ya no está) y se encola como chat normal.
  let channelUnsubscribe: (() => void) | undefined

  const permissionPromptStartTimeMs = Date.now()
  const displayInput = result.updatedInput ?? ctx.input

  function clearClassifierIndicator(): void {
    if (feature('BASH_CLASSIFIER')) {
      ctx.updateQueueItem({ classifierCheckInProgress: false })
    }
  }

  ctx.pushToQueue({
    assistantMessage: ctx.assistantMessage,
    tool: ctx.tool,
    description,
    input: displayInput,
    toolUseContext: ctx.toolUseContext,
    toolUseID: ctx.toolUseID,
    permissionResult: result,
    permissionPromptStartTimeMs,
    ...(feature('BASH_CLASSIFIER')
      ? {
          classifierCheckInProgress:
            !!result.pendingClassifierCheck &&
            !awaitAutomatedChecksBeforeDialog,
        }
      : {}),
    onUserInteraction() {
      // Se llama cuando el usuario empieza a interactuar con el diálogo de
      // permiso (flechas, tab, escribir un comentario).
      // Oculta el indicador del clasificador, porque la auto-aprobación ya no
      // es posible.
      //
      // Periodo de gracia: ignora las interacciones de los primeros 200 ms,
      // para que una pulsación accidental no cancele el clasificador antes de
      // tiempo.
      const GRACE_PERIOD_MS = 200
      if (Date.now() - permissionPromptStartTimeMs < GRACE_PERIOD_MS) {
        return
      }
      userInteracted = true
      clearClassifierChecking(ctx.toolUseID)
      clearClassifierIndicator()
    },
    onDismissCheckmark() {
      if (checkmarkTransitionTimer) {
        clearTimeout(checkmarkTransitionTimer)
        checkmarkTransitionTimer = undefined
        if (checkmarkAbortHandler) {
          ctx.toolUseContext.abortController.signal.removeEventListener(
            'abort',
            checkmarkAbortHandler,
          )
          checkmarkAbortHandler = undefined
        }
        ctx.removeFromQueue()
      }
    },
    onAbort() {
      if (!claim()) return
      if (bridgeCallbacks && bridgeRequestId) {
        bridgeCallbacks.sendResponse(bridgeRequestId, {
          behavior: 'deny',
          message: 'User aborted',
        })
        bridgeCallbacks.cancelRequest(bridgeRequestId)
      }
      channelUnsubscribe?.()
      ctx.logCancelled()
      ctx.logDecision(
        { decision: 'reject', source: { type: 'user_abort' } },
        { permissionPromptStartTimeMs },
      )
      resolveOnce(ctx.cancelAndAbort(undefined, true))
    },
    async onAllow(
      updatedInput,
      permissionUpdates: PermissionUpdate[],
      feedback?: string,
      contentBlocks?: ContentBlockParam[],
    ) {
      if (!claim()) return // comprobar-y-marcar atómico antes del await

      if (bridgeCallbacks && bridgeRequestId) {
        bridgeCallbacks.sendResponse(bridgeRequestId, {
          behavior: 'allow',
          updatedInput,
          updatedPermissions: permissionUpdates,
        })
        bridgeCallbacks.cancelRequest(bridgeRequestId)
      }
      channelUnsubscribe?.()

      resolveOnce(
        await ctx.handleUserAllow(
          updatedInput,
          permissionUpdates,
          feedback,
          permissionPromptStartTimeMs,
          contentBlocks,
          result.decisionReason,
        ),
      )
    },
    onReject(feedback?: string, contentBlocks?: ContentBlockParam[]) {
      if (!claim()) return

      if (bridgeCallbacks && bridgeRequestId) {
        bridgeCallbacks.sendResponse(bridgeRequestId, {
          behavior: 'deny',
          message: feedback ?? 'User denied permission',
        })
        bridgeCallbacks.cancelRequest(bridgeRequestId)
      }
      channelUnsubscribe?.()

      ctx.logDecision(
        {
          decision: 'reject',
          source: { type: 'user_reject', hasFeedback: !!feedback },
        },
        { permissionPromptStartTimeMs },
      )
      resolveOnce(ctx.cancelAndAbort(feedback, undefined, contentBlocks))
    },
    async recheckPermission() {
      if (isResolved()) return
      const freshResult = await hasPermissionsToUseTool(
        ctx.tool,
        ctx.input,
        ctx.toolUseContext,
        ctx.assistantMessage,
        ctx.toolUseID,
      )
      if (freshResult.behavior === 'allow') {
        // `claim()` (comprobar-y-marcar atómico), no `isResolved()` — la
        // llamada asíncrona a `hasPermissionsToUseTool` de arriba abre una
        // ventana en la que CCR pudo haber respondido en vuelo. Coincide con
        // los caminos de `onAllow`, `onReject` y los hooks. `cancelRequest`
        // le dice a CCR que descarte su prompt — sin eso, la interfaz web
        // muestra un prompt rancio de una herramienta que ya se está
        // ejecutando (se ve sobre todo cuando el recheck lo dispara un cambio
        // de modo iniciado por CCR, que es justo el caso para el que este
        // callback existe desde que `useReplBridge` empezó a llamarlo).
        if (!claim()) return
        if (bridgeCallbacks && bridgeRequestId) {
          bridgeCallbacks.cancelRequest(bridgeRequestId)
        }
        channelUnsubscribe?.()
        ctx.removeFromQueue()
        ctx.logDecision({ decision: 'accept', source: 'config' })
        resolveOnce(ctx.buildAllow(freshResult.updatedInput ?? ctx.input))
      }
    },
  })

  // Competidor 4: la respuesta de permiso que llega del bridge de CCR
  // (claude.ai). Con el bridge conectado, envía la petición de permiso a CCR
  // y se suscribe a la respuesta. Gane quien gane —la CLI o CCR—, el primero
  // en responder se lleva el `claim()`.
  //
  // Se reenvían TODAS las herramientas: el modal genérico de permitir/denegar
  // de CCR atiende cualquiera, y puede devolver `updatedInput` cuando tiene
  // un renderizador dedicado (la edición de un plan, por ejemplo). Las
  // herramientas cuyo diálogo local inyecta campos (`selected` de
  // ReviewArtifact, `answers` de AskUserQuestion) toleran que el campo falte,
  // así que la aprobación remota genérica se degrada con elegancia en vez de
  // lanzar.
  if (bridgeCallbacks && bridgeRequestId) {
    bridgeCallbacks.sendRequest(
      bridgeRequestId,
      ctx.tool.name,
      displayInput,
      ctx.toolUseID,
      description,
      result.suggestions,
      result.blockedPath,
    )

    const signal = ctx.toolUseContext.abortController.signal
    const unsubscribe = bridgeCallbacks.onResponse(
      bridgeRequestId,
      response => {
        if (!claim()) return // El usuario local, un hook o el clasificador ya respondió
        signal.removeEventListener('abort', unsubscribe)
        clearClassifierChecking(ctx.toolUseID)
        clearClassifierIndicator()
        ctx.removeFromQueue()
        channelUnsubscribe?.()

        if (response.behavior === 'allow') {
          if (response.updatedPermissions?.length) {
            void ctx.persistPermissions(response.updatedPermissions)
          }
          ctx.logDecision(
            {
              decision: 'accept',
              source: {
                type: 'user',
                permanent: !!response.updatedPermissions?.length,
              },
            },
            { permissionPromptStartTimeMs },
          )
          resolveOnce(ctx.buildAllow(response.updatedInput ?? displayInput))
        } else {
          ctx.logDecision(
            {
              decision: 'reject',
              source: {
                type: 'user_reject',
                hasFeedback: !!response.message,
              },
            },
            { permissionPromptStartTimeMs },
          )
          resolveOnce(ctx.cancelAndAbort(response.message))
        }
      },
    )

    signal.addEventListener('abort', unsubscribe, { once: true })
  }

  // Relevo de permiso por canal — compite junto al bloque del bridge de
  // arriba. Envía un prompt de permiso a cada canal activo (Telegram,
  // iMessage, etc.) por su herramienta MCP `send_message`, y luego hace
  // competir la respuesta contra la local, la del bridge, la del hook y la
  // del clasificador. El «yes abc123» entrante lo intercepta el manejador de
  // notificaciones (`useManageMCPConnections.ts`) ANTES de encolarlo, así que
  // nunca le llega a Claude como un turno de conversación.
  //
  // A diferencia del bloque del bridge, éste sí sigue guardando por
  // `requiresUserInteraction` — las respuestas de canal son un sí o un no
  // puros, sin camino de `updatedInput`. En la práctica hoy la guarda es
  // código muerto: las tres herramientas con `requiresUserInteraction`
  // (ExitPlanMode, AskUserQuestion, ReviewArtifact) devuelven
  // `isEnabled()===false` cuando hay canales configurados, así que nunca
  // llegan a este manejador.
  //
  // El envío es de disparar y olvidar: si `callTool` falla (canal caído,
  // herramienta ausente), la suscripción nunca se dispara y gana otro
  // competidor. Degradación con elegancia — el diálogo local siempre está
  // ahí, como piso.
  if (
    (feature('KAIROS') || feature('KAIROS_CHANNELS')) &&
    channelCallbacks &&
    !ctx.tool.requiresUserInteraction?.()
  ) {
    const channelRequestId = shortRequestId(ctx.toolUseID)
    const allowedChannels = getAllowedChannels()
    const channelClients = filterPermissionRelayClients(
      ctx.toolUseContext.getAppState().mcp.clients,
      name => findChannelEntry(name, allowedChannels) !== undefined,
    )

    if (channelClients.length > 0) {
      // La salida también va estructurada (la petición de simetría de
      // Kenneth) — el servidor es el dueño del formato del mensaje para su
      // plataforma (markdown de Telegram, texto enriquecido de iMessage,
      // embed de Discord). CC envía las partes EN CRUDO; el servidor
      // compone. El apaño viejo de la triple clave
      // `callTool('send_message', {text,content,message})` ya no está — se
      // acabó adivinar qué nombre de argumento toma cada plugin.
      const params: ChannelPermissionRequestParams = {
        request_id: channelRequestId,
        tool_name: ctx.tool.name,
        description,
        input_preview: truncateForPreview(displayInput),
      }

      for (const client of channelClients) {
        if (client.type !== 'connected') continue // refinar el tipo para TS
        void client.client
          .notification({
            method: CHANNEL_PERMISSION_REQUEST_METHOD,
            params,
          })
          .catch(e => {
            logForDebugging(
              `Channel permission_request failed for ${client.name}: ${errorMessage(e)}`,
              { level: 'error' },
            )
          })
      }

      const channelSignal = ctx.toolUseContext.abortController.signal
      // Se envuelve para que en CADA sitio de llamada ocurran LAS DOS cosas:
      // el borrado del mapa Y el desmontaje del listener de abort. Los 6
      // sitios de `channelUnsubscribe?.()` posteriores a una victoria local,
      // de hook o del clasificador antes sólo borraban la entrada del mapa —
      // la clausura muerta seguía registrada en la abort signal de ámbito de
      // sesión hasta que la sesión terminaba. No era un defecto funcional
      // (`Map.delete` es idempotente), pero mantenía viva la clausura.
      const mapUnsub = channelCallbacks.onResponse(
        channelRequestId,
        response => {
          if (!claim()) return // Ganó otro competidor
          channelUnsubscribe?.() // las dos: borrar del mapa y retirar el listener
          clearClassifierChecking(ctx.toolUseID)
          clearClassifierIndicator()
          ctx.removeFromQueue()
          // El bridge es el otro remoto — avisarle de que ya terminamos.
          if (bridgeCallbacks && bridgeRequestId) {
            bridgeCallbacks.cancelRequest(bridgeRequestId)
          }

          if (response.behavior === 'allow') {
            ctx.logDecision(
              {
                decision: 'accept',
                source: { type: 'user', permanent: false },
              },
              { permissionPromptStartTimeMs },
            )
            resolveOnce(ctx.buildAllow(displayInput))
          } else {
            ctx.logDecision(
              {
                decision: 'reject',
                source: { type: 'user_reject', hasFeedback: false },
              },
              { permissionPromptStartTimeMs },
            )
            resolveOnce(
              ctx.cancelAndAbort(`Denied via channel ${response.fromServer}`),
            )
          }
        },
      )
      channelUnsubscribe = () => {
        mapUnsub()
        channelSignal.removeEventListener('abort', channelUnsubscribe!)
      }

      channelSignal.addEventListener('abort', channelUnsubscribe, {
        once: true,
      })
    }
  }

  // Saltarse los hooks si ya se esperaron en la rama del coordinador de arriba
  if (!awaitAutomatedChecksBeforeDialog) {
    // Ejecutar los hooks de `PermissionRequest` de forma asíncrona.
    // Si un hook devuelve una decisión antes de que el usuario responda,
    // aplicarla.
    void (async () => {
      if (isResolved()) return
      const currentAppState = ctx.toolUseContext.getAppState()
      const hookDecision = await ctx.runHooks(
        currentAppState.toolPermissionContext.mode,
        result.suggestions,
        result.updatedInput,
        permissionPromptStartTimeMs,
      )
      if (!hookDecision || !claim()) return
      if (bridgeCallbacks && bridgeRequestId) {
        bridgeCallbacks.cancelRequest(bridgeRequestId)
      }
      channelUnsubscribe?.()
      ctx.removeFromQueue()
      resolveOnce(hookDecision)
    })()
  }

  // Ejecutar la comprobación del clasificador de bash de forma asíncrona (si aplica)
  if (
    feature('BASH_CLASSIFIER') &&
    result.pendingClassifierCheck &&
    ctx.tool.name === BASH_TOOL_NAME &&
    !awaitAutomatedChecksBeforeDialog
  ) {
    // Indicador de interfaz de «clasificador en marcha» — se fija aquí, y no
    // en `toolExecution.ts`, para que los comandos que se auto-permiten por
    // una regla de prefijo no hagan parpadear el indicador una fracción de
    // segundo antes de que la aprobación vuelva.
    setClassifierChecking(ctx.toolUseID)
    void executeAsyncClassifierCheck(
      result.pendingClassifierCheck,
      ctx.toolUseContext.abortController.signal,
      ctx.toolUseContext.options.isNonInteractiveSession,
      {
        shouldContinue: () => !isResolved() && !userInteracted,
        onComplete: () => {
          clearClassifierChecking(ctx.toolUseID)
          clearClassifierIndicator()
        },
        onAllow: decisionReason => {
          if (!claim()) return
          if (bridgeCallbacks && bridgeRequestId) {
            bridgeCallbacks.cancelRequest(bridgeRequestId)
          }
          channelUnsubscribe?.()
          clearClassifierChecking(ctx.toolUseID)

          const matchedRule =
            decisionReason.type === 'classifier'
              ? (decisionReason.reason.match(
                  /^Allowed by prompt rule: "(.+)"$/,
                )?.[1] ?? decisionReason.reason)
              : undefined

          // Mostrar la transición de auto-aprobado con las opciones atenuadas
          if (feature('TRANSCRIPT_CLASSIFIER')) {
            ctx.updateQueueItem({
              classifierCheckInProgress: false,
              classifierAutoApproved: true,
              classifierMatchedRule: matchedRule,
            })
          }

          if (
            feature('TRANSCRIPT_CLASSIFIER') &&
            decisionReason.type === 'classifier'
          ) {
            if (decisionReason.classifier === 'auto-mode') {
              setYoloClassifierApproval(ctx.toolUseID, decisionReason.reason)
            } else if (matchedRule) {
              setClassifierApproval(ctx.toolUseID, matchedRule)
            }
          }

          ctx.logDecision(
            { decision: 'accept', source: { type: 'classifier' } },
            { permissionPromptStartTimeMs },
          )
          resolveOnce(ctx.buildAllow(ctx.input, { decisionReason }))

          // Mantener el checkmark visible y después retirar el diálogo.
          // 3 s si la terminal tiene el foco (el usuario puede verlo), 1 s si
          // no. El usuario puede descartarlo antes con Esc, por
          // `onDismissCheckmark`.
          const signal = ctx.toolUseContext.abortController.signal
          checkmarkAbortHandler = () => {
            if (checkmarkTransitionTimer) {
              clearTimeout(checkmarkTransitionTimer)
              checkmarkTransitionTimer = undefined
              // El error de un Bash hermano puede disparar esto
              // (`StreamingToolExecutor` lo propaga en cascada por
              // `siblingAbortController`) — hay que soltar el diálogo
              // cosmético del ✓ o bloquea el siguiente elemento de la cola.
              ctx.removeFromQueue()
            }
          }
          const checkmarkMs = getTerminalFocused() ? 3000 : 1000
          checkmarkTransitionTimer = setTimeout(() => {
            checkmarkTransitionTimer = undefined
            if (checkmarkAbortHandler) {
              signal.removeEventListener('abort', checkmarkAbortHandler)
              checkmarkAbortHandler = undefined
            }
            ctx.removeFromQueue()
          }, checkmarkMs)
          signal.addEventListener('abort', checkmarkAbortHandler, {
            once: true,
          })
        },
      },
    ).catch(error => {
      // Registrar los errores del API del clasificador para depurar, pero no
      // propagarlos como interrupciones. Pueden ser fallos de red, límites de
      // tasa o problemas del modelo — no cancelaciones del usuario.
      logForDebugging(`Async classifier check failed: ${errorMessage(error)}`, {
        level: 'error',
      })
    })
  }
}

// --

export { handleInteractivePermission }
export type { InteractivePermissionParams }
