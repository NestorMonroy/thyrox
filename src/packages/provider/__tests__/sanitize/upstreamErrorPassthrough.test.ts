/**
 * Cuándo un 4xx del upstream se reenvía tal cual: sin estas pruebas la capa
 * sólo se ejercía a través de la prueba que la empareja con el saneador.
 */
import { expect, test } from 'bun:test'

import {
  buildPassthroughErrorResponse,
  shouldPassthroughUpstreamError,
} from '../../src/sanitize/upstreamErrorPassthrough.ts'

const capabilityError = { error: { type: 'invalid_request_error', message: 'thinking is not supported' } }

test('a clean 4xx with capability wording is relayed', () => {
  expect(shouldPassthroughUpstreamError(400, capabilityError)).toBe(true)
  expect(shouldPassthroughUpstreamError(429, capabilityError)).toBe(true)
})

test('outside 400-499, or an auth-adjacent status, is not relayed', () => {
  for (const status of [399, 500, 401, 403, 407]) {
    expect(shouldPassthroughUpstreamError(status, capabilityError)).toBe(false)
  }
})

test('a non-object or non-serializable body is not relayed', () => {
  const cyclic: Record<string, unknown> = {}
  cyclic.self = cyclic
  expect(shouldPassthroughUpstreamError(400, 'text')).toBe(false)
  expect(shouldPassthroughUpstreamError(400, cyclic)).toBe(false)
})

test('a body that leaks the proxy internals is not relayed', () => {
  expect(shouldPassthroughUpstreamError(400, { error: { message: 'boom at /srv/x.ts' } })).toBe(false)
  expect(shouldPassthroughUpstreamError(400, { error: { message: 'in src/thyrox/proxy' } })).toBe(false)
})

test('a body that echoes a credential is not relayed', () => {
  const echoed = { error: { message: 'bad header Authorization: Bearer abcdefgh12345678' } }
  expect(shouldPassthroughUpstreamError(400, echoed)).toBe(false)
  expect(shouldPassthroughUpstreamError(422, { error: { message: 'key sk-abcdefgh12345' } })).toBe(false)
})

test('the relayed response keeps status and JSON shape', async () => {
  const response = buildPassthroughErrorResponse(400, capabilityError, { 'x-extra': '1' })
  expect(response?.status).toBe(400)
  expect(response?.headers.get('x-extra')).toBe('1')
  expect(await response?.json()).toEqual(capabilityError)
  expect(buildPassthroughErrorResponse(500, capabilityError)).toBeNull()
})
