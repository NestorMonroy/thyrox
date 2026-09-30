/**
 * `startProxyServer`: el ciclo de vida del estado compartido en caliente
 * entre proxies (ADR-THYROX-006, R5b). Cubre la matriz de modo y
 * consistencia que la fase deja pendiente de verificación al nivel del
 * proxy —`@thyrox/shared-state` ya prueba `openSharedStateStore` y
 * `RateLimitManager` ya prueba su ventana compartida; aquí se prueba que
 * `startProxyServer` los conecta como declara la spec de R5— y la frontera
 * con el MITM de AgentBridge: una petición que reproduce su contrato de
 * enrutamiento (`proxyBaseUrl`/`proxyClientKey`, `@thyrox/mitm:
 * server/serverConfig.ts`) pasa por el mismo `RateLimitManager` y el mismo
 * `CredentialCooldown` que una enviada directamente al proxy.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type ConsistencyClass, SharedStateUnavailableError } from '@thyrox/shared-state/consistency.ts'
import { openSharedStateStore, type OpenedSharedState } from '@thyrox/shared-state/factory.ts'
import type { SharedStateStore } from '@thyrox/shared-state/port.ts'
import { resolveRedisServerFromToolchain } from '@thyrox/shared-state/__tests__/redisServerFromToolchain.ts'
import type { ProxyCredential } from '../credentialSelectors.ts'
import { ALLOW_LOOPBACK_ENV } from '../netGuards.ts'
import { proxyBaseUrl, proxyClientKey } from '../proxyEndpoint.ts'
import { startProxyServer, type ProxyStartConfig } from '../startServer.ts'

const KEY = 'sk-local'
const REDIS_DOWN_ERROR = 'redis inalcanzable'

function baseConfig(baseUrl: string, env: Record<string, string | undefined> = {}): ProxyStartConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    accessKeys: [KEY],
    routing: {
      upstreams: [{ name: 'up', provider: 'anthropic' }],
      models: [{ id: 'local-model', upstream_model: { up: 'real-model' } }],
      auto_include_builtin_models: false,
    },
    endpoints: { up: { baseUrl } },
    credentials: { up: [{ id: 'k1', attributes: { api_key: 'sk-upstream' } }] },
    selector: 'round-robin',
    version: '0.1.0',
    env: { [ALLOW_LOOPBACK_ENV]: '1', ...env },
  }
}

/** Un `SharedStateStore` cuyas cinco operaciones rechazan siempre: simula redis caído sin red real. */
function alwaysFailingStore(): SharedStateStore {
  const fail = async () => {
    throw new Error(REDIS_DOWN_ERROR)
  }
  return { incrementWindow: fail, acquireLease: fail, releaseLease: fail, getWithTtl: fail, setWithTtl: fail, close: async () => {} }
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000, stepMs = 10): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`waitFor: la condición no se cumplió en ${timeoutMs}ms`)
    await new Promise(resolve => setTimeout(resolve, stepMs))
  }
}

function jsonUpstream(handle: (request: Request) => Response | Promise<Response>) {
  return Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: handle })
}

/**
 * Reproduce exactamente la petición que `@thyrox/mitm` envía al proxy local:
 * la URL con `proxyBaseUrl(env)` y la clave con `proxyClientKey(env)` — las
 * mismas dos funciones que `server/serverConfig.ts` y
 * `handlers/base.ts#fetchRouter` usan para construir `routerBaseUrl`/
 * `apiKey` —, más las cabeceras de correlación del puente
 * (`x-thyrox-source`, `x-thyrox-agent`). No pasa por `@thyrox/mitm`: la
 * spec de R5 («Fronteras que se conservan») deja el transporte TLS y el
 * enrutamiento fuera de este límite — el contrato con el proxy es
 * exactamente esta dirección y estas cabeceras.
 */
function sendViaMitmRoute(env: Record<string, string | undefined>, body: unknown): Promise<Response> {
  const url = `${proxyBaseUrl(env).replace(/\/+$/, '')}/v1/messages`
  const apiKey = proxyClientKey(env)
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      'x-thyrox-source': 'agent-bridge',
      'x-thyrox-agent': 'claude-code',
    },
    body: JSON.stringify(body),
  })
}

function envFor(proxyUrl: string): Record<string, string> {
  const { hostname, port } = new URL(proxyUrl)
  return { THYROX_PROXY_HOST: hostname, THYROX_PROXY_PORT: port, THYROX_PROXY_API_KEYS: KEY }
}

