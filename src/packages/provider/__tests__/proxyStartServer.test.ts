/**
 * `startProxyServer`: el proxy local de punta a punta — un cliente habla
 * con él por loopback, él elige upstream y credencial y reenvía con su
 * propio `createHttpForwarder` a un `Bun.serve` que hace de proveedor.
 * La escucha sólo en loopback es regla propia (las credenciales de los
 * upstreams no salen de la máquina); nada aquí necesita thyrox.
 */
import { afterEach, describe, expect, test } from 'bun:test'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { createSelector, startProxyServer } = (await import(
  process.env.PROXY_START_SERVER_MODULE ?? '../src/proxy/startServer.ts'
)) as typeof import('../src/proxy/startServer.ts')
import { FillFirstSelector, type ProxyCredential, WeightedRoundRobinSelector } from '../src/proxy/credentialSelectors.ts'
import { SessionAffinitySelector } from '../src/proxy/session/affinitySelector.ts'

const stops: (() => void)[] = []
afterEach(() => {
  for (const stop of stops.splice(0)) stop()
})

function provider() {
  const keys: (string | null)[] = []
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      keys.push(request.headers.get('x-api-key'))
      const body = (await request.json()) as { model: string }
      return Response.json({ type: 'message', model: body.model })
    },
  })
  stops.push(() => server.stop(true))
  return { baseUrl: `http://127.0.0.1:${server.port}`, keys }
}

const KEY = 'sk-local'

function config(baseUrl: string, host = '127.0.0.1') {
  return {
    host,
    port: 0,
    accessKeys: [KEY],
    routing: {
      upstreams: [{ name: 'up', provider: 'anthropic' }],
      models: [{ id: 'local-model', upstream_model: { up: 'real-model' } }],
      auto_include_builtin_models: false,
    },
    endpoints: { up: { baseUrl } },
    credentials: { up: [{ id: 'k1', attributes: { api_key: 'sk-upstream' } }] },
    selector: 'round-robin' as const,
    version: '0.1.0',
    env: {},
  }
}

