/**
 * Servidor proxy local — el camino de inferencia de la pasarela del
 * ejecutable 2.1.283 (`Jue`/`Bv`/`Mt`/`AD`, chunk-wg7ts4cy.js; extracto en
 * `.claude/workbench/omniroute-analysis-20260927T160306/outputs/reflow/`), con
 * el control de acceso de CLIProxyAPI y el selector de credenciales por
 * upstream. Cada caso es una regla medida en esa fuente.
 */
import { describe, expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { FillFirstSelector, type ProxyCredential, RoundRobinSelector } from '../src/proxy/credentialSelectors.ts'
import { SessionAffinitySelector } from '../src/proxy/session/affinitySelector.ts'
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

describe('afinidad de sesión en el reenvío', () => {
  const single = { upstreams: [{ name: 'b', provider: 'anthropic' }], models: [{ id: 'mx', upstream_model: { b: 'mx-b' } }], auto_include_builtin_models: false }
  const affinityHandler = (status: () => number, seen: ForwardRequest[], selector = new SessionAffinitySelector({ fallback: new RoundRobinSelector(), cleanup: false })) =>
    createProxyHandler({
      access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
      routing: single,
      credentials: { b: [{ id: 'b1' }, { id: 'b2' }] },
      selector,
      forward: async request => {
        seen.push(request)
        return Response.json({ ok: true }, { status: status() })
      },
    })
  const session = (id: string) => ({ 'x-session-id': id })
  const lastCredential = (seen: ForwardRequest[]) => seen[seen.length - 1]!.credential.id

  test('la misma sesión vuelve a la misma credencial; otra sesión reparte', async () => {
    const seen: ForwardRequest[] = []
    const handler = affinityHandler(() => 200, seen)
    await handler(post({ model: 'mx' }, session('s1')))
    const bound = lastCredential(seen)
    await handler(post({ model: 'mx' }, session('s2')))
    expect(lastCredential(seen)).not.toBe(bound)
    for (let i = 0; i < 3; i++) {
      await handler(post({ model: 'mx' }, session('s1')))
      expect(lastCredential(seen)).toBe(bound)
    }
  })

  test('el selector ve el cuerpo del cliente: la sesión del cuerpo vincula', async () => {
    const seen: ForwardRequest[] = []
    const handler = affinityHandler(() => 200, seen)
    const body = { model: 'mx', metadata: { user_id: 'user_x_account__session_body-session' } }
    await handler(post(body))
    const bound = lastCredential(seen)
    await handler(post({ model: 'mx', metadata: { user_id: 'user_x_account__session_other' } }))
    for (let i = 0; i < 2; i++) {
      await handler(post(body))
      expect(lastCredential(seen)).toBe(bound)
    }
  })

  test('un fallo de la credencial libera la vinculación; uno de la petición la conserva', async () => {
    const seen: ForwardRequest[] = []
    let status = 200
    const selector = new SessionAffinitySelector({ fallback: new RoundRobinSelector(), cleanup: false })
    const handler = affinityHandler(() => status, seen, selector)
    await handler(post({ model: 'mx' }, session('s1')))
    const bound = lastCredential(seen)
    status = 400
    await handler(post({ model: 'mx' }, session('s1')))
    expect(selector.lookupAffinity('anthropic', 'mx-b', 'header:s1')).toEqual({ authId: bound, status: 'bound' })
    status = 429
    await handler(post({ model: 'mx' }, session('s1')))
    expect(selector.lookupAffinity('anthropic', 'mx-b', 'header:s1')).toEqual({ authId: '', status: 'unbound' })
  })
})

describe('afinidad por historia (LCP) en el reenvío', () => {
  const single = { upstreams: [{ name: 'b', provider: 'anthropic' }], models: [{ id: 'mx', upstream_model: { b: 'mx-b' } }], auto_include_builtin_models: false }
  const OTHER_KEY = 'sk-local-other'
  const lcpHandler = (seen: ForwardRequest[]) =>
    createProxyHandler({
      access: new AccessManager([createConfigApiKeyProvider([KEY, OTHER_KEY])!]),
      routing: single,
      credentials: { b: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }] },
      selector: new SessionAffinitySelector({ fallback: new RoundRobinSelector(), cleanup: false }),
      forward: async request => {
        seen.push(request)
        return Response.json({ ok: true })
      },
    })
  const conversation = (...texts: string[]) => ({ model: 'mx', messages: texts.map((content, i) => ({ role: i % 2 ? 'assistant' : 'user', content })) })
  const as = (key: string) => ({ authorization: `Bearer ${key}` })
  const last = (seen: ForwardRequest[]) => seen[seen.length - 1]!.credential.id

  test('sin sesión explícita, una conversación compactada vuelve a su credencial', async () => {
    const seen: ForwardRequest[] = []
    const handler = lcpHandler(seen)
    await handler(post(conversation('step 1', 'ack 1', 'step 2', 'ack 2', 'step 3'), as(KEY)))
    const bound = last(seen)
    await handler(post(conversation('otra conversación'), as(KEY)))
    expect(last(seen)).not.toBe(bound)
    // El resumen cambia el primer turno: el hash de mensajes ya no la reconoce, la cola sí.
    await handler(post(conversation('<summary>steps 1 and 2</summary>', 'ack 2', 'step 3', 'ack 3'), as(KEY)))
    expect(last(seen)).toBe(bound)
  })

  test('el espacio LCP es por clave de acceso', async () => {
    const seen: ForwardRequest[] = []
    const handler = lcpHandler(seen)
    await handler(post(conversation('prompt compartido'), as(KEY)))
    const first = last(seen)
    await handler(post(conversation('prompt compartido', 'r', 'más'), as(OTHER_KEY)))
    expect(last(seen)).not.toBe(first)
  })
})
