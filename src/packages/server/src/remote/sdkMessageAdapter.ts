/**
 * Puerto de `ccnmt: packages/server/src/remote/sdkMessageAdapter.ts`.
 *
 * `SDKAssistantMessage`/`SDKCompactBoundaryMessage`/`SDKMessage`/
 * `SDKPartialAssistantMessage`/`SDKResultMessage`/`SDKStatusMessage`/
 * `SDKSystemMessage`/`SDKToolProgressMessage`/`SDKUserMessage` — sólo
 * TIPOS, de `@thyrox/headless-sdk/agentSdkTypes.js`.
 *
 * `Message`/`AssistantMessage` — TIPOS de `@thyrox/agent/messageShapes.js`
 * (existen). `StreamEvent`/`SystemMessage` NO existen todavía en ese
 * archivo — su sibling `messageShapes.ts` es un porte parcial declarado
 * (ver su propio docstring) que aún no los cubre. Se declaran aquí LOCAL
 * y MÍNIMOS, con la misma forma que `ccnmt: packages/agent/messageShapes.ts:56,60`
 * (`SystemMessage = Message & { type: 'system' }`,
 * `StreamEvent = { type: string; [key: string]: unknown }`) — son tipos,
 * se erasan en runtime, así que no hace falta que el símbolo exista en el
 * sibling para que este archivo compile y corra.
 *
 * `createUserMessage` (`@thyrox/agent/messages.js`) es un PORTE PARCIAL
 * DECLARADO en ese sibling: no acepta `toolUseResult` (ver su propio
 * docstring). El campo SÍ existe en el tipo `UserMessage` de
 * `messageShapes.ts` (`toolUseResult?: unknown`), así que aquí se
 * construye el mensaje llamando a `createUserMessage` para los cuatro
 * campos que sí acepta y se agrega `toolUseResult` por composición — el
 * objeto final tiene la misma forma que produciría la fuente, aunque el
 * constructor portado no reciba ese parámetro directamente.
 *
 * `logForDebugging`/`fromSDKCompactMetadata`/`createUserMessage`/
 * `unpackModelId` — ver `../internal/pendingCrossPackageDeps.js` y
 * `requireProviderConnections`/`requireAgentMessages`.
 */
import type {
  SDKAssistantMessage,
  SDKCompactBoundaryMessage,
  SDKMessage,
  SDKPartialAssistantMessage,
  SDKResultMessage,
  SDKStatusMessage,
  SDKSystemMessage,
  SDKToolProgressMessage,
  SDKUserMessage,
} from '@thyrox/headless-sdk/agentSdkTypes.js'
import type { AssistantMessage, Message } from '@thyrox/agent/messageShapes.js'
import {
  fromSDKCompactMetadata,
  requireAgentMessages,
  requireLocalObservabilityDebug,
  requireProviderConnections,
} from '../internal/pendingCrossPackageDeps.js'

/** Ver el docstring del módulo: declarado localmente, el sibling no lo cubre todavía. */
export type SystemMessage = Message & { type: 'system' }
/** Ver el docstring del módulo: declarado localmente, el sibling no lo cubre todavía. */
export type StreamEvent = { type: string; [key: string]: unknown }

/**
 * Convierte un SDKAssistantMessage a un AssistantMessage.
 */
function convertAssistantMessage(msg: SDKAssistantMessage): AssistantMessage {
  return {
    type: 'assistant',
    message: msg.message,
    uuid: msg.uuid,
    requestId: undefined,
    timestamp: new Date().toISOString(),
    error: msg.error,
  } as unknown as AssistantMessage
}

/**
 * Convierte un SDKPartialAssistantMessage (streaming) a un StreamEvent.
 */
function convertStreamEvent(msg: SDKPartialAssistantMessage): StreamEvent {
  return {
    type: 'stream_event',
    event: msg.event,
  }
}

/**
 * Convierte un SDKResultMessage a un SystemMessage.
 */
function convertResultMessage(msg: SDKResultMessage): SystemMessage {
  const isError = msg.subtype !== 'success'
  const content = isError
    ? msg.errors?.join(', ') || 'Unknown error'
    : 'Session completed successfully'

  return {
    type: 'system',
    subtype: 'informational',
    content,
    level: isError ? 'warning' : 'info',
    uuid: msg.uuid,
    timestamp: new Date().toISOString(),
  } as unknown as SystemMessage
}

/**
 * Convierte un SDKSystemMessage (init) a un SystemMessage.
 */
