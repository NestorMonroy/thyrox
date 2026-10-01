/**
 * Cuándo una petición es local: el host de loopback en sus formas (con puerto,
 * IPv6 con y sin corchetes, IPv4 mapeada), y la falla cerrada.
 *
 * Porte de `omniroute: tests/unit/authz/routeGuard.test.ts`,
 * `route-guard-private-lan.test.ts` y
 * `tests/integration/traffic-inspector-localonly.test.ts` (MIT), en sus casos de
 * `isLoopbackHost`.
 */
import { expect, test } from 'bun:test'

import { hasForwardingHeaders, isLoopbackHost } from '../../src/api/locality.ts'

test('loopback names and addresses, with or without a port', () => {
  for (const host of ['localhost', 'localhost:20128', '127.0.0.1', '127.0.0.1:3000', 'LOCALHOST']) {
    expect(isLoopbackHost(host)).toBe(true)
  }
})

test('IPv6 loopback bracketed, bare and IPv4-mapped', () => {
  for (const host of ['[::1]', '[::1]:20128', '::1', '::ffff:127.0.0.1']) expect(isLoopbackHost(host)).toBe(true)
})

test('anything else is not loopback, and no host fails closed', () => {
  for (const host of ['192.168.1.1', '192.168.0.15', '8.8.8.8', 'example.com', '10.127.0.1', '']) {
    expect(isLoopbackHost(host)).toBe(false)
  }
  expect(isLoopbackHost(null)).toBe(false)
})

test('a request through a reverse proxy carries forwarding headers', () => {
  expect(hasForwardingHeaders(new Headers({ 'x-forwarded-for': '203.0.113.9' }))).toBe(true)
  expect(hasForwardingHeaders(new Headers({ 'x-real-ip': '203.0.113.9' }))).toBe(true)
  expect(hasForwardingHeaders(new Headers({ host: 'localhost' }))).toBe(false)
})
