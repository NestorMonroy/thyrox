/**
 * Puerto de `ccnmt: packages/server/src/directConnectManager.ts`.
 *
 * `SDKMessage`/`SDKControlPermissionRequest`/`StdoutMessage` — sólo TIPOS
 * (erasados), de `@thyrox/headless-sdk/{agentSdkTypes,controlTypes}.js`.
 * `RemotePermissionResponse` — tipo, de `./remote/RemoteSessionManager.js`.
 * `RemoteMessageContent` — tipo, ver `internal/pendingCrossPackageDeps.ts`
 * (el paquete `teleport` no existe en este árbol).
 * `logForDebugging`/`jsonParse`/`jsonStringify` — ver ese mismo archivo.
 *
 * `new WebSocket(...)` es el `WebSocket` global — Bun lo trae nativo, sin
 * import (verificado: `bun -e "new WebSocket('ws://x')"` no lanza por
 * import ausente). El comentario de la fuente sobre "headers option but
 * the DOM typings don't" se conserva porque describe una limitación real
 * de los tipos de lib.dom, no de Bun en tiempo de ejecución.
 */
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type {
  SDKControlPermissionRequest,
  StdoutMessage,
} from '@thyrox/headless-sdk/controlTypes.js'
import type { RemotePermissionResponse } from './remote/RemoteSessionManager.js'
import {
  requireLocalObservabilityDebug,
  requireLocalObservabilitySlowOperations,
  type RemoteMessageContent,
} from './internal/pendingCrossPackageDeps.js'

export type DirectConnectConfig = {
  serverUrl: string
  sessionId: string
  wsUrl: string
  authToken?: string
}

export type DirectConnectCallbacks = {
  onMessage: (message: SDKMessage) => void
  onPermissionRequest: (
    request: SDKControlPermissionRequest,
    requestId: string,
  ) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

function isStdoutMessage(value: unknown): value is StdoutMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  )
}

export class DirectConnectSessionManager {
  private ws: WebSocket | null = null
  private config: DirectConnectConfig
  private callbacks: DirectConnectCallbacks

  constructor(config: DirectConnectConfig, callbacks: DirectConnectCallbacks) {
    this.config = config
    this.callbacks = callbacks
  }

  connect(): void {
    const { logForDebugging } = requireLocalObservabilityDebug()
    const { jsonParse, jsonStringify } = requireLocalObservabilitySlowOperations()

    const headers: Record<string, string> = {}
    if (this.config.authToken) {
      headers['authorization'] = `Bearer ${this.config.authToken}`
    }
    // El WebSocket de Bun soporta la opción headers, pero los tipos DOM no.
    this.ws = new WebSocket(this.config.wsUrl, {
      headers,
    } as unknown as string[])

    this.ws.addEventListener('open', () => {
      this.callbacks.onConnected?.()
    })

    this.ws.addEventListener('message', event => {
      const data = typeof event.data === 'string' ? event.data : ''
      const lines = data.split('\n').filter((l: string) => l.trim())

      for (const line of lines) {
        let raw: unknown
        try {
          raw = jsonParse(line)
        } catch {
          continue
        }

        if (!isStdoutMessage(raw)) {
          continue
        }
        const parsed = raw as unknown as {
          type: string
          request?: { subtype: string; [key: string]: unknown }
          request_id: string
          subtype?: string
          [key: string]: unknown
        }

        // Maneja control requests (peticiones de permiso).
        if (parsed.type === 'control_request') {
          if (parsed.request?.subtype === 'can_use_tool') {
            this.callbacks.onPermissionRequest(
              parsed.request as unknown as SDKControlPermissionRequest,
              parsed.request_id,
            )
          } else {
            // Manda una respuesta de error para subtipos no reconocidos,
            // así el servidor no queda colgado esperando una respuesta que
            // nunca llega.
            logForDebugging(
              `[DirectConnect] Unsupported control request subtype: ${parsed.request?.subtype}`,
            )
            this.sendErrorResponse(
              parsed.request_id,
              `Unsupported control request subtype: ${parsed.request?.subtype}`,
            )
          }
          continue
        }

        // Reenvía mensajes SDK (assistant, result, system, etc).
        if (
          parsed.type !== 'control_response' &&
          parsed.type !== 'keep_alive' &&
          parsed.type !== 'control_cancel_request' &&
          parsed.type !== 'streamlined_text' &&
          parsed.type !== 'streamlined_tool_use_summary' &&
          !(parsed.type === 'system' && parsed.subtype === 'post_turn_summary')
        ) {
          this.callbacks.onMessage(parsed as unknown as SDKMessage)
        }
      }
    })

    this.ws.addEventListener('close', () => {
      this.callbacks.onDisconnected?.()
    })

    this.ws.addEventListener('error', () => {
      this.callbacks.onError?.(new Error('WebSocket connection error'))
    })
  }

  sendMessage(content: RemoteMessageContent): boolean {
    const { jsonStringify } = requireLocalObservabilitySlowOperations()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    // Debe coincidir con el formato SDKUserMessage que espera
    // `--input-format stream-json`.
    const message = jsonStringify({
      type: 'user',
      message: {
        role: 'user',
        content: content,
      },
      parent_tool_use_id: null,
      session_id: '',
    })
    this.ws.send(message)
    return true
  }

  respondToPermissionRequest(
    requestId: string,
    result: RemotePermissionResponse,
  ): void {
    const { jsonStringify } = requireLocalObservabilitySlowOperations()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    // Debe coincidir con el formato SDKControlResponse que espera StructuredIO.
    const response = jsonStringify({
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
    })
    this.ws.send(response)
  }

  /**
   * Manda una señal de interrupción para cancelar la petición actual.
   */
  sendInterrupt(): void {
    const { jsonStringify } = requireLocalObservabilitySlowOperations()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    // Debe coincidir con el formato SDKControlRequest que espera StructuredIO.
    const request = jsonStringify({
      type: 'control_request',
      request_id: crypto.randomUUID(),
      request: {
        subtype: 'interrupt',
      },
    })
    this.ws.send(request)
  }

  private sendErrorResponse(requestId: string, error: string): void {
    const { jsonStringify } = requireLocalObservabilitySlowOperations()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }
    const response = jsonStringify({
      type: 'control_response',
      response: {
        subtype: 'error',
        request_id: requestId,
        error,
      },
    })
    this.ws.send(response)
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
