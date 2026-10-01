/**
 * El ramal `peer_message_status` de `be` (`chunk-yg53q7yp.js`), con `WRr`,
 * `GRr`, `R1n`, `jRr` y `Cko` (`chunk-qcy58j4w.js`) y `Ye`
 * (`chunk-yg53q7yp.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import { messagingState } from '../src/uds/messagingState.ts'
import type { OutboundPacer, OutstandingSend } from '../src/uds/messagingState.ts'
import { PEER_MESSAGE_STATUSES, type PeerMessageStatusDeps, peerMessageStatusControlActions } from '../src/uds/peerMessageStatus.ts'

const HANDLER_KEY = 'peer_message_status'

function fakePacer(): OutboundPacer & { credits: string[]; debits: string[] } {
  const credits: string[] = []
  const debits: string[] = []
  return {
    credits,
    debits,
    reserve: () => ({ ok: true, refund: () => {} }),
    credit: target => void credits.push(target),
    debit: target => void debits.push(target),
  }
}

function harness(overrides: Partial<PeerMessageStatusDeps> = {}) {
  const host = {}
  const calls: Array<[string, string, unknown]> = []
  const warnings: string[] = []
  const deps: PeerMessageStatusDeps = {
    host,
    onPeerMessageStatus: (status, destination, detail) => void calls.push([status, destination, detail]),
    warn: message => void warnings.push(message),
    ...overrides,
  }
  const handler = peerMessageStatusControlActions(deps)[HANDLER_KEY]
  if (!handler || typeof handler === 'function') throw new Error('se esperaba un manejador con accepts/handle')
  return { host, calls, warnings, handler }
}

function outstanding(host: object, msgId: string, to: string): OutstandingSend {
  const entry = { msgId, to }
  messagingState(host).receipts.outstandingSends.push(entry)
  return entry
}

function held(host: object, msgId: string, to: string): OutstandingSend {
  const entry = { msgId, to }
  messagingState(host).receipts.awaitingTerminal.push(entry)
  return entry
}

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'

describe('peerMessageStatusControlActions — accepts (guardas de be)', () => {
  test('admite los seis estados y rechaza cualquier otro', () => {
    const { handler } = harness()
    for (const status of PEER_MESSAGE_STATUSES) expect(handler.accepts({ type: 'control', action: HANDLER_KEY, status })).toBe(true)
    expect(handler.accepts({ type: 'control', action: HANDLER_KEY, status: 'weird' })).toBe(false)
  })
})

describe('peerMessageStatusControlActions — handle', () => {
  test('expired con status_detail refused se reporta como refused (s=Cko de e.status)', () => {
    const { host, calls, handler } = harness()
    outstanding(host, A, '/tmp/peer.sock')
    handler.handle({ type: 'control', action: HANDLER_KEY, status: 'expired', status_detail: 'refused', orig_msg_id: A }, undefined as never)
    expect(calls).toEqual([['refused', '/tmp/peer.sock', undefined]])
  })

  test('dropped por queue-full tally por destino y debita el pacer de cada retenido liberado', () => {
    const { host, calls, warnings, handler } = harness()
    const pacer = fakePacer()
    messagingState(host).outbound.pacer = pacer
    held(host, A, '/tmp/peer.sock')
    held(host, B, '/tmp/peer.sock')
    handler.handle(
      { type: 'control', action: HANDLER_KEY, status: 'dropped', drop_reason: 'queue-full', dropped_msg_ids: [A, B] },
      undefined as never,
    )
    expect(pacer.debits).toEqual(['/tmp/peer.sock', '/tmp/peer.sock'])
    expect(calls).toEqual([['dropped', '/tmp/peer.sock', { dropReason: 'queue-full', droppedCount: 2 }]])
    expect(warnings).toEqual([])
  })

  test('dropped con un drop_reason fuera del catálogo lo reporta como undefined (Cko/ke)', () => {
    const { host, calls, handler } = harness()
    held(host, A, '/tmp/peer.sock')
    handler.handle(
      { type: 'control', action: HANDLER_KEY, status: 'dropped', drop_reason: 'invented', dropped_msg_ids: [A] },
      undefined as never,
    )
    expect(calls).toEqual([['dropped', '/tmp/peer.sock', { dropReason: undefined, droppedCount: 1 }]])
  })

  test('dropped sin correlación (ni orig_msg_id ni dropped_msg_ids casan) se avisa y no reporta nada', () => {
    const { calls, warnings, handler } = harness()
    handler.handle({ type: 'control', action: HANDLER_KEY, status: 'dropped', orig_msg_id: A, dropped_msg_ids: [B] }, undefined as never)
    expect(calls).toEqual([])
    expect(warnings).toEqual([`[uds-messaging] peer_message_status dropped: neither orig_msg_id=${A} nor any named id matches an outstanding send`])
  })

  test('held pasa el envío a retenido y acredita el pacer; delivered de un retenido lo cierra y lo debita', () => {
    const { host, calls, handler } = harness()
    const pacer = fakePacer()
    messagingState(host).outbound.pacer = pacer
    outstanding(host, A, '/tmp/peer.sock')

    handler.handle({ type: 'control', action: HANDLER_KEY, status: 'held', orig_msg_id: A }, undefined as never)
    expect(pacer.credits).toEqual(['/tmp/peer.sock'])
    expect(messagingState(host).receipts.outstandingSends).toEqual([])
    expect(messagingState(host).receipts.awaitingTerminal).toEqual([{ msgId: A, to: '/tmp/peer.sock' }])

    handler.handle({ type: 'control', action: HANDLER_KEY, status: 'delivered', orig_msg_id: A }, undefined as never)
    expect(pacer.debits).toEqual(['/tmp/peer.sock'])
    expect(messagingState(host).receipts.awaitingTerminal).toEqual([])
    expect(calls).toEqual([
      ['held', '/tmp/peer.sock', undefined],
      ['delivered', '/tmp/peer.sock', undefined],
    ])
  })

  test('sin envío pendiente que case con orig_msg_id, se avisa y no se reporta nada', () => {
    const { calls, warnings, handler } = harness()
    handler.handle({ type: 'control', action: HANDLER_KEY, status: 'denied', orig_msg_id: A }, undefined as never)
    expect(calls).toEqual([])
    expect(warnings).toEqual([`[uds-messaging] peer_message_status dropped: no outstanding send matches orig_msg_id=${A}`])
  })

  test(`held repetido sobre un envío ya retenido no lo casa (guarda status !== 'held' de WRr)`, () => {
    const { host, calls, warnings, handler } = harness()
    held(host, A, '/tmp/peer.sock')
    handler.handle({ type: 'control', action: HANDLER_KEY, status: 'held', orig_msg_id: A }, undefined as never)
    expect(calls).toEqual([])
    expect(warnings).toEqual([`[uds-messaging] peer_message_status dropped: no outstanding send matches orig_msg_id=${A}`])
    expect(messagingState(host).receipts.awaitingTerminal).toEqual([{ msgId: A, to: '/tmp/peer.sock' }])
  })
})
