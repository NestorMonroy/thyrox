/**
 * Servidor proxy local — el camino de inferencia de la pasarela del
 * ejecutable 2.1.283 (`Jue`/`Bv`/`Mt`/`AD`, chunk-wg7ts4cy.js; extracto en
 * `.claude/workbench/omniroute-analysis-20260927T160306/outputs/reflow/`), con
 * el control de acceso de CLIProxyAPI y el selector de credenciales por
 * upstream. Cada caso es una regla medida en esa fuente.
 */
import { describe, expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { FillFirstSelector, type ProxyCredential } from '../src/proxy/credentialSelectors.ts'
import { createProxyHandler, SECURITY_HEADERS, type ForwardRequest } from '../src/proxy/server.ts'

const KEY = 'sk-local-test'
const routing = {
  upstreams: [
    { name: 'a', provider: 'anthropic' },
    { name: 'b', provider: 'anthropic' },
  ],
  models: [{ id: 'mx', upstream_model: { a: 'mx-a', b: 'mx-b' } }],
  auto_include_builtin_models: false,
}
const credentials: Record<string, ProxyCredential[]> = { a: [{ id: 'a1' }], b: [{ id: 'b2' }, { id: 'b1' }] }

function handlerWith(statuses: Record<string, number>, seen: ForwardRequest[] = []) {
  return createProxyHandler({
    access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
    routing,
    credentials,
    selector: new FillFirstSelector(),
    forward: async request => {
      seen.push(request)
      const status = statuses[request.upstream.name] ?? 200
      return new Response(JSON.stringify({ from: request.upstream.name }), {
        status,
        headers: { 'content-type': 'application/json', 'x-gateway-upstream': 'filtrar-me' },
      })
    },
  })
}

const post = (body: unknown, headers: Record<string, string> = {}, path = '/v1/messages', signal?: AbortSignal) =>
  new Request(`http://127.0.0.1${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal,
  })

const errorOf = async (r: Response) => ((await r.json()) as { error: { type: string; message: string } }).error

describe('superficie común', () => {
  test('/healthz responde ok con las cabeceras de seguridad y un x-request-id', async () => {
    const r = await handlerWith({})(new Request('http://127.0.0.1/healthz'))
    expect(r.status).toBe(200)
    expect(await r.text()).toBe('ok')
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(r.headers.get(k)).toBe(v)
    expect(r.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('x-client-request-id válido se conserva; uno inválido se sustituye', async () => {
    const ok = await handlerWith({})(new Request('http://127.0.0.1/healthz', { headers: { 'x-client-request-id': 'mi.id_1' } }))
    expect(ok.headers.get('x-request-id')).toBe('mi.id_1')
    const bad = await handlerWith({})(new Request('http://127.0.0.1/healthz', { headers: { 'x-client-request-id': 'no válido!' } }))
    expect(bad.headers.get('x-request-id')).not.toBe('no válido!')
  })

  test('una ruta desconocida es 404 not found', async () => {
    const r = await handlerWith({})(new Request('http://127.0.0.1/otra', { headers: { authorization: `Bearer ${KEY}` } }))
    expect([r.status, await r.text()]).toEqual([404, 'not found'])
  })

  test('sin clave: 401, con el error del control de acceso', async () => {
    const r = await handlerWith({})(new Request('http://127.0.0.1/v1/messages', { method: 'POST', body: '{}' }))
    expect(r.status).toBe(401)
  })
})

describe('validación del cuerpo (Bv)', () => {
  test.each([
    ['{', 'invalid JSON'],
    ['[]', 'request body must be a JSON object'],
    ['{}', 'model is required'],
    ['{"model":""}', 'model is required'],
    ['{"model":3}', 'model must be a string'],
  ])('%s → 400 %s', async (body, message) => {
    const r = await handlerWith({})(post(body))
    expect(r.status).toBe(400)
    expect(await errorOf(r)).toEqual({ type: 'invalid_request_error', message })
  })
})

describe('reenvío con conmutación (Bv)', () => {
  test('el primer upstream en 500 cede al siguiente; la respuesta no lleva x-gateway-*', async () => {
    const seen: ForwardRequest[] = []
    const r = await handlerWith({ a: 500 }, seen)(post({ model: 'mx', messages: [] }))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ from: 'b' })
    expect(r.headers.get('x-gateway-upstream')).toBeNull()
    expect(seen.map(s => [s.upstream.name, s.upstreamModel, s.credential.id, (s.body as { model: string }).model])).toEqual([
      ['a', 'mx-a', 'a1', 'mx-a'],
      ['b', 'mx-b', 'b1', 'mx-b'],
    ])
  })

  test.each([
    // El esperado va SIEMPRE segundo: si fuera el primero, el caso pasaría
    // también sin conmutación y no mediría nada (lo mostró la anulación).
    [{ a: 404, b: 429 }, 429],
    [{ a: 404, b: 401 }, 401],
    [{ a: 404, b: 403 }, 403],
    [{ a: 500, b: 404 }, 404],
  ])('entre fallos, gana el más informativo: %o → %i', async (statuses, expected) => {
    expect((await handlerWith(statuses)(post({ model: 'mx' }))).status).toBe(expected)
  })

  test('todos en 5xx: 502 «all upstreams failed (2 attempted)»', async () => {
    const r = await handlerWith({ a: 500, b: 503 })(post({ model: 'mx' }))
    expect(r.status).toBe(502)
    expect(await errorOf(r)).toEqual({ type: 'api_error', message: 'all upstreams failed (2 attempted)' })
  })

  test('un 4xx que no es de conmutación se devuelve tal cual', async () => {
    const seen: ForwardRequest[] = []
    expect((await handlerWith({ a: 400 }, seen)(post({ model: 'mx' }))).status).toBe(400)
    expect(seen.length).toBe(1)
  })

  test('ningún upstream sirve el modelo: 400 con los motivos', async () => {
    const r = await handlerWith({})(post({ model: 'desconocido' }))
    expect(r.status).toBe(400)
    expect((await errorOf(r)).message).toContain("not in the operator's model allowlist")
  })

  test('con la petición abortada: 499 client closed request', async () => {
    const controller = new AbortController()
    controller.abort()
    const r = await handlerWith({})(post({ model: 'mx' }, {}, '/v1/messages', controller.signal))
    expect(r.status).toBe(499)
  })

  test('/v1/messages/count_tokens también es de inferencia', async () => {
    expect((await handlerWith({})(post({ model: 'mx' }, {}, '/v1/messages/count_tokens'))).status).toBe(200)
  })
})
