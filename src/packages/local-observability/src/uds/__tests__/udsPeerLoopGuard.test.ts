/**
 * El guardián de bucles y el ritmo de salida: `csn`, `LRr`, `Cko`, `NRr`,
 * `$Rr`, `GOt`, `FRr`, `Rko`, `URr`, `zOt` y su fábrica de ritmo (`ie`),
 * de `chunk-qcy58j4w.js`, 2.1.283.
 */
import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_PEER_LOOP_GUARD_LIMITS,
  asKnownDropReason,
  createOutboundPacer,
  createPeerDropReporter,
  createPeerLoopGuard,
  describeDroppedPeerMessage,
  ownAddressHopIds,
  ownHopMask,
  outboundPacingEnabled,
  peerMessageLimits,
  refillTokens,
  remoteEnvironmentBridgeTarget,
  setOwnBridgePeerAddressResolver,
  setOwnUdsHopToken,
} from '../peerLoopGuard.ts'
import { messagingState } from '../messagingState.ts'

describe('DEFAULT_PEER_LOOP_GUARD_LIMITS (csn)', () => {
  test('los seis campos por omisión', () => {
    expect(DEFAULT_PEER_LOOP_GUARD_LIMITS).toEqual({
      bucketCapacity: 30,
      refillPerSecond: 0.5,
      dedupWindowMs: 30000,
      maxSelfHops: 10,
      maxChainLength: 28,
      maxTrackedSenders: 256,
    })
  })
})

describe('refillTokens (M)', () => {
  test('rellena linealmente sin pasar de la capacidad', () => {
    expect(refillTokens(0, 0, 2000, 30, 0.5)).toBe(1)
    expect(refillTokens(29, 0, 1000000, 30, 0.5)).toBe(30)
  })
})

describe('createPeerLoopGuard (LRr)', () => {
  test('admite el primer mensaje de un remitente', () => {
    const guard = createPeerLoopGuard()
    expect(guard.admit({ senderKey: 'a', body: 'hola' })).toEqual({ admitted: true })
  })

  test('el mismo cuerpo dentro de la ventana de deduplicado se rechaza', () => {
    const guard = createPeerLoopGuard({ dedupWindowMs: 1000, now: () => 0 })
    expect(guard.admit({ senderKey: 'a', body: 'x' }).admitted).toBe(true)
    expect(guard.admit({ senderKey: 'a', body: 'x' })).toEqual({ admitted: false, reason: 'duplicate' })
  })

  test('sin la guarda de duplicado, el segundo mensaje también se admitiría (control de anulación)', () => {
    const guard = createPeerLoopGuard({ dedupWindowMs: 0, now: () => 0 })
    expect(guard.admit({ senderKey: 'a', body: 'x' }).admitted).toBe(true)
    expect(guard.admit({ senderKey: 'a', body: 'x' }).admitted).toBe(true)
  })

  test('agotado el cubo de tokens, se rechaza por ritmo', () => {
    const guard = createPeerLoopGuard({ bucketCapacity: 1, refillPerSecond: 0, now: () => 0 })
    expect(guard.admit({ senderKey: 'a', body: '1' }).admitted).toBe(true)
    expect(guard.admit({ senderKey: 'a', body: '2' })).toEqual({ admitted: false, reason: 'rate-limited' })
  })

  test('una cadena de saltos más larga que el tope se rechaza por reenvío desbocado', () => {
    const guard = createPeerLoopGuard({ maxChainLength: 2 })
    const verdict = guard.admit({ senderKey: 'a', body: 'x', hopChain: ['1', '2', '3'] })
    expect(verdict).toEqual({ admitted: false, reason: 'hop-runaway' })
  })

  test('sin la guarda de longitud, esa misma cadena se admitiría (control de anulación)', () => {
    const guard = createPeerLoopGuard({ maxChainLength: 100 })
    expect(guard.admit({ senderKey: 'a', body: 'x', hopChain: ['1', '2', '3'] }).admitted).toBe(true)
  })

  test('bastantes saltos propios en la cadena delatan un bucle', () => {
    const guard = createPeerLoopGuard({ maxSelfHops: 2 })
    const own = new Set(['h1', 'h2'])
    const verdict = guard.admit({ senderKey: 'a', body: 'x', hopChain: ['h1', 'other', 'h2'], ownTokens: own })
    expect(verdict).toEqual({ admitted: false, reason: 'hop-loop' })
  })

  test('sin la guarda de bucle, esa misma cadena se admitiría (control de anulación)', () => {
    const guard = createPeerLoopGuard({ maxSelfHops: 100 })
    const own = new Set(['h1', 'h2'])
    expect(guard.admit({ senderKey: 'a', body: 'x', hopChain: ['h1', 'other', 'h2'], ownTokens: own }).admitted).toBe(true)
  })

  test('trackedSenderCount y el tope de remitentes rastreados', () => {
    const guard = createPeerLoopGuard({ maxTrackedSenders: 2 })
    guard.admit({ senderKey: 'a', body: '1' })
    guard.admit({ senderKey: 'b', body: '1' })
    guard.admit({ senderKey: 'c', body: '1' })
    expect(guard.trackedSenderCount()).toBe(2)
  })
})

