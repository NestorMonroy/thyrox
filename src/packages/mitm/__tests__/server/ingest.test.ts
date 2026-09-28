// Portado de omniroute: tests/unit/mitm-ingest-shim.test.ts (MIT), sobre bun:test.
import { test } from 'bun:test'
import assert from 'node:assert/strict'

import { InterceptedRequestSchema } from '../../src/inspector/types.ts'
import { buildIngestEntry, INGEST_PATH, postIngestEntry } from '../../src/server/ingest.ts'

test('buildIngestEntry produces a schema-valid agent-bridge entry', () => {
  const entry = buildIngestEntry({
    id: '11111111-1111-4111-8111-111111111111',
    timestamp: '2026-06-19T00:00:00.000Z',
    method: 'POST',
    host: 'daily-cloudcode-pa.googleapis.com',
    path: '/v1internal:streamGenerateContent?alt=sse',
    agentId: 'antigravity',
    sourceModel: 'gemini-2.5-pro',
    mappedModel: 'glm-5.2',
    requestHeaders: { 'content-type': 'application/json' },
    requestBody: '{"model":"gemini-2.5-pro"}',
    requestSize: 26,
    status: 200,
    responseHeaders: { 'content-type': 'text/event-stream' },
    responseBody: 'data: {}',
    responseSize: 8,
    proxyLatencyMs: 5,
    upstreamLatencyMs: 100,
  })
  assert.equal(entry.source, 'agent-bridge')
  assert.equal(entry.agent, 'antigravity')
  assert.equal(entry.mappedModel, 'glm-5.2')
  assert.equal(entry.totalLatencyMs, 105)
  const parsed = InterceptedRequestSchema.safeParse(entry)
  assert.ok(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues))
})

test('buildIngestEntry defaults the missing fields to a valid entry', () => {
  const entry = buildIngestEntry({ method: 'POST', host: 'h', path: '/p', status: 'error', error: 'upstream 400' })
  assert.equal(entry.requestBody, null)
  assert.equal(entry.requestSize, 0)
  assert.deepEqual(entry.requestHeaders, {})
  assert.equal(entry.error, 'upstream 400')
  assert.equal('totalLatencyMs' in entry, false)
  assert.equal('agent' in entry, false)
  assert.match(entry.id, /^[0-9a-f-]{36}$/)
  assert.ok(!Number.isNaN(Date.parse(entry.timestamp)))
  assert.ok(InterceptedRequestSchema.safeParse(entry).success)
})

test('postIngestEntry posts with a bearer token and reports a 2xx as true', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return { ok: true }
  }
  assert.equal(await postIngestEntry('http://localhost:20128', 'tok123', { id: 'x' }, fetchImpl), true)
  assert.equal(calls[0]!.url, `http://localhost:20128${INGEST_PATH}`)
  assert.equal((calls[0]!.init.headers as Record<string, string>).Authorization, 'Bearer tok123')
  assert.equal(calls[0]!.init.method, 'POST')
  assert.equal(calls[0]!.init.body, '{"id":"x"}')
})

test('postIngestEntry never throws: no token, a non-2xx or a network error are false', async () => {
  let called = false
  const never = async () => {
    called = true
    return { ok: true }
  }
  assert.equal(await postIngestEntry('http://x', '', {}, never), false)
  assert.equal(await postIngestEntry('', 'tok', {}, never), false)
  assert.equal(called, false)
  assert.equal(await postIngestEntry('http://x', 'tok', {}, async () => ({ ok: false })), false)
  assert.equal(
    await postIngestEntry('http://x', 'tok', {}, async () => {
      throw new Error('ECONNREFUSED')
    }),
    false,
  )
})
