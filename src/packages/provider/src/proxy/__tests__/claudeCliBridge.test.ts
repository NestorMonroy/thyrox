/**
 * El puente MCP (`../claudeCli/bridge.ts`): el servidor JSON-RPC que claude
 * ve como `thyrox_bridge`, y la suspensión de `tools/call` hasta que el
 * cliente del proxy entrega el `tool_result`.
 */
import { describe, expect, test } from 'bun:test'
import { BridgeRegistry, ToolBridge } from '../claudeCli/bridge.ts'

const TOOLS = [{ name: 'ls', description: 'lista', inputSchema: { type: 'object', properties: {} } }]

function rpc(method: string, params: unknown, id: number): unknown {
  return { jsonrpc: '2.0', id, method, params }
}

function notification(method: string): unknown {
  return { jsonrpc: '2.0', method, params: {} }
}

describe('ToolBridge: JSON-RPC', () => {
  test('initialize responde capacidades de tools y el nombre del servidor, con el id de la petición', async () => {
    const bridge = new ToolBridge(TOOLS)
    const response = await bridge.handle(rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'c', version: '1' } }, 7))
    expect(response).toMatchObject({ jsonrpc: '2.0', id: 7, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'thyrox_bridge' } } })
  })
  test('una notificación no tiene respuesta', async () => {
    expect(await new ToolBridge(TOOLS).handle(notification('notifications/initialized'))).toBeUndefined()
  })
  test('tools/list devuelve las tools del cliente con su inputSchema; ping, un objeto vacío', async () => {
    const bridge = new ToolBridge(TOOLS)
    expect(await bridge.handle(rpc('tools/list', {}, 2))).toEqual({ jsonrpc: '2.0', id: 2, result: { tools: TOOLS } })
    expect(await bridge.handle(rpc('ping', {}, 3))).toEqual({ jsonrpc: '2.0', id: 3, result: {} })
  })
  test('un método desconocido responde -32601 y una petición sin forma JSON-RPC, -32600', async () => {
    const bridge = new ToolBridge(TOOLS)
    expect(await bridge.handle(rpc('resources/list', {}, 4))).toMatchObject({ id: 4, error: { code: -32601 } })
    expect(await bridge.handle({ unknown: 1 })).toMatchObject({ id: null, error: { code: -32600 } })
  })
})

describe('ToolBridge: la suspensión de tools/call', () => {
  test('tools/call queda pendiente hasta que se entrega el resultado; nextCall ve nombre y argumentos', async () => {
    const bridge = new ToolBridge(TOOLS)
    let settled = false
    const pending = bridge.handle(rpc('tools/call', { name: 'ls', arguments: { path: '.' } }, 5)).then(r => { settled = true; return r })
    const call = await bridge.nextCall()
    expect(call.name).toBe('ls')
    expect(call.arguments).toEqual({ path: '.' })
    await Bun.sleep(5)
    expect(settled).toBe(false)
    call.deliver({ content: [{ type: 'text', text: 'a.txt' }], isError: false })
    expect(await pending).toEqual({ jsonrpc: '2.0', id: 5, result: { content: [{ type: 'text', text: 'a.txt' }], isError: false } })
    expect(bridge.pendingCalls()).toHaveLength(0)
  })
  test('una llamada a una tool que el cliente no declaró responde -32602 sin suspender', async () => {
    const bridge = new ToolBridge(TOOLS)
    expect(await bridge.handle(rpc('tools/call', { name: 'rm', arguments: {} }, 6))).toMatchObject({ id: 6, error: { code: -32602 } })
    expect(bridge.pendingCalls()).toHaveLength(0)
  })
  test('abortar lo pendiente responde a cada llamada con un error que nombra la causa', async () => {
    const bridge = new ToolBridge(TOOLS)
    const pending = bridge.handle(rpc('tools/call', { name: 'ls', arguments: {} }, 8))
    await bridge.nextCall()
    bridge.abortPending('el cliente no volvió con el tool_result')
    expect(await pending).toMatchObject({ id: 8, error: { code: -32000, message: expect.stringContaining('no volvió') } })
  })
})

describe('BridgeRegistry: el endpoint HTTP', () => {
  test('POST con token registrado responde JSON; una notificación, 202 sin cuerpo; GET, 405; token desconocido, 404', async () => {
    const registry = new BridgeRegistry()
    const token = registry.register(new ToolBridge(TOOLS))
    const post = (body: unknown, t = token) => registry.serve(t, new Request(`http://x/claude-cli/bridge/${t}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }))
    const listed = await post(rpc('tools/list', {}, 1))
    expect(listed.status).toBe(200)
    expect(listed.headers.get('content-type')).toContain('application/json')
    expect(await listed.json()).toMatchObject({ id: 1, result: { tools: TOOLS } })
    expect((await post(notification('notifications/initialized'))).status).toBe(202)
    expect((await registry.serve(token, new Request(`http://x/claude-cli/bridge/${token}`, { method: 'GET' }))).status).toBe(405)
    expect((await post(rpc('ping', {}, 2), 'ajeno')).status).toBe(404)
    registry.release(token)
    expect((await post(rpc('ping', {}, 3))).status).toBe(404)
  })
  test('un cuerpo que no es JSON responde -32700', async () => {
    const registry = new BridgeRegistry()
    const token = registry.register(new ToolBridge(TOOLS))
    const response = await registry.serve(token, new Request('http://x/', { method: 'POST', body: '{no' }))
    expect(await response.json()).toMatchObject({ id: null, error: { code: -32700 } })
  })
})
