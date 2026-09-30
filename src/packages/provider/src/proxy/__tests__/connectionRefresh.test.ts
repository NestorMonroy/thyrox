/**
 * El refresco de conexiones OAuth del proxy local (ADR-THYROX-006, R5c):
 * qué fila cuenta como vencida o por vencer, que su resultado se persiste
 * por la API del store de conexiones, que en modo `multi` con redis caído
 * falla explícito en vez de degradar a memoria en silencio, que dos
 * refrescadores contra un redis real comparten el lease, y que
 * `startProxyServer` (R5c) los conecta con la vista de consistencia global
 * antes de servir una petición y no deja un refresco colgado al parar.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { SharedStateUnavailableError } from '@thyrox/shared-state/consistency.ts'
import { openSharedStateStore } from '@thyrox/shared-state/factory.ts'
import { createMemorySharedStateStore } from '@thyrox/shared-state/memory.ts'
import type { SharedStateStore } from '@thyrox/shared-state/port.ts'
import { resolveRedisServerFromToolchain } from '@thyrox/shared-state/__tests__/redisServerFromToolchain.ts'

import type { ConnectionRow, ConnectionRefreshStore } from '../connectionRefresh.ts'
import { createConnectionRefresher } from '../connectionRefresh.ts'
import { startProxyServer, type ProxyStartConfig } from '../startServer.ts'

const KEY = 'sk-local'
const REDIS_DOWN_ERROR = 'redis inalcanzable'
/** Dentro del margen de refresco (5 min): vence en 1 minuto. */
const ABOUT_TO_EXPIRE = () => new Date(Date.now() + 60_000).toISOString()
/** Fuera del margen: vence en una hora. */
const STILL_VALID = () => new Date(Date.now() + 3_600_000).toISOString()

function oauthRow(overrides: Partial<ConnectionRow> = {}): ConnectionRow {
  return {
    id: 'conn-1',
    provider: 'claude',
    authType: 'oauth',
    isActive: true,
    refreshToken: 'rt-0',
    accessToken: 'at-old',
    tokenExpiresAt: ABOUT_TO_EXPIRE(),
    ...overrides,
  }
}

function createFakeConnectionsStore(rows: ConnectionRow[]): ConnectionRefreshStore {
  return {
    list: ({ provider }) => rows.filter(row => row.provider === provider),
    getById: id => rows.find(row => row.id === id) ?? null,
    update: (id, data) => {
      const index = rows.findIndex(row => row.id === id)
      if (index < 0) return null
      rows[index] = { ...rows[index], ...data }
      return rows[index]
    },
  }
}

/** Un `SharedStateStore` cuyas cinco operaciones rechazan siempre: simula redis caído sin red real. */
function alwaysFailingStore(): SharedStateStore {
  const fail = async () => {
    throw new Error(REDIS_DOWN_ERROR)
  }
  return { incrementWindow: fail, acquireLease: fail, releaseLease: fail, getWithTtl: fail, setWithTtl: fail, close: async () => {} }
}

function gate() {
  let open!: () => void
  const opened = new Promise<void>(resolve => (open = resolve))
  return { opened, open }
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000, stepMs = 10): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`waitFor: la condición no se cumplió en ${timeoutMs}ms`)
    await new Promise(resolve => setTimeout(resolve, stepMs))
  }
}