describe('asKnownDropReason (Cko)', () => {
  test('los cinco motivos reconocidos pasan tal cual', () => {
    for (const reason of ['rate-limited', 'duplicate', 'hop-loop', 'hop-runaway', 'queue-full']) {
      expect<string | undefined>(asKnownDropReason(reason)).toBe(reason)
    }
  })
  test('cualquier otra cosa es undefined', () => {
    expect(asKnownDropReason('other')).toBeUndefined()
    expect(asKnownDropReason(42)).toBeUndefined()
  })
})

describe('describeDroppedPeerMessage (Rko)', () => {
  test('con nombre, cita el alias y la dirección', () => {
    const text = describeDroppedPeerMessage({ from: 'uds:/tmp/a.sock', name: 'bob', reason: 'rate-limited', suppressed: 0 })
    expect(text).toBe('Dropped a peer message from @bob (uds:/tmp/a.sock): sender exceeded the peer message rate limit.')
  })
  test('con suprimidos, los cuenta en plural', () => {
    const text = describeDroppedPeerMessage({ from: 'uds:/tmp/a.sock', reason: 'duplicate', suppressed: 3 })
    expect(text).toContain('(+3 similar drops suppressed)')
  })
  test('un solo suprimido va en singular', () => {
    const text = describeDroppedPeerMessage({ from: 'uds:/tmp/a.sock', reason: 'duplicate', suppressed: 1 })
    expect(text).toContain('(+1 similar drop suppressed)')
  })
})

describe('createPeerDropReporter (URr)', () => {
  test('el primer recibo de un remitente, en una ventana nueva, se envía de inmediato', () => {
    const reporter = createPeerDropReporter()
    let flushed: string[] | undefined
    reporter.noteDropForReceipt('sender-a', 'm1', ids => {
      flushed = ids
    })
    expect(flushed).toEqual([])
  })

  test('avisos repetidos del mismo (remitente, motivo), dentro de la ventana, se agrupan como suprimidos', () => {
    const reporter = createPeerDropReporter()
    const drop = { from: 'uds:/tmp/a.sock', reason: 'rate-limited' as const, suppressed: 0 }
    const emitted: unknown[] = []
    const unsubscribe = messagingState().ingress.messageDropped.subscribe(value => emitted.push(value))
    reporter.report(drop, 0) // primero: se emite de inmediato
    reporter.report(drop, 10) // dentro de la ventana: se cuenta, no se emite
    reporter.report(drop, 20) // idem
    reporter.report(drop, 60001) // pasada la ventana: se emite con lo suprimido acumulado
    expect(emitted).toEqual([{ ...drop, suppressed: 0 }, { ...drop, suppressed: 2 }])
    unsubscribe()
    reporter.dispose()
  })
})

