/**
 * Las rutas del inspector de tráfico: la lista filtrada y su HAR, una
 * petición con su anotación y su repetición contra el proxy local, las
 * sesiones grabadas y los hosts propios con su entrada de DNS.
 *
 * Porte del contrato de `omniroute: src/app/api/tools/traffic-inspector/
 * {requests,requests/[id],requests/[id]/annotation,requests/[id]/replay,
 * export.har,sessions,sessions/[id],sessions/[id]/requests,
 * sessions/[id]/export.har,hosts,hosts/[host]}/route.ts` (MIT), con el búfer
 * real, una base en memoria y el DNS y el `fetch` como dobles.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { createApiHandler } from '../../src/api/router.ts'
import { INSPECTOR_BASE } from '../../src/api/routes/inspector/basePath.ts'
import { createHostRoutes, type HostRouteDeps } from '../../src/api/routes/inspector/hosts.ts'
import { createRequestRoutes, type RequestRouteDeps } from '../../src/api/routes/inspector/requests.ts'
import { createSessionRoutes } from '../../src/api/routes/inspector/sessions.ts'
import { TrafficBuffer } from '../../src/inspector/buffer.ts'
import type { InterceptedRequest } from '../../src/inspector/types.ts'
import { listCustomHosts } from '../../src/state/inspectorCustomHosts.ts'
import { appendSessionRequest, createSession, getSession } from '../../src/state/inspectorSessions.ts'
import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'

let db: Database
let traffic: TrafficBuffer
let calls: string[]
let cachedPassword: string | null
let deps: RequestRouteDeps & HostRouteDeps
let handle: (request: Request) => Promise<Response>

beforeEach(() => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  traffic = new TrafficBuffer(100)
  calls = []
  cachedPassword = 'pw'
  deps = {
    db,
    traffic,
    cachedPassword: () => cachedPassword,
    dns: {
      add: async (hosts, password) => {
        calls.push(`dns-add:${hosts.join(',')}:${password}`)
      },
      remove: async (hosts, password) => {
        calls.push(`dns-remove:${hosts.join(',')}:${password}`)
      },
    },
    proxyBaseUrl: () => 'http://127.0.0.1:4000',
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      calls.push(
        `fetch:${init?.method} ${String(input)} ${headers.get('x-thyrox-source')} auth=${headers.get('authorization')} body=${String(init?.body)}`,
      )
      return new Response('{"replayed":true}', { status: 201, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch,
  }
  handle = createApiHandler([...createRequestRoutes(deps), ...createSessionRoutes(db), ...createHostRoutes(deps)], { peerAddress: () => '127.0.0.1' })
})
afterEach(() => db.close())

function call(method: string, route: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { host: '127.0.0.1' }
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }
  return handle(new Request(`http://127.0.0.1${INSPECTOR_BASE}${route}`, init))
}

async function json(res: Response): Promise<Record<string, any>> {
  return (await res.json()) as Record<string, any>
}

function captured(overrides: Partial<InterceptedRequest> = {}): InterceptedRequest {
  const req: InterceptedRequest = {
    id: crypto.randomUUID(),
    source: 'agent-bridge',
    agent: 'cursor',
    timestamp: new Date().toISOString(),
    method: 'POST',
    host: 'api.cursor.sh',
    path: '/v1/chat/completions',
    requestHeaders: { 'content-type': 'application/json' },
    requestBody: '{"model":"gpt-4o"}',
    requestSize: 18,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    status: 200,
    ...overrides,
  }
  traffic.push(req)
  return req
}

// ── requests ─────────────────────────────────────────────────────────────

test('GET /requests lists the buffer with the filters of the query', async () => {
  captured({ host: 'api.cursor.sh' })
  captured({ host: 'api.githubcopilot.com', agent: 'copilot' })
  expect((await json(await call('GET', '/requests'))).total).toBe(2)
  // El búfer filtra por host exacto; la subcadena es cosa del filtro de la vista.
  expect((await json(await call('GET', '/requests?host=githubcopilot'))).total).toBe(0)
  const one = await json(await call('GET', '/requests?host=api.githubcopilot.com'))
  expect(one.requests.map((r: InterceptedRequest) => r.agent)).toEqual(['copilot'])
})

test('GET /requests rejects a query outside the schema', async () => {
  expect((await call('GET', '/requests?status=7xx')).status).toBe(400)
  expect((await call('GET', '/requests?sessionId=not-a-uuid')).status).toBe(400)
})

test('DELETE /requests empties the buffer with a 204', async () => {
  captured()
  expect((await call('DELETE', '/requests')).status).toBe(204)
  expect(traffic.list()).toEqual([])
})

test('GET /requests/:id returns the entry, or 404', async () => {
  const req = captured()
  expect((await json(await call('GET', `/requests/${req.id}`))).id).toBe(req.id)
  expect((await call('GET', '/requests/missing')).status).toBe(404)
})

test('PUT /requests/:id/annotation stores the note in the buffer', async () => {
  const req = captured()
  expect((await json(await call('PUT', `/requests/${req.id}/annotation`, { annotation: 'slow one' }))).annotation).toBe(
    'slow one',
  )
  expect(traffic.get(req.id)?.annotation).toBe('slow one')
})

test('PUT /requests/:id/annotation validates the body and the entry', async () => {
  const req = captured()
  expect((await call('PUT', `/requests/${req.id}/annotation`, '{bad')).status).toBe(400)
  expect((await call('PUT', `/requests/${req.id}/annotation`, { annotation: 'x'.repeat(10_001) })).status).toBe(400)
  expect((await call('PUT', '/requests/missing/annotation', { annotation: 'x' })).status).toBe(404)
})

test('POST /requests/:id/replay resends to the local proxy, tagged, with its original auth', async () => {
  const req = captured({ requestHeaders: { authorization: 'Bearer sk-local-123' } })
  const res = await call('POST', `/requests/${req.id}/replay`)
  expect(res.status).toBe(201)
  expect(await res.text()).toBe('{"replayed":true}')
  expect(calls).toEqual([
    'fetch:POST http://127.0.0.1:4000/v1/chat/completions inspector-replay auth=Bearer sk-local-123 body={"model":"gpt-4o"}',
  ])
})

test('POST /requests/:id/replay drops a masked authorization', async () => {
  const req = captured({ requestHeaders: { Authorization: 'Bearer sk-***' } })
  await call('POST', `/requests/${req.id}/replay`)
  expect(calls[0]).toContain('auth=null')
})

test('POST /requests/:id/replay of a proxy that cannot be reached is a sanitized 502', async () => {
  deps.fetch = (async () => {
    throw new Error('connect ECONNREFUSED at /home/user/thyrox/src/x.ts:1')
  }) as unknown as typeof fetch
  const req = captured()
  const res = await call('POST', `/requests/${req.id}/replay`)
  expect(res.status).toBe(502)
  expect((await json(res)).error.message).not.toContain('/home/user')
  expect((await call('POST', '/requests/missing/replay')).status).toBe(404)
})

test('GET /export.har exports the filtered buffer as a no-store attachment', async () => {
  captured({ agent: 'cursor' })
  captured({ agent: 'zed', host: 'zed.dev' })
  const res = await call('GET', '/export.har?host=zed.dev')
  expect(res.headers.get('content-disposition')).toBe('attachment; filename="traffic.har"')
  expect(res.headers.get('cache-control')).toBe('no-store')
  const har = await json(res)
  expect(har.log.entries).toHaveLength(1)
  expect(har.log.entries[0].request.url).toBe('https://zed.dev/v1/chat/completions')
})

// ── sessions ─────────────────────────────────────────────────────────────

test('sessions: POST creates one with a 201, GET lists it', async () => {
  const created = await call('POST', '/sessions', { name: 'debug' })
  expect(created.status).toBe(201)
  const { id } = await json(created)
  expect((await json(await call('GET', '/sessions'))).sessions.map((s: { id: string }) => s.id)).toEqual([id])
  expect(getSession(db, id)?.name).toBe('debug')
})

test('sessions: POST with no body creates an unnamed session', async () => {
  const res = await call('POST', '/sessions')
  expect(res.status).toBe(201)
  expect(getSession(db, (await json(res)).id)?.name).toBeNull()
})

test('sessions/:id: GET returns the session and its requests, parsed when they are JSON', async () => {
  const { id } = createSession(db)
  appendSessionRequest(db, id, '{"path":"/a"}')
  appendSessionRequest(db, id, 'not json')
  const body = await json(await call('GET', `/sessions/${id}`))
  expect(body.session.id).toBe(id)
  expect(body.requests).toEqual([{ path: '/a' }, 'not json'])
  expect((await call('GET', `/sessions/${crypto.randomUUID()}`)).status).toBe(404)
})

test('sessions/:id: PATCH stops or renames, and a rename needs a name', async () => {
  const { id } = createSession(db, { name: 'old' })
  expect((await json(await call('PATCH', `/sessions/${id}`, { action: 'rename', name: 'new' }))).name).toBe('new')
  expect((await call('PATCH', `/sessions/${id}`, { action: 'rename' })).status).toBe(400)
  expect((await json(await call('PATCH', `/sessions/${id}`, { action: 'stop' }))).ended_at).toEqual(expect.any(String))
  expect((await call('PATCH', `/sessions/${id}`, { action: 'pause' })).status).toBe(400)
  expect((await call('PATCH', `/sessions/${crypto.randomUUID()}`, { action: 'stop' })).status).toBe(404)
})

test('sessions/:id: DELETE removes it with a 204, and an unknown one is a 404', async () => {
  const { id } = createSession(db)
  expect((await call('DELETE', `/sessions/${id}`)).status).toBe(204)
  expect(getSession(db, id)).toBeNull()
  expect((await call('DELETE', `/sessions/${id}`)).status).toBe(404)
})

test('sessions/:id/requests: POST appends with the next sequence', async () => {
  const { id } = createSession(db)
  expect(await json(await call('POST', `/sessions/${id}/requests`, { payload: 'a' }))).toEqual({ seq: 1 })
  const second = await call('POST', `/sessions/${id}/requests`, { payload: 'b' })
  expect(second.status).toBe(201)
  expect(await json(second)).toEqual({ seq: 2 })
  expect((await call('POST', `/sessions/${id}/requests`, {})).status).toBe(400)
  expect((await call('POST', `/sessions/${crypto.randomUUID()}/requests`, { payload: 'a' })).status).toBe(404)
})

test('sessions/:id/export.har names the file after the session and keeps valid rows only', async () => {
  const { id } = createSession(db, { name: 'my run/1' })
  appendSessionRequest(db, id, JSON.stringify(captured()))
  appendSessionRequest(db, id, '{"broken":true}')
  const res = await call('GET', `/sessions/${id}/export.har`)
  expect(res.headers.get('content-disposition')).toBe('attachment; filename="my_run_1.har"')
  expect((await json(res)).log.entries).toHaveLength(1)
  expect((await call('GET', `/sessions/${crypto.randomUUID()}/export.har`)).status).toBe(404)
})

// ── hosts ────────────────────────────────────────────────────────────────

test('hosts: POST adds the host and its DNS entry with the cached password', async () => {
  const res = await call('POST', '/hosts', { host: 'llm.example.com', kind: 'llm', label: 'mine' })
  expect(res.status).toBe(201)
  expect(await json(res)).toEqual({ ok: true, host: 'llm.example.com' })
  expect(calls).toEqual(['dns-add:llm.example.com:pw'])
  expect((await json(await call('GET', '/hosts'))).hosts.map((h: { host: string }) => h.host)).toEqual([
    'llm.example.com',
  ])
})

test('hosts: POST without a cached password stores the host and warns about DNS', async () => {
  cachedPassword = null
  const body = await json(await call('POST', '/hosts', { host: 'llm.example.com' }))
  expect(body.ok).toBe(true)
  expect(body.warning).toContain('cached sudo password')
  expect(calls).toEqual([])
})

test('hosts: POST whose DNS entry fails keeps the host and reports the warning', async () => {
  deps.dns.add = async () => {
    throw new Error('sudo: a password is required')
  }
  const body = await json(await call('POST', '/hosts', { host: 'llm.example.com' }))
  expect(body.warning).toStartWith('DNS routing entry could not be added:')
  expect(listCustomHosts(db)).toHaveLength(1)
})

test('hosts: POST refuses a host that is not a hostname, before touching the hosts file', async () => {
  for (const host of ['evil.com\n1.2.3.4 github.com', 'a b.com', '-bad.com', `${'x'.repeat(64)}.com`, '']) {
    expect((await call('POST', '/hosts', { host })).status).toBe(400)
  }
  expect(calls).toEqual([])
  expect(listCustomHosts(db)).toEqual([])
})

test('hosts/:host: PATCH toggles it, and an unknown host is a 404', async () => {
  await call('POST', '/hosts', { host: 'llm.example.com' })
  expect((await json(await call('PATCH', '/hosts/llm.example.com', { enabled: false }))).enabled).toBe(false)
  expect((await call('PATCH', '/hosts/nope.example.com', { enabled: true })).status).toBe(404)
  expect((await call('PATCH', '/hosts/llm.example.com', { enabled: 'no' })).status).toBe(400)
})

test('hosts/:host: DELETE removes it and its DNS entry', async () => {
  await call('POST', '/hosts', { host: 'llm.example.com' })
  calls = []
  const res = await call('DELETE', '/hosts/llm.example.com')
  expect(res.status).toBe(204)
  expect(res.headers.get('x-dns-warning')).toBeNull()
  expect(calls).toEqual(['dns-remove:llm.example.com:pw'])
  expect(listCustomHosts(db)).toEqual([])
})

test('hosts/:host: DELETE without a password, or with a failing DNS removal, warns in a header', async () => {
  await call('POST', '/hosts', { host: 'a.example.com' })
  await call('POST', '/hosts', { host: 'b.example.com' })
  cachedPassword = null
  expect((await call('DELETE', '/hosts/a.example.com')).headers.get('x-dns-warning')).toContain('cached sudo password')
  cachedPassword = 'pw'
  deps.dns.remove = async () => {
    throw new Error('denied')
  }
  expect((await call('DELETE', '/hosts/b.example.com')).headers.get('x-dns-warning')).toContain('b.example.com')
  expect(listCustomHosts(db)).toEqual([])
})
