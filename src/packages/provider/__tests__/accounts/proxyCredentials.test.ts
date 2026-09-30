/**
 * Una conexión guardada se presenta al proxy local como `ProxyCredential`: la
 * vista de disponibilidad de la selección de cuentas —estado terminal,
 * enfriamiento vigente, caducidad del token— traducida a los campos que los
 * selectores ya leen.
 *
 * Porte de `isTerminalConnectionStatus` y `materializeConnection` en
 * `omniroute: src/sse/services/auth.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { connectionProxyCredential, connectionProxyCredentials, isTerminalConnectionStatus } from '../../src/accounts/proxyCredentials.ts'

const NOW = Date.parse('2026-09-28T12:00:00Z')
const row = (overrides: Record<string, unknown> = {}) => ({ id: 'c1', provider: 'openai', authType: 'apikey', priority: 1, isActive: true, apiKey: 'sk-1', ...overrides })

describe('the terminal connection states', () => {
  test('are exhausted credits, a ban and expiry, in any case and spacing', () => {
    for (const status of ['credits_exhausted', 'banned', 'expired', ' BANNED ']) expect(isTerminalConnectionStatus(status)).toBe(true)
    for (const status of ['active', 'unavailable', '', null, undefined, 3]) expect(isTerminalConnectionStatus(status)).toBe(false)
  })
})

describe('one connection as a proxy credential', () => {
  test('an api-key connection carries its key as an attribute and its priority reversed', () => {
    expect(connectionProxyCredential(row(), NOW)).toEqual({ id: 'c1', disabled: false, attributes: { priority: '-1', provider: 'openai', auth_type: 'apikey', api_key: 'sk-1' }, metadata: {} })
  })

  test('the lower stored priority wins, as the higher proxy priority', () => {
    const first = connectionProxyCredential(row({ priority: 1 }), NOW).attributes!.priority
    const second = connectionProxyCredential(row({ priority: 2 }), NOW).attributes!.priority
    expect(Number(first)).toBeGreaterThan(Number(second))
    expect(connectionProxyCredential(row({ priority: undefined }), NOW).attributes!.priority).toBe('0')
  })

  test('an oauth connection carries its token, project and token expiry', () => {
    const credential = connectionProxyCredential(row({ authType: 'oauth', apiKey: null, accessToken: 'tok', projectId: 'p-1', tokenExpiresAt: '2026-09-28T13:00:00Z', expiresAt: '2026-09-28T14:00:00Z' }), NOW)
    expect(credential.metadata).toEqual({ access_token: 'tok', project_id: 'p-1' })
    expect(credential.attributes!.api_key).toBeUndefined()
    expect(credential.accessTokenExpiresAt).toEqual(new Date('2026-09-28T13:00:00Z'))
    expect(connectionProxyCredential(row({ expiresAt: '2026-09-28T14:00:00Z' }), NOW).accessTokenExpiresAt).toEqual(new Date('2026-09-28T14:00:00Z'))
    expect(connectionProxyCredential(row({ tokenExpiresAt: 'nunca' }), NOW).accessTokenExpiresAt).toBeUndefined()
  })

  test('blank secrets are not carried', () => {
    const credential = connectionProxyCredential(row({ apiKey: '  ', accessToken: '' }), NOW)
    expect(credential.attributes!.api_key).toBeUndefined()
    expect(credential.metadata!.access_token).toBeUndefined()
  })

  test('an inactive or terminal connection is disabled', () => {
    expect(connectionProxyCredential(row({ isActive: false }), NOW).disabled).toBe(true)
    expect(connectionProxyCredential(row({ testStatus: 'banned' }), NOW).disabled).toBe(true)
    expect(connectionProxyCredential(row({ testStatus: 'unavailable' }), NOW).disabled).toBe(false)
  })

  test('a future cooldown makes it unavailable until then; a past one does not', () => {
    const cooling = connectionProxyCredential(row({ rateLimitedUntil: '2026-09-28T12:05:00Z' }), NOW)
    expect(cooling.unavailable).toBe(true)
    expect(cooling.nextRetryAfter).toEqual(new Date('2026-09-28T12:05:00Z'))
    const past = connectionProxyCredential(row({ rateLimitedUntil: '2026-09-28T11:55:00Z' }), NOW)
    expect(past.unavailable).toBeUndefined()
    expect(past.nextRetryAfter).toBeUndefined()
    expect(connectionProxyCredential(row({ rateLimitedUntil: 'x' }), NOW).unavailable).toBeUndefined()
  })
})

describe('the credentials of the proxy, by provider', () => {
  test('group every connection under its provider, in the given order, skipping rows without id or provider', () => {
    const grouped = connectionProxyCredentials([row({ id: 'a' }), row({ id: 'b', provider: 'anthropic' }), row({ id: 'c' }), row({ id: '' }), row({ id: 'd', provider: '' })], NOW)
    expect(Object.keys(grouped)).toEqual(['openai', 'anthropic'])
    expect(grouped.openai!.map(c => c.id)).toEqual(['a', 'c'])
    expect(grouped.anthropic!.map(c => c.id)).toEqual(['b'])
  })
})
