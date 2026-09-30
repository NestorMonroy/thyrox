/**
 * Los dos ramales de `be` (`chunk-yg53q7yp.js`) que disparan el aviso de
 * inactividad entre sesiones: `notify_when_idle` y `peer_idle_notice`
 * (`idleNotificationControlActions`, `../src/uds/idleNotification.ts`).
 */
import { describe, expect, test } from 'bun:test'

import type { PeerIdentity } from '../src/uds/inboxConnection.ts'
import { createInboxState } from '../src/uds/inboxState.ts'
import {
  admitPeerIdleNotice,
  idleNotificationControlActions,
  registerOutstandingIdleRequest,
  type SendIdleNotice,
  setOnSubscribed,
  setSendNotice,
  subscribeToIdleNotice,
} from '../src/uds/idleNotification.ts'

const OWN_SOCKET = '/tmp/thyrox-idle-own.sock'
const PEER_SOCKET = '/tmp/thyrox-idle-peer.sock'

function peer(overrides: Partial<PeerIdentity> = {}): PeerIdentity {
  return { pid: undefined, startToken: undefined, ancestry: undefined, origin: undefined, ...overrides }
}

function harness(overrides: { isSelfSent?: (peer: PeerIdentity) => Promise<boolean> } = {}) {
  const host = {}
  const state = createInboxState()
  state.activeSocketPath = OWN_SOCKET
  const actions = idleNotificationControlActions({
    state,
    isSelfSent: overrides.isSelfSent ?? (async () => false),
    host,
  })
  return { host, state, actions }
}

describe('notify_when_idle (be, ramal notify_when_idle)', () => {
  test('marco inválido: ni se suscribe ni se envía nada', async () => {
    const { actions, host } = harness()
    const subscribed: unknown[] = []
    setOnSubscribed(address => void subscribed.push(address), null, host)
    await actions.notify_when_idle({ type: 'control', action: 'notify_when_idle', from: 'uds:' + PEER_SOCKET }, peer())
    expect(subscribed).toEqual([])
  })

  test('buzón propio sin enlazar: no se suscribe', async () => {
    const { actions, host, state } = harness()
    state.activeSocketPath = undefined
    const subscribed: unknown[] = []
    setOnSubscribed(address => void subscribed.push(address), null, host)
    await actions.notify_when_idle({ type: 'control', action: 'notify_when_idle', from: 'uds:' + PEER_SOCKET, msg_id: '11111111-1111-1111-1111-111111111111' }, peer())
    expect(subscribed).toEqual([])
  })

  test('dirección no respondible: no se suscribe', async () => {
    const { actions, host } = harness()
    const subscribed: unknown[] = []
    setOnSubscribed(address => void subscribed.push(address), null, host)
    await actions.notify_when_idle({ type: 'control', action: 'notify_when_idle', from: 'not-a-uds-address', msg_id: '11111111-1111-1111-1111-111111111111' }, peer())
    expect(subscribed).toEqual([])
  })

  test('auto-envío: el destino de respuesta es esta misma sesión, no se suscribe', async () => {
    const { actions, host } = harness()
    const subscribed: unknown[] = []
    setOnSubscribed(address => void subscribed.push(address), null, host)
    await actions.notify_when_idle({ type: 'control', action: 'notify_when_idle', from: 'uds:' + OWN_SOCKET, msg_id: '11111111-1111-1111-1111-111111111111' }, peer())
    expect(subscribed).toEqual([])
  })

  test('suscripción aceptada: se anuncia con la dirección y si el pid quedó verificado', async () => {
    const { actions, host } = harness()
    const subscribed: [string, boolean][] = []
    setOnSubscribed((address, hasVerifiedPeerPid) => void subscribed.push([address, hasVerifiedPeerPid]), null, host)
    const outcome = await actions.notify_when_idle(
      { type: 'control', action: 'notify_when_idle', from: 'uds:' + PEER_SOCKET, msg_id: '11111111-1111-1111-1111-111111111111' },
      peer({ pid: 4242, origin: 'peer' }),
    )
    expect(outcome).toBeUndefined()
    expect(subscribed).toEqual([['uds:' + PEER_SOCKET, true]])
  })

  test('suscripción llena: no se anuncia, y se avisa "unavailable" al peticionario', async () => {
    const { actions, host } = harness()
    for (let pid = 1; pid <= 32; pid++) {
      const outcome = subscribeToIdleNotice('uds:' + PEER_SOCKET, 'uds:' + PEER_SOCKET, `11111111-1111-1111-1111-${String(pid).padStart(12, '0')}`, pid, undefined, true, undefined, false, host)
      expect(outcome).toBe('recorded')
    }
    const subscribed: unknown[] = []
    const sent: Parameters<SendIdleNotice>[] = []
    setOnSubscribed(address => void subscribed.push(address), null, host)
    subscribed.length = 0
    setSendNotice(async (...args) => void sent.push(args), host)
    await actions.notify_when_idle({ type: 'control', action: 'notify_when_idle', from: 'uds:' + PEER_SOCKET, msg_id: '22222222-2222-2222-2222-222222222222' }, peer({ pid: 999, origin: 'peer' }))
    expect(subscribed).toEqual([])
    expect(sent).toHaveLength(1)
    expect(sent[0]?.[1]).toEqual({ orig_msg_id: '22222222-2222-2222-2222-222222222222', state: 'unavailable' })
  })
})

describe('peer_idle_notice (be, ramal peer_idle_notice)', () => {
  test('marco inválido: no admite nada, y la petición saliente sigue viva', async () => {
    const { actions, host } = harness()
    const registered = registerOutstandingIdleRequest('33333333-3333-3333-3333-333333333333', 'peer', 'uds:' + PEER_SOCKET, host)
    expect(registered.ok).toBe(true)
    await actions.peer_idle_notice({ type: 'control', action: 'peer_idle_notice', orig_msg_id: '33333333-3333-3333-3333-333333333333' }, peer())
    expect(admitPeerIdleNotice('33333333-3333-3333-3333-333333333333', 'idle', undefined, undefined, undefined, false, host)).toBe(true)
  })

  test('no correlacionado: no hay petición saliente con ese id, y no llega a mirar la confianza del par', async () => {
    let selfSentCalls = 0
    const { actions, host } = harness({ isSelfSent: async () => (selfSentCalls++, false) })
    await actions.peer_idle_notice({ type: 'control', action: 'peer_idle_notice', orig_msg_id: 'no-such-id', state: 'idle' }, peer())
    expect(selfSentCalls).toBe(0)
    expect(admitPeerIdleNotice('no-such-id', 'idle', undefined, undefined, undefined, false, host)).toBe(false)
  })

  test('ya consumido: una segunda entrega con el mismo id no vuelve a mirar la confianza del par', async () => {
    let selfSentCalls = 0
    const { actions, host } = harness({ isSelfSent: async () => (selfSentCalls++, false) })
    registerOutstandingIdleRequest('44444444-4444-4444-4444-444444444444', 'peer', 'uds:' + PEER_SOCKET, host)
    await actions.peer_idle_notice({ type: 'control', action: 'peer_idle_notice', orig_msg_id: '44444444-4444-4444-4444-444444444444', state: 'idle' }, peer())
    expect(selfSentCalls).toBe(1)
    await actions.peer_idle_notice({ type: 'control', action: 'peer_idle_notice', orig_msg_id: '44444444-4444-4444-4444-444444444444', state: 'idle' }, peer())
    expect(selfSentCalls).toBe(1)
  })
})
