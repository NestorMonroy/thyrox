/**
 * La exportación HAR 1.2: campos del formato, secretos enmascarados en
 * cabeceras y cuerpos, campos propios con prefijo de guion bajo, estados no
 * numéricos y la pseudo-URL de un CONNECT.
 *
 * Porte de `omniroute: tests/unit/inspector-har-export.test.ts` (MIT). El
 * identificador de la captura va en `_captureId` y no en `_omniRouteId`: el
 * campo nombra lo que guarda, no al producto que lo exporta.
 */
import { expect, test } from 'bun:test'

import { HAR_CREATOR_NAME, toHar } from '../../src/inspector/harExport.ts'
import type { InterceptedRequest } from '../../src/inspector/types.ts'

function makeReq(overrides: Partial<InterceptedRequest> = {}): InterceptedRequest {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    source: 'agent-bridge',
    timestamp: '2026-05-27T12:00:00.000Z',
    method: 'POST',
    host: 'api.openai.com',
    path: '/v1/chat/completions',
    requestHeaders: { 'content-type': 'application/json' },
    requestBody: '{"model":"gpt-4"}',
    requestSize: 17,
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: '{"ok":true}',
    responseSize: 11,
    status: 200,
    totalLatencyMs: 200,
    upstreamLatencyMs: 150,
    ...overrides,
  }
}

test('a HAR 1.2 with its creator and one entry per request', () => {
  const har = toHar([makeReq()])
  expect(har.log.version).toBe('1.2')
  expect(har.log.creator.name).toBe(HAR_CREATOR_NAME)
  expect(har.log.creator.version).toMatch(/^\d+\.\d+\.\d+/)
  expect(har.log.entries).toHaveLength(1)
})

test('the entry fields follow the format', () => {
  const e = toHar([makeReq()]).log.entries[0]!
  expect(e.startedDateTime).toBe('2026-05-27T12:00:00.000Z')
  expect(e.time).toBe(200)
  expect(e.request.method).toBe('POST')
  expect(e.request.url).toBe('https://api.openai.com/v1/chat/completions')
  expect(e.request.httpVersion).toBe('HTTP/1.1')
  expect(e.request.bodySize).toBe(17)
  expect(e.request.postData?.mimeType).toBe('application/json')
  expect(e.response.status).toBe(200)
  expect(e.response.content.size).toBe(11)
  expect(e.response.content.text).toBe('{"ok":true}')
  expect(e.timings).toEqual({ send: 0, wait: 150, receive: 50 })
})

test('a bearer token in a header is masked', () => {
  const har = toHar([
    makeReq({
      requestHeaders: {
        'content-type': 'application/json',
        authorization: 'Bearer sk-supersecretvalueabc1234567890XYZ',
      },
    }),
  ])
  const auth = har.log.entries[0]!.request.headers.find(h => h.name === 'authorization')!
  expect(auth.value).not.toContain('supersecretvalueabc1234567890XYZ')
  expect(auth.value.includes('…') || auth.value.includes('***')).toBe(true)
})

test('an sk- key in a body is masked', () => {
  const body = toHar([makeReq({ requestBody: '{"key":"sk-abcdef1234567890ABCDEF"}' })]).log.entries[0]!.request.postData?.text ?? ''
  expect(body).not.toContain('sk-abcdef1234567890ABCDEF')
  expect(body).toMatch(/sk-abc/)
})

test('the source and the capture fields travel as underscore fields', () => {
  const har = toHar([
    makeReq({ source: 'http-proxy' }),
    makeReq({
      id: '00000000-0000-4000-8000-000000000002',
      source: 'system-proxy',
      agent: 'claude-code',
      detectedKind: 'llm',
      contextKey: 'abc123',
      sessionId: '00000000-0000-4000-8000-000000000099',
      note: 'TLS tunnel',
    }),
  ])
  expect(har.log.entries[0]!._source).toBe('http-proxy')
  const e = har.log.entries[1]!
  expect(e._source).toBe('system-proxy')
  expect(e._agent).toBe('claude-code')
  expect(e._detectedKind).toBe('llm')
  expect(e._contextKey).toBe('abc123')
  expect(e._sessionId).toBe('00000000-0000-4000-8000-000000000099')
  expect(e._note).toBe('TLS tunnel')
  expect(e._captureId).toBe('00000000-0000-4000-8000-000000000002')
})

test('in-flight and error states become status 0 with their text', () => {
  const har = toHar([
    makeReq({ status: 'in-flight', responseBody: null }),
    makeReq({ id: 'x', status: 'error', responseBody: null, error: 'boom' }),
  ])
  expect(har.log.entries[0]!.response.status).toBe(0)
  expect(har.log.entries[0]!.response.statusText).toBe('in-flight')
  expect(har.log.entries[1]!.response.statusText).toBe('error')
})

test('a CONNECT path renders as a pseudo-URL', () => {
  const har = toHar([makeReq({ method: 'CONNECT', host: 'api.example.com', path: ':443', responseBody: null })])
  expect(har.log.entries[0]!.request.url).toBe('https://api.example.com:443')
})
