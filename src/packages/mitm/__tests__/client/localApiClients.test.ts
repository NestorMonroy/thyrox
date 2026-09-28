/**
 * Los clientes de las rutas locales del MITM: cada uno pide la ruta y el
 * método de la referencia, lleva la contraseña de sudo sólo si se dio,
 * desenvuelve el estado de respuesta, y ante un no-2xx lanza el mensaje
 * saneado del servidor o, sin él, el estado HTTP.
 *
 * Porte de `omniroute: tests/unit/tproxy-capture-api.test.ts` y
 * `agent-bridge-maintenance-api.test.ts` (MIT). El `fetch` se inyecta en vez
 * de sustituir el global.
 */
import { expect, test } from 'bun:test'

import { createLocalApiClient } from '../../src/client/localApi.ts'
import {
  fetchAgentBridgeConfig,
  importAgentBridgeConfig,
  removeCaCert,
  repairMitmState,
  runDiagnose,
} from '../../src/client/maintenanceApi.ts'
import {
  fetchTproxyStatus,
  startTproxyCaptureMode,
  stopTproxyCaptureMode,
  TPROXY_ROUTE,
} from '../../src/client/tproxyCaptureApi.ts'

const BASE = 'http://127.0.0.1:20128'
type Call = { url: string; init?: RequestInit }

function fakeServer(reply: (call: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = []
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const call = { url: String(url), init }
    calls.push(call)
    const { status = 200, body } = reply(call)
    return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response
  }) as unknown as typeof fetch
  return { calls, client: createLocalApiClient(`${BASE}/`, fetchImpl) }
}

const EMPTY_CONFIG = { version: 1 as const, bypassPatterns: [], customHosts: [], agentMappings: {} }

test('tproxy status is a plain GET on its route', async () => {
  const s = fakeServer(() => ({ body: { running: true, interceptCount: 3 } }))
  expect(await fetchTproxyStatus(s.client)).toMatchObject({ running: true, interceptCount: 3 })
  expect(s.calls[0]).toEqual({ url: `${BASE}${TPROXY_ROUTE}`, init: undefined })
})

test('tproxy start POSTs its options and unwraps the status; stop DELETEs', async () => {
  const s = fakeServer(call => ({ body: { ok: true, status: { running: call.init?.method === 'POST', onPort: 9443 } } }))
  expect(await startTproxyCaptureMode(s.client, { onPort: 9443 })).toMatchObject({ running: true, onPort: 9443 })
  expect(s.calls[0]!.init?.method).toBe('POST')
  expect(JSON.parse(String(s.calls[0]!.init?.body)).onPort).toBe(9443)
  expect((await stopTproxyCaptureMode(s.client)).running).toBe(false)
  expect(s.calls[1]!.init?.method).toBe('DELETE')
})

test('diagnose GETs /diagnose, with the agent in the query when given', async () => {
  const report = { healthy: false, checks: [{ name: 'cert-trusted', ok: false, hint: 'trust it' }], port: 443 }
  const s = fakeServer(() => ({ body: report }))
  expect(await runDiagnose(s.client)).toEqual(report)
  await runDiagnose(s.client, 'claude code')
  expect(s.calls.map(c => c.url)).toEqual([
    `${BASE}/api/tools/agent-bridge/diagnose`,
    `${BASE}/api/tools/agent-bridge/diagnose?agentId=claude%20code`,
  ])
})

test('cert removal and repair send the sudo password only when given', async () => {
  const s = fakeServer(call => ({ body: call.url.endsWith('/cert') ? { ok: true, trusted: false } : { ok: true, repaired: ['dns'] } }))
  expect((await removeCaCert(s.client)).trusted).toBe(false)
  expect((await repairMitmState(s.client, 'hunter2')).repaired).toEqual(['dns'])
  expect(s.calls.map(c => [c.url.slice(BASE.length), c.init?.method, c.init?.body])).toEqual([
    ['/api/tools/agent-bridge/cert', 'DELETE', '{}'],
    ['/api/tools/agent-bridge/repair', 'POST', '{"sudoPassword":"hunter2"}'],
  ])
})

test('the portable config is read with GET and imported with POST', async () => {
  const s = fakeServer(call =>
    call.init?.method === 'POST'
      ? { body: { ok: true, bypassPatterns: 1, customHosts: 0, agents: 0 } }
      : { body: { ...EMPTY_CONFIG, bypassPatterns: ['*.corp'] } },
  )
  expect((await fetchAgentBridgeConfig(s.client)).bypassPatterns).toEqual(['*.corp'])
  expect((await importAgentBridgeConfig(s.client, EMPTY_CONFIG)).bypassPatterns).toBe(1)
  expect(JSON.parse(String(s.calls[1]!.init?.body)).version).toBe(1)
})

test('a non-2xx throws the sanitized server message', async () => {
  const s = fakeServer(() => ({ status: 400, body: { error: { message: 'Invalid AgentBridge config' } } }))
  await expect(importAgentBridgeConfig(s.client, EMPTY_CONFIG)).rejects.toThrow('Invalid AgentBridge config')
  await expect(startTproxyCaptureMode(s.client)).rejects.toThrow('Invalid AgentBridge config')
})

test('without a message the error is the HTTP status', async () => {
  const s = fakeServer(() => ({ status: 503, body: null }))
  await expect(repairMitmState(s.client)).rejects.toThrow('HTTP 503')
  await expect(fetchTproxyStatus(s.client)).rejects.toThrow('HTTP 503')
})
