/**
 * Los tickets de un solo uso del enlace público de conexión de codex: quien
 * genera el enlace sondea el estado; quien lo abre completa el flujo de
 * dispositivo exactamente una vez, antes de quince minutos.
 *
 * Porte de `omniroute: src/lib/oauth/deviceFlowTickets.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createDeviceFlowTickets, DEVICE_FLOW_TICKET_TTL_MS } from '../../../src/accounts/oauth/deviceFlowTickets.ts'

function tickets(start = 1_000_000) {
  let now = start
  let serial = 0
  const store = createDeviceFlowTickets({ now: () => now, newToken: () => `token-${++serial}` })
  return { store, advance: (ms: number) => (now += ms), now: () => now }
}

describe('device flow tickets', () => {
  test('a new ticket is pending for fifteen minutes', () => {
    const { store, now } = tickets()
    const created = store.create('codex', 'conn-9')
    expect(created).toEqual({ token: 'token-1', expiresAt: now() + DEVICE_FLOW_TICKET_TTL_MS })
    expect(DEVICE_FLOW_TICKET_TTL_MS).toBe(15 * 60 * 1000)
    expect(store.peek('token-1')).toEqual({ token: 'token-1', provider: 'codex', connectionId: 'conn-9', expiresAt: created.expiresAt, status: 'pending' })
    expect(store.status('token-1')).toEqual({ status: 'pending', result: null })
  })

  test('the default token is 32 random bytes in base64url', () => {
    const store = createDeviceFlowTickets()
    const { token } = store.create('codex')
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(store.create('codex').token).not.toBe(token)
  })

  test('a ticket expires at its deadline, not after', () => {
    const { store, advance } = tickets()
    store.create('codex')
    advance(DEVICE_FLOW_TICKET_TTL_MS - 1)
    expect(store.peek('token-1')?.status).toBe('pending')
    advance(1)
    expect(store.peek('token-1')).toBeNull()
    expect(store.status('token-1')).toEqual({ status: 'expired', result: null })
    expect(store.status('unknown')).toEqual({ status: 'expired', result: null })
  })

  test('only a pending ticket of the same provider can be claimed, and only once', () => {
    const { store } = tickets()
    store.create('codex')
    expect(store.claim('token-1', 'claude')).toBeNull()
    expect(store.claim('token-1', 'codex')?.status).toBe('claimed')
    expect(store.claim('token-1', 'codex')).toBeNull()
    expect(store.claim('missing', 'codex')).toBeNull()
  })

  test('an expired ticket cannot be claimed', () => {
    const { store, advance } = tickets()
    store.create('codex')
    advance(DEVICE_FLOW_TICKET_TTL_MS)
    expect(store.claim('token-1', 'codex')).toBeNull()
  })

  test('a failed attempt releases the claim so the visitor can retry', () => {
    const { store } = tickets()
    store.create('codex')
    store.claim('token-1', 'codex')
    store.release('token-1')
    expect(store.status('token-1').status).toBe('pending')
    expect(store.claim('token-1', 'codex')?.status).toBe('claimed')
  })

  test('completion records the connection; a completed ticket is not released or reclaimed', () => {
    const { store } = tickets()
    store.create('codex')
    store.claim('token-1', 'codex')
    store.complete('token-1', { connectionId: 'conn-1', email: 'u@x' })
    expect(store.status('token-1')).toEqual({ status: 'completed', result: { connectionId: 'conn-1', email: 'u@x' } })
    store.release('token-1')
    expect(store.status('token-1').status).toBe('completed')
    expect(store.claim('token-1', 'codex')).toBeNull()
    store.complete('missing', { connectionId: 'x', email: null })
    expect(store.status('missing').status).toBe('expired')
  })

  test('creating a ticket prunes the expired ones', () => {
    const { store, advance } = tickets()
    store.create('codex')
    advance(DEVICE_FLOW_TICKET_TTL_MS)
    store.create('codex')
    expect(store.size()).toBe(1)
  })

  test('two stores do not share tickets', () => {
    const first = tickets()
    const second = tickets()
    first.store.create('codex')
    expect(second.store.peek('token-1')).toBeNull()
  })
})
