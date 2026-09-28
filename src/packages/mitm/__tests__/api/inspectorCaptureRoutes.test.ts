/**
 * Los modos de captura del inspector y su punto de ingesta: el resumen de
 * modos, el proxy HTTP explícito, el proxy del sistema con su guarda, la
 * intercepción TLS, y la ingesta del servidor MITM con token y saneado.
 *
 * Porte del contrato de `omniroute: src/app/api/tools/traffic-inspector/
 * {capture-modes,capture-modes/http-proxy,capture-modes/system-proxy,
 * capture-modes/tls-intercept,internal/ingest}/route.ts` (MIT), con el estado
 * de captura y los proxies como dobles.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { createApiHandler } from '../../src/api/router.ts'
import { INSPECTOR_BASE } from '../../src/api/routes/inspector.ts'
import {
  createInspectorCaptureRoutes,
  resolveIngestToken,
  systemProxyGuardMinutes,
  type InspectorCaptureDeps,
} from '../../src/api/routes/inspectorCapture.ts'
import { TrafficBuffer } from '../../src/inspector/buffer.ts'
import type { HttpProxyServerHandle } from '../../src/inspector/httpProxyServer.ts'
import type { SystemProxyState } from '../../src/inspector/captureState.ts'
import { addCustomHost, toggleCustomHost } from '../../src/state/inspectorCustomHosts.ts'
import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'

const TOKEN = 'ingest-token-0123456789abcdef'
let db: Database
let traffic: TrafficBuffer
let calls: string[]
let proxyHandle: HttpProxyServerHandle | null
let systemState: SystemProxyState
let tls: boolean
let deps: InspectorCaptureDeps
let handle: (request: Request) => Promise<Response>

function fakeHandle(port: number): HttpProxyServerHandle {
  return {
    port,
    server: {} as HttpProxyServerHandle['server'],
    stop: async () => {
      calls.push(`http-stop:${port}`)
    },
  }
}

beforeEach(() => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  traffic = new TrafficBuffer(100)
  calls = []
  proxyHandle = null
  systemState = { applied: false, port: null, guardUntil: null, previousState: null }
  tls = false
  deps = {
    db,
    traffic,
    ingestToken: () => TOKEN,
    httpProxy: {
      current: () => proxyHandle,
      remember: h => {
        proxyHandle = h
      },
      start: async port => {
        calls.push(`http-start:${port}`)
        return fakeHandle(port)
      },
      defaultPort: () => 8080,
    },
    systemProxy: {
      state: () => systemState,
      apply: async port => {
        calls.push(`apply:${port}`)
        return { platform: 'linux', previousState: { platform: 'linux', mode: 'none' } as never }
      },
      revert: async previous => {
        calls.push(`revert:${JSON.stringify(previous)}`)
      },
      markApplied: (port, _previous, guardMinutes) => {
        calls.push(`mark:${port}:${guardMinutes}`)
        systemState = { applied: true, port, guardUntil: '2030-01-01T00:00:00.000Z', previousState: _previous }
      },
      clear: () => {
        systemState = { applied: false, port: null, guardUntil: null, previousState: null }
      },
      defaultGuardMinutes: () => 30,
    },
    tlsIntercept: {
      enabled: () => tls,
      set: enabled => {
        tls = enabled
      },
    },
  }
  handle = createApiHandler(createInspectorCaptureRoutes(deps), { peerAddress: () => '127.0.0.1' })
})
afterEach(() => db.close())

function call(method: string, route: string, body?: unknown, headers: Record<string, string> = {}): Promise<Response> {
  const all: Record<string, string> = { host: '127.0.0.1', ...headers }
  const init: RequestInit = { method, headers: all }
  if (body !== undefined) {
    all['content-type'] = 'application/json'
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }
  return handle(new Request(`http://127.0.0.1${INSPECTOR_BASE}${route}`, init))
}

async function json(res: Response): Promise<Record<string, any>> {
  return (await res.json()) as Record<string, any>
}

// ── capture-modes ────────────────────────────────────────────────────────

test('GET /capture-modes summarizes every mode', async () => {
  addCustomHost(db, 'a.example.com')
  addCustomHost(db, 'b.example.com')
  toggleCustomHost(db, 'b.example.com', false)
  proxyHandle = fakeHandle(8081)
  expect(await json(await call('GET', '/capture-modes'))).toEqual({
    agentBridge: true,
    customHosts: { count: 2, enabledCount: 1 },
    httpProxy: { running: true, port: 8081 },
    systemProxy: { applied: false, guardUntil: null, port: null },
    tlsIntercept: { enabled: false },
  })
})

test('http-proxy: start opens it on the default port, and a second start reuses it', async () => {
  const first = await call('POST', '/capture-modes/http-proxy', { action: 'start' })
  expect(first.status).toBe(201)
  expect(await json(first)).toEqual({ ok: true, running: true, port: 8080 })
  const again = await call('POST', '/capture-modes/http-proxy', { action: 'start' })
  expect(again.status).toBe(200)
  expect(calls).toEqual(['http-start:8080'])
})

test('http-proxy: stop closes it and forgets it, and stopping nothing is fine', async () => {
  proxyHandle = fakeHandle(8080)
  expect(await json(await call('POST', '/capture-modes/http-proxy', { action: 'stop' }))).toEqual({
    ok: true,
    running: false,
    port: null,
  })
  expect(calls).toEqual(['http-stop:8080'])
  expect(proxyHandle).toBeNull()
  expect((await call('POST', '/capture-modes/http-proxy', { action: 'stop' })).status).toBe(200)
})

test('http-proxy: a busy port is a 409 naming it', async () => {
  deps.httpProxy.start = async () => {
    throw Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' })
  }
  const res = await call('POST', '/capture-modes/http-proxy', { action: 'start' })
  expect(res.status).toBe(409)
  const body = await json(res)
  expect(body.error).toMatchObject({ type: 'conflict', details: { code: 'EADDRINUSE', port: 8080 } })
  expect(proxyHandle).toBeNull()
})

test('http-proxy: an unknown action is a 400', async () => {
  expect((await call('POST', '/capture-modes/http-proxy', { action: 'pause' })).status).toBe(400)
})

test('system-proxy: apply points the system at the proxy and arms the guard', async () => {
  const body = await json(await call('POST', '/capture-modes/system-proxy', { action: 'apply', port: 9090, guardMinutes: 5 }))
  expect(body).toEqual({ ok: true, applied: true, port: 9090, platform: 'linux', guardUntil: '2030-01-01T00:00:00.000Z' })
  expect(calls).toEqual(['apply:9090', 'mark:9090:5'])
})

test('system-proxy: apply without port or guard uses the defaults', async () => {
  await call('POST', '/capture-modes/system-proxy', { action: 'apply' })
  expect(calls).toEqual(['apply:8080', 'mark:8080:30'])
})

test('system-proxy: revert restores the previous state, and without one only clears', async () => {
  await call('POST', '/capture-modes/system-proxy', { action: 'apply' })
  calls = []
  expect(await json(await call('POST', '/capture-modes/system-proxy', { action: 'revert' }))).toEqual({
    ok: true,
    applied: false,
  })
  expect(calls).toEqual(['revert:{"platform":"linux","mode":"none"}'])
  expect(systemState.applied).toBe(false)
  calls = []
  await call('POST', '/capture-modes/system-proxy', { action: 'revert' })
  expect(calls).toEqual([])
})

test('tls-intercept toggles the flag and reports it', async () => {
  expect(await json(await call('POST', '/capture-modes/tls-intercept', { enabled: true }))).toEqual({
    ok: true,
    tlsIntercept: { enabled: true },
  })
  expect(tls).toBe(true)
  expect((await call('POST', '/capture-modes/tls-intercept', { enabled: 'on' })).status).toBe(400)
})

// ── internal/ingest ──────────────────────────────────────────────────────

function ingestEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    source: 'agent-bridge',
    timestamp: new Date().toISOString(),
    method: 'POST',
    host: 'api.cursor.sh',
    path: '/v1/chat/completions',
    requestHeaders: { authorization: 'Bearer sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789', connection: 'keep-alive' },
    requestBody: '{"key":"sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789"}',
    requestSize: 10,
    responseHeaders: {},
    responseSize: 0,
    status: 200,
    ...overrides,
  }
}

test('ingest with the token puts the entry in the buffer, masked and without hop headers', async () => {
  const entry = ingestEntry()
  const res = await call('POST', '/internal/ingest', entry, { authorization: `Bearer ${TOKEN}` })
  expect(await json(res)).toEqual({ ok: true, id: entry.id })
  const stored = traffic.get(entry.id)!
  expect(stored.requestHeaders.connection).toBeUndefined()
  expect(stored.requestHeaders.authorization).not.toContain('abcdefghijklmnopqrstuvwxyz')
  expect(stored.requestBody).not.toContain('abcdefghijklmnopqrstuvwxyz')
  expect(stored.responseBody).toBeNull()
})

test('ingest without the token, or with another one, is a 403 and stores nothing', async () => {
  expect((await call('POST', '/internal/ingest', ingestEntry())).status).toBe(403)
  expect((await call('POST', '/internal/ingest', ingestEntry(), { authorization: 'Bearer wrong' })).status).toBe(403)
  expect(traffic.list()).toEqual([])
})

test('ingest rejects an entry missing a required field', async () => {
  const { host: _host, ...withoutHost } = ingestEntry()
  const res = await call('POST', '/internal/ingest', withoutHost, { authorization: `Bearer ${TOKEN}` })
  expect(res.status).toBe(400)
  expect(traffic.list()).toEqual([])
})

test('the ingest token comes from the environment only when it is long enough', () => {
  expect(resolveIngestToken({ THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN: TOKEN })).toBe(TOKEN)
  const generated = resolveIngestToken({ THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN: 'short' })
  expect(generated).not.toBe('short')
  expect(generated).toMatch(/^[0-9a-f]{32}$/)
  expect(resolveIngestToken({})).toMatch(/^[0-9a-f]{32}$/)
})

test('the system proxy guard comes from THYROX_INSPECTOR_SYSTEM_PROXY_GUARD_MINUTES, 30 by default', () => {
  expect(systemProxyGuardMinutes({ THYROX_INSPECTOR_SYSTEM_PROXY_GUARD_MINUTES: '5' })).toBe(5)
  expect(systemProxyGuardMinutes({})).toBe(30)
})
