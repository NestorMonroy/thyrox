// Portado de omniroute: tests/unit/mitm-forward-target.test.ts y
// mitm-server-claude-code-routing.test.ts (MIT), sobre bun:test. Los alias salen de la tabla
// `mitm_alias` del store del AgentBridge.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'

import {
  ANTIGRAVITY_PATH,
  CHAT_PATH,
  getAgentRouteConfig,
  isCloudcodeEnvelope,
  resolveForwardTarget,
  resolveForwardTargetForAgent,
  resolveMappedOverride,
} from '../../src/server/forwardTarget.ts'
import { setMitmAliasAll } from '../../src/state/mitmAlias.ts'
import { openMitmStateStore } from '../../src/state/stateStore.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

const BASE = 'http://localhost:20128'

test('a cloudcode envelope goes to the antigravity endpoint, anything else to chat', () => {
  const envelope = { model: 'gemini-2.5-pro', request: { contents: [{ role: 'user', parts: [{ text: 'oi' }] }] } }
  assert.equal(isCloudcodeEnvelope(envelope), true)
  assert.deepEqual(resolveForwardTarget(BASE, envelope), { url: `${BASE}${ANTIGRAVITY_PATH}`, format: 'antigravity' })
  assert.deepEqual(resolveForwardTarget(`${BASE}//`, { messages: [] }), { url: `${BASE}${CHAT_PATH}`, format: 'openai' })
})

test('non-envelope shapes are not taken for cloudcode', () => {
  for (const body of [{ request: {} }, { request: { contents: 'nope' } }, { contents: [] }, null, [], 'string']) {
    assert.equal(isCloudcodeEnvelope(body), false, JSON.stringify(body))
  }
})

test('the route config maps claude-code and kiro to /v1/messages, unknown to antigravity', () => {
  assert.deepEqual(getAgentRouteConfig('claude-code'), {
    aliasKey: 'claude-code',
    chatUrlPatterns: ['/v1/messages'],
    routerPath: '/v1/messages',
  })
  assert.equal(getAgentRouteConfig('kiro').routerPath, '/v1/messages')
  assert.deepEqual(getAgentRouteConfig('antigravity').chatUrlPatterns, [':generateContent', ':streamGenerateContent'])
  assert.equal(getAgentRouteConfig('unknown'), getAgentRouteConfig('antigravity'))
})

test('agents are forwarded by their router path, not by a hardcoded id', () => {
  const fallbackCalls: unknown[] = []
  const fallbackResolver = (baseUrl: string, body: unknown) => {
    fallbackCalls.push(body)
    return { format: 'openai' as const, url: `${baseUrl}/v1/chat/completions` }
  }
  const common = { routerBaseUrl: 'http://router', routerMessagesUrl: 'http://router/v1/messages', fallbackResolver }
  assert.deepEqual(resolveForwardTargetForAgent({ ...common, body: {}, agentId: 'claude-code' }), {
    format: 'anthropic',
    url: 'http://router/v1/messages',
  })
  assert.deepEqual(resolveForwardTargetForAgent({ ...common, body: { model: 'g' }, agentId: 'antigravity' }), {
    format: 'openai',
    url: 'http://router/v1/chat/completions',
  })
  assert.deepEqual(resolveForwardTargetForAgent({ ...common, body: {}, agentId: 'kiro' }), {
    format: 'anthropic',
    url: 'http://router/v1/messages',
  })
  assert.deepEqual(fallbackCalls, [{ model: 'g' }])
})

test('the mapped override comes from the agent namespace, then its wildcard', () => {
  const db = openMitmStateStore(':memory:')
  cleanups.push(() => db.close())
  setMitmAliasAll(db, 'claude-code', {
    'claude-source': { model: 'anthropic/claude-sonnet-5', reasoningEffort: 'high' },
    '*': 'fallback/model',
  })
  setMitmAliasAll(db, 'antigravity', { 'claude-source': 'antigravity-should-not-win' })
  assert.deepEqual(resolveMappedOverride(db, 'claude-source', 'claude-code'), {
    model: 'anthropic/claude-sonnet-5',
    reasoningEffort: 'high',
  })
  assert.deepEqual(resolveMappedOverride(db, 'other', 'claude-code'), { model: 'fallback/model' })
  assert.equal(resolveMappedOverride(db, 'other', 'kiro'), null)
  assert.equal(resolveMappedOverride(db, '', 'claude-code'), null)
})

test('an unreadable store yields no override instead of throwing', () => {
  const db = openMitmStateStore(':memory:')
  db.close()
  assert.equal(resolveMappedOverride(db, 'claude-source', 'claude-code'), null)
})