function convertInitMessage(msg: SDKSystemMessage): SystemMessage {
  const { unpackModelId } = requireProviderConnections()
  // Recorta el prefijo de enrutamiento de conexión — este string se
  // muestra tal cual en el panel de mensajes de sistema del REPL; el
  // usuario no debería ver internos de ccb.
  const bareModel = unpackModelId(msg.model).modelId
  return {
    type: 'system',
    subtype: 'informational',
    content: `Remote session initialized (model: ${bareModel})`,
    level: 'info',
    uuid: msg.uuid,
    timestamp: new Date().toISOString(),
  } as unknown as SystemMessage
}

/**
 * Convierte un SDKStatusMessage a un SystemMessage.
 */
function convertStatusMessage(msg: SDKStatusMessage): SystemMessage | null {
  if (!msg.status) {
    return null
  }

  return {
    type: 'system',
    subtype: 'informational',
    content:
      msg.status === 'compacting'
        ? 'Compacting conversation…'
        : `Status: ${msg.status}`,
    level: 'info',
    uuid: msg.uuid,
    timestamp: new Date().toISOString(),
  } as unknown as SystemMessage
}

/**
 * Convierte un SDKToolProgressMessage a un SystemMessage.
 * Se usa un system message en vez de ProgressMessage porque el tipo
 * Progress es una unión compleja que exige datos específicos de la
 * herramienta que no tenemos desde CCR.
 */
function convertToolProgressMessage(
  msg: SDKToolProgressMessage,
): SystemMessage {
  return {
    type: 'system',
    subtype: 'informational',
    content: `Tool ${msg.tool_name} running for ${msg.elapsed_time_seconds}s…`,
    level: 'info',
    uuid: msg.uuid,
    timestamp: new Date().toISOString(),
    toolUseID: msg.tool_use_id,
  } as unknown as SystemMessage
}

/**
 * Convierte un SDKCompactBoundaryMessage a un SystemMessage.
 */
function convertCompactBoundaryMessage(
  msg: SDKCompactBoundaryMessage,
): SystemMessage {
  return {
    type: 'system',
    subtype: 'compact_boundary',
    content: 'Conversation compacted',
    level: 'info',
    uuid: msg.uuid,
    timestamp: new Date().toISOString(),
    compactMetadata: fromSDKCompactMetadata(
      msg.compact_metadata as unknown as Parameters<
        typeof fromSDKCompactMetadata
      >[0],
    ),
  } as unknown as SystemMessage
}

/**
 * Resultado de convertir un SDKMessage.
 */
export type ConvertedMessage =
  | { type: 'message'; message: Message }
  | { type: 'stream_event'; event: StreamEvent }
  | { type: 'ignored' }

type ConvertOptions = {
  /** Convierte mensajes de usuario con bloques de contenido tool_result en
   * UserMessages. Lo usa el modo de conexión directa, donde los resultados
   * de herramientas vienen del servidor remoto y hay que renderizarlos
   * localmente. El modo CCR ignora los mensajes de usuario porque se
   * manejan distinto. */
  convertToolResults?: boolean
  /**
   * Convierte mensajes de texto de usuario en UserMessages para mostrarlos.
   * Se usa al convertir eventos históricos donde hay que mostrar mensajes
   * escritos por el usuario. En modo WS en vivo ya los agrega localmente
   * el REPL, así que por defecto se ignoran.
   */
  convertUserTextMessages?: boolean
}

/**
 * Convierte un SDKMessage al formato de mensaje del REPL.
 */
