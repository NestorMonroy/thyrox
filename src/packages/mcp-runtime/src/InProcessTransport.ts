/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/InProcessTransport.ts`
 * — su única exportación (más la clase interna que consume), ninguna
 * omitida.
 *
 * `@modelcontextprotocol/sdk` está declarado en `package.json`
 * (`^1.29.0`, misma versión que fija `ccnmt: package.json`) pero no
 * resuelve todavía en este árbol — sin `node_modules` enlazado, mismo
 * criterio de deuda que `command-runtime::@anthropic-ai/sdk`.
 *
 * Par de transportes enlazados en proceso para correr un servidor y un
 * cliente MCP en el mismo proceso, sin lanzar un subproceso.
 *
 * `send()` de un lado entrega a `onmessage` del otro. `close()` de
 * cualquiera de los dos llama `onclose` en ambos.
 */
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'

class InProcessTransport implements Transport {
  private peer: InProcessTransport | undefined
  private closed = false

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  /** @internal */
  _setPeer(peer: InProcessTransport): void {
    this.peer = peer
  }

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error('Transport is closed')
    }
    // Entrega al otro lado de forma asíncrona para evitar problemas de
    // profundidad de pila con ciclos síncronos de petición/respuesta.
    queueMicrotask(() => {
      this.peer?.onmessage?.(message)
    })
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }
    this.closed = true
    this.onclose?.()
    // Cierra al peer si todavía no se había cerrado.
    if (this.peer && !this.peer.closed) {
      this.peer.closed = true
      this.peer.onclose?.()
    }
  }
}

/**
 * Crea un par de transportes enlazados para comunicación MCP en proceso.
 * Los mensajes enviados en un transporte se entregan al `onmessage` del
 * otro.
 *
 * @returns [clientTransport, serverTransport]
 */
export function createLinkedTransportPair(): [Transport, Transport] {
  const a = new InProcessTransport()
  const b = new InProcessTransport()
  a._setPeer(b)
  b._setPeer(a)
  return [a, b]
}
