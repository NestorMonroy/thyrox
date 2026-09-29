/**
 * El cliente del buzón: envío (`VOt`, `kee`, `iat`), errores de envío
 * (`MV`, `cG`, `R4e`, `x4e`, `A1n`, `C1n`, `Mae`, `I4e`, `BRr`, `dsn`),
 * recibos (`WRr`, `GRr`, `jRr`, `R1n`) y el rechazo por uid de una conexión
 * de control (`Ako`). `chunk-qcy58j4w.js`, 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createServer, type Server, type Socket } from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  BUSY_PIPE_HINT,
  MAX_UDS_MESSAGE_CHARS,
  UdsSendRefusedError,
  classifySendFailure,
  controlConnectionUidRefusal,
  creditSendPacer,
  debitSendPacer,
  isMessageTooLargeError,
  isNoLiveInboxError,
  isRetryableSendError,
  isSenderPacedError,
  isUnusableInboxError,
  resolveOutstandingReceipt,
  sendControlMessageWithReceipt,
  sendFailureHint,
  sendPeerUserMessage,
  sendToUdsSocket,
  staleSocketHint,
  tallyDroppedReceipts,
} from '../udsClient.ts'
import { messagingState } from '../messagingState.ts'
import { NoLiveInboxError } from '../udsClient.ts'

describe('MAX_UDS_MESSAGE_CHARS (WOt) y el tope de tamaño del envío', () => {
  test('un mensaje que supera el tope se rehúsa como demasiado grande', async () => {
    const huge = 'x'.repeat(MAX_UDS_MESSAGE_CHARS)
    let caught: unknown
    try {
      await sendPeerUserMessage('/tmp/does-not-matter.sock', huge, undefined, undefined, undefined, undefined, undefined)
    } catch (error) {
      caught = error
    }
    expect(isMessageTooLargeError(caught)).toBe(true)
  })

  test('sin ese tope, el mismo mensaje pasaría a intentar la conexión (control de anulación)', async () => {
    // Un mensaje corto no dispara el error de tamaño — llega hasta el intento
    // de conexión real, que falla por otra razón (no hay socket ahí).
    let caught: unknown
    try {
      await sendPeerUserMessage('/tmp/does-not-exist-uds-client-size.sock', 'short', undefined, undefined, undefined, undefined, undefined)
    } catch (error) {
      caught = error
    }
    expect(isMessageTooLargeError(caught)).toBe(false)
  })
})

describe('clasificación de errores de envío', () => {
  test('isNoLiveInboxError (A1n) reconoce ENOENT, ECONNREFUSED y NoLiveInboxError', () => {
    expect(isNoLiveInboxError(Object.assign(new Error('x'), { code: 'ENOENT' }))).toBe(true)
    expect(isNoLiveInboxError(Object.assign(new Error('x'), { code: 'ECONNREFUSED' }))).toBe(true)
    expect(isNoLiveInboxError(new NoLiveInboxError('no-key', 'x'))).toBe(true)
    expect(isNoLiveInboxError(new Error('otro'))).toBe(false)
  })

  test('isUnusableInboxError (C1n) sólo el kind "unusable"', () => {
    expect(isUnusableInboxError(new NoLiveInboxError('unusable', 'x'))).toBe(true)
    expect(isUnusableInboxError(new NoLiveInboxError('no-key', 'x'))).toBe(false)
  })

  test('classifySendFailure (Mae) distingue busy/gone/other', () => {
    expect(classifySendFailure(new NoLiveInboxError('unusable', 'x'))).toBe('busy')
    expect(classifySendFailure(new NoLiveInboxError('no-key', 'x'))).toBe('gone')
    expect(classifySendFailure(Object.assign(new Error('x'), { code: 'EBUSY' }))).toBe('busy')
    expect(classifySendFailure(new Error('otro'))).toBe('other')
  })

  test('sendFailureHint (dsn) y las dos pistas (I4e / BRr)', () => {
    expect(sendFailureHint(new NoLiveInboxError('unusable', 'x'))).not.toBe(BUSY_PIPE_HINT)
    expect(sendFailureHint(new NoLiveInboxError('no-key', 'x'))).toBe(BUSY_PIPE_HINT)
    expect(staleSocketHint('reply_addresses()')).toContain('reply_addresses()')
  })

  test('isRetryableSendError (cG) — control de anulación por tipo de error', () => {
    expect(isRetryableSendError(new UdsSendRefusedError('symlink', 'x'))).toBe(true)
    expect(isRetryableSendError(Object.assign(new Error('x'), { code: 'EBUSY' }))).toBe(true)
    expect(isRetryableSendError(new Error('cualquier otra cosa'))).toBe(false)
  })
})

describe('controlConnectionUidRefusal (Ako)', () => {
  const socket = {} as Socket

  test('el mismo uid no se rechaza', () => {
    const originalGetuid = process.getuid
    process.getuid = (() => 1000) as typeof process.getuid
    expect(controlConnectionUidRefusal(socket, () => 1000)).toBeUndefined()
    process.getuid = originalGetuid
  })

  test('un uid distinto se rechaza con el motivo', () => {
    const originalGetuid = process.getuid
    process.getuid = (() => 1000) as typeof process.getuid
    const reason = controlConnectionUidRefusal(socket, () => 2000)
    expect(reason).toContain('connecting uid 2000 != daemon uid 1000')
    process.getuid = originalGetuid
  })

  test('sin poder leer el uid del par, no se rechaza (no se puede juzgar)', () => {
    const originalGetuid = process.getuid
    process.getuid = (() => 1000) as typeof process.getuid
    expect(controlConnectionUidRefusal(socket, () => null)).toBeUndefined()
    process.getuid = originalGetuid
  })
})

describe('resolveOutstandingReceipt (WRr) y tallyDroppedReceipts (GRr)', () => {
  beforeEach(() => {
    messagingState().receipts.reset()
  })

  test('un envío pendiente que se entrega se retira, no queda retenido', () => {
    messagingState().receipts.outstandingSends.push({ msgId: 'm1', to: 'uds:/tmp/a.sock' })
    const outcome = resolveOutstandingReceipt('m1', 'delivered')
    expect(outcome).toEqual({ destination: 'uds:/tmp/a.sock', wasHeld: false })
    expect(messagingState().receipts.outstandingSends).toEqual([])
    expect(messagingState().receipts.awaitingTerminal).toEqual([])
  })

  test('un estado "held" pasa el envío a retenido, en vez de olvidarlo', () => {
    messagingState().receipts.outstandingSends.push({ msgId: 'm1', to: 'uds:/tmp/a.sock' })
    resolveOutstandingReceipt('m1', 'held')
    expect(messagingState().receipts.awaitingTerminal).toEqual([{ msgId: 'm1', to: 'uds:/tmp/a.sock' }])
  })

  test('un id que no está en lo pendiente no resuelve nada', () => {
    expect(resolveOutstandingReceipt('no-existe', 'delivered')).toBeUndefined()
  })

  test('tallyDroppedReceipts cuenta por destino, y si venía retenido lo distingue', () => {
    messagingState().receipts.outstandingSends.push({ msgId: 'm1', to: 'a' }, { msgId: 'm2', to: 'a' })
    messagingState().receipts.awaitingTerminal.push({ msgId: 'm3', to: 'b' })
    const tallies = tallyDroppedReceipts(['m1', 'm2', 'm3'])
    expect(tallies.get('a')).toEqual({ dropped: 2, wereHeld: 0 })
    expect(tallies.get('b')).toEqual({ dropped: 1, wereHeld: 1 })
  })
})

describe('creditSendPacer (jRr) y debitSendPacer (R1n)', () => {
  beforeEach(() => {
    messagingState().outbound.reset()
  })
  afterEach(() => {
    messagingState().outbound.reset()
  })

  test('sin ritmo de salida creado todavía, no hacen nada (no lanzan)', () => {
    expect(() => creditSendPacer('uds:/tmp/a.sock')).not.toThrow()
    expect(() => debitSendPacer('uds:/tmp/a.sock')).not.toThrow()
  })

  test('con un ritmo de salida instalado, créditan y debitan el cubo del destino canónico', () => {
    const calls: Array<['credit' | 'debit', string]> = []
    messagingState().outbound.pacer = {
      reserve: () => ({ ok: true, refund: () => {} }),
      credit: target => calls.push(['credit', target]),
      debit: target => calls.push(['debit', target]),
    }
    creditSendPacer('uds:/tmp/a.sock')
    debitSendPacer('uds:/tmp/a.sock')
    expect(calls).toEqual([
      ['credit', '/tmp/a.sock'],
      ['debit', '/tmp/a.sock'],
    ])
  })

  test('un destino que no es `uds:` no toca el ritmo (control de anulación)', () => {
    const calls: string[] = []
    messagingState().outbound.pacer = { reserve: () => ({ ok: true, refund: () => {} }), credit: target => calls.push(target), debit: () => {} }
    creditSendPacer('bridge:otra-sesion')
    expect(calls).toEqual([])
  })
})

describe('envío real sobre un socket de escucha (mkdtemp)', () => {
  let dir: string | undefined
  let server: Server | undefined
  let socketPath: string | undefined
  let received: string[] = []

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'uds-client-'))
    socketPath = join(dir, 'peer.sock')
    received = []
    server = createServer(socket => {
      socket.on('data', chunk => received.push(chunk.toString('utf8')))
      socket.on('error', () => {})
    })
    await new Promise<void>(resolve => server!.listen(socketPath, () => resolve()))
  })

  afterEach(async () => {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()))
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  test('sendToUdsSocket entrega la línea al servidor', async () => {
    await sendToUdsSocket(socketPath!, 'hola par')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(received.length).toBe(1)
    const parsed = JSON.parse(received[0]!.trimEnd())
    expect(parsed.type).toBe('user')
    expect(parsed.message.content).toContain('hola par')
  })

  test('sendControlMessageWithReceipt entrega un mensaje de control con su msg_id', async () => {
    const { msgId } = await sendControlMessageWithReceipt(socketPath!, { action: 'ping' })
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(received.length).toBe(1)
    const parsed = JSON.parse(received[0]!.trimEnd())
    expect(parsed.type).toBe('control')
    expect(parsed.action).toBe('ping')
    expect(parsed.msg_id).toBe(msgId)
  })

  test('agotado el cubo de ritmo (mínimo válido: 5 fichas), el siguiente envío se rehúsa por ritmo', async () => {
    const previousFlags = process.env.THYROX_FEATURE_FLAGS
    process.env.THYROX_FEATURE_FLAGS = JSON.stringify({
      tengu_harbor_kite_limits: { bucketCapacity: 5, refillPerSecond: 0.05, dedupWindowMs: 0, maxSelfHops: 10, maxChainLength: 28, maxTrackedSenders: 256, maxQueuedPeerMessages: 50 },
    })
    for (let i = 0; i < 5; i++) await sendPeerUserMessage(socketPath!, `primero-${i}`, undefined, undefined, undefined, undefined, undefined)
    let caught: unknown
    try {
      await sendPeerUserMessage(socketPath!, 'de-mas', undefined, undefined, undefined, undefined, undefined)
    } catch (error) {
      caught = error
    }
    expect(isSenderPacedError(caught)).toBe(true)
    if (previousFlags === undefined) delete process.env.THYROX_FEATURE_FLAGS
    else process.env.THYROX_FEATURE_FLAGS = previousFlags
  })

  test('con cubo amplio, esos mismos seis envíos no se rehúsan (control de anulación)', async () => {
    const previousFlags = process.env.THYROX_FEATURE_FLAGS
    process.env.THYROX_FEATURE_FLAGS = JSON.stringify({
      tengu_harbor_kite_limits: { bucketCapacity: 100, refillPerSecond: 0.05, dedupWindowMs: 0, maxSelfHops: 10, maxChainLength: 28, maxTrackedSenders: 256, maxQueuedPeerMessages: 50 },
    })
    for (let i = 0; i < 5; i++) await sendPeerUserMessage(socketPath!, `primero-${i}`, undefined, undefined, undefined, undefined, undefined)
    let caught: unknown
    try {
      await sendPeerUserMessage(socketPath!, 'de-mas', undefined, undefined, undefined, undefined, undefined)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeUndefined()
    if (previousFlags === undefined) delete process.env.THYROX_FEATURE_FLAGS
    else process.env.THYROX_FEATURE_FLAGS = previousFlags
  })
})