describe('ownAddressHopIds / setOwnUdsHopToken (FRr / $Rr)', () => {
  test('sin token propio fijado, el conjunto está vacío', () => {
    setOwnUdsHopToken(undefined)
    setOwnBridgePeerAddressResolver(undefined)
    expect(ownAddressHopIds().size).toBe(0)
  })

  test('con token propio fijado, aparece enmascarado — no en claro', () => {
    setOwnUdsHopToken('mi-token-secreto')
    const ids = ownAddressHopIds()
    expect(ids.size).toBe(1)
    expect([...ids][0]).not.toBe('mi-token-secreto')
    expect(ownHopMask('mi-token-secreto')).toBe([...ids][0])
    setOwnUdsHopToken(undefined)
  })

  test('con resolvedor de dirección de puente propia, se añade su máscara', () => {
    setOwnBridgePeerAddressResolver(() => 'bridge:own')
    expect(ownAddressHopIds().size).toBe(1)
    setOwnBridgePeerAddressResolver(undefined)
  })
})

describe('remoteEnvironmentBridgeTarget (Dae)', () => {
  test('sin THYROX_CODE_REMOTE=true, no hay destino', () => {
    expect(remoteEnvironmentBridgeTarget({})).toBeUndefined()
  })
  test('con la variable y un id con forma válida, el id tal cual', () => {
    expect(remoteEnvironmentBridgeTarget({ THYROX_CODE_REMOTE: 'true', THYROX_CODE_REMOTE_SESSION_ID: 'session_abc123' })).toBe('session_abc123')
  })
  test('con un id de forma inválida, undefined', () => {
    expect(remoteEnvironmentBridgeTarget({ THYROX_CODE_REMOTE: 'true', THYROX_CODE_REMOTE_SESSION_ID: 'not-valid' })).toBeUndefined()
  })
})

describe('peerMessageLimits (zOt)', () => {
  test('sin configuración remota, los valores por omisión', () => {
    const limits = peerMessageLimits()
    expect(limits.bucketCapacity).toBe(30)
    expect(limits.maxQueuedPeerMessages).toBe(50)
  })
})

describe('createOutboundPacer (ie)', () => {
  test('reserva, agota y reembolsa', () => {
    const pacer = createOutboundPacer(() => ({ bucketCapacity: 1, refillPerSecond: 0, maxTrackedSenders: 10 }), () => 0)
    const first = pacer.reserve('uds:/tmp/a.sock')
    expect(first.ok).toBe(true)
    const second = pacer.reserve('uds:/tmp/a.sock')
    expect(second.ok).toBe(false)
    if (first.ok) first.refund()
    const third = pacer.reserve('uds:/tmp/a.sock')
    expect(third.ok).toBe(true)
  })

  test('crédito y débito ajustan el cubo sin pasar de la capacidad ni bajar de cero', () => {
    const pacer = createOutboundPacer(() => ({ bucketCapacity: 1, refillPerSecond: 0, maxTrackedSenders: 10 }), () => 0)
    pacer.credit('uds:/tmp/a.sock')
    pacer.debit('uds:/tmp/a.sock')
    pacer.debit('uds:/tmp/a.sock')
    const reservation = pacer.reserve('uds:/tmp/a.sock')
    expect(reservation.ok).toBe(false)
  })
})

describe('outboundPacingEnabled (We)', () => {
  test('sin nada declarado, el ritmo está activo', () => {
    expect(outboundPacingEnabled({})).toBe(true)
  })
  test('THYROX_CODE_HARBOR_KITE_PACING_OFF="true" lo apaga', () => {
    expect(outboundPacingEnabled({ THYROX_CODE_HARBOR_KITE_PACING_OFF: 'true' })).toBe(false)
  })
  test('THYROX_CODE_HARBOR_KITE_PACING_OFF="1" también lo apaga', () => {
    expect(outboundPacingEnabled({ THYROX_CODE_HARBOR_KITE_PACING_OFF: '1' })).toBe(false)
  })
  test('cualquier otro valor no lo apaga (control de anulación)', () => {
    expect(outboundPacingEnabled({ THYROX_CODE_HARBOR_KITE_PACING_OFF: 'nope' })).toBe(true)
  })
})
