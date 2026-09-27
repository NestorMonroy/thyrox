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
import { FillFirstSelector, WeightedRoundRobinSelector } from '../src/proxy/credentialSelectors.ts'
import { SessionAffinitySelector } from '../src/proxy/session/affinitySelector.ts'
import { ALLOW_LOOPBACK_ENV } from '../src/proxy/netGuards.ts'

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
    env: { [ALLOW_LOOPBACK_ENV]: '1' },
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
