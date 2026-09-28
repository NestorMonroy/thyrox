/**
 * Las rutas de estado del AgentBridge: agentes y su detección, modelos vistos
 * en el tráfico, asignaciones de modelo, exclusiones, configuración portable y
 * el estado completo que lee el tablero.
 *
 * Porte de `omniroute: tests/unit/agent-bridge-detected-models-8656.test.ts`,
 * `agent-bridge-state-full-payload-8656.test.ts` y la parte de ruta de
 * `agent-bridge-mappings-sync-8656.test.ts` (MIT), sobre una base en memoria y
 * con las sondas del sistema inyectadas.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { createApiHandler } from '../../src/api/router.ts'
import {
  AGENT_BRIDGE_BASE,
  createAgentBridgeStateRoutes,
  type AgentBridgeStateDeps,
} from '../../src/api/routes/agentBridgeState.ts'
import { TrafficBuffer } from '../../src/inspector/buffer.ts'
import type { InterceptedRequest } from '../../src/inspector/types.ts'
import { getMitmAlias } from '../../src/state/mitmAlias.ts'
import { upsertAgentBridgeState } from '../../src/state/agentBridgeState.ts'
import { setMappings } from '../../src/state/agentBridgeMappings.ts'
import { replaceUserBypassPatterns, seedDefaultBypassPatterns } from '../../src/state/agentBridgeBypass.ts'
import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'
import type { AgentId } from '../../src/types.ts'

let db: Database
let traffic: TrafficBuffer
let deps: AgentBridgeStateDeps
let handle: (request: Request) => Promise<Response>

beforeEach(() => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  traffic = new TrafficBuffer(100)
  deps = {
    db,
    traffic,
    detectAgent: (id: AgentId) => ({ installed: id === 'cursor', version: id === 'cursor' ? '1.2.3' : undefined }),
    mitmStatus: async () => ({
      running: false,
      pid: null,
      dnsConfigured: false,
      certExists: false,
      orphanedStateDetected: false,
    }),
    certStatus: async () => ({ certExists: false, certTrusted: false }),
    dnsConfiguredFor: () => false,
    hasCachedPassword: () => false,
    sudoPasswordRequired: () => true,
    platform: 'linux',
  }
  handle = createApiHandler(createAgentBridgeStateRoutes(deps), { peerAddress: () => '127.0.0.1' })
})
afterEach(() => db.close())

function call(method: string, path: string, body?: unknown): Promise<Response> {
  const init: RequestInit = { method, headers: { host: '127.0.0.1' } }
  if (body !== undefined) {
    init.headers = { host: '127.0.0.1', 'content-type': 'application/json' }
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }
  return handle(new Request(`http://127.0.0.1${AGENT_BRIDGE_BASE}${path}`, init))
}

async function json(res: Response): Promise<Record<string, any>> {
  return (await res.json()) as Record<string, any>
}

function captured(agent: AgentId, sourceModel: string | null, source: InterceptedRequest['source'] = 'agent-bridge') {
  traffic.push({
    id: crypto.randomUUID(),
    source,
    agent,
    timestamp: new Date().toISOString(),
    method: 'POST',
    host: 'api.example.com',
    path: '/v1/chat/completions',
    requestHeaders: {},
    requestBody: null,
    requestSize: 0,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    status: 200,
    sourceModel,
  })
}

// ── agents ───────────────────────────────────────────────────────────────

test('GET /agents lists every target with its viability and detection', async () => {
  const body = await json(await call('GET', '/agents'))
  const cursor = body.agents.find((a: { id: string }) => a.id === 'cursor')
  expect(cursor).toMatchObject({ name: expect.any(String), viability: 'supported', state: { installed: true } })
  expect(body.agents.find((a: { id: string }) => a.id === 'trae').viability).toBe('investigating')
  expect(body.agents.every((a: { hosts: unknown }) => Array.isArray(a.hosts))).toBe(true)
})

test('GET /agents/:id returns the target view, its detection and its stored state', async () => {
  upsertAgentBridgeState(db, { agent_id: 'cursor', setup_completed: true })
  const res = await call('GET', '/agents/cursor')
  expect(res.status).toBe(200)
  const body = await json(res)
  expect(body.agent.id).toBe('cursor')
  expect(body.agent.handler).toBeUndefined()
  expect(body.detection).toEqual({ installed: true, version: '1.2.3' })
  expect(body.state.setup_completed).toBe(true)
})

test('GET /agents/:id of an agent without state returns state null', async () => {
  expect((await json(await call('GET', '/agents/zed'))).state).toBeNull()
})

test('GET /agents/:id of an unknown agent is a 404 naming it', async () => {
  const res = await call('GET', '/agents/windsurf')
  expect(res.status).toBe(404)
  expect((await json(res)).error.message).toBe('Agent not found: windsurf')
})

test('PATCH /agents/:id stores setup_completed and returns the state', async () => {
  const res = await call('PATCH', '/agents/codex', { setup_completed: true })
  expect(res.status).toBe(200)
  expect(await json(res)).toMatchObject({ ok: true, state: { agent_id: 'codex', setup_completed: true } })
})

test('PATCH /agents/:id rejects a malformed or invalid body with 400', async () => {
  const bad = await call('PATCH', '/agents/codex', '{not json')
  expect(bad.status).toBe(400)
  expect((await json(bad)).error.message).toBe('Invalid JSON body')
  const invalid = await call('PATCH', '/agents/codex', { setup_completed: 'yes' })
  expect(invalid.status).toBe(400)
  const body = await json(invalid)
  expect(body.error.message).toBe('Invalid request body')
  expect(body.error.details.fieldErrors.setup_completed).toBeDefined()
})

test('PATCH /agents/:id of an unknown agent writes nothing', async () => {
  expect((await call('PATCH', '/agents/windsurf', { setup_completed: true })).status).toBe(404)
  expect(db.query('SELECT COUNT(*) AS n FROM agent_bridge_state').get()).toEqual({ n: 0 })
})

// ── detect ───────────────────────────────────────────────────────────────

test('GET /agents/:id/detect returns the agent id with its detection', async () => {
  expect(await json(await call('GET', '/agents/cursor/detect'))).toEqual({
    agentId: 'cursor',
    installed: true,
    version: '1.2.3',
  })
})

test('GET /agents/:id/detect of an unknown agent is a 404', async () => {
  const res = await call('GET', '/agents/invalid-agent/detect')
  expect(res.status).toBe(404)
  expect((await json(res)).error.message).toBe('Unknown agent id: invalid-agent')
})

// ── detected-models ──────────────────────────────────────────────────────

test('GET /agents/:id/detected-models returns the unique source models, sorted, and the count', async () => {
  captured('cursor', 'gpt-4-turbo')
  captured('cursor', 'claude-3-opus')
  captured('cursor', 'gpt-4-turbo')
  captured('cursor', null)
  captured('kiro', 'gemini-pro')
  captured('cursor', 'from-a-proxy', 'http-proxy')
  expect(await json(await call('GET', '/agents/cursor/detected-models'))).toEqual({
    agentId: 'cursor',
    detectedModels: ['claude-3-opus', 'gpt-4-turbo'],
    requestCount: 4,
  })
})

test('GET /agents/:id/detected-models of an agent without traffic is empty', async () => {
  expect(await json(await call('GET', '/agents/antigravity/detected-models'))).toEqual({
    agentId: 'antigravity',
    detectedModels: [],
    requestCount: 0,
  })
})

test('GET /agents/:id/detected-models of an unknown agent is a 404', async () => {
  expect((await call('GET', '/agents/invalid-agent/detected-models')).status).toBe(404)
})

// ── mappings ─────────────────────────────────────────────────────────────

test('PUT /agents/:id/mappings replaces them and mirrors them into the MITM alias', async () => {
  const res = await call('PUT', '/agents/antigravity/mappings', {
    mappings: [{ source: 'gemini-2.5-pro', target: 'openai/gpt-4o' }],
  })
  expect(res.status).toBe(200)
  const body = await json(res)
  expect(body.ok).toBe(true)
  expect(body.mappings.map((m: { source_model: string }) => m.source_model)).toEqual(['gemini-2.5-pro'])
  expect(getMitmAlias(db, 'antigravity')).toEqual({ 'gemini-2.5-pro': 'openai/gpt-4o' })
  const read = await json(await call('GET', '/agents/antigravity/mappings'))
  expect(read.mappings).toHaveLength(1)
})

test('PUT /agents/:id/mappings rejects a body without mappings', async () => {
  const res = await call('PUT', '/agents/antigravity/mappings', { mapping: [] })
  expect(res.status).toBe(400)
  expect((await json(res)).error.details.fieldErrors.mappings).toBeDefined()
})

test('PUT /agents/:id/mappings of an unknown agent writes nothing', async () => {
  const res = await call('PUT', '/agents/windsurf/mappings', { mappings: [{ source: 'a', target: 'b' }] })
  expect(res.status).toBe(404)
  expect(db.query('SELECT COUNT(*) AS n FROM agent_bridge_mappings').get()).toEqual({ n: 0 })
})

// ── bypass ───────────────────────────────────────────────────────────────

test('bypass: GET lists default and user patterns, POST replaces the user ones', async () => {
  seedDefaultBypassPatterns(db, ['*.apple.com'])
  const posted = await json(await call('POST', '/bypass', { patterns: ['*.internal', 'localhost'] }))
  expect(posted.ok).toBe(true)
  const listed = await json(await call('GET', '/bypass'))
  expect(listed.patterns.map((p: { pattern: string }) => p.pattern).sort()).toEqual([
    '*.apple.com',
    '*.internal',
    'localhost',
  ])
})

test('bypass: DELETE removes one user pattern and keeps the defaults', async () => {
  seedDefaultBypassPatterns(db, ['*.apple.com'])
  replaceUserBypassPatterns(db, ['*.internal', 'localhost'])
  const res = await json(await call('DELETE', '/bypass?pattern=localhost'))
  expect(res.patterns.map((p: { pattern: string }) => p.pattern).sort()).toEqual(['*.apple.com', '*.internal'])
})

test('bypass: DELETE without the pattern param is a 400', async () => {
  const res = await call('DELETE', '/bypass')
  expect(res.status).toBe(400)
  expect((await json(res)).error.message).toBe('Missing query param: pattern')
})

test('bypass: POST with non-string patterns is a 400', async () => {
  expect((await call('POST', '/bypass', { patterns: [1] })).status).toBe(400)
})

// ── config ───────────────────────────────────────────────────────────────

test('config: POST imports and GET exports the same portable config', async () => {
  const config = {
    version: 1,
    bypassPatterns: ['*.internal'],
    customHosts: [{ host: 'llm.example.com', kind: 'llm', label: 'mine' }],
    agentMappings: { cursor: [{ source: 'a', target: 'b' }] },
  }
  expect(await json(await call('POST', '/config', config))).toEqual({
    ok: true,
    bypassPatterns: 1,
    customHosts: 1,
    agents: 1,
  })
  expect(await json(await call('GET', '/config'))).toEqual(config)
})

test('config: POST of a wrong version or a malformed body is a 400 with the first issue', async () => {
  const wrong = await call('POST', '/config', { version: 2, bypassPatterns: [], customHosts: [], agentMappings: {} })
  expect(wrong.status).toBe(400)
  expect((await json(wrong)).error.message).toContain('1')
  const malformed = await call('POST', '/config', '{nope')
  expect(malformed.status).toBe(400)
})

// ── state ────────────────────────────────────────────────────────────────

test('GET /state returns agentStates from the store with dns_enabled', async () => {
  upsertAgentBridgeState(db, { agent_id: 'claude-code', dns_enabled: true })
  const body = await json(await call('GET', '/state'))
  expect(body.agentStates.find((s: { agent_id: string }) => s.agent_id === 'claude-code').dns_enabled).toBe(true)
})

test('GET /state returns the mappings keyed by agent for every target', async () => {
  setMappings(db, 'claude-code', [{ source: 'claude-sonnet-4', target: 'openai/gpt-4o' }])
  const body = await json(await call('GET', '/state'))
  expect(body.mappings['claude-code']).toEqual([{ source: 'claude-sonnet-4', target: 'openai/gpt-4o' }])
  expect(body.mappings.zed).toEqual([])
})

test('GET /state returns the bypass patterns as strings', async () => {
  replaceUserBypassPatterns(db, ['*.internal', 'localhost'])
  expect((await json(await call('GET', '/state'))).bypassPatterns).toEqual(
    expect.arrayContaining(['*.internal', 'localhost']),
  )
})

test('GET /state keeps certTrusted apart from certExists', async () => {
  deps.certStatus = async () => ({ certExists: true, certTrusted: false })
  const body = await json(await call('GET', '/state'))
  expect(body.server).toMatchObject({ certExists: true, certTrusted: false })
})

test('GET /state keeps the legacy keys next to the new ones', async () => {
  const body = await json(await call('GET', '/state'))
  expect(Object.keys(body).sort()).toEqual(
    ['agentStates', 'agents', 'bypassPatterns', 'mappings', 'server', 'serverState'].sort(),
  )
  expect(body.serverState).toEqual(body.server)
  expect(body.agents.find((a: { id: string }) => a.id === 'cursor').detection).toEqual({ installed: true, version: '1.2.3' })
})

test('GET /state: dnsConfigured is true only when an agent with DNS enabled has its hosts entry', async () => {
  upsertAgentBridgeState(db, { agent_id: 'cursor', dns_enabled: true })
  upsertAgentBridgeState(db, { agent_id: 'zed', dns_enabled: false })
  deps.dnsConfiguredFor = id => id === 'zed'
  expect((await json(await call('GET', '/state'))).server.dnsConfigured).toBe(false)
  deps.dnsConfiguredFor = id => id === 'cursor'
  expect((await json(await call('GET', '/state'))).server.dnsConfigured).toBe(true)
})

test('GET /state: the sudo password is needed only off Windows, uncached and required', async () => {
  expect((await json(await call('GET', '/state'))).server).toMatchObject({
    isWin: false,
    hasCachedPassword: false,
    needsSudoPassword: true,
  })
  deps.hasCachedPassword = () => true
  expect((await json(await call('GET', '/state'))).server.needsSudoPassword).toBe(false)
  deps.hasCachedPassword = () => false
  deps.platform = 'win32'
  expect((await json(await call('GET', '/state'))).server).toMatchObject({ isWin: true, needsSudoPassword: false })
})

test('GET /state carries the server status fields through', async () => {
  deps.mitmStatus = async () => ({
    running: true,
    pid: 42,
    dnsConfigured: true,
    certExists: true,
    orphanedStateDetected: true,
  })
  expect((await json(await call('GET', '/state'))).server).toMatchObject({
    running: true,
    pid: 42,
    orphanedStateDetected: true,
  })
})
