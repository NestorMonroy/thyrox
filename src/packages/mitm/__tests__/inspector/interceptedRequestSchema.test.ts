/**
 * El esquema de una petición interceptada: identificador UUID, fuente dentro
 * del enumerado (tproxy incluida), estados en curso y de error, y tamaños no
 * negativos.
 *
 * Porte de `omniroute: tests/unit/inspector-types.test.ts` (MIT). Sus casos de
 * `MitmTargetSchema` ya están en `__tests__/types.test.ts`.
 */
import { expect, test } from 'bun:test'

import { InterceptedRequestSchema } from '../../src/inspector/types.ts'

const valid = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  source: 'agent-bridge' as const,
  timestamp: new Date().toISOString(),
  method: 'POST',
  host: 'api.openai.com',
  path: '/v1/chat/completions',
  requestHeaders: { 'content-type': 'application/json' },
  requestBody: null,
  requestSize: 0,
  responseHeaders: {},
  responseBody: null,
  responseSize: 0,
  status: 200,
}

const accepts = (patch: Record<string, unknown>) => InterceptedRequestSchema.safeParse({ ...valid, ...patch }).success

test('a complete payload is accepted', () => {
  expect(accepts({})).toBe(true)
})

test('the in-flight and error states are accepted', () => {
  expect(accepts({ status: 'in-flight' })).toBe(true)
  expect(accepts({ status: 'error', error: 'Connection timeout' })).toBe(true)
})

test('the tproxy source is accepted, an unknown one is not', () => {
  expect(accepts({ source: 'tproxy' })).toBe(true)
  expect(accepts({ source: 'invalid-source' })).toBe(false)
})

test('a malformed id or a negative size is rejected', () => {
  expect(accepts({ id: 'not-a-uuid' })).toBe(false)
  expect(accepts({ requestSize: -1 })).toBe(false)
})
