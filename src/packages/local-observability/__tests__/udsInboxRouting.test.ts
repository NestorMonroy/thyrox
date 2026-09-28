/**
 * El despacho de un mensaje del buzón: `Qe`, `be`, `le` e `Ie`
 * (`chunk-yg53q7yp.js`) de 2.1.283. La entrega de un mensaje `user` y las
 * acciones de control con subsistema propio se inyectan (F4c-2..5).
 */
import { describe, expect, test } from 'bun:test'

import type { PeerIdentity } from '../src/uds/inboxConnection.ts'
import { handleInboxMessage, type InboxRoutingDeps, routeInboxMessage, sessionIdMatches } from '../src/uds/inboxRouting.ts'
import { createInboxState } from '../src/uds/inboxState.ts'

const PEER: PeerIdentity = { pid: 7, startToken: 't', ancestry: undefined, origin: 'peer' }

function harness(overrides: Partial<InboxRoutingDeps> = {}) {
  const calls: string[] = []
  const warnings: string[] = []
  const deps: InboxRoutingDeps = {
    state: createInboxState(),
    sessionId: () => 'session-a',
    warn: message => void warnings.push(message),
    deliverUserMessage: async message => void calls.push(`user:${(message as { tag?: string }).tag}`),
    onRename: name => void calls.push(`rename:${name}`),
    controlActions: {
      peer_message_status: async message => void calls.push(`status:${(message as { tag?: string }).tag}`),
    },
    ...overrides,
  }
  return { deps, calls, warnings }
}

describe('sessionIdMatches (Ie)', () => {
  test('sin session_id, o con el de esta sesión, pasa; otro se descarta con aviso', () => {
    const warnings: string[] = []
    const warn = (message: string) => void warnings.push(message)
    expect(sessionIdMatches({ type: 'control' }, 'a', warn)).toBe(true)
    expect(sessionIdMatches({ type: 'control', session_id: 'a' }, 'a', warn)).toBe(true)
    expect(sessionIdMatches({ type: 'control', session_id: 'b' }, 'a', warn)).toBe(false)
    expect(warnings).toEqual(['[uds-messaging] Dropping control message: session_id mismatch (got "b", expected "a")'])
  })
})

describe('handleInboxMessage (be)', () => {
  test('sin type de texto se ignora con aviso', async () => {
    const { deps, calls, warnings } = harness()
    await handleInboxMessage({ nope: 1 }, PEER, deps)
    await handleInboxMessage(null, PEER, deps)
    await handleInboxMessage({ type: 3 }, PEER, deps)
    expect(calls).toEqual([])
    expect(warnings).toEqual(Array(3).fill('[uds-messaging] Ignoring message without valid type field'))
  })

  test('user va a la entrega con la identidad del par', async () => {
    let seen: PeerIdentity | undefined
    const { deps } = harness({ deliverUserMessage: async (_, peer) => void (seen = peer) })
    await handleInboxMessage({ type: 'user' }, PEER, deps)
    expect(seen).toEqual(PEER)
  })

  test('control con otro session_id no llega a ninguna acción', async () => {
    const { deps, calls } = harness()
    await handleInboxMessage({ type: 'control', action: 'rename', name: 'x', session_id: 'otra' }, PEER, deps)
    expect(calls).toEqual([])
  })

  test('rename con nombre de texto llama a onRename; sin nombre, se trata como acción sin manejar', async () => {
    const { deps, calls, warnings } = harness()
    await handleInboxMessage({ type: 'control', action: 'rename', name: 'nuevo' }, PEER, deps)
    await handleInboxMessage({ type: 'control', action: 'rename', name: 4 }, PEER, deps)
    expect(calls).toEqual(['rename:nuevo'])
    expect(warnings).toEqual(['[uds-messaging] Unhandled control action: rename'])
  })

  test('una acción registrada recibe el mensaje y el par; una desconocida se avisa', async () => {
    const { deps, calls, warnings } = harness()
    await handleInboxMessage({ type: 'control', action: 'peer_message_status', tag: 's' }, PEER, deps)
    await handleInboxMessage({ type: 'control', action: 'teleport' }, PEER, deps)
    expect(calls).toEqual(['status:s'])
    expect(warnings).toEqual(['[uds-messaging] Unhandled control action: teleport'])
  })

  test('una acción con guarda que no la acepta cae como sin manejar, igual que las guardas de be', async () => {
    const handled: unknown[] = []
    const { deps, warnings } = harness({
      controlActions: { peer_message_status: { accepts: message => message.status === 'held', handle: message => void handled.push(message.status) } },
    })
    await handleInboxMessage({ type: 'control', action: 'peer_message_status', status: 'held' }, PEER, deps)
    await handleInboxMessage({ type: 'control', action: 'peer_message_status', status: 'weird' }, PEER, deps)
    expect(handled).toEqual(['held'])
    expect(warnings).toEqual(['[uds-messaging] Unhandled control action: peer_message_status'])
  })

  test('una acción heredada del prototipo no cuenta como registrada', async () => {
    const { deps, warnings } = harness()
    await handleInboxMessage({ type: 'control', action: 'toString' }, PEER, deps)
    expect(warnings).toEqual(['[uds-messaging] Unhandled control action: toString'])
  })

  test('un tipo desconocido se avisa, con el tipo saneado', async () => {
    const { deps, warnings } = harness()
    await handleInboxMessage({ type: 'my_token_kind' }, PEER, deps)
    await handleInboxMessage({ type: 'ping' }, PEER, deps)
    expect(warnings).toEqual(['[uds-messaging] Received unhandled message type: (withheld)', '[uds-messaging] Received unhandled message type: ping'])
  })
})

