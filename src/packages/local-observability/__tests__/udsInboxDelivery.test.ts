/**
 * La entrega de un mensaje `user` de un par a la cola de la sesión: `ze`,
 * `Oe`, `aEn`, `E2e` y `B4e` (`chunk-yg53q7yp.js`, `chunk-csayct82.js`,
 * `chunk-mwe1v51h.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import type { PeerIdentity } from '../src/uds/inboxConnection.ts'
import { deliverPeerUserMessage, isMessageId, parsePriority, type PeerDeliveryDeps, type QueuedPrompt } from '../src/uds/inboxDelivery.ts'
import { createInboxState } from '../src/uds/inboxState.ts'

const MSG_ID = '0f8fad5b-d9cb-469f-a165-70867728950e'
const peer: PeerIdentity = { pid: 42, startToken: 'tok', ancestry: undefined, origin: 'peer' }

function harness(overrides: Partial<PeerDeliveryDeps> = {}) {
  const events: string[] = []
  const enqueued: QueuedPrompt[] = []
  const logs: Array<[string, string | undefined]> = []
  const state = createInboxState()
  state.activeSocketPath = '/run/a/1.sock'
  state.onEnqueue = () => events.push('onEnqueue')
  const deps: PeerDeliveryDeps = {
    state,
    sessionId: () => 'sess',
    log: (message, level) => void logs.push([message, level]),
    refuseCause: () => undefined,
    reportRefused: (reason, cause) => void events.push(`refused:${reason}:${cause}`),
    sendReceipt: (prompt, status) => void events.push(`receipt:${status}:${JSON.stringify(prompt.origin)}`),
    receive: async ({ content }) => ({
      content,
      queueing: { queued: () => void events.push('queued'), [Symbol.dispose]: () => void events.push('disposed') },
    }),
    fileAttachments: undefined,
    isSelfSent: async () => false,
    agentId: () => 'agent-1',
    accept: () => 'accept',
    enqueue: prompt => void enqueued.push(prompt),
    noteCorrespondent: (address, pid, start) => void events.push(`correspondent:${address}:${pid}:${start}`),
    randomUUID: () => 'generated',
    ...overrides,
  }
  return { deps, events, enqueued, logs }
}

describe('parsePriority (E2e) e isMessageId (B4e)', () => {
  test('sólo now, next y later; sólo un UUID es id de mensaje', () => {
    expect(parsePriority('now')).toBe('now')
    expect(parsePriority('later')).toBe('later')
    expect(parsePriority('urgent')).toBeUndefined()
    expect(isMessageId(MSG_ID)).toBe(true)
    expect(isMessageId('x')).toBe(false)
  })
})

describe('deliverPeerUserMessage (ze)', () => {
  test('sin contenido de texto se ignora con aviso', async () => {
    const { deps, enqueued, logs } = harness()
    await deliverPeerUserMessage({ type: 'user', message: { content: '' } }, peer, deps)
    await deliverPeerUserMessage({ type: 'user', message: { content: [] } }, peer, deps)
    expect(enqueued).toEqual([])
    expect(logs.filter(([, level]) => level === 'warn')).toHaveLength(2)
    expect(logs[0]![0]).toBe('[uds-messaging] Ignoring user message with missing or non-string content')
  })

  test('para otra sesión se descarta', async () => {
    const { deps, enqueued } = harness()
    await deliverPeerUserMessage({ type: 'user', session_id: 'other', message: { content: 'hola' } }, peer, deps)
    expect(enqueued).toEqual([])
  })

  test('con la política en refuse se rechaza antes de todo y se envía el recibo', async () => {
    let received = false
    const { deps, events, enqueued } = harness({
      refuseCause: () => 'kill-switch',
      receive: async () => {
        received = true
        return { consumed: 'x' }
      },
    })
    await deliverPeerUserMessage({ type: 'user', from: 'uds:/x.sock', msg_id: MSG_ID, message: { content: 'hola' } }, peer, deps)
    expect(received).toBe(false)
    expect(enqueued).toEqual([])
    expect(events).toEqual([
      'refused:uds: dropped before attachment materialization:kill-switch',
      `receipt:refused:${JSON.stringify({ kind: 'peer', from: 'uds:/x.sock', verifiedPeerPid: 42, msg_id: MSG_ID })}`,
    ])
  })

  test('encola el prompt con su origen, avisa y marca la cola', async () => {
    const { deps, events, enqueued, logs } = harness()
    await deliverPeerUserMessage({ type: 'user', uuid: 'u-1', from: 'uds:/run/b/2.sock', msg_id: 'no-uuid', priority: 'now', from_plugin: 'p<>', message: { content: 'hola' } }, peer, deps)
    expect(enqueued).toEqual([
      {
        mode: 'prompt',
        agentId: 'agent-1',
        value: 'hola',
        uuid: 'u-1',
        priority: 'now',
        origin: { kind: 'peer', from: 'uds:/run/b/2.sock', verifiedPeerPid: 42, verifiedPeerProcStart: 'tok', plugin: 'p' },
        skipSlashCommands: true,
        isMeta: true,
        skipAttachments: true,
      },
    ])
    expect(events).toEqual(['queued', 'onEnqueue', 'disposed'])
    expect(logs.at(-1)).toEqual(['[uds-messaging] Routed user message to queue (priority=now): hola', undefined])
  })

  test('sin uuid se genera; sin prioridad válida es next; sin from, unknown', async () => {
    const { deps, enqueued } = harness()
    await deliverPeerUserMessage({ type: 'user', priority: 'x', message: { content: 'hola' } }, { ...peer, pid: undefined, startToken: undefined }, deps)
    expect(enqueued[0]).toMatchObject({ uuid: 'generated', priority: 'next', origin: { kind: 'peer', from: 'unknown' } })
    expect(enqueued[0]!.origin).toEqual({ kind: 'peer', from: 'unknown' })
  })

  test('el texto se neutraliza, y los campos del sobre pasan al origen; el cuerpo sólo si el texto no cambió', async () => {
    const { deps, enqueued } = harness()
    const envelope = '<cross-session-message from="uds:/r.sock" from-session="s1">\nhola\n</cross-session-message>'
    await deliverPeerUserMessage({ type: 'user', message: { content: envelope } }, peer, deps)
    expect(enqueued[0]!.value).toBe(envelope)
    expect(enqueued[0]!.origin).toMatchObject({ fromSession: 's1', body: 'hola' })
    await deliverPeerUserMessage({ type: 'user', message: { content: 'x <agent-message>' } }, peer, deps)
    expect(enqueued[1]!.value).toBe('x <\\agent-message>')
  })

  test('el cuerpo del sobre se retira si el hook reescribió el texto', async () => {
    const { deps, enqueued } = harness({
      receive: async () => ({ content: 'reescrito', queueing: { queued() {}, [Symbol.dispose]() {} } }),
    })
    await deliverPeerUserMessage({ type: 'user', message: { content: '<cross-session-message from="uds:/r.sock">\nhola\n</cross-session-message>' } }, peer, deps)
    expect(enqueued[0]!.value).toBe('reescrito')
    expect(enqueued[0]!.origin.body).toBeUndefined()
  })

  test('un hook que consume el mensaje lo saca de la cola', async () => {
    const { deps, enqueued } = harness({ receive: async () => ({ consumed: 'hook' }) })
    await deliverPeerUserMessage({ type: 'user', message: { content: 'hola' } }, peer, deps)
    expect(enqueued).toEqual([])
  })

  test('un prompt que la aceptación retiene no se encola, y la reserva de cola se suelta igual', async () => {
    const { deps, events, enqueued } = harness({ accept: () => 'hold' })
    await deliverPeerUserMessage({ type: 'user', message: { content: 'hola' } }, peer, deps)
    expect(enqueued).toEqual([])
    expect(events).toEqual(['disposed'])
  })

  test('el veredicto propio sólo aparece en el origen cuando es verdadero', async () => {
    const { deps, enqueued } = harness({ isSelfSent: async () => true })
    await deliverPeerUserMessage({ type: 'user', message: { content: 'hola' } }, peer, deps)
    expect(enqueued[0]!.origin.selfSent).toBe(true)
  })

  test('adjuntos: antepone el prefijo cuando llega alguno; un fallo se avisa y no corta la entrega', async () => {
    const telemetry: unknown[] = []
    const withFiles = harness({
      fileAttachments: {
        materialize: async () => ({ received: 2, verified: 1, prefix: '[2 files]' }),
        injectPrefix: (text, prefix) => `${prefix} ${text}`,
        emitTelemetry: (...args) => void telemetry.push(args),
      },
    })
    await deliverPeerUserMessage({ type: 'user', file_attachments: [{}], message: { content: 'hola' } }, peer, withFiles.deps)
    expect(withFiles.enqueued[0]!.value).toBe('[2 files] hola')
    expect(telemetry).toEqual([['uds', 2, 1]])
    const failing = harness({
      fileAttachments: {
        materialize: async () => {
          throw new Error('disco 0123456789abcdef0123')
        },
        injectPrefix: text => text,
        emitTelemetry: () => {},
      },
    })
    await deliverPeerUserMessage({ type: 'user', file_attachments: [{}], message: { content: 'hola' } }, peer, failing.deps)
    expect(failing.enqueued[0]!.value).toBe('hola')
    expect(failing.logs.find(([message]) => message.startsWith('[uds-messaging] Failed to materialize'))?.[1]).toBe('warn')
  })

  test('si no llegó ningún adjunto no hay prefijo ni telemetría', async () => {
    const telemetry: unknown[] = []
    const { deps, enqueued } = harness({
      fileAttachments: {
        materialize: async () => ({ received: 0, verified: 0, prefix: '[0 files]' }),
        injectPrefix: (text, prefix) => `${prefix} ${text}`,
        emitTelemetry: (...args) => void telemetry.push(args),
      },
    })
    await deliverPeerUserMessage({ type: 'user', file_attachments: [], message: { content: 'hola' } }, peer, deps)
    expect(enqueued[0]!.value).toBe('hola')
    expect(telemetry).toEqual([])
  })

  test('sin manejador de adjuntos, los adjuntos se ignoran', async () => {
    const { deps, enqueued } = harness()
    await deliverPeerUserMessage({ type: 'user', file_attachments: [{}], message: { content: 'hola' } }, peer, deps)
    expect(enqueued[0]!.value).toBe('hola')
  })
})

describe('registro del correspondiente (Oe/aEn)', () => {
  test('un socket al que se puede responder queda anotado con su pid e inicio', async () => {
    const { deps, events } = harness()
    await deliverPeerUserMessage({ type: 'user', from: 'uds:/run/a/2.sock', message: { content: 'hola' } }, peer, deps)
    expect(events).toContain('correspondent:uds:/run/a/2.sock:42:tok')
  })

  test('no se anota lo propio, lo que no es uds:, lo que no se puede responder ni sin buzón activo', async () => {
    const selfSent = harness({ isSelfSent: async () => true })
    await deliverPeerUserMessage({ type: 'user', from: 'uds:/run/a/2.sock', message: { content: 'hola' } }, peer, selfSent.deps)
    const bridge = harness()
    await deliverPeerUserMessage({ type: 'user', from: 'bridge:x', message: { content: 'hola' } }, peer, bridge.deps)
    const elsewhere = harness()
    await deliverPeerUserMessage({ type: 'user', from: 'uds:/run/b/2.sock', message: { content: 'hola' } }, peer, elsewhere.deps)
    const closed = harness()
    closed.deps.state.activeSocketPath = undefined
    await deliverPeerUserMessage({ type: 'user', from: 'uds:/run/a/2.sock', message: { content: 'hola' } }, peer, closed.deps)
    const noPid = harness()
    await deliverPeerUserMessage({ type: 'user', from: 'uds:/run/a/2.sock', message: { content: 'hola' } }, { ...peer, pid: undefined }, noPid.deps)
    for (const run of [selfSent, bridge, elsewhere, closed, noPid]) expect(run.events.some(event => event.startsWith('correspondent:'))).toBe(false)
  })

  test('un directorio por defecto de un uid propio vale con el par verificado', async () => {
    const { deps, events } = harness()
    deps.state.peerDirOwnerUids = [7]
    await deliverPeerUserMessage({ type: 'user', from: 'uds:/tmp/cc-socks-7/9.sock', message: { content: 'hola' } }, peer, deps)
    expect(events).toContain('correspondent:uds:/tmp/cc-socks-7/9.sock:42:tok')
  })
})