describe('startProxyServer', () => {
  test('una petición con la clave local llega al upstream con su modelo y su credencial', async () => {
    const upstream = provider()
    const proxy = startProxyServer(config(upstream.baseUrl))
    stops.push(() => proxy.stop())
    const response = await fetch(`${proxy.url}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'local-model', messages: [] }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ type: 'message', model: 'real-model' })
    expect(upstream.keys).toEqual(['sk-upstream'])
    expect(response.headers.get('x-request-id')).toBeTruthy()
  })

  test('los rasgos del proveedor deciden si un 403 conserva la sesión', async () => {
    const keysAfterRefusal = async (providerTraits?: Record<string, { authType: 'oauth' }>) => {
      const replies = [200, 403, 200]
      const keys: (string | null)[] = []
      const server = Bun.serve({
        port: 0,
        hostname: '127.0.0.1',
        fetch(request) {
          keys.push(request.headers.get('x-api-key'))
          const status = replies.shift() ?? 200
          return status === 200 ? Response.json({ type: 'message' }) : new Response('Request not allowed', { status })
        },
      })
      stops.push(() => server.stop(true))
      const proxy = startProxyServer({
        ...config(`http://127.0.0.1:${server.port}`),
        credentials: { up: ['k1', 'k2', 'k3'].map(id => ({ id, attributes: { api_key: `sk-${id}` } })) },
        sessionAffinity: {},
        providerTraits,
        // Mide sólo la afinidad: la regla «request not allowed» enfriaría la credencial 5 s.
        cooldown: false,
      })
      stops.push(() => proxy.stop())
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${proxy.url}/v1/messages`, {
          method: 'POST',
          headers: { 'x-api-key': KEY, 'content-type': 'application/json', 'x-session-id': 's1' },
          body: JSON.stringify({ model: 'local-model', messages: [] }),
        })
        await response.text()
      }
      return keys
    }
    const kept = await keysAfterRefusal({ anthropic: { authType: 'oauth' } })
    expect(kept[2]).toBe(kept[0])
    const released = await keysAfterRefusal()
    expect(released[2]).not.toBe(released[0])
  })

  test('con streamRecovery, un SSE real que se corta antes del primer byte se reabre', async () => {
    const enc = new TextEncoder()
    const whole = 'event: message_start\ndata: {}\n\nevent: message_stop\ndata: {}\n\n'
    let calls = 0
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch() {
        calls += 1
        const cut = calls === 1
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            if (cut) {
              controller.enqueue(enc.encode('event: message_start\ndata: {}\n\n'))
              controller.error(new Error('cortado'))
              return
            }
            controller.enqueue(enc.encode(whole))
            controller.close()
          },
        })
        return new Response(body, { headers: { 'content-type': 'text/event-stream' } })
      },
    })
    stops.push(() => server.stop(true))
    const proxy = startProxyServer({ ...config(`http://127.0.0.1:${server.port}`), streamRecovery: { enabled: true } })
    stops.push(() => proxy.stop())
    const response = await fetch(`${proxy.url}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'local-model', stream: true, messages: [] }),
    })
    expect(await response.text()).toBe(whole)
    expect(calls).toBe(2)
  })

  test('rateLimit protege las credenciales de clave de API y deja pasar las OAuth', async () => {
    const peakWith = async (providerTraits?: Record<string, { authType: 'oauth' }>) => {
      let inFlight = 0
      let peak = 0
      const server = Bun.serve({
        port: 0,
        hostname: '127.0.0.1',
        async fetch() {
          inFlight += 1
          peak = Math.max(peak, inFlight)
          await new Promise(r => setTimeout(r, 40))
          inFlight -= 1
          return Response.json({ type: 'message' })
        },
      })
      stops.push(() => server.stop(true))
      const proxy = startProxyServer({
        ...config(`http://127.0.0.1:${server.port}`),
        providerTraits,
        rateLimit: { concurrentRequests: 1 },
      })
      stops.push(() => proxy.stop())
      const send = () => fetch(`${proxy.url}/v1/messages`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages: [] }),
      }).then(r => r.text())
      await Promise.all([send(), send(), send()])
      return peak
    }
    expect(await peakWith()).toBe(1)
    expect(await peakWith({ anthropic: { authType: 'oauth' } })).toBeGreaterThan(1)
  })

  test('sin la clave local no llega nada al upstream', async () => {
    const upstream = provider()
    const proxy = startProxyServer(config(upstream.baseUrl))
    stops.push(() => proxy.stop())
    const response = await fetch(`${proxy.url}/v1/messages`, { method: 'POST', body: '{"model":"local-model"}' })
    expect(response.status).toBe(401)
    expect(upstream.keys).toHaveLength(0)
  })

  test('rehúsa escuchar fuera de loopback', () => {
    expect(() => startProxyServer(config('http://127.0.0.1:1', '0.0.0.0'))).toThrow(/loopback/)
  })

  test('rehúsa arrancar con un upstream de baseUrl insegura, nombrándolo', () => {
    expect(() => startProxyServer({ ...config('http://169.254.169.254'), env: {} })).toThrow(/"up"/)
  })

  test('rehúsa arrancar si un upstream enrutado no declara endpoint', () => {
    expect(() => startProxyServer({ ...config('http://127.0.0.1:1'), endpoints: {} })).toThrow(/"up"/)
  })
})