describe('routeInboxMessage (Qe)', () => {
  test('los mensajes normales se procesan en orden aunque el primero tarde', async () => {
    const order: string[] = []
    const { deps } = harness({
      deliverUserMessage: async message => {
        const tag = (message as { tag: string }).tag
        if (tag === 'slow') await Bun.sleep(30)
        order.push(tag)
      },
    })
    routeInboxMessage({ type: 'user', tag: 'slow' }, PEER, deps)
    routeInboxMessage({ type: 'user', tag: 'fast' }, PEER, deps)
    await deps.state.processingChain
    expect(order).toEqual(['slow', 'fast'])
  })

  test('un control (salvo notify_when_idle) y un user con prioridad now sin adjuntos se atienden sin esperar la cadena', async () => {
    const order: string[] = []
    const { deps } = harness({
      deliverUserMessage: async message => {
        const tag = (message as { tag: string }).tag
        if (tag === 'slow') await Bun.sleep(40)
        order.push(tag)
      },
      controlActions: {
        peer_message_status: async () => void order.push('control'),
        notify_when_idle: async () => void order.push('notify'),
      },
    })
    routeInboxMessage({ type: 'user', tag: 'slow' }, PEER, deps)
    routeInboxMessage({ type: 'control', action: 'peer_message_status' }, PEER, deps)
    routeInboxMessage({ type: 'user', tag: 'now', priority: 'now' }, PEER, deps)
    routeInboxMessage({ type: 'user', tag: 'now-with-files', priority: 'now', file_attachments: [] }, PEER, deps)
    routeInboxMessage({ type: 'control', action: 'notify_when_idle' }, PEER, deps)
    await Bun.sleep(5)
    expect(order).toEqual(['control', 'now'])
    await deps.state.processingChain
    expect(order).toEqual(['control', 'now', 'slow', 'now-with-files', 'notify'])
  })

  test('un fallo al procesar se avisa y la cadena sigue', async () => {
    const order: string[] = []
    const { deps, warnings } = harness({
      deliverUserMessage: async message => {
        const tag = (message as { tag: string }).tag
        if (tag === 'bad') throw new Error('boom')
        order.push(tag)
      },
    })
    routeInboxMessage({ type: 'user', tag: 'bad' }, PEER, deps)
    routeInboxMessage({ type: 'user', tag: 'good' }, PEER, deps)
    routeInboxMessage({ type: 'user', tag: 'bad', priority: 'now' }, PEER, deps)
    await deps.state.processingChain
    await Bun.sleep(1)
    expect(order).toEqual(['good'])
    expect(warnings).toEqual(['[uds-messaging] Failed to process message: Error: boom', '[uds-messaging] Failed to process message: Error: boom'])
  })
})