export function convertSDKMessage(
  msg: SDKMessage,
  opts?: ConvertOptions,
): ConvertedMessage {
  const { logForDebugging } = requireLocalObservabilityDebug()
  const { createUserMessage } = requireAgentMessages()

  switch (msg.type) {
    case 'assistant':
      return {
        type: 'message',
        message: convertAssistantMessage(msg as SDKAssistantMessage),
      }

    case 'user': {
      const userMsg = msg as SDKUserMessage
      const content = userMsg.message?.content
      // Los mensajes de resultado de herramienta del servidor remoto
      // necesitan convertirse para que rendericen y colapsen como los
      // resultados locales. Se detecta por la forma del contenido
      // (bloques tool_result) — parent_tool_use_id NO es confiable: el
      // normalizeMessage() del lado del agente lo fija en null para los
      // resultados de herramienta de nivel superior, así que no puede
      // distinguir resultados de herramienta de ecos de prompt.
      const isToolResult =
        Array.isArray(content) &&
        content.some((b: { type?: string }) => b.type === 'tool_result')
      if (opts?.convertToolResults && isToolResult) {
        return {
          type: 'message',
          message: {
            ...createUserMessage({
              content: content as unknown[],
              uuid: userMsg.uuid,
              timestamp: userMsg.timestamp,
            }),
            toolUseResult: userMsg.tool_use_result,
          } as unknown as Message,
        }
      }
      // Al convertir eventos históricos, los mensajes escritos por el
      // usuario hay que renderizarlos (el REPL no los agregó localmente).
      // Salta los tool_results aquí — ya se manejaron arriba.
      if (opts?.convertUserTextMessages && !isToolResult) {
        if (typeof content === 'string' || Array.isArray(content)) {
          return {
            type: 'message',
            message: {
              ...createUserMessage({
                content: content as string | unknown[],
                uuid: userMsg.uuid,
                timestamp: userMsg.timestamp,
              }),
              toolUseResult: userMsg.tool_use_result,
            } as unknown as Message,
          }
        }
      }
      // Los mensajes escritos por el usuario (contenido string) ya los
      // agregó localmente el REPL. En modo CCR, todos los mensajes de
      // usuario se ignoran (los resultados de herramienta se manejan distinto).
      return { type: 'ignored' }
    }

    case 'stream_event':
      return {
        type: 'stream_event',
        event: convertStreamEvent(msg as SDKPartialAssistantMessage),
      }

    case 'result':
      // Sólo se muestran mensajes de resultado para errores. Los
      // resultados exitosos son ruido en sesiones multi-turno
      // (isLoading=false ya es señal suficiente).
      if ((msg as SDKResultMessage).subtype !== 'success') {
        return {
          type: 'message',
          message: convertResultMessage(msg as SDKResultMessage),
        }
      }
      return { type: 'ignored' }

    case 'system': {
      const sysMsg = msg as SDKSystemMessage
      if (sysMsg.subtype === 'init') {
        return { type: 'message', message: convertInitMessage(sysMsg) }
      }
      if (sysMsg.subtype === 'status') {
        const statusMsg = convertStatusMessage(msg as SDKStatusMessage)
        return statusMsg
          ? { type: 'message', message: statusMsg }
          : { type: 'ignored' }
      }
      if (sysMsg.subtype === 'compact_boundary') {
        return {
          type: 'message',
          message: convertCompactBoundaryMessage(
            msg as SDKCompactBoundaryMessage,
          ),
        }
      }
      // hook_response y otros subtipos.
      logForDebugging(
        `[sdkMessageAdapter] Ignoring system message subtype: ${sysMsg.subtype}`,
      )
      return { type: 'ignored' }
    }

    case 'tool_progress':
      return {
        type: 'message',
        message: convertToolProgressMessage(msg as SDKToolProgressMessage),
      }

    case 'auth_status':
      // El estado de auth se maneja aparte, no se convierte a mensaje visible.
      logForDebugging('[sdkMessageAdapter] Ignoring auth_status message')
      return { type: 'ignored' }

    case 'tool_use_summary':
      // Los resúmenes de uso de herramienta son eventos sólo-SDK, no se muestran en el REPL.
      logForDebugging('[sdkMessageAdapter] Ignoring tool_use_summary message')
      return { type: 'ignored' }

    case 'rate_limit_event':
      // Los eventos de rate limit son eventos sólo-SDK, no se muestran en el REPL.
      logForDebugging('[sdkMessageAdapter] Ignoring rate_limit_event message')
      return { type: 'ignored' }

    default: {
      // Ignora con gracia tipos de mensaje desconocidos. El backend puede
      // mandar tipos nuevos antes de que el cliente se actualice; loguear
      // ayuda a diagnosticar sin tirar ni perder la sesión.
      logForDebugging(
        `[sdkMessageAdapter] Unknown message type: ${(msg as { type: string }).type}`,
      )
      return { type: 'ignored' }
    }
  }
}

/**
 * Comprueba si un SDKMessage indica que la sesión terminó.
 */
export function isSessionEndMessage(msg: SDKMessage): boolean {
  return msg.type === 'result'
}

/**
 * Comprueba si un SDKResultMessage indica éxito.
 */
export function isSuccessResult(msg: SDKResultMessage): boolean {
  return msg.subtype === 'success'
}

/**
 * Extrae el texto de resultado de un SDKResultMessage exitoso.
 */
export function getResultText(msg: SDKResultMessage): string | null {
  if (msg.subtype === 'success') {
    return msg.result ?? null
  }
  return null
}
