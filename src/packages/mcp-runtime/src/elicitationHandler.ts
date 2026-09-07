/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/elicitationHandler.ts`
 * — sus 6 exportaciones (3 tipos, 3 funciones), ninguna omitida.
 *
 * Repuntados (subpath declarado y símbolo verificado con resolución real):
 * `@thyrox/local-observability/logging` (`logMCPDebug`, `logMCPError`),
 * `@thyrox/local-observability/slowOperations.js` (`jsonStringify`) y
 * `@thyrox/local-observability` (`logEvent`). El tipo
 * `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS` se toma del
 * mismo `./compat` que ya usa `claudeai.ts` de este puerto (aquí sin
 * re-exportarlo, sólo como anotación de tipo — Bun no lo evalúa en runtime).
 *
 * `executeElicitationHooks`/`executeElicitationResultHooks`/
 * `executeNotificationHooks` (`@claude-code-how-works/agent/hooks.js` — el
 * subpath no está en el `exports` de `@thyrox/agent`, verificado contra la
 * lista completa del paquete) se usan sólo dentro de cuerpos de función
 * (nunca a nivel de módulo), así que se envuelven con `require()` diferido:
 * un `import` estático de un paquete cuya base (`@claude-code-how-works/*`)
 * no existe en este árbol hace fallar la carga del MÓDULO ENTERO (`Cannot
 * find module`, medido con `bun -e "import(...)"` antes de esta corrección),
 * no sólo la función que los usa. Mismo patrón que ya evita
 * `appStateHooks.ts` de este puerto.
 *
 * `@modelcontextprotocol/sdk` está genuinamente ausente de `node_modules`
 * en este contenedor (confirmado con `ls`) — hueco de entorno preexistente,
 * no del porte; queda como import estático porque es una dependencia externa
 * real del paquete, no un especificador `@claude-code-how-works/*` propio de
 * ccnmt.
 *
 * Maneja las peticiones de elicitación MCP (formulario o URL): las encola
 * en `AppState.elicitation.queue` para que la UI las muestre, corre los
 * hooks de elicitación antes y después de la respuesta del usuario, y
 * atiende la notificación de finalización del modo URL.
 */
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  ElicitationCompleteNotificationSchema,
  type ElicitRequestParams,
  ElicitRequestSchema,
  type ElicitResult,
} from '@modelcontextprotocol/sdk/types.js'
import type { AppState } from './appStateHooks.js'
import { logMCPDebug, logMCPError } from '@thyrox/local-observability/logging'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { logEvent } from '@thyrox/local-observability'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/local-observability/compat'

type ElicitationHooksResult = {
  elicitationResponse?: { action: ElicitResult['action']; content?: ElicitResult['content'] }
  blockingError?: boolean
}

type ElicitationResultHooksResult = {
  elicitationResultResponse?: { action: ElicitResult['action']; content?: ElicitResult['content'] }
  blockingError?: boolean
}

function requireAgentHooks(): {
  executeElicitationHooks: (args: {
    serverName: string
    message: string
    requestedSchema: Record<string, unknown> | undefined
    signal: AbortSignal
    mode: 'form' | 'url'
    url: string | undefined
    elicitationId: string | undefined
  }) => Promise<ElicitationHooksResult>
  executeElicitationResultHooks: (args: {
    serverName: string
    action: ElicitResult['action']
    content: Record<string, unknown> | undefined
    signal: AbortSignal
    mode: 'form' | 'url' | undefined
    elicitationId: string | undefined
  }) => Promise<ElicitationResultHooksResult>
  executeNotificationHooks: (args: {
    message: string
    notificationType: string
  }) => Promise<void>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@claude-code-how-works/agent/hooks.js')
}

/** Configuración del estado de espera mostrado tras abrir la URL el usuario. */
export type ElicitationWaitingState = {
  /** Etiqueta del botón, p. ej. "Retry now" o "Skip confirmation" */
  actionLabel: string
  /** Si mostrar un botón Cancel visible (p. ej. para el flujo de reintento por error) */
  showCancel?: boolean
}

