/**
 * La configuración portable del AgentBridge: el esquema rechaza otra versión
 * y patrones que no son texto, y exportar tras importar devuelve lo mismo.
 *
 * Porte de `omniroute: tests/unit/agent-bridge-config-portability.test.ts`
 * (MIT), sobre una base en memoria en vez de un DATA_DIR temporal.
 */
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import {
  AgentBridgeConfigSchema,
  exportConfig,
  importConfig,
} from '../../src/inspector/configPortability.ts'
import { seedDefaultBypassPatterns } from '../../src/state/agentBridgeBypass.ts'
import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'

let db: Database

beforeEach(() => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
})
afterEach(() => db.close())

test('a well-formed config is accepted', () => {
  expect(
    AgentBridgeConfigSchema.safeParse({
      version: 1,
      bypassPatterns: ['*.bank.test'],
      customHosts: [{ host: 'api.internal.test', kind: 'custom', label: 'Internal' }],
      agentMappings: { cursor: [{ source: 'gpt-4o', target: 'claude-sonnet-4-5' }] },
    }).success,
  ).toBe(true)
})

test('another version or a non-string bypass pattern is rejected', () => {
  const base = { bypassPatterns: [], customHosts: [], agentMappings: {} }
  expect(AgentBridgeConfigSchema.safeParse({ ...base, version: 2 }).success).toBe(false)
  expect(AgentBridgeConfigSchema.safeParse({ ...base, version: 1, bypassPatterns: [123] }).success).toBe(false)
})

test('import then export roundtrips bypass, custom hosts and mappings', () => {
  const config = {
    version: 1 as const,
    bypassPatterns: ['*.bank.test', 'literal.example.com'],
    customHosts: [{ host: 'api.internal.test', kind: 'custom' as const, label: 'Internal LLM' }],
    agentMappings: { cursor: [{ source: 'gpt-4o', target: 'claude-sonnet-4-5' }] },
  }
  expect(importConfig(db, config)).toEqual({ bypassPatterns: 2, customHosts: 1, agents: 1 })
  const exported = exportConfig(db)
  expect([...exported.bypassPatterns].sort()).toEqual([...config.bypassPatterns].sort())
  expect(exported.customHosts).toEqual([{ host: 'api.internal.test', kind: 'custom', label: 'Internal LLM' }])
  expect(exported.agentMappings).toEqual({ cursor: config.agentMappings.cursor })
})

test('the default bypass patterns are not exported', () => {
  seedDefaultBypassPatterns(db, ['*.apple.com'])
  expect(exportConfig(db).bypassPatterns).toEqual([])
})