describe('startProxyServer: apertura del estado compartido (R5b)', () => {
  test('single sin THYROX_REDIS_URL: abre su propio estado en memoria (sin inyectar nada) y sirve una petición', async () => {
    const keys: (string | null)[] = []
    const upstream = jsonUpstream(request => {
      keys.push(request.headers.get('x-api-key'))
      return Response.json({ type: 'message' })
    })
    const proxy = startProxyServer(baseConfig(`http://127.0.0.1:${upstream.port}`))
    try {
      const response = await fetch(`${proxy.url}/v1/messages`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages: [] }),
      })
      expect(response.status).toBe(200)
      expect(keys).toEqual(['sk-upstream'])
    } finally {
      await proxy.stop()
      upstream.stop(true)
    }
  })

  test('single con redis caído (inyectado): degrada a memoria con un aviso y la petición se sigue atendiendo', async () => {
    const warnings: string[] = []
    const sharedState = openSharedStateStore({
      env: { THYROX_REDIS_URL: 'redis://placeholder' },
      createRedis: () => alwaysFailingStore(),
      warn: message => warnings.push(message),
    })
    // 401 con cooldownMs=0 no publica nada (accountCooldown.ts): se fuerza un
    // 429, que sí produce un enfriamiento positivo y dispara publishCooldown.
    const upstream = jsonUpstream(() => new Response('Rate limit hit', { status: 429 }))
    const proxy = startProxyServer({ ...baseConfig(`http://127.0.0.1:${upstream.port}`), sharedState })
    try {
      const response = await fetch(`${proxy.url}/v1/messages`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages: [] }),
      })
      await response.text()
      // `publishCooldown` no se espera (fire-and-forget): el aviso llega en un tick aparte.
      await waitFor(() => warnings.length > 0)
      expect(warnings[0]).toContain('redis falló')
    } finally {
      await proxy.stop()
      upstream.stop(true)
    }
  })

  test('multi sin THYROX_REDIS_URL: rehúsa antes de abrir Bun.serve, sin dejar puerto abierto', () => {
    const originalServe = Bun.serve
    let served = false
    Bun.serve = ((...args: Parameters<typeof Bun.serve>) => {
      served = true
      return originalServe(...(args as [never]))
    }) as typeof Bun.serve
    try {
      expect(() => startProxyServer(baseConfig('http://127.0.0.1:1', { THYROX_PROXY_MODE: 'multi' }))).toThrow(
        SharedStateUnavailableError,
      )
      expect(served).toBe(false)
    } finally {
      Bun.serve = originalServe
    }
  })

  test('multi con redis caído (inyectado): RateLimitManager recibe la vista global, que lanza SharedStateUnavailableError y nunca degrada a memoria', async () => {
    const consistencyCalls: ConsistencyClass[] = []
    const opened = openSharedStateStore({
      env: { THYROX_PROXY_MODE: 'multi', THYROX_REDIS_URL: 'redis://placeholder' },
      createRedis: () => alwaysFailingStore(),
      warn: () => {},
    })
    let globalWindowStore: SharedStateStore | undefined
    const sharedState: OpenedSharedState = {
      ...opened,
      forConsistency: consistency => {
        consistencyCalls.push(consistency)
        const store = opened.forConsistency(consistency)
        if (consistency === 'requiresGlobalConsistency') globalWindowStore = store
        return store
      },
    }
    const upstream = jsonUpstream(() => Response.json({ type: 'message' }))
    const proxy = startProxyServer({
      ...baseConfig(`http://127.0.0.1:${upstream.port}`, { THYROX_PROXY_MODE: 'multi', THYROX_REDIS_URL: 'redis://placeholder' }),
      rateLimit: { concurrentRequests: 5 },
      sharedState,
    })
    try {
      expect(consistencyCalls).toContain('requiresGlobalConsistency')
      await expect(globalWindowStore!.incrementWindow('k', 1000)).rejects.toBeInstanceOf(SharedStateUnavailableError)
    } finally {
      await proxy.stop()
      upstream.stop(true)
    }
  })

  test('stop() cierra el estado compartido inyectado una sola vez, y una segunda llamada no falla ni vuelve a cerrar', async () => {
    const calls: string[] = []
    const redisDouble: SharedStateStore = {
      incrementWindow: async () => 1,
      acquireLease: async () => true,
      releaseLease: async () => true,
      getWithTtl: async () => null,
      setWithTtl: async () => {},
      close: async () => {
        calls.push('redis:close')
      },
    }
    const sharedState = openSharedStateStore({ env: { THYROX_REDIS_URL: 'redis://placeholder' }, createRedis: () => redisDouble })
    const upstream = jsonUpstream(() => Response.json({ type: 'message' }))
    const proxy = startProxyServer({ ...baseConfig(`http://127.0.0.1:${upstream.port}`), sharedState })
    try {
      await proxy.stop()
      await proxy.stop()
      expect(calls).toEqual(['redis:close'])
    } finally {
      upstream.stop(true)
    }
  })
})