describe('startProxyServer: enfriamiento por credencial', () => {
  function keyedUpstream(fail: (key: string | null) => Response | null) {
    const keys: (string | null)[] = []
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch(request) {
        const key = request.headers.get('x-api-key')
        keys.push(key)
        return fail(key) ?? Response.json({ type: 'message' })
      },
    })
    stops.push(() => server.stop(true))
    return { baseUrl: `http://127.0.0.1:${server.port}`, keys }
  }
  const twoKeys = (): { up: ProxyCredential[] } => ({ up: [{ id: 'k1', attributes: { api_key: 'sk-1' } }, { id: 'k2', attributes: { api_key: 'sk-2' } }] })
  const send = (url: string) => fetch(`${url}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'local-model', messages: [] }),
  }).then(r => r.status)

  test('por defecto, la credencial que falla queda apartada para la petición siguiente', async () => {
    const upstream = keyedUpstream(key => (key === 'sk-1' ? new Response('Rate limit hit', { status: 429 }) : null))
    const proxy = startProxyServer({ ...config(upstream.baseUrl), selector: 'fill-first', credentials: twoKeys() })
    stops.push(() => proxy.stop())
    expect([await send(proxy.url), await send(proxy.url)]).toEqual([429, 200])
    expect(upstream.keys).toEqual(['sk-1', 'sk-2'])
  })

  test('cooldown: false lo apaga', async () => {
    const upstream = keyedUpstream(key => (key === 'sk-1' ? new Response('Rate limit hit', { status: 429 }) : null))
    const proxy = startProxyServer({ ...config(upstream.baseUrl), selector: 'fill-first', credentials: twoKeys(), cooldown: false })
    stops.push(() => proxy.stop())
    await send(proxy.url)
    await send(proxy.url)
    expect(upstream.keys).toEqual(['sk-1', 'sk-1'])
  })

  test('las señales de baja del operador llegan a la decisión', async () => {
    const upstream = keyedUpstream(() => new Response('cuenta vetada por el operador', { status: 401 }))
    const credentials = twoKeys()
    const proxy = startProxyServer({ ...config(upstream.baseUrl), selector: 'fill-first', credentials, cooldown: { bannedSignals: ['cuenta vetada'] } })
    stops.push(() => proxy.stop())
    await send(proxy.url)
    expect(credentials.up[0]!.nextRetryAfter!.getTime() - Date.now()).toBeGreaterThan(300 * 24 * 60 * 60 * 1000)
  })
})

describe('startProxyServer: compresión previa del contexto', () => {
  function countingUpstream() {
    const counts: number[] = []
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      async fetch(request) {
        counts.push(((await request.json()) as { messages: unknown[] }).messages.length)
        return Response.json({ type: 'message' })
      },
    })
    stops.push(() => server.stop(true))
    return { baseUrl: `http://127.0.0.1:${server.port}`, counts }
  }
  const longConversation = Array.from({ length: 120 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `${i} ${'z'.repeat(400)}` }))
  const send = (url: string) => fetch(`${url}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'local-model', messages: longConversation }),
  }).then(r => r.text())

  test('con la ventana declarada del modelo de upstream, una conversación larga llega recortada', async () => {
    const upstream = countingUpstream()
    const proxy = startProxyServer({ ...config(upstream.baseUrl), contextCompaction: { windows: { 'real-model': 4000 } } })
    stops.push(() => proxy.stop())
    await send(proxy.url)
    expect(upstream.counts[0]).toBeLessThan(120)
  })

  test('sin declarar, la conversación llega entera aunque el entorno fije una ventana pequeña', async () => {
    const saved = process.env.THYROX_CONTEXT_LENGTH_DEFAULT
    process.env.THYROX_CONTEXT_LENGTH_DEFAULT = '4000'
    try {
      const upstream = countingUpstream()
      const proxy = startProxyServer(config(upstream.baseUrl))
      stops.push(() => proxy.stop())
      await send(proxy.url)
      expect(upstream.counts[0]).toBe(120)
    } finally {
      if (saved === undefined) delete process.env.THYROX_CONTEXT_LENGTH_DEFAULT
      else process.env.THYROX_CONTEXT_LENGTH_DEFAULT = saved
    }
  })
})

describe('startProxyServer: combos', () => {
  function namedUpstream(name: string, hits: string[]) {
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => { hits.push(name); return Response.json({ type: 'message' }) } })
    stops.push(() => server.stop(true))
    return `http://127.0.0.1:${server.port}`
  }
  const twoUpstreams = (hits: string[], strategy?: string) => ({
    ...config('http://127.0.0.1:1'),
    routing: {
      upstreams: [{ name: 'a', provider: 'anthropic' }, { name: 'b', provider: 'anthropic' }],
      models: [{ id: 'local-model', upstream_model: { a: 'm-a', b: 'm-b' }, ...(strategy && { strategy }) }],
      auto_include_builtin_models: false,
    },
    endpoints: { a: { baseUrl: namedUpstream('a', hits) }, b: { baseUrl: namedUpstream('b', hits) } },
    credentials: { a: [{ id: 'ka', attributes: { api_key: 'sk-a' } }], b: [{ id: 'kb', attributes: { api_key: 'sk-b' } }] },
  })
  const send = (url: string) => fetch(`${url}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'local-model', messages: [] }),
  }).then(r => r.text())

  test('la estrategia declarada en la entrada del modelo rige el orden de los upstreams', async () => {
    const hits: string[] = []
    const proxy = startProxyServer(twoUpstreams(hits, 'round-robin'))
    stops.push(() => proxy.stop())
    for (let i = 0; i < 3; i++) await send(proxy.url)
    expect(hits).toEqual(['a', 'b', 'a'])
  })

  test('el lote pegajoso del round-robin se declara en combos', async () => {
    const hits: string[] = []
    const proxy = startProxyServer({ ...twoUpstreams(hits, 'round-robin'), combos: { stickyRoundRobinLimit: 2 } })
    stops.push(() => proxy.stop())
    for (let i = 0; i < 4; i++) await send(proxy.url)
    expect(hits).toEqual(['a', 'a', 'b', 'b'])
  })
})

describe('startProxyServer sin claves locales', () => {
  test('rehúsa arrancar abierto: las credenciales del upstream quedarían al alcance de cualquier proceso', () => {
    expect(() => startProxyServer({ ...config('http://127.0.0.1:1'), accessKeys: [] })).toThrow(/clave/)
  })
})

describe('createSelector', () => {
  test('sin afinidad declarada, la estrategia tal cual', () => {
    expect(createSelector('fill-first')).toBeInstanceOf(FillFirstSelector)
    expect(createSelector('weighted-round-robin')).toBeInstanceOf(WeightedRoundRobinSelector)
  })

  test('con afinidad, la estrategia queda como respaldo del selector de sesión', () => {
    const selector = createSelector('fill-first', { ttlMs: 60_000, subagents: false })
    expect(selector).toBeInstanceOf(SessionAffinitySelector)
    const pool = [{ id: 'a' }, { id: 'b' }]
    expect(selector.pick('p', 'm', pool, new Date(), {})!.id).toBe('a')
    ;(selector as SessionAffinitySelector).stop()
  })
})

describe('upstreams de nube', () => {
  test('un upstream declarado de nube va por su SDK sin endpoint ni credencial propios', async () => {
    const seen: string[] = []
    const cloudFetch = (async (input: string | URL | Request) => {
      seen.push(String(input))
      return Response.json({ id: 'msg', type: 'message', role: 'assistant', model: 'real-model', content: [], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } })
    }) as typeof globalThis.fetch
    const proxy = startProxyServer({
      ...config('http://unused.invalid'),
      routing: {
        upstreams: [{ name: 'v', provider: 'vertex' }],
        models: [{ id: 'local-model', upstream_model: { v: 'real-model' } }],
        auto_include_builtin_models: false,
      },
      endpoints: {},
      credentials: {},
      cloud: {
        upstreams: [{ name: 'v', provider: 'vertex', region: 'us-east5', project_id: 'p', auth: { access_token: 't' } }],
        fetch: cloudFetch,
      },
    })
    stops.push(() => proxy.stop())
    const response = await fetch(`${proxy.url}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'local-model', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    })
    expect(response.status).toBe(200)
    expect(((await response.json()) as { id: string }).id).toBe('msg')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toContain('us-east5-aiplatform.googleapis.com')
    expect(seen[0]).toContain('/publishers/anthropic/models/real-model:rawPredict')
  })

  test('el error del SDK lleva el identificador de la petición', async () => {
    const cloudFetch = (async () => Response.json({ type: 'error', error: { type: 'authentication_error', message: 'bad' } }, { status: 401 })) as unknown as typeof globalThis.fetch
    const proxy = startProxyServer({
      ...config('http://unused.invalid'),
      routing: { upstreams: [{ name: 'v', provider: 'vertex' }], models: [{ id: 'local-model', upstream_model: { v: 'real-model' } }], auto_include_builtin_models: false },
      endpoints: {},
      credentials: {},
      cloud: { upstreams: [{ name: 'v', provider: 'vertex', region: 'us-east5', project_id: 'p', auth: { access_token: 't' } }], fetch: cloudFetch },
    })
    stops.push(() => proxy.stop())
    const response = await fetch(`${proxy.url}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'local-model', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    })
    expect(response.status).toBe(401)
    expect(((await response.json()) as { request_id?: string }).request_id).toBe(response.headers.get('x-request-id')!)
  })

  test('un upstream que no es de nube y no declara endpoint sigue rehusándose', () => {
    expect(() => startProxyServer({ ...config('http://unused.invalid'), endpoints: {}, cloud: { upstreams: [] } }))
      .toThrow('el upstream "up" no declara endpoint')
  })
})

describe('startProxyServer: credenciales del store de conexiones', () => {
  const send = (url: string) => fetch(`${url}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'local-model', messages: [] }),
  })
  const connection = (overrides: Record<string, unknown> = {}) => ({ id: 's1', provider: 'anthropic', authType: 'apikey', priority: 1, isActive: true, apiKey: 'sk-store', ...overrides })
  const storeOf = (rows: Record<string, unknown>[]) => {
    const asked: unknown[] = []
    return { asked, list: (filter?: { provider?: string }) => (asked.push(filter), rows.filter(row => !filter?.provider || row.provider === filter.provider)) }
  }
  const withoutDeclared = (baseUrl: string) => ({ ...config(baseUrl), credentials: {} })

  test('un upstream sin credenciales declaradas usa las de su proveedor en el store', async () => {
    const upstream = provider()
    const store = storeOf([connection(), connection({ id: 'x', provider: 'openai', apiKey: 'sk-other' })])
    const proxy = startProxyServer({ ...withoutDeclared(upstream.baseUrl), connections: store })
    stops.push(() => proxy.stop())
    expect((await send(proxy.url)).status).toBe(200)
    expect(upstream.keys).toEqual(['sk-store'])
    expect(store.asked).toContainEqual({ provider: 'anthropic' })
  })

  test('el store se relee en cada petición: una conexión nueva sirve sin reiniciar', async () => {
    const upstream = provider()
    const rows = [connection({ isActive: false })]
    const proxy = startProxyServer({ ...withoutDeclared(upstream.baseUrl), connections: storeOf(rows) })
    stops.push(() => proxy.stop())
    expect((await send(proxy.url)).status).not.toBe(200)
    rows.push(connection({ id: 's2', apiKey: 'sk-new' }))
    expect((await send(proxy.url)).status).toBe(200)
    expect(upstream.keys).toEqual(['sk-new'])
  })

  test('las credenciales declaradas ganan sobre el store', async () => {
    const upstream = provider()
    const proxy = startProxyServer({ ...config(upstream.baseUrl), connections: storeOf([connection()]) })
    stops.push(() => proxy.stop())
    await send(proxy.url)
    expect(upstream.keys).toEqual(['sk-upstream'])
  })

  test('rateLimit protege también las credenciales de clave de API del store', async () => {
    let inFlight = 0
    let peak = 0
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      async fetch() {
        inFlight += 1
        peak = Math.max(peak, inFlight)
        await new Promise(r => setTimeout(r, 40))
        inFlight -= 1
        return Response.json({ type: 'message' })
      },
    })
    stops.push(() => server.stop(true))
    const proxy = startProxyServer({ ...withoutDeclared(`http://127.0.0.1:${server.port}`), connections: storeOf([connection()]), rateLimit: { concurrentRequests: 1 } })
    stops.push(() => proxy.stop())
    await Promise.all([send(proxy.url), send(proxy.url), send(proxy.url)].map(p => p.then(r => r.text())))
    expect(peak).toBe(1)
  })
})
