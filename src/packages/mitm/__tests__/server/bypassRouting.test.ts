/**
 * Las decisiones de enrutado del servidor MITM con los hosts de la
 * referencia: exclusiones por defecto, globs del usuario, precedencia, y la
 * lectura de `bypass.json`.
 *
 * Porte de `omniroute: tests/unit/mitm-server-connect.test.ts` (MIT). Sus
 * cinco aserciones sobre el texto de `server.cjs` no se portan como texto: en
 * thyrox el servidor es TypeScript y esos contratos se prueban por conducta en
 * `mitmServer.test.ts` (cabeceras `x-thyrox-*`, error saneado, CONNECT a túnel
 * y a descifrado). La guarda contra el doble conteo no aplica: el servidor no
 * reemite el socket con `emit('connection')`.
 */
import { expect, test } from 'bun:test'

import { parseBypassJson, routeBypass } from '../../src/server/bypass.ts'
import { DEFAULT_BYPASS_PATTERNS, globMatch } from '../../src/passthrough.ts'

const TARGETS = new Set(['daily-cloudcode-pa.googleapis.com', 'api.githubcopilot.com'])

test('the default exclusions are at least the four mandatory patterns', () => {
  expect(DEFAULT_BYPASS_PATTERNS.length).toBeGreaterThanOrEqual(4)
})

test('banks, government sites, okta and auth0 are excluded by default', () => {
  for (const host of ['my.bank.example', 'secure.bank.com', 'portal.gov.br', 'tax.gov', 'mycorp.okta.com', 'okta.com', 'myapp.auth0.com']) {
    expect(routeBypass(host, TARGETS, [])).toBe('bypass')
  }
})

test('a known target is decrypted and an unknown host passes through', () => {
  expect(routeBypass('daily-cloudcode-pa.googleapis.com', TARGETS, [])).toBe('target')
  expect(routeBypass('api.githubcopilot.com', TARGETS, [])).toBe('target')
  expect(routeBypass('api.openai.com', TARGETS, [])).toBe('passthrough')
})

test('a user glob excludes only the hosts it matches', () => {
  const user = ['*.internal.example.com']
  expect(routeBypass('admin.internal.example.com', TARGETS, user)).toBe('bypass')
  expect(routeBypass('external.example.com', TARGETS, user)).toBe('passthrough')
})

test('an undefined host passes through and the host is matched case-insensitively', () => {
  expect(routeBypass(undefined as unknown as string, TARGETS, [])).toBe('passthrough')
  expect(routeBypass('MyApp.Okta.COM', TARGETS, [])).toBe('bypass')
})

test('the glob walk rejects too many wildcards and never compiles the pattern', () => {
  expect(globMatch('abcdefghijk', 'a*b*c*d*e*f*g*h*i*j*k')).toBe(false)
  expect(() => globMatch('test.com', '(invalid[')).not.toThrow()
  expect(globMatch('api.example.com', 'api.*')).toBe(true)
  expect(globMatch('svc.example.com', 'api.*')).toBe(false)
})

test('bypass.json without a patterns key, or with non-strings, keeps only the strings', () => {
  expect(parseBypassJson(JSON.stringify({ version: 1 }))).toEqual([])
  expect(parseBypassJson(JSON.stringify({ patterns: ['valid.com', '', null, 42, 'Another.COM'] }))).toEqual([
    'valid.com',
    'another.com',
  ])
})
