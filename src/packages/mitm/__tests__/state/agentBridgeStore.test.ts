/**
 * Estado persistente del AgentBridge: las cinco tablas de la referencia
 * (`omniroute: src/lib/db/{agentBridgeState,agentBridgeBypass,
 * agentBridgeMappings,inspectorCustomHosts}.ts` y `models/mitmAlias.ts`)
 * sobre una base en memoria, más la apertura en el directorio del MITM.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { join } from 'node:path'

import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'
import { BUSY_TIMEOUT_MS } from '@thyrox/store/db.ts'
import {
  mitmStateStorePath,
  MITM_STATE_STORE_FILE,
  openMitmStateStore,
} from '../../src/state/stateStore.ts'
import {
  getAgentBridgeState,
  getAllAgentBridgeStates,
  setLastError,
  setLastStarted,
  upsertAgentBridgeState,
} from '../../src/state/agentBridgeState.ts'
import {
  getAllBypassPatterns,
  getUserBypassPatterns,
  replaceUserBypassPatterns,
  seedDefaultBypassPatterns,
} from '../../src/state/agentBridgeBypass.ts'
import {
  addCustomHost,
  isCustomHost,
  listCustomHosts,
  removeCustomHost,
  toggleCustomHost,
  touchLastSeen,
} from '../../src/state/inspectorCustomHosts.ts'
import {
  deleteMapping,
  getMappingsForAgent,
  setMappings,
  syncAgentBridgeMappingsToMitmAlias,
} from '../../src/state/agentBridgeMappings.ts'
import { getMitmAlias, getAllMitmAliases, setMitmAliasAll } from '../../src/state/mitmAlias.ts'
import { gheCopilotHostsFrom } from '../../src/state/gheCopilotHosts.ts'
import { resolveMitmDataDir } from '../../src/dataDir.ts'

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
})
afterEach(() => db.close())

test('schema — applying it twice is a no-op', () => {
  ensureAgentBridgeSchema(db)
  const tables = db
    .query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map(r => (r as { name: string }).name)
  expect(tables).toEqual([
    'agent_bridge_bypass',
    'agent_bridge_mappings',
    'agent_bridge_migrations',
    'agent_bridge_state',
    'inspector_custom_hosts',
    'inspector_session_requests',
    'inspector_sessions',
    'mitm_alias',
  ])
})

test('state — upsert inserts with false defaults and maps 0/1 to booleans', () => {
  upsertAgentBridgeState(db, { agent_id: 'codex', dns_enabled: true })
  expect(getAgentBridgeState(db, 'codex')).toEqual({
    agent_id: 'codex',
    dns_enabled: true,
    cert_trusted: false,
    setup_completed: false,
    last_started_at: null,
    last_error: null,
  })
})

test('state — upsert on an existing row only touches the given fields', () => {
  upsertAgentBridgeState(db, { agent_id: 'kiro', dns_enabled: true, last_error: 'x' })
  upsertAgentBridgeState(db, { agent_id: 'kiro', cert_trusted: true })
  const row = getAgentBridgeState(db, 'kiro')
  expect(row?.dns_enabled).toBe(true)
  expect(row?.cert_trusted).toBe(true)
  expect(row?.last_error).toBe('x')
})

test('state — setLastStarted and setLastError upsert without clobbering', () => {
  setLastStarted(db, 'zed', '2026-09-28T00:00:00.000Z')
  setLastError(db, 'zed', 'boom')
  upsertAgentBridgeState(db, { agent_id: 'zed', setup_completed: true })
  setLastError(db, 'zed', null)
  const row = getAgentBridgeState(db, 'zed')
  expect(row?.last_started_at).toBe('2026-09-28T00:00:00.000Z')
  expect(row?.last_error).toBeNull()
  expect(row?.setup_completed).toBe(true)
})

test('state — getAll is ordered by agent id, unknown agent is null', () => {
  upsertAgentBridgeState(db, { agent_id: 'zed' })
  upsertAgentBridgeState(db, { agent_id: 'codex' })
  expect(getAllAgentBridgeStates(db).map(r => r.agent_id)).toEqual(['codex', 'zed'])
  expect(getAgentBridgeState(db, 'cursor')).toBeNull()
})

test('bypass — seeding defaults is idempotent', () => {
  seedDefaultBypassPatterns(db, ['*.local', 'localhost'])
  seedDefaultBypassPatterns(db, ['*.local', 'localhost'])
  const all = getAllBypassPatterns(db)
  expect(all.map(r => [r.pattern, r.source])).toEqual([
    ['*.local', 'default'],
    ['localhost', 'default'],
  ])
  expect(all[0]!.created_at).toMatch(ISO)
})

test('bypass — replacing user patterns keeps defaults and sorts', () => {
  seedDefaultBypassPatterns(db, ['localhost'])
  replaceUserBypassPatterns(db, ['b.example', 'a.example'])
  replaceUserBypassPatterns(db, ['c.example'])
  expect(getUserBypassPatterns(db)).toEqual(['c.example'])
  expect(getAllBypassPatterns(db).map(r => r.source)).toEqual(['default', 'user'])
})

test('bypass — a failed replacement leaves the previous user patterns', () => {
  replaceUserBypassPatterns(db, ['keep.example'])
  seedDefaultBypassPatterns(db, ['dup.example'])
  // La clave primaria es el patrón: repetir uno por defecto aborta la transacción.
  expect(() => replaceUserBypassPatterns(db, ['new.example', 'dup.example'])).toThrow()
  expect(getUserBypassPatterns(db)).toEqual(['keep.example'])
})

test('custom hosts — add is idempotent, list filters and sorts', () => {
  addCustomHost(db, 'b.example.com', 'llm', 'B')
  addCustomHost(db, 'a.example.com')
  addCustomHost(db, 'a.example.com', 'app', 'ignored')
  toggleCustomHost(db, 'b.example.com', false)
  const all = listCustomHosts(db)
  expect(all.map(r => [r.host, r.kind, r.label, r.enabled])).toEqual([
    ['a.example.com', 'custom', null, true],
    ['b.example.com', 'llm', 'B', false],
  ])
  expect(listCustomHosts(db, { enabledOnly: true }).map(r => r.host)).toEqual(['a.example.com'])
})

test('custom hosts — isCustomHost only counts enabled rows', () => {
  addCustomHost(db, 'x.example.com')
  expect(isCustomHost(db, 'x.example.com')).toBe(true)
  toggleCustomHost(db, 'x.example.com', false)
  expect(isCustomHost(db, 'x.example.com')).toBe(false)
  expect(isCustomHost(db, 'missing.example.com')).toBe(false)
})

test('custom hosts — touchLastSeen stamps and remove deletes', () => {
  addCustomHost(db, 'y.example.com')
  expect(listCustomHosts(db)[0]!.last_seen_at).toBeNull()
  touchLastSeen(db, 'y.example.com')
  expect(listCustomHosts(db)[0]!.last_seen_at).toMatch(ISO)
  removeCustomHost(db, 'y.example.com')
  expect(listCustomHosts(db)).toEqual([])
})

test('custom hosts — an unknown kind is dropped, not stored', () => {
  // `INSERT OR IGNORE` también ignora la violación del CHECK: no lanza.
  addCustomHost(db, 'z.example.com', 'other' as never)
  expect(listCustomHosts(db)).toEqual([])
})

test('mappings — set replaces the whole agent, delete removes one', () => {
  setMappings(db, 'kiro', [
    { source: 'm2', target: 't2' },
    { source: 'm1', target: 't1' },
  ])
  setMappings(db, 'codex', [{ source: 'c', target: 'd' }])
  setMappings(db, 'kiro', [
    { source: 'm1', target: 't9' },
    { source: 'm3', target: 't3' },
  ])
  deleteMapping(db, 'kiro', 'm3')
  const rows = getMappingsForAgent(db, 'kiro')
  expect(rows.map(r => [r.source_model, r.target_model])).toEqual([['m1', 't9']])
  expect(rows[0]!.updated_at).toMatch(ISO)
  expect(getMappingsForAgent(db, 'codex')).toHaveLength(1)
})

test('mappings — sync writes the alias only for agents with an alias key', () => {
  setMappings(db, 'claude-code', [{ source: 'a', target: 'b' }])
  setMappings(db, 'codex', [{ source: 'c', target: 'd' }])
  syncAgentBridgeMappingsToMitmAlias(db, 'claude-code')
  syncAgentBridgeMappingsToMitmAlias(db, 'codex')
  expect(getMitmAlias(db, 'claude-code')).toEqual({ a: 'b' })
  expect(getMitmAlias(db, 'codex')).toEqual({})
})

test('alias — setAll replaces, getAll gathers every agent, empty stays {}', () => {
  setMitmAliasAll(db, 'kiro', { x: 'y' })
  setMitmAliasAll(db, 'kiro', { z: 'w' })
  setMitmAliasAll(db, 'antigravity', null)
  expect(getAllMitmAliases(db)).toEqual({ antigravity: {}, kiro: { z: 'w' } })
})

test('ghe copilot — hosts from provider data, lowercased, deduplicated', () => {
  const hosts = gheCopilotHostsFrom([
    JSON.stringify({ gheUrl: 'https://GHE.Example.com/x', copilotApiUrl: 'https://api.ghe.example.com' }),
    { copilotProxyUrl: 'https://ghe.example.com' },
    'not json',
    null,
    { gheUrl: 'not a url', copilotApiUrl: '  ' },
  ])
  expect(hosts.sort()).toEqual(['api.ghe.example.com', 'ghe.example.com'])
})

test('store path — lives in the MITM data directory', () => {
  const previous = process.env.THYROX_MITM_DATA_DIR
  process.env.THYROX_MITM_DATA_DIR = '/nonexistent/mitm-data'
  try {
    expect(mitmStateStorePath()).toBe(join(resolveMitmDataDir(), MITM_STATE_STORE_FILE))
    expect(mitmStateStorePath().startsWith('/nonexistent/mitm-data')).toBe(true)
  } finally {
    if (previous === undefined) delete process.env.THYROX_MITM_DATA_DIR
    else process.env.THYROX_MITM_DATA_DIR = previous
  }
})

test('store — opens through @thyrox/store with the schema applied', () => {
  const opened = openMitmStateStore(':memory:')
  try {
    expect(opened.query('PRAGMA busy_timeout').get()).toEqual({ timeout: BUSY_TIMEOUT_MS })
    upsertAgentBridgeState(opened, { agent_id: 'cursor' })
    expect(getAllAgentBridgeStates(opened)).toHaveLength(1)
  } finally {
    opened.close()
  }
})