describe('startProxyServer: dos proxies contra un redis-server real comparten la ventana global (R5b)', () => {
  const redisServerBin = resolveRedisServerFromToolchain()
  const runDir = mkdtempSync(join(tmpdir(), 'thyrox-proxy-shared-state-'))
  const socketPath = join(runDir, 'redis.sock')
  const redisUrl = `redis+unix://${socketPath}`
  const server = Bun.spawn(
    [redisServerBin, '--port', '0', '--unixsocket', socketPath, '--unixsocketperm', '700', '--save', '', '--appendonly', 'no'],
    { stdout: 'ignore', stderr: 'ignore' },
  )

  function isSocket(path: string): boolean {
    return existsSync(path) && statSync(path).isSocket()
  }

  beforeAll(async () => {
    await waitFor(() => isSocket(socketPath), 5_000)
  })

  afterAll(async () => {
    if (isSocket(socketPath)) {
      server.kill()
      await server.exited
    }
    rmSync(runDir, { recursive: true, force: true })
  })

  test(
    'dos startProxyServer con estado inyectado sobre el mismo redis ven la misma ventana',
    async () => {
      const env = { THYROX_PROXY_MODE: 'multi', THYROX_REDIS_URL: redisUrl }
      const openedA = openSharedStateStore({ env })
      const openedB = openSharedStateStore({ env })
      const upstreamA = jsonUpstream(() => Response.json({ type: 'message' }))
      const upstreamB = jsonUpstream(() => Response.json({ type: 'message' }))
      const proxyA = startProxyServer({
        ...baseConfig(`http://127.0.0.1:${upstreamA.port}`, env),
        rateLimit: { concurrentRequests: 5 },
        sharedState: openedA,
      })
      const proxyB = startProxyServer({
        ...baseConfig(`http://127.0.0.1:${upstreamB.port}`, env),
        rateLimit: { concurrentRequests: 5 },
        sharedState: openedB,
      })
      try {
        // Cada proxy vive en su propio proceso en producción; aquí, en el mismo,
        // así que la vista global se comprueba por la misma referencia que
        // `startProxyServer` le pasó a su `RateLimitManager` (`forConsistency`
        // memoiza un único store por instancia — factory.ts).
        const windowKey = `proxy-shared-window:${crypto.randomUUID()}`
        expect(await openedA.forConsistency('requiresGlobalConsistency').incrementWindow(windowKey, 60_000)).toBe(1)
        expect(await openedB.forConsistency('requiresGlobalConsistency').incrementWindow(windowKey, 60_000)).toBe(2)
        // Y los dos proxies siguen sirviendo con normalidad sobre el mismo redis.
        const responseA = await fetch(`${proxyA.url}/v1/messages`, {
          method: 'POST',
          headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
          body: JSON.stringify({ model: 'local-model', messages: [] }),
        })
        expect(responseA.status).toBe(200)
      } finally {
        await proxyA.stop()
        await proxyB.stop()
        upstreamA.stop(true)
        upstreamB.stop(true)
      }
    },
    20_000,
  )

})

describe('startProxyServer: frontera del MITM — la misma conducta que una petición directa (R5b)', () => {
  test('RateLimitManager: una petición por la ruta MITM y otra directa comparten el mismo límite de concurrencia', async () => {
    let inFlight = 0
    let peak = 0
    const upstream = jsonUpstream(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise(resolve => setTimeout(resolve, 60))
      inFlight -= 1
      return Response.json({ type: 'message' })
    })
    const proxy = startProxyServer({ ...baseConfig(`http://127.0.0.1:${upstream.port}`), rateLimit: { concurrentRequests: 1 } })
    try {
      const body = { model: 'local-model', messages: [] }
      const direct = () =>
        fetch(`${proxy.url}/v1/messages`, {
          method: 'POST',
          headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).then(r => r.text())
      const viaMitm = () => sendViaMitmRoute(envFor(proxy.url), body).then(r => r.text())
      await Promise.all([direct(), viaMitm()])
      // Con `concurrentRequests: 1` dos managers distintos habrían dejado
      // correr las dos peticiones a la vez (peak 2): que el pico sea 1 sólo se
      // explica si las dos rutas comparten el mismo `RateLimitManager`.
      expect(peak).toBe(1)
    } finally {
      await proxy.stop()
      upstream.stop(true)
    }
  })

  test('CredentialCooldown: la credencial apartada por la ruta directa sigue apartada para la petición siguiente por la ruta MITM', async () => {
    const keys: (string | null)[] = []
    const upstream = jsonUpstream(request => {
      const key = request.headers.get('x-api-key')
      keys.push(key)
      return key === 'sk-1' ? new Response('Rate limit hit', { status: 429 }) : Response.json({ type: 'message' })
    })
    const credentials: Record<string, ProxyCredential[]> = {
      up: [
        { id: 'k1', attributes: { api_key: 'sk-1' } },
        { id: 'k2', attributes: { api_key: 'sk-2' } },
      ],
    }
    const proxy = startProxyServer({ ...baseConfig(`http://127.0.0.1:${upstream.port}`), selector: 'fill-first', credentials })
    try {
      const body = { model: 'local-model', messages: [] }
      const direct = await fetch(`${proxy.url}/v1/messages`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      expect(direct.status).toBe(429)
      // La ruta MITM, con la misma credencial sk-1 ya apartada, tiene que
      // recibir de entrada sk-2: eso sólo pasa si comparte el CredentialCooldown.
      const viaMitm = await sendViaMitmRoute(envFor(proxy.url), body)
      expect(viaMitm.status).toBe(200)
      expect(keys).toEqual(['sk-1', 'sk-2'])
    } finally {
      await proxy.stop()
      upstream.stop(true)
    }
  })
})
