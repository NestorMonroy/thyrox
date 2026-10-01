/**
 * El servidor de API local del MITM: sólo atiende al loopback (IP real del
 * par, sin cabeceras de reenvío y con un Host de loopback), resuelve rutas con
 * parámetros, distingue 404 de 405 y nunca devuelve un error sin sanear.
 *
 * Porte del contrato LOCAL_ONLY de `omniroute: src/server/authz/
 * {routeGuard,peerContext}.ts` y `policies/management.ts`, y del cuerpo de
 * `src/lib/api/errorResponse.ts` (MIT).
 */
import { afterAll, beforeAll, expect, test } from 'bun:test'

import { errorResponse, readJsonBody } from '../../src/api/http.ts'
import { createApiHandler, type ApiRoute } from '../../src/api/router.ts'
import { startMitmApiServer, type MitmApiServer } from '../../src/api/server.ts'

const ROUTES: ApiRoute[] = [
  { method: 'GET', path: '/api/tools/agent-bridge/agents', handler: () => Response.json({ agents: [] }) },
  {
    method: 'POST',
    path: '/api/tools/agent-bridge/agents/:id/dns',
    handler: ({ params }) => Response.json({ id: params.id }),
  },
  {
    method: 'GET',
    path: '/api/tools/agent-bridge/boom',
    handler: () => {
      throw new Error('failed at /home/user/secret/file.ts:12 with token sk-abcdef1234567890ABCDEF')
    },
  },
  {
    method: 'POST',
    path: '/api/tools/agent-bridge/echo',
    handler: async ({ request }) => {
      const read = await readJsonBody(request)
      return read.ok ? Response.json(read.body) : read.response
    },
  },
]

let server: MitmApiServer
let base: string

beforeAll(() => {
  server = startMitmApiServer({ port: 0, routes: ROUTES })
  base = `http://127.0.0.1:${server.port}`
})
afterAll(() => server.stop())

test('the server listens on loopback only', () => {
  expect(server.hostname).toBe('127.0.0.1')
})

test('a local request reaches its route', async () => {
  const res = await fetch(`${base}/api/tools/agent-bridge/agents`)
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ agents: [] })
})

test('path parameters are decoded', async () => {
  const res = await fetch(`${base}/api/tools/agent-bridge/agents/claude%20code/dns`, { method: 'POST' })
  expect(await res.json()).toEqual({ id: 'claude code' })
})

test('an unknown path is 404 and a known path with another method is 405 with Allow', async () => {
  const missing = await fetch(`${base}/api/tools/agent-bridge/nope`)
  expect(missing.status).toBe(404)
  expect((await missing.json()).error.type).toBe('not_found')
  const wrong = await fetch(`${base}/api/tools/agent-bridge/agents`, { method: 'DELETE' })
  expect(wrong.status).toBe(405)
  expect(wrong.headers.get('allow')).toBe('GET')
})

test('a request through a reverse proxy is refused as not local', async () => {
  const res = await fetch(`${base}/api/tools/agent-bridge/agents`, { headers: { 'x-forwarded-for': '203.0.113.9' } })
  expect(res.status).toBe(403)
  const body = await res.json()
  expect(body.error.code).toBe('LOCAL_ONLY')
  expect(body.error.message).toBe('This endpoint requires localhost access')
  expect(typeof body.error.correlation_id).toBe('string')
})

test('a non-loopback Host is refused even from a loopback peer', async () => {
  const res = await fetch(`${base}/api/tools/agent-bridge/agents`, { headers: { host: 'evil.example' } })
  expect(res.status).toBe(403)
  expect((await res.json()).error.code).toBe('LOCAL_ONLY')
})

test('a thrown error answers 500 with a sanitized message', async () => {
  const res = await fetch(`${base}/api/tools/agent-bridge/boom`)
  expect(res.status).toBe(500)
  const text = await res.text()
  expect(text).not.toContain('/home/user/secret')
  expect(text).not.toContain('sk-abcdef1234567890ABCDEF')
  expect(JSON.parse(text).error.type).toBe('server_error')
})

test('a malformed JSON body is 400 invalid_request', async () => {
  const res = await fetch(`${base}/api/tools/agent-bridge/echo`, { method: 'POST', body: '{not json' })
  expect(res.status).toBe(400)
  expect((await res.json()).error.type).toBe('invalid_request')
  const ok = await fetch(`${base}/api/tools/agent-bridge/echo`, { method: 'POST', body: '{"a":1}' })
  expect(await ok.json()).toEqual({ a: 1 })
})

test('a remote or unknown peer is refused: the guard fails closed', async () => {
  for (const peer of ['10.0.0.5', null]) {
    const handler = createApiHandler(ROUTES, { peerAddress: () => peer })
    // Con un Host de loopback explícito, sólo el par decide: sin él, la guarda
    // del Host rechazaría igual y la prueba no mediría el par.
    const res = await handler(
      new Request('http://127.0.0.1/api/tools/agent-bridge/agents', { headers: { host: '127.0.0.1' } }),
    )
    expect(res.status).toBe(403)
  }
})

test('the error body keeps the reference shape and infers its type from the status', async () => {
  const res = errorResponse({ status: 409, message: 'busy' })
  const body = await res.json()
  expect(body.error).toEqual({ message: 'busy', type: 'conflict' })
  expect(typeof body.requestId).toBe('string')
})
