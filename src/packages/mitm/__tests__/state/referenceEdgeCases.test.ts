/**
 * Los casos de borde del estado del AgentBridge que la referencia prueba y
 * `agentBridgeStore.test.ts` no cubría: tabla vacía, reemplazo por la lista
 * vacía, aislamiento entre agentes, borrado de lo que no existe, y el
 * encendido y apagado de un host propio.
 *
 * Porte de `omniroute: tests/unit/db-agent-bridge-bypass.test.ts`,
 * `db-agent-bridge-mappings.test.ts`, `db-inspector-custom-hosts.test.ts` y
 * `agent-bridge-mappings-sync-8656.test.ts`
 * (MIT).
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'
import {
  getAllBypassPatterns,
  getUserBypassPatterns,
  replaceUserBypassPatterns,
  seedDefaultBypassPatterns,
} from '../../src/state/agentBridgeBypass.ts'
import {
  deleteMapping,
  getMappingsForAgent,
  setMappings,
  syncAgentBridgeMappingsToMitmAlias,
} from '../../src/state/agentBridgeMappings.ts'
import { getMitmAlias } from '../../src/state/mitmAlias.ts'
import {
  addCustomHost,
  listCustomHosts,
  removeCustomHost,
  toggleCustomHost,
} from '../../src/state/inspectorCustomHosts.ts'

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
})
afterEach(() => db.close())

test('bypass — an empty table gives no patterns', () => {
  expect(getAllBypassPatterns(db)).toEqual([])
})

test('bypass — replacing with an empty list clears only the user patterns', () => {
  seedDefaultBypassPatterns(db, ['*.apple.com'])
  replaceUserBypassPatterns(db, ['a.example', 'b.example'])
  replaceUserBypassPatterns(db, [])
  expect(getUserBypassPatterns(db)).toEqual([])
  expect(getAllBypassPatterns(db).map((row) => row.pattern)).toEqual(['*.apple.com'])
})

test('mappings — an agent with none gives an empty list', () => {
  expect(getMappingsForAgent(db, 'kiro')).toEqual([])
})

test('mappings — setting an empty list clears the agent', () => {
  setMappings(db, 'kiro', [{ source: 'a', target: 'b' }])
  setMappings(db, 'kiro', [])
  expect(getMappingsForAgent(db, 'kiro')).toEqual([])
})

test('mappings — setting one agent leaves the others untouched', () => {
  setMappings(db, 'kiro', [{ source: 'a', target: 'b' }])
  setMappings(db, 'antigravity', [{ source: 'x', target: 'y' }])
  setMappings(db, 'kiro', [{ source: 'c', target: 'd' }])
  expect(getMappingsForAgent(db, 'antigravity').map((row) => row.source_model)).toEqual(['x'])
})

test('mappings — deleting a source that does not exist changes nothing', () => {
  setMappings(db, 'kiro', [{ source: 'a', target: 'b' }])
  deleteMapping(db, 'kiro', 'missing')
  expect(getMappingsForAgent(db, 'kiro')).toHaveLength(1)
})

test('custom hosts — kind and label are stored as given', () => {
  addCustomHost(db, 'api.anthropic.com', 'llm', 'Anthropic API')
  const row = listCustomHosts(db).find((r) => r.host === 'api.anthropic.com')
  expect(row?.kind).toBe('llm')
  expect(row?.label).toBe('Anthropic API')
})

test('custom hosts — toggle turns a host off and back on', () => {
  addCustomHost(db, 'h.example')
  toggleCustomHost(db, 'h.example', false)
  expect(listCustomHosts(db)[0]?.enabled).toBe(false)
  expect(listCustomHosts(db, { enabledOnly: true })).toEqual([])
  toggleCustomHost(db, 'h.example', true)
  expect(listCustomHosts(db)[0]?.enabled).toBe(true)
})

test('custom hosts — removing an unknown host changes nothing', () => {
  addCustomHost(db, 'h.example')
  removeCustomHost(db, 'other.example')
  expect(listCustomHosts(db)).toHaveLength(1)
})

test('alias sync — a second sync replaces the previous target', () => {
  setMappings(db, 'antigravity', [{ source: 'gpt-oss-120b-medium', target: 'openai/gpt-4o' }])
  syncAgentBridgeMappingsToMitmAlias(db, 'antigravity')
  setMappings(db, 'antigravity', [{ source: 'gpt-oss-120b-medium', target: 'anthropic/claude-opus-4' }])
  syncAgentBridgeMappingsToMitmAlias(db, 'antigravity')
  expect(getMitmAlias(db, 'antigravity')).toEqual({ 'gpt-oss-120b-medium': 'anthropic/claude-opus-4' })
})

test('alias sync — emptying the mappings leaves an empty alias', () => {
  setMappings(db, 'antigravity', [{ source: 'a', target: 'b' }])
  syncAgentBridgeMappingsToMitmAlias(db, 'antigravity')
  setMappings(db, 'antigravity', [])
  syncAgentBridgeMappingsToMitmAlias(db, 'antigravity')
  expect(getMitmAlias(db, 'antigravity')).toEqual({})
})