describe('createConnectionRefresher: qué fila cuenta como vencida o por vencer', () => {
  test('una conexión OAuth por vencer se refresca y el resultado se persiste vía connections.update', async () => {
    const store = createFakeConnectionsStore([oauthRow()])
    let calls = 0
    const refresher = createConnectionRefresher({
      sharedState: createMemorySharedStateStore(),
      connections: store,
      refresh: async () => {
        calls++
        return { accessToken: 'at-new', refreshToken: 'rt-new', expiresIn: 3600 }
      },
    })
    await refresher.ensureFreshOAuthConnections(['claude'])
    expect(calls).toBe(1)
    const updated = store.getById('conn-1')!
    expect(updated.accessToken).toBe('at-new')
    expect(updated.refreshToken).toBe('rt-new')
    expect(typeof updated.tokenExpiresAt).toBe('string')
  })

  test('una conexión OAuth cuyo token sigue vigente no se refresca', async () => {
    const store = createFakeConnectionsStore([oauthRow({ tokenExpiresAt: STILL_VALID() })])
    let calls = 0
    const refresher = createConnectionRefresher({
      sharedState: createMemorySharedStateStore(),
      connections: store,
      refresh: async () => {
        calls++
        return null
      },
    })
    await refresher.ensureFreshOAuthConnections(['claude'])
    expect(calls).toBe(0)
    expect(store.getById('conn-1')!.accessToken).toBe('at-old')
  })

  test('una conexión de clave de API nunca se refresca, aunque su fila declare una caducidad ya vencida', async () => {
    const store = createFakeConnectionsStore([oauthRow({ authType: 'apikey', tokenExpiresAt: new Date(Date.now() - 1_000).toISOString() })])
    let calls = 0
    const refresher = createConnectionRefresher({
      sharedState: createMemorySharedStateStore(),
      connections: store,
      refresh: async () => {
        calls++
        return null
      },
    })
    await refresher.ensureFreshOAuthConnections(['claude'])
    expect(calls).toBe(0)
  })

  test('una conexión OAuth inactiva no se refresca', async () => {
    const store = createFakeConnectionsStore([oauthRow({ isActive: false, tokenExpiresAt: new Date(Date.now() - 1_000).toISOString() })])
    let calls = 0
    const refresher = createConnectionRefresher({
      sharedState: createMemorySharedStateStore(),
      connections: store,
      refresh: async () => {
        calls++
        return null
      },
    })
    await refresher.ensureFreshOAuthConnections(['claude'])
    expect(calls).toBe(0)
  })

  // Este guardia es de `createTokenRefresher` (`tokenRefresh.ts`), no de `isDueForRefresh`;
  // se cubre aquí porque es la conducta que `ensureFreshOAuthConnections` expone.
  test('una conexión OAuth sin refresh token no se refresca', async () => {
    const store = createFakeConnectionsStore([oauthRow({ refreshToken: null, tokenExpiresAt: new Date(Date.now() - 1_000).toISOString() })])
    let calls = 0
    const refresher = createConnectionRefresher({
      sharedState: createMemorySharedStateStore(),
      connections: store,
      refresh: async () => {
        calls++
        return null
      },
    })
    await refresher.ensureFreshOAuthConnections(['claude'])
    expect(calls).toBe(0)
  })
})

describe('createConnectionRefresher: modo multi con redis caído nunca degrada a memoria en silencio', () => {
  test('el refresco falla explícito con SharedStateUnavailableError y el store no cambia', async () => {
    const store = createFakeConnectionsStore([oauthRow()])
    const opened = openSharedStateStore({
      env: { THYROX_PROXY_MODE: 'multi', THYROX_REDIS_URL: 'redis://placeholder' },
      createRedis: () => alwaysFailingStore(),
      warn: () => {},
    })
    let calls = 0
    const refresher = createConnectionRefresher({
      sharedState: opened.forConsistency('requiresGlobalConsistency'),
      connections: store,
      refresh: async () => {
        calls++
        return { accessToken: 'at-new', refreshToken: 'rt-new', expiresIn: 3600 }
      },
    })
    await expect(refresher.ensureFreshOAuthConnections(['claude'])).rejects.toBeInstanceOf(SharedStateUnavailableError)
    // El lease falla antes de intentar la red: nunca hay un refresco sin coordinación entre proxies.
    expect(calls).toBe(0)
    expect(store.getById('conn-1')!.accessToken).toBe('at-old')
  })
})

describe('createConnectionRefresher: dos refrescadores contra un redis-server real comparten el lease', () => {
  const redisServerBin = resolveRedisServerFromToolchain()
  const runDir = mkdtempSync(join(tmpdir(), 'thyrox-connection-refresh-'))
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
    'sólo uno llama a la red; el otro espera el lease y lee lo que el primero ya persistió',
    async () => {
      const env = { THYROX_PROXY_MODE: 'multi', THYROX_REDIS_URL: redisUrl }
      // Las dos instancias representan dos proxies distintos; comparten la
      // misma fila de base de datos real, aquí el mismo arreglo en memoria.
      const sharedRows = [oauthRow()]
      const store = createFakeConnectionsStore(sharedRows)
      let calls = 0
      const started = gate()
      const finish = gate()
      function makeRefresher() {
        const opened = openSharedStateStore({ env })
        return createConnectionRefresher({
          sharedState: opened.forConsistency('requiresGlobalConsistency'),
          connections: store,
          refresh: async () => {
            calls++
            started.open()
            await finish.opened
            return { accessToken: 'at-shared', refreshToken: 'rt-shared', expiresIn: 3600 }
          },
        })
      }
      const a = makeRefresher()
      const b = makeRefresher()
      const first = a.ensureFreshOAuthConnections(['claude'])
      await started.opened
      const second = b.ensureFreshOAuthConnections(['claude'])
      finish.open()
      await Promise.all([first, second])
      expect(calls).toBe(1)
      expect(store.getById('conn-1')!.accessToken).toBe('at-shared')
    },
    20_000,
  )
})

