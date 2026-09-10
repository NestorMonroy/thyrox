/**
 * Puerto de `ccnmt: packages/server/src/remote/RemoteSessionManager.ts`.
 * `SDKMessage`/`SDKControl*` — sólo TIPOS, de
 * `@thyrox/headless-sdk/{agentSdkTypes,controlTypes}.js`.
 * `logForDebugging`/`logError`/`sendEventToRemoteSession` — ver
 * `../internal/pendingCrossPackageDeps.js` (el último es punto de
 * inyección: el paquete `teleport` no existe en este árbol).
 */
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type {
  SDKControlCancelRequest,
  SDKControlPermissionRequest,
  SDKControlRequest,
  SDKControlResponse,
} from '@thyrox/headless-sdk/controlTypes.js'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilityLogging,
  sendEventToRemoteSession,
  type RemoteMessageContent,
} from '../internal/pendingCrossPackageDeps.js'
import {
  SessionsWebSocket,
  type SessionsWebSocketCallbacks,
} from './SessionsWebSocket.js'

/**
 * Type guard: ¿es un mensaje SDKMessage (no un mensaje de control)?
 */
function isSDKMessage(
  message:
    | SDKMessage
    | SDKControlRequest
    | SDKControlResponse
    | SDKControlCancelRequest,
): message is SDKMessage {
  return (
    message.type !== 'control_request' &&
    message.type !== 'control_response' &&
    message.type !== 'control_cancel_request'
  )
}

/**
 * Respuesta de permiso simplificada para sesiones remotas.
 * Es una versión simplificada de PermissionResult para comunicación con CCR.
 */
export type RemotePermissionResponse =
  | {
      behavior: 'allow'
      updatedInput: Record<string, unknown>
    }
  | {
      behavior: 'deny'
      message: string
    }

export type RemoteSessionConfig = {
  sessionId: string
  getAccessToken: () => string
  orgUuid: string
  /** True si la sesión se creó con un prompt inicial que se está procesando. */
  hasInitialPrompt?: boolean
  /**
   * Cuando es true, este cliente es un viewer puro. Ctrl+C/Escape NO
   * mandan interrupt al agente remoto; el timeout de reconexión de 60s se
   * desactiva; el título de la sesión nunca se actualiza. Lo usa
   * `claude assistant`.
   */
  viewerOnly?: boolean
}

export type RemoteSessionCallbacks = {
  /** Se llama cuando se recibe un SDKMessage de la sesión. */
  onMessage: (message: SDKMessage) => void
  /** Se llama cuando se recibe una petición de permiso de CCR. */
  onPermissionRequest: (
    request: SDKControlPermissionRequest,
    requestId: string,
  ) => void
  /** Se llama cuando el servidor cancela una petición de permiso pendiente. */
  onPermissionCancelled?: (
    requestId: string,
    toolUseId: string | undefined,
  ) => void
  /** Se llama cuando se establece la conexión. */
  onConnected?: () => void
  /** Se llama cuando se pierde la conexión y no se puede restaurar. */
  onDisconnected?: () => void
  /** Se llama ante una caída transitoria de WS mientras el backoff de reconexión está en curso. */
  onReconnecting?: () => void
  /** Se llama ante un error. */
  onError?: (error: Error) => void
}

/**
 * Gestiona una sesión CCR remota.
 *
 * Coordina:
 * - La suscripción WebSocket para recibir mensajes de CCR
 * - El POST HTTP para mandar mensajes de usuario a CCR
 * - El flujo de petición/respuesta de permisos
 */
export class RemoteSessionManager {
  private websocket: SessionsWebSocket | null = null
  private pendingPermissionRequests: Map<string, SDKControlPermissionRequest> =
    new Map()

  constructor(
    private readonly config: RemoteSessionConfig,
    private readonly callbacks: RemoteSessionCallbacks,
  ) {}

  /**
   * Conecta a la sesión remota vía WebSocket.
   */
  connect(): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    logForDebugging(
      `[RemoteSessionManager] Connecting to session ${this.config.sessionId}`,
    )

    const wsCallbacks: SessionsWebSocketCallbacks = {
      onMessage: message => this.handleMessage(message),
      onConnected: () => {
        logForDebugging('[RemoteSessionManager] Connected')
        this.callbacks.onConnected?.()
      },
      onClose: () => {
        logForDebugging('[RemoteSessionManager] Disconnected')
        this.callbacks.onDisconnected?.()
      },
      onReconnecting: () => {
        logForDebugging('[RemoteSessionManager] Reconnecting')
        this.callbacks.onReconnecting?.()
      },
      onError: error => {
        const { logError } = requireLocalObservabilityLogging()
        logError(error)
        this.callbacks.onError?.(error)
      },
    }

    this.websocket = new SessionsWebSocket(
      this.config.sessionId,
      this.config.orgUuid,
      this.config.getAccessToken,
      wsCallbacks,
    )

