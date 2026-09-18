import { feature } from 'bun:bundle'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import type { PendingClassifierCheck } from '../../permissionTypes.js'
import { isAgentSwarmsEnabled } from '@thyrox/agent/agentSwarmsEnabled.js'
import { toError } from '@thyrox/local-observability/errorHelpers.js'
import { logError } from '@thyrox/local-observability/logging'
import type { PermissionDecision } from '../../PermissionResult.js'
import type { PermissionUpdate } from '../../PermissionUpdateSchema.js'
import {
  createPermissionRequest,
  isSwarmWorker,
  sendPermissionRequestViaMailbox,
} from '@thyrox/swarm'
import { registerPermissionCallback } from '@thyrox/repl/hooks/useSwarmPermissionPoller.js'
import type { PermissionContext } from '../PermissionContext.js'
import { createResolveOnce } from '../PermissionContext.js'

type SwarmWorkerPermissionParams = {
  ctx: PermissionContext
  description: string
  pendingClassifierCheck?: PendingClassifierCheck | undefined
  updatedInput: Record<string, unknown> | undefined
  suggestions: PermissionUpdate[] | undefined
}

/**
 * Copia de `ccnmt: packages/permission/src/toolPermission/handlers/swarmWorkerHandler.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Atiende el flujo de permiso de un trabajador de swarm.
 *
 * Cuando se corre como trabajador de un swarm:
 * 1. Intenta la auto-aprobación del clasificador para los comandos de bash.
 * 2. Reenvía la petición de permiso al líder por el buzón.
 * 3. Registra los callbacks para cuando el líder responda.
 * 4. Fija el indicador de pendiente mientras espera.
 *
 * Devuelve una `PermissionDecision` si el clasificador auto-aprueba, o una
 * promesa que resuelve cuando el líder responde. Devuelve null si los swarms
 * no están habilitados o si esto no es un trabajador de swarm, para que quien
 * llame caiga al manejo interactivo.
 */
async function handleSwarmWorkerPermission(
  params: SwarmWorkerPermissionParams,
): Promise<PermissionDecision | null> {
  if (!isAgentSwarmsEnabled() || !isSwarmWorker()) {
    return null
  }

  const { ctx, description, updatedInput, suggestions } = params

  // Para los comandos de bash, intentar la auto-aprobación del clasificador
  // antes de reenviar al líder. Los agentes esperan el resultado del
  // clasificador, en vez de hacerlo competir contra la interacción del
  // usuario como hace el agente principal.
  const classifierResult = feature('BASH_CLASSIFIER')
    ? await ctx.tryClassifier?.(params.pendingClassifierCheck, updatedInput)
    : null
  if (classifierResult) {
    return classifierResult
  }

  // Reenviar la petición de permiso al líder por el buzón
  try {
    const clearPendingRequest = (): void =>
      ctx.toolUseContext.setAppState(prev => ({
        ...prev,
        pendingWorkerRequest: null,
      }))

    const decision = await new Promise<PermissionDecision>(resolve => {
      const { resolve: resolveOnce, claim } = createResolveOnce(resolve)

      // Crear la petición de permiso
      const request = createPermissionRequest({
        toolName: ctx.tool.name,
        toolUseId: ctx.toolUseID,
        input: ctx.input,
        description,
        permissionSuggestions: suggestions,
      })

      // Registrar el callback ANTES de enviar la petición, para evitar la
      // carrera en la que el líder responde antes de que el callback esté
      // registrado.
      registerPermissionCallback({
        requestId: request.id,
        toolUseId: ctx.toolUseID,
        async onAllow(
          allowedInput: Record<string, unknown> | undefined,
          permissionUpdates: PermissionUpdate[],
          feedback?: string,
          contentBlocks?: ContentBlockParam[],
        ) {
          if (!claim()) return // comprobar-y-marcar atómico antes del await
          clearPendingRequest()

          // Fundir la entrada actualizada con la original
          const finalInput =
            allowedInput && Object.keys(allowedInput).length > 0
              ? allowedInput
              : ctx.input

          resolveOnce(
            await ctx.handleUserAllow(
              finalInput,
              permissionUpdates,
              feedback,
              undefined,
              contentBlocks,
            ),
          )
        },
        onReject(feedback?: string, contentBlocks?: ContentBlockParam[]) {
          if (!claim()) return
          clearPendingRequest()

          ctx.logDecision({
            decision: 'reject',
            source: { type: 'user_reject', hasFeedback: !!feedback },
          })

          resolveOnce(ctx.cancelAndAbort(feedback, undefined, contentBlocks))
        },
      })

      // Con el callback ya registrado, enviar la petición al líder
      void sendPermissionRequestViaMailbox(request)

      // Mostrar el indicador visual de que se está esperando la aprobación del líder
      ctx.toolUseContext.setAppState(prev => ({
        ...prev,
        pendingWorkerRequest: {
          toolName: ctx.tool.name,
          toolUseId: ctx.toolUseID,
          description,
        },
      }))

      // Si la abort signal se dispara mientras se espera la respuesta del
      // líder, resolver la promesa con una decisión de cancelar para que no
      // se quede colgada.
      ctx.toolUseContext.abortController.signal.addEventListener(
        'abort',
        () => {
          if (!claim()) return
          clearPendingRequest()
          ctx.logCancelled()
          resolveOnce(ctx.cancelAndAbort(undefined, true))
        },
        { once: true },
      )
    })

    return decision
  } catch (error) {
    // Si el envío del permiso al swarm falla, caer al manejo local
    logError(toError(error))
    // Continuar al manejo de la interfaz local, abajo
    return null
  }
}

export { handleSwarmWorkerPermission }
export type { SwarmWorkerPermissionParams }