export type ElicitationRequestEvent = {
  serverName: string
  /** El ID de petición JSON-RPC, único por conexión de servidor. */
  requestId: string | number
  params: ElicitRequestParams
  signal: AbortSignal
  /**
   * Resuelve la elicitación. Para elicitaciones explícitas, todas las
   * acciones son significativas. Para el reintento basado en error
   * (-32042), 'accept' es un no-op — el reintento lo maneja
   * onWaitingDismiss en su lugar.
   */
  respond: (response: ElicitResult) => void
  /** Para elicitaciones URL: se muestra tras abrir el navegador el usuario. */
  waitingState?: ElicitationWaitingState
  /** Se llama cuando la fase 2 (espera) se descarta por acción del usuario o finalización. */
  onWaitingDismiss?: (action: 'dismiss' | 'retry' | 'cancel') => void
  /** El manejador de la notificación de finalización lo pone en true cuando el servidor confirma. */
  completed?: boolean
}

function getElicitationMode(params: ElicitRequestParams): 'form' | 'url' {
  return params.mode === 'url' ? 'url' : 'form'
}

/** Busca un evento de elicitación encolado por nombre de servidor y elicitationId. */
function findElicitationInQueue(
  queue: ElicitationRequestEvent[],
  serverName: string,
  elicitationId: string,
): number {
  return queue.findIndex(
    e =>
      e.serverName === serverName &&
      e.params.mode === 'url' &&
      'elicitationId' in e.params &&
      e.params.elicitationId === elicitationId,
  )
}

export function registerElicitationHandler(
  client: Client,
  serverName: string,
  setAppState: (f: (prevState: AppState) => AppState) => void,
): void {
  // Registra el manejador de peticiones de elicitación.
  // Envuelto en try/catch porque setRequestHandler lanza si el cliente no
  // se creó con la capacidad de elicitación declarada.
  try {
    client.setRequestHandler(ElicitRequestSchema, async (request, extra) => {
      logMCPDebug(
        serverName,
        `Received elicitation request: ${jsonStringify(request)}`,
      )

      const mode = getElicitationMode(request.params)

      logEvent('tengu_mcp_elicitation_shown', {
        mode: mode as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })

      try {
        // Corre primero los hooks de elicitación — pueden dar una respuesta
        // programáticamente.
        const hookResponse = await runElicitationHooks(
          serverName,
          request.params,
          extra.signal,
        )
        if (hookResponse) {
          logMCPDebug(
            serverName,
            `Elicitation resolved by hook: ${jsonStringify(hookResponse)}`,
          )
          logEvent('tengu_mcp_elicitation_response', {
            mode: mode as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
            action:
              hookResponse.action as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          })
          return hookResponse
        }

        const elicitationId =
          mode === 'url' && 'elicitationId' in request.params
            ? (request.params.elicitationId as string | undefined)
            : undefined

        const response = new Promise<ElicitResult>(resolve => {
          const onAbort = () => {
            resolve({ action: 'cancel' })
          }

          if (extra.signal.aborted) {
            onAbort()
            return
          }

          const waitingState: ElicitationWaitingState | undefined =
            elicitationId ? { actionLabel: 'Skip confirmation' } : undefined

          setAppState(prev => ({
            ...prev,
            elicitation: {
              queue: [
                ...prev.elicitation.queue,
                {
                  serverName,
                  requestId: extra.requestId,
                  params: request.params,
                  signal: extra.signal,
                  waitingState,
                  respond: (result: ElicitResult) => {
                    extra.signal.removeEventListener('abort', onAbort)
                    logEvent('tengu_mcp_elicitation_response', {
                      mode: mode as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                      action:
                        result.action as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                    })
                    resolve(result)
                  },
                },
              ],
            },
          }))

          extra.signal.addEventListener('abort', onAbort, { once: true })
        })
        const rawResult = await response
        logMCPDebug(
          serverName,
          `Elicitation response: ${jsonStringify(rawResult)}`,
        )
        const result = await runElicitationResultHooks(
          serverName,
          rawResult,
          extra.signal,
          mode,
          elicitationId,
        )
        return result
      } catch (error) {
        logMCPError(serverName, `Elicitation error: ${error}`)
        return { action: 'cancel' as const }
      }
    })

    // Registra el manejador de las notificaciones de finalización de
    // elicitación (modo URL). Pone `completed: true` en el evento encolado
    // que coincide; el diálogo reacciona a esta bandera.
    client.setNotificationHandler(
      ElicitationCompleteNotificationSchema,
      notification => {
        const { elicitationId } = notification.params
        logMCPDebug(
          serverName,
          `Received elicitation completion notification: ${elicitationId}`,
        )
        void requireAgentHooks().executeNotificationHooks({
          message: `MCP server "${serverName}" confirmed elicitation ${elicitationId} complete`,
          notificationType: 'elicitation_complete',
        })
        let found = false
        setAppState(prev => {
          const idx = findElicitationInQueue(
            prev.elicitation.queue,
            serverName,
            elicitationId,
          )
          if (idx === -1) return prev
          found = true
          const queue = [...prev.elicitation.queue]
          queue[idx] = { ...queue[idx]!, completed: true }
          return { ...prev, elicitation: { queue } }
        })
        if (!found) {
          logMCPDebug(
            serverName,
            `Ignoring completion notification for unknown elicitation: ${elicitationId}`,
          )
        }
      },
    )
  } catch {
    // El cliente no se creó con la capacidad de elicitación — nada que registrar.
    return
  }
}