    void this.websocket.connect()
  }

  /**
   * Maneja mensajes provenientes del WebSocket.
   */
  private handleMessage(
    message:
      | SDKMessage
      | SDKControlRequest
      | SDKControlResponse
      | SDKControlCancelRequest,
  ): void {
    const { logForDebugging } = requireLocalObservabilityDebug()

    // Maneja control requests (prompts de permiso de CCR).
    if (message.type === 'control_request') {
      this.handleControlRequest(message)
      return
    }

    // Maneja control cancel requests (el servidor cancela un permiso pendiente).
    if (message.type === 'control_cancel_request') {
      const { request_id } = message
      const pendingRequest = this.pendingPermissionRequests.get(request_id)
      logForDebugging(
        `[RemoteSessionManager] Permission request cancelled: ${request_id}`,
      )
      this.pendingPermissionRequests.delete(request_id)
      this.callbacks.onPermissionCancelled?.(
        request_id,
        pendingRequest?.tool_use_id,
      )
      return
    }

    // Maneja control responses (acuses de recibo).
    if (message.type === 'control_response') {
      logForDebugging('[RemoteSessionManager] Received control response')
      return
    }

    // Reenvía mensajes SDK al callback (el type guard asegura el narrowing correcto).
    if (isSDKMessage(message)) {
      this.callbacks.onMessage(message)
    }
  }

  /**
   * Maneja control requests de CCR (p. ej. peticiones de permiso).
   */
  private handleControlRequest(request: SDKControlRequest): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    const requestId = request.request_id as string
    const inner = request.request as SDKControlPermissionRequest

    if (inner.subtype === 'can_use_tool') {
      logForDebugging(
        `[RemoteSessionManager] Permission request for tool: ${inner.tool_name}`,
      )
      this.pendingPermissionRequests.set(requestId, inner)
      this.callbacks.onPermissionRequest(inner, requestId)
    } else {
      // Manda una respuesta de error para subtipos no reconocidos, así el
      // servidor no queda colgado esperando una respuesta que nunca llega.
      logForDebugging(
        `[RemoteSessionManager] Unsupported control request subtype: ${inner.subtype}`,
      )
      const response: SDKControlResponse = {
        type: 'control_response',
        response: {
          subtype: 'error',
          request_id: requestId,
          error: `Unsupported control request subtype: ${inner.subtype}`,
        },
      }
      this.websocket?.sendControlResponse(response)
    }
  }

  /**
   * Manda un mensaje de usuario a la sesión remota vía HTTP POST.
   */
  async sendMessage(
    content: RemoteMessageContent,
    opts?: { uuid?: string },
  ): Promise<boolean> {
    const { logForDebugging } = requireLocalObservabilityDebug()
    const { logError } = requireLocalObservabilityLogging()
    logForDebugging(
      `[RemoteSessionManager] Sending message to session ${this.config.sessionId}`,
    )

    const success = await sendEventToRemoteSession(
      this.config.sessionId,
      content,
      opts,
    )

    if (!success) {
      logError(
        new Error(
          `[RemoteSessionManager] Failed to send message to session ${this.config.sessionId}`,
        ),
      )
    }

    return success
  }

  /**
   * Responde a una petición de permiso de CCR.
   */
  respondToPermissionRequest(
    requestId: string,
    result: RemotePermissionResponse,
  ): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    const { logError } = requireLocalObservabilityLogging()
    const pendingRequest = this.pendingPermissionRequests.get(requestId)
    if (!pendingRequest) {
      logError(
        new Error(
          `[RemoteSessionManager] No pending permission request with ID: ${requestId}`,
        ),
      )
      return
    }

    this.pendingPermissionRequests.delete(requestId)

    const response: SDKControlResponse = {
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: requestId,
        response: {
          behavior: result.behavior,
          ...(result.behavior === 'allow'
            ? { updatedInput: result.updatedInput }
            : { message: result.message }),
        },
      },
    }

    logForDebugging(
      `[RemoteSessionManager] Sending permission response: ${result.behavior}`,
    )

    this.websocket?.sendControlResponse(response)
  }

  /**
   * Comprueba si está conectado a la sesión remota.
   */
  isConnected(): boolean {
    return this.websocket?.isConnected() ?? false
  }

  /**
   * Manda una señal de interrupción para cancelar la petición actual en la sesión remota.
   */
  cancelSession(): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    logForDebugging('[RemoteSessionManager] Sending interrupt signal')
    this.websocket?.sendControlRequest({ subtype: 'interrupt' })
  }

  /**
   * Devuelve el ID de sesión.
   */
  getSessionId(): string {
    return this.config.sessionId
  }

  /**
   * Se desconecta de la sesión remota.
   */
  disconnect(): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    logForDebugging('[RemoteSessionManager] Disconnecting')
    this.websocket?.close()
    this.websocket = null
    this.pendingPermissionRequests.clear()
  }

  /**
   * Fuerza la reconexión del WebSocket.
   * Útil cuando la suscripción queda obsoleta tras el apagado de un contenedor.
   */
  reconnect(): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    logForDebugging('[RemoteSessionManager] Reconnecting WebSocket')
    this.websocket?.reconnect()
  }
}

/**
 * Crea una config de sesión remota a partir de tokens OAuth.
 */
export function createRemoteSessionConfig(
  sessionId: string,
  getAccessToken: () => string,
  orgUuid: string,
  hasInitialPrompt = false,
  viewerOnly = false,
): RemoteSessionConfig {
  return {
    sessionId,
    getAccessToken,
    orgUuid,
    hasInitialPrompt,
    viewerOnly,
  }
}
