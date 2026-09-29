/**
 * Las siete acciones de control que despacha `be` (`chunk-yg53q7yp.js`,
 * 2.1.283): `rename` vive en el despacho mismo y las otras seis llegan por
 * `inboxControlActions`. Un marco de cada una tiene que alcanzar su manejador
 * y nunca caer en «Unhandled control action», que es lo que el despacho dice
 * cuando una acción no está cableada.
 */
import { describe, expect, test } from 'bun:test'

import { INBOX_CONTROL_ACTIONS, inboxControlActions } from '../src/uds/controlActions.ts'
import type { PeerIdentity } from '../src/uds/inboxConnection.ts'
import { handleInboxMessage } from '../src/uds/inboxRouting.ts'
import { createInboxState } from '../src/uds/inboxState.ts'

const SESSION = 'session-under-test'
const PEER: PeerIdentity = { pid: undefined, startToken: undefined, ancestry: undefined, origin: undefined }

function harness() {
  const state = createInboxState()
  const warnings: string[] = []
  const statuses: string[] = []
  const controlActions = inboxControlActions({
    peerMessageStatus: { onPeerMessageStatus: status => void statuses.push(status), warn: message => void warnings.push(message), host: {} },
    idleNotification: { state, isSelfSent: async () => false, host: {} },
    artifactReplies: { state, sessionId: () => SESSION, findLiveSession: async () => undefined, isDefinitelyUndelivered: () => false },
  })
  const deps = { state, sessionId: () => SESSION, warn: (message: string) => void warnings.push(message), deliverUserMessage: async () => {}, controlActions }
  return { deps, warnings, statuses }
}

const FRAMES: Record<(typeof INBOX_CONTROL_ACTIONS)[number], Record<string, unknown>> = {
  peer_message_status: { status: 'delivered', orig_msg_id: '11111111-1111-1111-1111-111111111111' },
  notify_when_idle: {},
  peer_idle_notice: {},
  yield_artifact_replies: {},
  unyield_artifact_replies: {},
  artifact_replies_yielded: {},
}

describe('inboxControlActions', () => {
  test('cubre exactamente las seis acciones de be que no son rename', () => {
    const { deps } = harness()
    expect(Object.keys(deps.controlActions).sort()).toEqual([...INBOX_CONTROL_ACTIONS].sort())
    expect([...INBOX_CONTROL_ACTIONS].sort()).toEqual([
      'artifact_replies_yielded',
      'notify_when_idle',
      'peer_idle_notice',
      'peer_message_status',
      'unyield_artifact_replies',
      'yield_artifact_replies',
    ])
  })

  for (const action of Object.keys(FRAMES) as (typeof INBOX_CONTROL_ACTIONS)[number][]) {
    test(`${action} llega a su manejador por el despacho`, async () => {
      const { deps, warnings } = harness()
      await handleInboxMessage({ type: 'control', action, ...FRAMES[action] }, PEER, deps)
      expect(warnings.filter(message => message.includes('Unhandled control action'))).toEqual([])
    })
  }

  test('peer_message_status llega al módulo propio: su aviso es el de «sin envío pendiente»', async () => {
    const { deps, warnings } = harness()
    await handleInboxMessage({ type: 'control', action: 'peer_message_status', ...FRAMES.peer_message_status }, PEER, deps)
    expect(warnings).toEqual([
      '[uds-messaging] peer_message_status dropped: no outstanding send matches orig_msg_id=11111111-1111-1111-1111-111111111111',
    ])
  })
})