export async function runElicitationHooks(
  serverName: string,
  params: ElicitRequestParams,
  signal: AbortSignal,
): Promise<ElicitResult | undefined> {
  try {
    const mode = params.mode === 'url' ? 'url' : 'form'
    const url = 'url' in params ? (params.url as string) : undefined
    const elicitationId =
      'elicitationId' in params
        ? (params.elicitationId as string | undefined)
        : undefined

    const { elicitationResponse, blockingError } =
      await requireAgentHooks().executeElicitationHooks({
        serverName,
        message: params.message,
        requestedSchema:
          'requestedSchema' in params
            ? (params.requestedSchema as Record<string, unknown>)
            : undefined,
        signal,
        mode,
        url,
        elicitationId,
      })

    if (blockingError) {
      return { action: 'decline' }
    }

    if (elicitationResponse) {
      return {
        action: elicitationResponse.action,
        content: elicitationResponse.content,
      }
    }

    return undefined
  } catch (error) {
    logMCPError(serverName, `Elicitation hook error: ${error}`)
    return undefined
  }
}

/**
 * Corre los hooks de ElicitationResult tras la respuesta del usuario, y
 * dispara una notificación `elicitation_response`. Devuelve un ElicitResult
 * (potencialmente modificado) — los hooks pueden sobreescribir la
 * acción/contenido o bloquear la respuesta.
 */
export async function runElicitationResultHooks(
  serverName: string,
  result: ElicitResult,
  signal: AbortSignal,
  mode?: 'form' | 'url',
  elicitationId?: string,
): Promise<ElicitResult> {
  try {
    const { elicitationResultResponse, blockingError } =
      await requireAgentHooks().executeElicitationResultHooks({
        serverName,
        action: result.action,
        content: result.content as Record<string, unknown> | undefined,
        signal,
        mode,
        elicitationId,
      })

    if (blockingError) {
      void requireAgentHooks().executeNotificationHooks({
        message: `Elicitation response for server "${serverName}": decline`,
        notificationType: 'elicitation_response',
      })
      return { action: 'decline' }
    }

    const finalResult = elicitationResultResponse
      ? {
          action: elicitationResultResponse.action,
          content: elicitationResultResponse.content ?? result.content,
        }
      : result

    // Dispara una notificación con fines de observabilidad.
    void requireAgentHooks().executeNotificationHooks({
      message: `Elicitation response for server "${serverName}": ${finalResult.action}`,
      notificationType: 'elicitation_response',
    })

    return finalResult
  } catch (error) {
    logMCPError(serverName, `ElicitationResult hook error: ${error}`)
    // Dispara la notificación incluso ante error.
    void requireAgentHooks().executeNotificationHooks({
      message: `Elicitation response for server "${serverName}": ${result.action}`,
      notificationType: 'elicitation_response',
    })
    return result
  }
}
