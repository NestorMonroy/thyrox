/**
 * Porte COMPLETO de
 * `ccnmt: packages/mcp-runtime/src/mcpWebSocketTransport.ts` — su única
 * exportación, ninguna omitida.
 *
 * Transporte WebSocket de MCP — puente Bun-vs-Node WebSocket. La clase
 * guarda `ws: WebSocketLike` (una unión que cubre tanto el WebSocket nativo
 * de Bun como el paquete `ws` de Node) y despacha en runtime vía `this.isBun`.
 * Los casts `as unknown as` estrechan a uno u otro tipo concreto según la
 * rama — patrón de binding en runtime.
 *
 * Los tres cruces (`logForDiagnosticsNoPII`, `toError`, `jsonParse`/
 * `jsonStringify`) pasan el filtro de dos pasos — subpath declarado en
 * `@thyrox/local-observability` y símbolo verificado con resolución real —
 * y se repuntan sin divergencia.
 */
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
  type JSONRPCMessage,
  JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type WsWebSocket from 'ws'
import { logForDiagnosticsNoPII } from '@thyrox/local-observability/logging'
import { toError } from '@thyrox/local-observability/errorHelpers.js'
import { jsonParse, jsonStringify } from '@thyrox/local-observability/slowOperations.js'

// Constantes de readyState de WebSocket (iguales para nativo y para ws)
const WS_CONNECTING = 0
const WS_OPEN = 1

// Interfaz mínima compartida por globalThis.WebSocket y ws.WebSocket
type WebSocketLike = {
  readonly readyState: number
  close(): void
  send(data: string): void
}

export class WebSocketTransport implements Transport {
  private started = false
  private opened: Promise<void>
  private isBun = typeof Bun !== 'undefined'

  constructor(private ws: WebSocketLike) {
    this.opened = new Promise((resolve, reject) => {
      if (this.ws.readyState === WS_OPEN) {
        resolve()
      } else if (this.isBun) {
        const nws = this.ws as unknown as globalThis.WebSocket
        const onOpen = () => {
          nws.removeEventListener('open', onOpen)
          nws.removeEventListener('error', onError)
          resolve()
        }
        const onError = (event: Event) => {
          nws.removeEventListener('open', onOpen)
          nws.removeEventListener('error', onError)
          logForDiagnosticsNoPII('error', 'mcp_websocket_connect_fail')
          reject(event)
        }
        nws.addEventListener('open', onOpen)
        nws.addEventListener('error', onError)
      } else {
        const nws = this.ws as unknown as WsWebSocket
        nws.on('open', () => {
          resolve()
        })
        nws.on('error', error => {
          logForDiagnosticsNoPII('error', 'mcp_websocket_connect_fail')
          reject(error)
        })
      }
    })

    // Cablea los manejadores de eventos persistentes.
    if (this.isBun) {
      const nws = this.ws as unknown as globalThis.WebSocket
      nws.addEventListener('message', this.onBunMessage)
      nws.addEventListener('error', this.onBunError)
      nws.addEventListener('close', this.onBunClose)
    } else {
      const nws = this.ws as unknown as WsWebSocket
      nws.on('message', this.onNodeMessage)
      nws.on('error', this.onNodeError)
      nws.on('close', this.onNodeClose)
    }
  }

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  // Manejadores de eventos de Bun (WebSocket nativo)
  private onBunMessage = (event: MessageEvent) => {
    try {
      const data =
        typeof event.data === 'string' ? event.data : String(event.data)
      const messageObj = jsonParse(data)
      const message = JSONRPCMessageSchema.parse(messageObj)
      this.onmessage?.(message)
    } catch (error) {
      this.handleError(error)
    }
  }

  private onBunError = () => {
    this.handleError(new Error('WebSocket error'))
  }

  private onBunClose = () => {
    this.handleCloseCleanup()
  }

  // Manejadores de eventos de Node (paquete ws)
  private onNodeMessage = (data: Buffer) => {
    try {
      const messageObj = jsonParse(data.toString('utf-8'))
      const message = JSONRPCMessageSchema.parse(messageObj)
      this.onmessage?.(message)
    } catch (error) {
      this.handleError(error)
    }
  }

  private onNodeError = (error: unknown) => {
    this.handleError(error)
  }

  private onNodeClose = () => {
    this.handleCloseCleanup()
  }

  // Manejador de error compartido
  private handleError(error: unknown): void {
    logForDiagnosticsNoPII('error', 'mcp_websocket_message_fail')
    this.onerror?.(toError(error))
  }

  // Manejador de cierre compartido, con limpieza de listeners
  private handleCloseCleanup(): void {
    this.onclose?.()
    // Limpia los listeners tras el cierre.
    if (this.isBun) {
      const nws = this.ws as unknown as globalThis.WebSocket
      nws.removeEventListener('message', this.onBunMessage)
      nws.removeEventListener('error', this.onBunError)
      nws.removeEventListener('close', this.onBunClose)
    } else {
      const nws = this.ws as unknown as WsWebSocket
      nws.off('message', this.onNodeMessage)
      nws.off('error', this.onNodeError)
      nws.off('close', this.onNodeClose)
    }
  }

  /**
   * Empieza a escuchar mensajes en el WebSocket.
   */
  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Start can only be called once per transport.')
    }
    await this.opened
    if (this.ws.readyState !== WS_OPEN) {
      logForDiagnosticsNoPII('error', 'mcp_websocket_start_not_opened')
      throw new Error('WebSocket is not open. Cannot start transport.')
    }
    this.started = true
    // A diferencia de stdio, las conexiones WebSocket normalmente ya están
    // establecidas cuando se crea el transporte. No hace falta ninguna
    // acción de conexión explícita aquí, sólo cablear los listeners.
  }

  /**
   * Cierra la conexión WebSocket.
   */
  async close(): Promise<void> {
    if (
      this.ws.readyState === WS_OPEN ||
      this.ws.readyState === WS_CONNECTING
    ) {
      this.ws.close()
    }
    // Asegura que los listeners se retiren aunque close() se haya llamado
    // externamente o la conexión ya estuviera cerrada.
    this.handleCloseCleanup()
  }

  /**
   * Envía un mensaje JSON-RPC por la conexión WebSocket.
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this.ws.readyState !== WS_OPEN) {
      logForDiagnosticsNoPII('error', 'mcp_websocket_send_not_opened')
      throw new Error('WebSocket is not open. Cannot send message.')
    }
    const json = jsonStringify(message)

    try {
      if (this.isBun) {
        // El send() del WebSocket nativo es síncrono (sin callback).
        this.ws.send(json)
      } else {
        await new Promise<void>((resolve, reject) => {
          ;(this.ws as unknown as WsWebSocket).send(json, error => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
      }
    } catch (error) {
      this.handleError(error)
      throw error
    }
  }
}
