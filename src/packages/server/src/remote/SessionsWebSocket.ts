/**
 * Puerto de `ccnmt: packages/server/src/remote/SessionsWebSocket.ts`.
 *
 * `SDKMessage`/`SDKControl*` — sólo TIPOS (erasados), de
 * `@thyrox/headless-sdk/{agentSdkTypes,controlTypes}.js`.
 * `getOauthConfig`/`getWebSocketTLSOptions`/`getWebSocketProxyAgent`/
 * `getWebSocketProxyUrl`/`logForDebugging`/`errorMessage`/`logError`/
 * `jsonParse`/`jsonStringify` — ver `../internal/pendingCrossPackageDeps.js`.
 *
 * La rama `else` usa `import('ws')` dinámico, EXACTAMENTE como la fuente:
 * no es un rodeo mío por Rule 3 (`@thyrox/ide`/`@thyrox/server` no tienen
 * problema para resolver `ws` — Bun trae un shim nativo del paquete `ws`,
 * verificado con `await import('ws')` en este turno), sino la propia
 * detección de entorno de ccnmt (`typeof Bun !== 'undefined'`). Esa rama
 * nunca se ejecuta bajo este runtime (Bun siempre está definido aquí); se
 * conserva por fidelidad de comportamiento, no porque haga falta.
 */
import { randomUUID } from 'crypto'
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type {
  SDKControlCancelRequest,
  SDKControlRequest,
  SDKControlRequestInner,
  SDKControlResponse,
} from '@thyrox/headless-sdk/controlTypes.js'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
  requireLocalObservabilitySlowOperations,
  requireProviderMtls,
  requireProviderOauthConstants,
  requireProviderProxy,
} from '../internal/pendingCrossPackageDeps.js'

const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_ATTEMPTS = 5
const PING_INTERVAL_MS = 30000

/**
 * Máximo de reintentos para 4001 (sesión no encontrada). Durante la
 * compactación el servidor puede considerar la sesión obsoleta un
 * instante; una ventana corta de reintento deja al cliente recuperarse
 * sin rendirse permanentemente.
 */
const MAX_SESSION_NOT_FOUND_RETRIES = 3

/**
 * Códigos de cierre de WebSocket que indican un rechazo permanente del
 * lado servidor. El cliente deja de reconectar de inmediato.
 * Nota: 4001 (sesión no encontrada) se maneja aparte con reintentos
 * limitados, ya que puede ser transitorio durante la compactación.
 */
const PERMANENT_CLOSE_CODES = new Set([
  4003, // no autorizado
])

type WebSocketState = 'connecting' | 'connected' | 'closed'

type SessionsMessage =
  | SDKMessage
  | SDKControlRequest
  | SDKControlResponse
  | SDKControlCancelRequest

function isSessionsMessage(value: unknown): value is SessionsMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false
  }
  // Acepta cualquier mensaje con un campo `type` de tipo string. Los
  // handlers río abajo (sdkMessageAdapter, RemoteSessionManager) deciden
  // qué hacer con tipos desconocidos. Una allowlist fija aquí descartaría
  // en silencio tipos de mensaje nuevos que el backend empiece a mandar
  // antes de que el cliente se actualice.
  return typeof (value as { type: unknown }).type === 'string'
}

export type SessionsWebSocketCallbacks = {
  onMessage: (message: SessionsMessage) => void
  onClose?: () => void
  onError?: (error: Error) => void
  onConnected?: () => void
  /** Se dispara cuando se detecta un cierre transitorio y se agenda un
   *  reintento. onClose sólo se dispara en cierre permanente (el servidor
   *  terminó la sesión / se agotaron los intentos). */
  onReconnecting?: () => void
}

// Intersección entre globalThis.WebSocket y ws.WebSocket.
type WebSocketLike = {
  close(): void
  send(data: string): void
  ping?(): void // Tanto Bun como ws lo soportan.
}

/**
 * Cliente WebSocket para conectar con sesiones CCR vía
 * /v1/sessions/ws/{id}/subscribe.
 *
 * Protocolo:
 * 1. Conecta a wss://api.anthropic.com/v1/sessions/ws/{sessionId}/subscribe?organization_uuid=...
 * 2. Manda mensaje de auth: { type: 'auth', credential: { type: 'oauth', token: '...' } }
 * 3. Recibe el stream de SDKMessage de la sesión.
 */
