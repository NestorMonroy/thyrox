/**
 * Porte COMPLETO de
 * `ccnmt: packages/mcp-runtime/src/SdkControlTransport.ts` — sus 2
 * exportaciones, ninguna omitida.
 *
 * `@modelcontextprotocol/sdk` declarado en `package.json`, sin
 * `node_modules` enlazado todavía (misma deuda que el resto del paquete).
 *
 * Puente de transporte MCP del SDK.
 *
 * Este archivo implementa un puente de transporte que permite a los
 * servidores MCP que corren en el proceso del SDK comunicarse con el
 * proceso de la CLI de Claude Code a través de mensajes de control.
 *
 * ## Visión general de la arquitectura
 *
 * A diferencia de los servidores MCP normales, que corren como procesos
 * separados, los servidores MCP del SDK corren en proceso, dentro del
 * SDK. Esto exige un mecanismo de transporte especial para tender un
 * puente de comunicación entre:
 * - El proceso de la CLI (donde corre el cliente MCP)
 * - El proceso del SDK (donde corre el servidor MCP del SDK)
 *
 * ## Flujo de mensajes
 *
 * ### CLI → SDK (vía SdkControlClientTransport)
 * 1. El cliente MCP de la CLI llama una herramienta → envía una petición
 *    JSONRPC a SdkControlClientTransport.
 * 2. El transporte envuelve el mensaje en una petición de control con
 *    server_name y request_id.
 * 3. La petición de control se envía por stdout al proceso del SDK.
 * 4. El StructuredIO del SDK recibe la respuesta de control y la
 *    enruta de vuelta al transporte.
 * 5. El transporte desenvuelve la respuesta y se la devuelve al cliente
 *    MCP.
 *
 * ### SDK → CLI (vía SdkControlServerTransport)
 * 1. Query recibe la petición de control con el mensaje MCP y llama a
 *    transport.onmessage.
 * 2. El servidor MCP procesa el mensaje y llama a transport.send() con
 *    la respuesta.
 * 3. El transporte llama al callback sendMcpMessage con la respuesta.
 * 4. El callback de Query resuelve la promesa pendiente con la
 *    respuesta.
 * 5. Query devuelve la respuesta para completar la petición de control.
 *
 * ## Puntos clave de diseño
 *
 * - SdkControlClientTransport: StructuredIO lleva el registro de
 *   peticiones pendientes.
 * - SdkControlServerTransport: Query lleva el registro de peticiones
 *   pendientes.
 * - El envoltorio de la petición de control incluye server_name para
 *   enrutar al servidor SDK correcto.
 * - El sistema soporta múltiples servidores MCP del SDK corriendo
 *   simultáneamente.
 * - Los IDs de mensaje se preservan a lo largo de todo el flujo para
 *   una correlación correcta.
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'

/**
 * Función de callback para enviar un mensaje MCP y obtener la respuesta.
 */
type SendMcpMessageCallback = (
  serverName: string,
  message: JSONRPCMessage,
) => Promise<JSONRPCMessage>

/**
 * Transporte del lado de la CLI para servidores MCP del SDK.
 *
 * Este transporte se usa en el proceso de la CLI para tender un puente
 * de comunicación entre:
 * - El cliente MCP de la CLI (que quiere llamar herramientas de
 *   servidores MCP del SDK)
 * - El proceso del SDK (donde corre el servidor MCP real)
 *
 * Convierte mensajes del protocolo MCP en peticiones de control que se
 * pueden enviar por stdout/stdin al proceso del SDK.
 */
export class SdkControlClientTransport implements Transport {
  private isClosed = false

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  constructor(
    private serverName: string,
    private sendMcpMessage: SendMcpMessageCallback,
  ) {}

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.isClosed) {
      throw new Error('Transport is closed')
    }

    // Envía el mensaje y espera la respuesta.
    const response = await this.sendMcpMessage(this.serverName, message)

    // Devuelve la respuesta al cliente MCP.
    if (this.onmessage) {
      this.onmessage(response)
    }
  }

  async close(): Promise<void> {
    if (this.isClosed) {
      return
    }
    this.isClosed = true
    this.onclose?.()
  }
}

/**
 * Transporte del lado del SDK para servidores MCP del SDK.
 *
 * Este transporte se usa en el proceso del SDK para tender un puente de
 * comunicación entre:
 * - Las peticiones de control que llegan de la CLI (vía stdin)
 * - El servidor MCP real corriendo en el proceso del SDK
 *
 * Actúa como un simple paso-a-través que reenvía mensajes al servidor
 * MCP y envía las respuestas de vuelta vía un callback.
 *
 * Nota: Query maneja toda la correlación de petición/respuesta y el
 * flujo asíncrono.
 */
class SdkControlServerTransport implements Transport {
  private isClosed = false

  constructor(private sendMcpMessage: (message: JSONRPCMessage) => void) {}

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.isClosed) {
      throw new Error('Transport is closed')
    }

    // Simplemente devuelve la respuesta a través del callback.
    this.sendMcpMessage(message)
  }

  async close(): Promise<void> {
    if (this.isClosed) {
      return
    }
    this.isClosed = true
    this.onclose?.()
  }
}
