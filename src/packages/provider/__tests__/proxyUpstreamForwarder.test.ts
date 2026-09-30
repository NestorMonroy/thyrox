/**
 * El reenviador HTTP del proxy local — implementación de thyrox, con el
 * upstream `raw` del ejecutable 2.1.283 como referencia (`Mv`, `lj`, `gj`,
 * `wj`, `Hv` y el `applyAuth` de `Fv`; chunk-wg7ts4cy.js, extracto en
 * `.claude/workbench/omniroute-analysis-20260927T160306/outputs/reflow/`).
 * Cada caso habla con un `Bun.serve` de loopback: ni red externa ni
 * credencial real.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { createHttpForwarder, credentialAuth, forwardableRequestHeaders, returnableResponseHeaders } from '../src/proxy/upstreamForwarder.ts'
import type { ForwardRequest } from '../src/proxy/server.ts'
import { OAUTH_BETA } from '../src/credentials.ts'

type Seen = { url: string; method: string; headers: Headers; body: string }
const servers: { stop: (force?: boolean) => void }[] = []
afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true)
})

function stub(respond: (seen: Seen) => Response | Promise<Response> = () => Response.json({ ok: true })) {
  const seen: Seen[] = []
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      const entry = { url: request.url, method: request.method, headers: request.headers, body: await request.text() }
      seen.push(entry)
      return respond(entry)
    },
  })
  servers.push(server)
  return { baseUrl: `http://127.0.0.1:${server.port}`, seen }
}

const loopbackEnv = {}

function headerNames(headers: Headers): string[] {
  const names: string[] = []
  headers.forEach((_value, name) => names.push(name))
  return names.sort()
}

function forwardRequest(overrides: Partial<ForwardRequest> = {}): ForwardRequest {
  return {
    upstream: { name: 'u', provider: 'anthropic' },
    upstreamModel: 'm-up',
    credential: { id: 'c1', attributes: { api_key: 'sk-up' } },
    path: '/v1/messages',
    search: '',
    body: { model: 'm-up', messages: [] },
    headers: new Headers({ 'content-type': 'application/json' }),
    signal: new AbortController().signal,
    ...overrides,
  }
}

describe('forwardableRequestHeaders (lj)', () => {
  test('pasa sólo la lista permitida y las x-stainless-*', () => {
    const kept = forwardableRequestHeaders(
      new Headers({
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'b1',
        'x-stainless-os': 'Linux',
        authorization: 'Bearer local-proxy-key',
        'x-api-key': 'local',
        cookie: 'c=1',
      }),
    )
    expect(headerNames(kept)).toEqual(['anthropic-beta', 'anthropic-version', 'content-type', 'x-stainless-os'])
  })
})

describe('returnableResponseHeaders (gj)', () => {
  test('retira la lista negra y las anthropic-ratelimit-*', () => {
    const kept = returnableResponseHeaders(
      new Headers({
        'content-type': 'application/json',
        'content-length': '10',
        'request-id': 'req_1',
        'anthropic-ratelimit-requests-remaining': '9',
        'retry-after': '3',
      }),
    )
    expect(headerNames(kept)).toEqual(['content-type', 'retry-after'])
  })
})

describe('credentialAuth (applyAuth de Fv)', () => {
  test('una clave de API va en x-api-key y retira la autorización del cliente', () => {
    const headers = new Headers({ authorization: 'Bearer local', 'x-api-key': 'local' })
    credentialAuth({ id: 'c', attributes: { api_key: 'sk-up' } })(headers)
    expect(headers.get('x-api-key')).toBe('sk-up')
    expect(headers.get('authorization')).toBeNull()
  })

  test('un token OAuth va como Bearer y añade la beta de OAuth', () => {
    const headers = new Headers({ 'anthropic-beta': 'b1' })
    credentialAuth({ id: 'c', metadata: { access_token: 'tok' } })(headers)
    expect(headers.get('authorization')).toBe('Bearer tok')
    expect(headers.get('x-api-key')).toBeNull()
    expect(headers.get('anthropic-beta')).toBe(`b1, ${OAUTH_BETA}`)
  })

  test('una credencial sin material rehúsa en vez de mandar la petición sin autorizar', () => {
    expect(() => credentialAuth({ id: 'vacia' })(new Headers())).toThrow(/vacia/)
  })
})

describe('createHttpForwarder (Mv)', () => {
  test('reenvía a baseUrl + ruta + query, con el cuerpo y la credencial del upstream', async () => {
    const upstream = stub()
    const forward = createHttpForwarder({ upstreams: { u: { baseUrl: `${upstream.baseUrl}/` } }, env: loopbackEnv, version: '0.1.0' })
    const response = await forward(forwardRequest({ search: '?beta=true' }))
    expect(response.status).toBe(200)
    const [seen] = upstream.seen
    expect(seen?.url).toBe(`${upstream.baseUrl}/v1/messages?beta=true`)
    expect(seen?.method).toBe('POST')
    expect(JSON.parse(seen?.body ?? '{}')).toEqual({ model: 'm-up', messages: [] })
    expect(seen?.headers.get('x-api-key')).toBe('sk-up')
  })

  test('añade su marca al user-agent del cliente y fija las cabeceras declaradas del upstream', async () => {
    const upstream = stub()
    const forward = createHttpForwarder({
      upstreams: { u: { baseUrl: upstream.baseUrl, headers: { 'x-tenant': 't1' } } },
      env: loopbackEnv,
      version: '0.1.0',
    })
    await forward(forwardRequest({ headers: new Headers({ 'user-agent': 'cli/1' }) }))
    expect(upstream.seen[0]?.headers.get('user-agent')).toBe('cli/1 thyrox-proxy/0.1.0')
    expect(upstream.seen[0]?.headers.get('x-tenant')).toBe('t1')
  })

  test('devuelve el estado del upstream y filtra sus cabeceras', async () => {
    const upstream = stub(() =>
      new Response('{"type":"error"}', {
        status: 429,
        headers: { 'retry-after': '7', 'anthropic-ratelimit-tokens-remaining': '0', 'request-id': 'r' },
      }),
    )
    const forward = createHttpForwarder({ upstreams: { u: { baseUrl: upstream.baseUrl } }, env: loopbackEnv, version: '0.1.0' })
    const response = await forward(forwardRequest())
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('7')
    expect(response.headers.get('anthropic-ratelimit-tokens-remaining')).toBeNull()
    expect(response.headers.get('request-id')).toBeNull()
  })

  test('un upstream sin baseUrl declarada rehúsa nombrándolo', async () => {
    const forward = createHttpForwarder({ upstreams: {}, env: loopbackEnv, version: '0.1.0' })
    await expect(forward(forwardRequest())).rejects.toThrow(/"u"/)
  })

  test('una baseUrl insegura (loopback sin permiso) rehúsa antes de conectar', async () => {
    const upstream = stub()
    const forward = createHttpForwarder({ upstreams: { u: { baseUrl: upstream.baseUrl } }, env: {}, version: '0.1.0' })
    await expect(forward(forwardRequest())).rejects.toThrow(/insegura|unsafe/)
    expect(upstream.seen).toHaveLength(0)
  })

  test('un upstream que no manda cabeceras dentro del plazo se aborta (wj)', async () => {
    const upstream = stub(() => new Promise(resolve => setTimeout(() => resolve(Response.json({})), 2000)))
    const forward = createHttpForwarder({
      upstreams: { u: { baseUrl: upstream.baseUrl } },
      env: loopbackEnv,
      version: '0.1.0',
      firstByteTimeoutMs: 50,
    })
    const started = Date.now()
    await expect(forward(forwardRequest())).rejects.toThrow()
    expect(Date.now() - started).toBeLessThan(1500)
  })

  test('el aborto del cliente cancela la petición al upstream', async () => {
    const upstream = stub(() => new Promise(resolve => setTimeout(() => resolve(Response.json({})), 2000)))
    const forward = createHttpForwarder({ upstreams: { u: { baseUrl: upstream.baseUrl } }, env: loopbackEnv, version: '0.1.0' })
    const client = new AbortController()
    const pending = forward(forwardRequest({ signal: client.signal }))
    client.abort()
    await expect(pending).rejects.toThrow()
  })

  test('el cuerpo del stream llega sin almacenarse entero', async () => {
    const upstream = stub(
      () =>
        new Response('event: ping\ndata: {}\n\n', { headers: { 'content-type': 'text/event-stream' } }),
    )
    const forward = createHttpForwarder({ upstreams: { u: { baseUrl: upstream.baseUrl } }, env: loopbackEnv, version: '0.1.0' })
    const response = await forward(forwardRequest({ body: { model: 'm-up', stream: true, messages: [] } }))
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    expect(await response.text()).toContain('event: ping')
  })
})