export class SessionsWebSocket {
  private ws: WebSocketLike | null = null
  private state: WebSocketState = 'closed'
  private reconnectAttempts = 0
  private sessionNotFoundRetries = 0
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly sessionId: string,
    private readonly orgUuid: string,
    private readonly getAccessToken: () => string,
    private readonly callbacks: SessionsWebSocketCallbacks,
  ) {}

  /**
   * Conecta al endpoint WebSocket de sesiones.
   */
  async connect(): Promise<void> {
    const { logForDebugging } = requireLocalObservabilityDebug()
    const { logError } = requireLocalObservabilityLogging()
    const { getOauthConfig } = requireProviderOauthConstants()
    const { getWebSocketTLSOptions } = requireProviderMtls()
    const { getWebSocketProxyAgent, getWebSocketProxyUrl } = requireProviderProxy()

    if (this.state === 'connecting') {
      logForDebugging('[SessionsWebSocket] Already connecting')
      return
    }

    this.state = 'connecting'

    const baseUrl = getOauthConfig().BASE_API_URL.replace('https://', 'wss://')
    const url = `${baseUrl}/v1/sessions/ws/${this.sessionId}/subscribe?organization_uuid=${this.orgUuid}`

    logForDebugging(`[SessionsWebSocket] Connecting to ${url}`)

    // Obtiene un token fresco en cada intento de conexión.
    const accessToken = this.getAccessToken()
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'anthropic-version': '2023-06-01',
    }

    if (typeof Bun !== 'undefined') {
      // El WebSocket de Bun soporta headers/proxy, pero los tipos DOM no.
      const ws = new globalThis.WebSocket(url, {
        headers,
        proxy: getWebSocketProxyUrl(url),
        tls: getWebSocketTLSOptions() || undefined,
      } as unknown as string[])
      this.ws = ws

      ws.addEventListener('open', () => {
        logForDebugging(
          '[SessionsWebSocket] Connection opened, authenticated via headers',
        )
        this.state = 'connected'
        this.reconnectAttempts = 0
        this.sessionNotFoundRetries = 0
        this.startPingInterval()
        this.callbacks.onConnected?.()
      })

      ws.addEventListener('message', (event: MessageEvent) => {
        const data =
          typeof event.data === 'string' ? event.data : String(event.data)
        this.handleMessage(data)
      })

      ws.addEventListener('error', () => {
        const err = new Error('[SessionsWebSocket] WebSocket error')
        logError(err)
        this.callbacks.onError?.(err)
      })

      ws.addEventListener('close', (event: CloseEvent) => {
        logForDebugging(
          `[SessionsWebSocket] Closed: code=${event.code} reason=${event.reason}`,
        )
        this.handleClose(event.code)
      })

      ws.addEventListener('pong', () => {
        logForDebugging('[SessionsWebSocket] Pong received')
      })
    } else {
      const { default: WS } = await import('ws')
      const ws = new WS(url, {
        headers,
        agent: getWebSocketProxyAgent(url),
        ...getWebSocketTLSOptions(),
      })
      this.ws = ws as unknown as WebSocketLike

      ws.on('open', () => {
        logForDebugging(
          '[SessionsWebSocket] Connection opened, authenticated via headers',
        )
        // La auth se maneja vía headers, así que quedamos conectados de inmediato.
        this.state = 'connected'
        this.reconnectAttempts = 0
        this.sessionNotFoundRetries = 0
        this.startPingInterval()
        this.callbacks.onConnected?.()
      })

      ws.on('message', (data: Buffer) => {
        this.handleMessage(data.toString())
      })

      ws.on('error', (err: Error) => {
        logError(new Error(`[SessionsWebSocket] Error: ${err.message}`))
        this.callbacks.onError?.(err)
      })

      ws.on('close', (code: number, reason: Buffer) => {
        logForDebugging(
          `[SessionsWebSocket] Closed: code=${code} reason=${reason.toString()}`,
        )
        this.handleClose(code)
      })

      ws.on('pong', () => {
        logForDebugging('[SessionsWebSocket] Pong received')
      })
    }
  }

  /**
   * Maneja un mensaje entrante de WebSocket.
   */
  private handleMessage(data: string): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    const { logError } = requireLocalObservabilityLogging()
    const { errorMessage } = requireLocalObservabilityErrorHelpers()
    const { jsonParse } = requireLocalObservabilitySlowOperations()
    try {
      const message: unknown = jsonParse(data)

      // Reenvía mensajes SDK al callback.
      if (isSessionsMessage(message)) {
        this.callbacks.onMessage(message)
      } else {
        logForDebugging(
          `[SessionsWebSocket] Ignoring message type: ${typeof message === 'object' && message !== null && 'type' in message ? String((message as { type: unknown }).type) : 'unknown'}`,
        )
      }
    } catch (error) {
      logError(
        new Error(
          `[SessionsWebSocket] Failed to parse message: ${errorMessage(error)}`,
        ),
      )
    }
  }

  /**
   * Maneja el cierre de WebSocket.
   */
  private handleClose(closeCode: number): void {
    const { logForDebugging } = requireLocalObservabilityDebug()

    this.stopPingInterval()

    if (this.state === 'closed') {
      return
    }

    this.ws = null

    const previousState = this.state
    this.state = 'closed'

    // Códigos permanentes: deja de reconectar — el servidor terminó la sesión definitivamente.
    if (PERMANENT_CLOSE_CODES.has(closeCode)) {
      logForDebugging(
        `[SessionsWebSocket] Permanent close code ${closeCode}, not reconnecting`,
      )
      this.callbacks.onClose?.()
      return
    }

    // 4001 (sesión no encontrada) puede ser transitorio durante la
    // compactación: el servidor puede considerar la sesión obsoleta un
    // instante mientras el worker de CLI está ocupado con la llamada de
    // compactación y no emite eventos.
    if (closeCode === 4001) {
      this.sessionNotFoundRetries++
      if (this.sessionNotFoundRetries > MAX_SESSION_NOT_FOUND_RETRIES) {
        logForDebugging(
          `[SessionsWebSocket] 4001 retry budget exhausted (${MAX_SESSION_NOT_FOUND_RETRIES}), not reconnecting`,
        )
        this.callbacks.onClose?.()
        return
      }
      this.scheduleReconnect(
        RECONNECT_DELAY_MS * this.sessionNotFoundRetries,
        `4001 attempt ${this.sessionNotFoundRetries}/${MAX_SESSION_NOT_FOUND_RETRIES}`,
      )
      return
    }

    // Intenta reconectar si estábamos conectados.
    if (
      previousState === 'connected' &&
      this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
    ) {
      this.reconnectAttempts++
      this.scheduleReconnect(
        RECONNECT_DELAY_MS,
        `attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`,
      )
    } else {
      logForDebugging('[SessionsWebSocket] Not reconnecting')
      this.callbacks.onClose?.()
    }
  }

  private scheduleReconnect(delay: number, label: string): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    this.callbacks.onReconnecting?.()
    logForDebugging(
      `[SessionsWebSocket] Scheduling reconnect (${label}) in ${delay}ms`,
    )
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, delay)
  }

  private startPingInterval(): void {
    this.stopPingInterval()

    this.pingInterval = setInterval(() => {
      if (this.ws && this.state === 'connected') {
        try {
          this.ws.ping?.()
        } catch {
          // Ignora errores de ping, el handler de close se ocupa de los problemas de conexión.
        }
      }
    }, PING_INTERVAL_MS)
  }

  /**
   * Detiene el intervalo de ping.
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Manda una respuesta de control de vuelta a la sesión.
   */
  sendControlResponse(response: SDKControlResponse): void {
    const { logError } = requireLocalObservabilityLogging()
    const { logForDebugging } = requireLocalObservabilityDebug()
    const { jsonStringify } = requireLocalObservabilitySlowOperations()
    if (!this.ws || this.state !== 'connected') {
      logError(new Error('[SessionsWebSocket] Cannot send: not connected'))
      return
    }

    logForDebugging('[SessionsWebSocket] Sending control response')
    this.ws.send(jsonStringify(response))
  }

  /**
   * Manda una petición de control a la sesión (p. ej. interrupt).
   */
  sendControlRequest(request: SDKControlRequestInner): void {
    const { logError } = requireLocalObservabilityLogging()
    const { logForDebugging } = requireLocalObservabilityDebug()
    const { jsonStringify } = requireLocalObservabilitySlowOperations()
    if (!this.ws || this.state !== 'connected') {
      logError(new Error('[SessionsWebSocket] Cannot send: not connected'))
      return
    }

    const controlRequest: SDKControlRequest = {
      type: 'control_request',
      request_id: randomUUID(),
      request,
    }

    logForDebugging(
      `[SessionsWebSocket] Sending control request: ${request.subtype}`,
    )
    this.ws.send(jsonStringify(controlRequest))
  }

  /**
   * Comprueba si está conectado.
   */
  isConnected(): boolean {
    return this.state === 'connected'
  }

  /**
   * Cierra la conexión WebSocket.
   */
  close(): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    logForDebugging('[SessionsWebSocket] Closing connection')
    this.state = 'closed'
    this.stopPingInterval()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      // Anula los handlers de evento para evitar race conditions durante
      // la reconexión. Bajo Bun (WebSocket nativo) los handlers onX son la
      // forma limpia de desengancharlos; bajo Node (paquete ws) los
      // listeners se adjuntaron con .on() en connect(), pero como ya
      // vamos a cerrar y anular this.ws, no hace falta limpieza extra.
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Fuerza una reconexión — cierra la conexión existente y establece una
   * nueva. Útil cuando la suscripción queda obsoleta (p. ej. tras el
   * apagado de un contenedor).
   */
  reconnect(): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    logForDebugging('[SessionsWebSocket] Force reconnecting')
    this.reconnectAttempts = 0
    this.sessionNotFoundRetries = 0
    this.close()
    // Pequeño delay antes de reconectar (guardado en reconnectTimer para poder cancelarlo).
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, 500)
  }
}
