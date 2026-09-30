/**
 * El normalizador del estado del AgentBridge: nunca deja `serverState`
 * indefinido, mapea la forma de siempre (`server`, `certExists`) y deja pasar
 * intacta la forma correcta.
 *
 * Porte de `omniroute: tests/unit/agent-bridge-state-normalize-3318.test.ts`
 * (MIT).
 */
import { expect, test } from 'bun:test'

import { DEFAULT_AGENT_BRIDGE_STATE, normalizeAgentBridgeState } from '../../src/client/normalizeState.ts'

const LEGACY_SHAPE = {
  server: { running: true, pid: 123, dnsConfigured: true, certExists: true },
  agents: [{ id: 'claude-code', name: 'Code agent', hosts: [], viability: 'ok' }],
}

test('the legacy route shape maps through and serverState is never undefined', () => {
  const result = normalizeAgentBridgeState(LEGACY_SHAPE)
  expect(result.serverState.running).toBe(true)
  expect(result.serverState.certTrusted).toBe(true)
  expect(result.agentStates).toEqual([])
  expect(result.bypassPatterns).toEqual([])
  expect(result.mappings).toEqual({})
})

test('empty or garbage input falls back to safe defaults', () => {
  for (const bad of [null, undefined, {}, 42, 'x', []]) {
    const result = normalizeAgentBridgeState(bad)
    expect(result.serverState.running).toBe(false)
    expect(Array.isArray(result.agentStates)).toBe(true)
    expect(Array.isArray(result.bypassPatterns)).toBe(true)
    expect(typeof result.mappings).toBe('object')
  }
})

test('orphanedStateDetected and dnsConfigured map through from the server status', () => {
  const result = normalizeAgentBridgeState({
    server: { running: false, dnsConfigured: true, certExists: true, orphanedStateDetected: true },
    agents: [],
  })
  expect(result.serverState.orphanedStateDetected).toBe(true)
  expect(result.serverState.dnsConfigured).toBe(true)
})

test('orphanedStateDetected and dnsConfigured default to false', () => {
  for (const bad of [null, undefined, {}, { server: {} }]) {
    const result = normalizeAgentBridgeState(bad)
    expect(result.serverState.orphanedStateDetected).toBe(false)
    expect(result.serverState.dnsConfigured).toBe(false)
  }
})

test('certTrusted wins over certExists when both are present', () => {
  expect(normalizeAgentBridgeState({ server: { certExists: true, certTrusted: false } }).serverState.certTrusted).toBe(
    false,
  )
})

test('a field with the wrong type keeps its default', () => {
  expect(normalizeAgentBridgeState({ serverState: { running: 'yes', port: '8443' } }).serverState).toMatchObject({
    running: false,
    port: 443,
  })
})

test('the sudo and platform flags from the state route pass through', () => {
  expect(
    normalizeAgentBridgeState({ server: { hasCachedPassword: true, needsSudoPassword: false, isWin: true } })
      .serverState,
  ).toMatchObject({ hasCachedPassword: true, needsSudoPassword: false, isWin: true })
})

test('a correctly shaped payload passes through intact', () => {
  const correct = {
    ...DEFAULT_AGENT_BRIDGE_STATE,
    serverState: { ...DEFAULT_AGENT_BRIDGE_STATE.serverState, running: true, port: 8443 },
    agentStates: [
      {
        agent_id: 'claude-code',
        dns_enabled: true,
        cert_trusted: true,
        setup_completed: true,
        last_started_at: null,
        last_error: null,
      },
    ],
    bypassPatterns: ['*.internal'],
    mappings: { 'claude-code': [] },
  }
  const result = normalizeAgentBridgeState(correct)
  expect(result.serverState).toMatchObject({ running: true, port: 8443 })
  expect(result.agentStates[0]!.agent_id).toBe('claude-code')
  expect(result.bypassPatterns).toEqual(['*.internal'])
})

test('the default serverState is never shared between two results', () => {
  const a = normalizeAgentBridgeState(null)
  a.serverState.running = true
  expect(normalizeAgentBridgeState(null).serverState.running).toBe(false)
  expect(DEFAULT_AGENT_BRIDGE_STATE.serverState.running).toBe(false)
})