function jsonUpstream(handle: (request: Request) => Response | Promise<Response>) {
  return Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: handle })
}

function proxyConfig(baseUrl: string, connections: ConnectionRefreshStore, env: Record<string, string | undefined> = {}): ProxyStartConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    accessKeys: [KEY],
    routing: {
      upstreams: [{ name: 'up', provider: 'claude' }],
      models: [{ id: 'local-model', upstream_model: { up: 'real-model' } }],
      auto_include_builtin_models: false,
    },
    endpoints: { up: { baseUrl } },
    credentials: {},
    connections,
    selector: 'round-robin',
    version: '0.1.0',
    env: { ...env },
  }
}

describe('startProxyServer: wiring del refresco de conexiones OAuth (R5c)', () => {
  test('un upstream con credenciales propias declaradas no consulta el store: su proveedor no se refresca', async () => {
    const upstreamStore = jsonUpstream(() => Response.json({ type: 'message' }))
    const upstreamDeclared = jsonUpstream(() => Response.json({ type: 'message' }))
    const store = createFakeConnectionsStore([oauthRow({ id: 'conn-claude', provider: 'claude' }), oauthRow({ id: 'conn-openai', provider: 'openai' })])
    const refreshedProviders: string[] = []
    const refresher = createConnectionRefresher({
      sharedState: createMemorySharedStateStore(),
      connections: store,
      refresh: async provider => {
        refreshedProviders.push(provider)
        return { accessToken: 'at-new', refreshToken: 'rt-new', expiresIn: 3600 }
      },
    })
    const proxy = startProxyServer({
      host: '127.0.0.1',
      port: 0,
      accessKeys: [KEY],
      routing: {
        upstreams: [{ name: 'up-store', provider: 'claude' }, { name: 'up-declared', provider: 'openai' }],
        models: [
          { id: 'store-model', upstream_model: { 'up-store': 'real-model' } },
          { id: 'declared-model', upstream_model: { 'up-declared': 'real-model' } },
        ],
        auto_include_builtin_models: false,
      },
      endpoints: { 'up-store': { baseUrl: `http://127.0.0.1:${upstreamStore.port}` }, 'up-declared': { baseUrl: `http://127.0.0.1:${upstreamDeclared.port}` } },
      credentials: { 'up-declared': [{ id: 'k1', attributes: { api_key: 'sk-declared' } }] },
      connections: store,
      connectionRefresher: refresher,
      selector: 'round-robin',
      version: '0.1.0',
      env: {},
    })
    try {
      const response = await fetch(`${proxy.url}/v1/messages`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'declared-model', messages: [] }),
      })
      expect(response.status).toBe(200)
      // Sólo 'claude' se sirve del store; 'openai' declara sus propias
      // credenciales y `connectionBackedProviders` lo excluye del refresco.
      expect(refreshedProviders).toEqual(['claude'])
    } finally {
      await proxy.stop()
      upstreamStore.stop(true)
      upstreamDeclared.stop(true)
    }
  })

  test('un refrescador inyectado con la vista de consistencia global se consulta antes de servir la primera petición', async () => {
    const upstreamRequests: (string | null)[] = []
    const upstream = jsonUpstream(request => {
      upstreamRequests.push(request.headers.get('x-api-key'))
      return Response.json({ type: 'message' })
    })
    const store = createFakeConnectionsStore([oauthRow()])
    const consistencyCalls: string[] = []
    const sharedState = { ...createMemorySharedStateStore(), close: async () => {} }
    const refresher = createConnectionRefresher({
      sharedState: {
        ...sharedState,
        acquireLease: (...args: Parameters<SharedStateStore['acquireLease']>) => {
          consistencyCalls.push('acquireLease')
          return sharedState.acquireLease(...args)
        },
      },
      connections: store,
      refresh: async () => ({ accessToken: 'at-fresh', refreshToken: 'rt-fresh', expiresIn: 3600 }),
    })
    const proxy = startProxyServer({ ...proxyConfig(`http://127.0.0.1:${upstream.port}`, store), connectionRefresher: refresher })
    try {
      const response = await fetch(`${proxy.url}/v1/messages`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages: [] }),
      })
      expect(response.status).toBe(200)
      expect(consistencyCalls).toContain('acquireLease')
      expect(store.getById('conn-1')!.accessToken).toBe('at-fresh')
    } finally {
      await proxy.stop()
      upstream.stop(true)
    }
  })

  test('sin refrescador inyectado, startProxyServer crea el suyo con sharedState.forConsistency("requiresGlobalConsistency")', async () => {
    const consistencyCalls: string[] = []
    const opened = openSharedStateStore({ env: {} })
    const sharedState = {
      ...opened,
      forConsistency: (consistency: Parameters<typeof opened.forConsistency>[0]) => {
        consistencyCalls.push(consistency)
        return opened.forConsistency(consistency)
      },
    }
    // El token sigue vigente: no dispara ningún refresco de red (que exigiría
    // credenciales de un proveedor OAuth real). Esta prueba sólo mide con qué
    // clase de consistencia `startProxyServer` construye su propio refrescador.
    const store = createFakeConnectionsStore([oauthRow({ tokenExpiresAt: STILL_VALID() })])
    const upstream = jsonUpstream(() => Response.json({ type: 'message' }))
    const proxy = startProxyServer({ ...proxyConfig(`http://127.0.0.1:${upstream.port}`, store), sharedState })
    try {
      await fetch(`${proxy.url}/v1/messages`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages: [] }),
      })
      // Sin `rateLimit` configurado, nadie más pide esta clase: que aparezca
      // sólo se explica porque `startProxyServer` construyó su propio
      // refrescador de conexiones con `forConsistency('requiresGlobalConsistency')`.
      expect(consistencyCalls).toContain('requiresGlobalConsistency')
    } finally {
      await proxy.stop()
      upstream.stop(true)
    }
  })

  test('un fallo de refresco no tumba la petición ni lo persiste; y stop() sigue resolviendo sin propagarlo', async () => {
    const store = createFakeConnectionsStore([oauthRow()])
    const started = gate()
    const finish = gate()
    const refresher = createConnectionRefresher({
      sharedState: createMemorySharedStateStore(),
      connections: store,
      refresh: async () => {
        started.open()
        await finish.opened
        throw new Error('el refresco falló justo cuando el proxy paraba')
      },
    })
    const upstream = jsonUpstream(() => Response.json({ type: 'message' }))
    const proxy = startProxyServer({ ...proxyConfig(`http://127.0.0.1:${upstream.port}`, store), connectionRefresher: refresher })
    try {
      // `server.stop(true)` corta los sockets activos: la petición concurrente
      // puede terminar en ECONNRESET, y eso es aparte de lo que esta prueba
      // mide — que el refresco fallido no cuelgue ni tumbe `stop()`.
      const requestPromise = fetch(`${proxy.url}/v1/messages`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages: [] }),
      }).catch(() => null)
      await started.opened
      const stopPromise = proxy.stop()
      finish.open()
      await expect(stopPromise).resolves.toBeUndefined()
      await requestPromise
      expect(store.getById('conn-1')!.accessToken).toBe('at-old')
    } finally {
      upstream.stop(true)
    }
  })

  test('stop() no deja un refresco colgado: puede llamarse con un refresco en curso sin lanzar', async () => {
    const store = createFakeConnectionsStore([oauthRow()])
    const started = gate()
    const finish = gate()
    const refresher = createConnectionRefresher({
      sharedState: createMemorySharedStateStore(),
      connections: store,
      refresh: async () => {
        started.open()
        await finish.opened
        return { accessToken: 'at-late', refreshToken: 'rt-late', expiresIn: 3600 }
      },
    })
    const upstream = jsonUpstream(() => Response.json({ type: 'message' }))
    const proxy = startProxyServer({ ...proxyConfig(`http://127.0.0.1:${upstream.port}`, store), connectionRefresher: refresher })
    try {
      // `.catch` encadenado ya en la creación: si `server.stop(true)` corta el
      // socket mientras la petición espera el refresco, la promesa se
      // rechaza entre la creación y la siguiente línea, y sin un manejador
      // colgado desde ya cuenta como una promesa no atendida para el runner.
      const requestPromise = fetch(`${proxy.url}/v1/messages`, {
        method: 'POST',
        headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'local-model', messages: [] }),
      }).catch(() => null)
      await started.opened
      const stopPromise = proxy.stop()
      finish.open()
      await expect(stopPromise).resolves.toBeUndefined()
      await requestPromise
    } finally {
      upstream.stop(true)
    }
  })
})
