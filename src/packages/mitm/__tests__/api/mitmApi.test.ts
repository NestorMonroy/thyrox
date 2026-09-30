/**
 * La API local del MITM compuesta: todas las rutas montadas sin repetir
 * ninguna, el canal en vivo sobre el búfer, y el token de ingesta que la ruta
 * valida es el mismo que el gestor le pasa al servidor MITM, junto con la
 * URL de la API.
 */
import { afterEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { assertUniqueRoutes, mitmApiRoutes, startMitmApi, type RunningMitmApi } from '../../src/api/mitmApi.ts'
import { INGEST_PATH } from '../../src/server/ingest.ts'
import type { ApiRoute } from '../../src/api/router.ts'
import { __resetMitmManagerForTest, buildServerEnv, getInspectorIngest, setInspectorIngest } from '../../src/manager.ts'
import { TrafficBuffer } from '../../src/inspector/buffer.ts'
import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'

let api: RunningMitmApi | undefined
let db: Database | undefined
afterEach(() => {
  api?.stop()
  api = undefined
  db?.close()
  db = undefined
  __resetMitmManagerForTest()
})

function memoryDb(): Database {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  return db
}

test('every route group mounts without repeating a method and path', () => {
  const routes = mitmApiRoutes(memoryDb(), { traffic: new TrafficBuffer(10), ingestToken: 'x'.repeat(32) })
  expect(() => assertUniqueRoutes(routes)).not.toThrow()
  const paths = new Set(routes.map(r => r.path))
  for (const expected of [
    '/api/tools/agent-bridge/state',
    '/api/tools/agent-bridge/server',
    '/api/tools/traffic-inspector/requests',
    '/api/tools/traffic-inspector/internal/ingest',
    '/api/settings/mitm',
    '/api/cli-tools/antigravity-mitm/alias',
  ]) {
    expect(paths.has(expected)).toBe(true)
  }
})

test('a repeated method and path is refused, naming it', () => {
  const route: ApiRoute = { method: 'GET', path: '/api/x', handler: () => new Response() }
  expect(() => assertUniqueRoutes([route, { ...route }])).toThrow('GET /api/x')
  expect(() => assertUniqueRoutes([route, { ...route, method: 'POST' }])).not.toThrow()
})

test('the running API accepts ingest with the token it hands the MITM server, and streams it', async () => {
  const traffic = new TrafficBuffer(10)
  api = startMitmApi({ port: 0, db: memoryDb(), traffic })
  const target = getInspectorIngest()
  expect(target).toEqual({ baseUrl: api.url, token: api.ingestToken })
  const entry = {
    id: crypto.randomUUID(),
    source: 'agent-bridge',
    timestamp: new Date().toISOString(),
    method: 'POST',
    host: 'api.cursor.sh',
    path: '/v1/chat/completions',
    requestHeaders: {},
    requestSize: 0,
    responseHeaders: {},
    responseSize: 0,
    status: 200,
  }
  const res = await fetch(`${target!.baseUrl}${INGEST_PATH}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${target!.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(entry),
  })
  expect(res.status).toBe(200)
  expect(traffic.get(entry.id)?.host).toBe('api.cursor.sh')
})

test('stopping the API withdraws the ingest target', () => {
  api = startMitmApi({ port: 0, db: memoryDb(), traffic: new TrafficBuffer(10) })
  api.stop()
  api = undefined
  expect(getInspectorIngest()).toBeNull()
})

test('resetting the manager forgets the ingest target', () => {
  setInspectorIngest({ baseUrl: 'http://127.0.0.1:1', token: 't'.repeat(16) })
  __resetMitmManagerForTest()
  expect(getInspectorIngest()).toBeNull()
})

test('the MITM server environment carries the API URL and token only when the API runs', () => {
  const base = { PATH: '/bin', THYROX_MITM_API_URL: 'http://stale', THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN: 'stale' }
  const without = buildServerEnv(base, { port: 443, mode: 'legacy', apiKey: '', ingest: null })
  expect(without.THYROX_MITM_API_URL).toBeUndefined()
  expect(without.THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN).toBeUndefined()
  expect(without).toMatchObject({ PATH: '/bin', THYROX_MITM_LOCAL_PORT: '443', THYROX_MITM_CERT_MODE: 'legacy' })
  expect(without.THYROX_PROXY_API_KEYS).toBeUndefined()
  const withApi = buildServerEnv(base, {
    port: 443,
    mode: 'root-ca',
    apiKey: 'sk-local',
    ingest: { baseUrl: 'http://127.0.0.1:4455', token: 'tok' },
  })
  expect(withApi).toMatchObject({
    THYROX_MITM_API_URL: 'http://127.0.0.1:4455',
    THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN: 'tok',
    THYROX_PROXY_API_KEYS: 'sk-local',
  })
})
