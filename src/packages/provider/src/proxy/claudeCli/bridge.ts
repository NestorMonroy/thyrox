/**
 * El puente MCP: el servidor que `claude -p` ve como `thyrox_bridge` y que
 * expone las tools de la petición del cliente. Habla JSON-RPC 2.0 por HTTP
 * —la forma «Streamable HTTP» con respuesta `application/json`, que el
 * cliente MCP de la referencia acepta (`StreamableHTTPClientTransport`,
 * `chunk-6ex11db3.js`)— y sirve `initialize`, `ping`, `tools/list` y
 * `tools/call`.
 *
 * `tools/call` no ejecuta nada: la llamada queda suspendida hasta que el
 * cliente del proxy entrega su `tool_result` (`deliver`), o hasta que el
 * upstream la aborta con causa. Quien espera la siguiente llamada
 * (`nextCall`) es el upstream, que con ella responde `stop_reason: tool_use`.
 *
 * El token de cada puente es su única credencial: es aleatorio, vive lo que
 * la conversación y sólo lo conoce el proceso `claude` que lo recibió en su
 * `--mcp-config`.
 */
import { randomBytes } from 'node:crypto'
import type { BridgeToolDefinition } from './requestTranslation.ts'

export const BRIDGE_PATH_PREFIX = '/claude-cli/bridge/'
const PROTOCOL_VERSION = '2025-06-18'
const SERVER_VERSION = '0.1.0'
const TOKEN_BYTES = 16

const JSON_RPC = '2.0'
const ERROR_PARSE = -32700
const ERROR_INVALID_REQUEST = -32600
const ERROR_METHOD_NOT_FOUND = -32601
const ERROR_INVALID_PARAMS = -32602
const ERROR_CALL_ABORTED = -32000

type JsonRpcId = string | number | null

export type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcId; result: unknown }
  | { jsonrpc: '2.0'; id: JsonRpcId; error: { code: number; message: string } }

export type BridgeCallResult = { content: unknown[]; isError: boolean }

export type BridgeCall = {
  name: string
  arguments: Record<string, unknown>
  /** Entrega el resultado a claude y cierra la llamada. */
  deliver: (result: BridgeCallResult) => void
}

type JsonRpcRequest = { jsonrpc: string; id?: JsonRpcId; method: string; params?: unknown }

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  return typeof value === 'object' && value !== null && typeof (value as { method?: unknown }).method === 'string'
}

function isNotification(request: JsonRpcRequest): boolean {
  return request.id === undefined
}

function success(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: JSON_RPC, id, result }
}

function failure(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: JSON_RPC, id, error: { code, message } }
}

function callParamsOf(params: unknown): { name: string; arguments: Record<string, unknown> } | undefined {
  if (typeof params !== 'object' || params === null) return undefined
  const { name, arguments: args } = params as { name?: unknown; arguments?: unknown }
  if (typeof name !== 'string') return undefined
  const callArguments = typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {}
  return { name, arguments: callArguments }
}

export class ToolBridge {
  private readonly pending: BridgeCall[] = []
  private readonly waiters: ((call: BridgeCall) => void)[] = []

  constructor(private readonly tools: readonly BridgeToolDefinition[]) {}

  /** Un mensaje JSON-RPC; la respuesta, o nada para una notificación. */
  async handle(message: unknown): Promise<JsonRpcResponse | undefined> {
    if (!isJsonRpcRequest(message)) return failure(null, ERROR_INVALID_REQUEST, 'la petición no tiene la forma JSON-RPC 2.0')
    if (isNotification(message)) return undefined
    const id = message.id ?? null
    switch (message.method) {
      case 'initialize':
        return success(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'thyrox_bridge', version: SERVER_VERSION } })
      case 'ping':
        return success(id, {})
      case 'tools/list':
        return success(id, { tools: this.tools })
      case 'tools/call':
        return this.suspendCall(id, message.params)
      default:
        return failure(id, ERROR_METHOD_NOT_FOUND, `método no servido por el puente: ${message.method}`)
    }
  }

  /** La siguiente llamada que claude haga (o la primera que ya espera). */
  nextCall(): Promise<BridgeCall> {
    const waiting = this.pending.find(call => !this.claimed.has(call))
    if (waiting) {
      this.claimed.add(waiting)
      return Promise.resolve(waiting)
    }
    return new Promise(resolve => this.waiters.push(resolve))
  }

  pendingCalls(): readonly BridgeCall[] {
    return [...this.pending]
  }

  /** Responde con error a toda llamada suspendida, nombrando la causa. */
  abortPending(reason: string): void {
    for (const call of [...this.pending]) this.abortCall(call, reason)
  }

  private readonly claimed = new WeakSet<BridgeCall>()
  private readonly aborters = new WeakMap<BridgeCall, (reason: string) => void>()

  private suspendCall(id: JsonRpcId, params: unknown): Promise<JsonRpcResponse> {
    const parsed = callParamsOf(params)
    if (!parsed) return Promise.resolve(failure(id, ERROR_INVALID_PARAMS, 'tools/call exige name y arguments'))
    if (!this.tools.some(tool => tool.name === parsed.name)) {
      return Promise.resolve(failure(id, ERROR_INVALID_PARAMS, `la tool "${parsed.name}" no está declarada en esta petición`))
    }
    return new Promise(resolve => {
      const call: BridgeCall = {
        name: parsed.name,
        arguments: parsed.arguments,
        deliver: result => {
          this.settle(call)
          resolve(success(id, result))
        },
      }
      this.aborters.set(call, reason => {
        this.settle(call)
        resolve(failure(id, ERROR_CALL_ABORTED, reason))
      })
      this.pending.push(call)
      const waiter = this.waiters.shift()
      if (waiter) {
        this.claimed.add(call)
        waiter(call)
      }
    })
  }

  private abortCall(call: BridgeCall, reason: string): void {
    this.aborters.get(call)?.(reason)
  }

  private settle(call: BridgeCall): void {
    const index = this.pending.indexOf(call)
    if (index >= 0) this.pending.splice(index, 1)
  }
}

/** Los puentes vivos por token; el endpoint HTTP que los sirve. */
export class BridgeRegistry {
  private readonly bridges = new Map<string, ToolBridge>()

  register(bridge: ToolBridge): string {
    const token = randomBytes(TOKEN_BYTES).toString('hex')
    this.bridges.set(token, bridge)
    return token
  }

  release(token: string): void {
    this.bridges.delete(token)
  }

  get size(): number {
    return this.bridges.size
  }

  async serve(token: string, request: Request): Promise<Response> {
    const bridge = this.bridges.get(token)
    if (!bridge) return new Response('not found', { status: 404 })
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })
    let message: unknown
    try {
      message = await request.json()
    } catch {
      return Response.json(failure(null, ERROR_PARSE, 'el cuerpo no es JSON'))
    }
    const response = await bridge.handle(message)
    if (response === undefined) return new Response(null, { status: 202 })
    return Response.json(response)
  }
}
