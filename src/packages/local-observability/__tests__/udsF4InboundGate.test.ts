/**
 * La compuerta de entrada de pares: `E7e`, `abt`, `lbt`, `anr`, `kJr`, `cbt`,
 * `k7e`, `lnr`, `dbt`, `cnr`, `ubt`, `pbt`, `T7e`, `tSe`, `dnr`, `fbt`,
 * `mbt`, `gbt`, `hbt`, `A7e`, `C7e`, `pnr`, `nSe`, `rSe`, `R7e`, `TJr`,
 * `x7e`, `fnr` (`chunk-dv9ctjss.js`) y `f9r` (`chunk-yg53q7yp.js`) de
 * 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import type { InboundPolicyReaders } from '../src/uds/inboundPolicy.ts'
import {
  announcedHoldCause,
  classifyInboundOrigin,
  currentModeClassForTelemetry,
  currentRefuseCause,
  gateHostInjectedMessage,
  gateInboundMessage,
  gatePeerMessage,
  heldMessageCount,
  heldMessages,
  inboundGateStatus,
  isCrossSessionMessage,
  isShuttingDown,
  kiteModeEmitEnabled,
  modeClassLabel,
  peerVerdictStatus,
  publishAvailability,
  refuseCauseForOrigin,
  reportRefused,
  resolveHeldMessage,
  sendRefusalReceipt,
  settleHeldMessagesAsExpired,
  wireCurrentModeGetter,
  wireOnPeerHeld,
  wireOnPeerHoldDropped,
  wireOnPeerHoldReleased,
  wirePublishAvailability,
  wireRecordCorrespondent,
  wireSendPeerReceipt,
  type InboundGateDeps,
} from '../src/uds/inboundGate.ts'
import { InboundState, type HeldPeerMessage } from '../src/uds/messagingState.ts'

function readers(value: 'accept' | 'hold' | 'refuse' | undefined): InboundPolicyReaders {
  return {
    isSourceEnabled: () => value !== undefined,
    settingFor: () => value,
    hasInvalidSettingWarning: () => false,
  }
}

function harness(overrides: Partial<InboundGateDeps> = {}) {
  const state = new InboundState()
  const receipts: Array<{ message: unknown; status: string; extra?: unknown }> = []
  const dropped: HeldPeerMessage[] = []
  const heldEvents: HeldPeerMessage[] = []
  const released: HeldPeerMessage[] = []
  const correspondents: unknown[] = []
  state.sendPeerReceipt = (...args: unknown[]) => void receipts.push({ message: args[0], status: args[1] as string, extra: args[2] })
  state.onPeerHoldDropped = (...args: unknown[]) => void dropped.push(args[0] as HeldPeerMessage)
  state.onPeerHeld = (...args: unknown[]) => void heldEvents.push(args[0] as HeldPeerMessage)
  state.onPeerHoldReleased = (...args: unknown[]) => void released.push(args[0] as HeldPeerMessage)
  state.recordCorrespondent = (...args: unknown[]) => void correspondents.push(args[0])
  const deps: InboundGateDeps = {
    state,
    checkFeatureGate: (_gate, defaultValue) => defaultValue,
    crossSessionMessagingEnabled: () => true,
    nonInteractive: () => false,
    agentId: () => 'agent-1',
    admitForDelivery: () => ({ admitted: true }),
    subscribeToSettingsRefresh: () => () => {},
    policyReaders: readers(undefined),
    ...overrides,
  }
  return { deps, state, receipts, dropped, heldEvents, released, correspondents }
}

function peerMessage(overrides: Partial<HeldPeerMessage> = {}): HeldPeerMessage {
  return { origin: { kind: 'peer', from: 'uds:/a.sock' }, value: 'hola', ...overrides }
}

describe('classifyInboundOrigin (mbt) y refuseCauseForOrigin (A7e)', () => {
  test('sin origen es ungated; peer, host-injected y coordinator por forma', () => {
    expect(classifyInboundOrigin(undefined)).toBe('ungated')
    expect(classifyInboundOrigin({ kind: 'peer' })).toBe('peer')
    expect(classifyInboundOrigin({ kind: 'peer', hostInjected: true })).toBe('host-injected')
    expect(classifyInboundOrigin({ kind: 'task-notification', subkind: 'peer-send-message' })).toBe('coordinator')
    expect(classifyInboundOrigin({ kind: 'task-notification', subkind: 'other' })).toBe('ungated')
  })

  test('ungated nunca tiene causa de rechazo', () => {
    const { deps } = harness()
    expect(refuseCauseForOrigin(undefined, deps)).toBeUndefined()
  })

  test('coordinator y host-injected miran sólo la política explícita, no el interruptor', () => {
    const { deps } = harness({ crossSessionMessagingEnabled: () => false, policyReaders: readers('refuse') })
    expect(refuseCauseForOrigin({ kind: 'task-notification', subkind: 'peer-send-message' }, deps)).toBe('opt-out')
    expect(refuseCauseForOrigin({ kind: 'peer', hostInjected: true }, deps)).toBe('opt-out')
  })

  test('peer sí ve el interruptor', () => {
    const { deps } = harness({ crossSessionMessagingEnabled: () => false })
    expect(refuseCauseForOrigin({ kind: 'peer' }, deps)).toBe('kill-switch')
  })
})

describe('isCrossSessionMessage (gbt)', () => {
  test('un sobre marcado como peer siempre cuenta', () => {
    expect(isCrossSessionMessage({ ingressOrigin: undefined, inboundOrigin: undefined, envelopePeer: true })).toBe(true)
  })

  test('un origen ungated y sin el origen de mcp_send_message no cuenta', () => {
    expect(isCrossSessionMessage({ ingressOrigin: undefined, inboundOrigin: 'other' })).toBe(false)
  })

  test('mcp_send_message cuenta aunque el origen sea ungated', () => {
    expect(isCrossSessionMessage({ ingressOrigin: undefined, inboundOrigin: 'mcp_send_message' })).toBe(true)
  })

  test('un par verificado por el bridge de slack no cuenta por sí solo', () => {
    expect(isCrossSessionMessage({ ingressOrigin: { kind: 'peer', inbound_origin: 'slack_bot' }, inboundOrigin: 'other' })).toBe(false)
  })

  test('un par sin verificar cuenta', () => {
    expect(isCrossSessionMessage({ ingressOrigin: { kind: 'peer' }, inboundOrigin: 'other' })).toBe(true)
  })
})

describe('la política de la compuerta: acepta, retiene y rechaza (H/k vía gatePeerMessage)', () => {
  test('política explícita accept: pasa aunque el modo esté sin cablear', () => {
    const { deps, receipts } = harness({ policyReaders: readers('accept') })
    expect(gatePeerMessage(peerMessage(), deps)).toBe('accept')
    expect(receipts).toEqual([])
  })

  test('política explícita hold: retiene y avisa held', () => {
    const { deps, state, receipts } = harness({ policyReaders: readers('hold') })
    const message = peerMessage()
    expect(gatePeerMessage(message, deps)).toBe('held')
    expect(state.held).toEqual([message])
    expect(receipts.at(-1)).toMatchObject({ status: 'held' })
  })

  test('política explícita refuse: rechaza con recibo refused', () => {
    const { deps, receipts } = harness({ policyReaders: readers('refuse') })
    expect(gatePeerMessage(peerMessage(), deps)).toBe('refused')
    expect(receipts).toEqual([{ message: peerMessage(), status: 'refused' }])
  })

  test('interruptor de apagado (Ws): rechaza con causa kill-switch antes que nada más', () => {
    const { deps } = harness({ crossSessionMessagingEnabled: () => false, policyReaders: readers('accept') })
    expect(peerVerdictStatus(undefined, deps)).toBe('refuse')
  })

  test('sin política y sin modo cableado: retiene por modo desconocido', () => {
    const { deps } = harness()
    expect(gatePeerMessage(peerMessage(), deps)).toBe('held')
    expect(inboundGateStatus(deps)).toBe('hold')
  })

  test('sin política, modo no reconocido: retiene por modo desconocido', () => {
    const { deps } = harness()
    deps.state.getCurrentMode = () => ({ mode: 'unheard-of' })
    expect(gatePeerMessage(peerMessage(), deps)).toBe('held')
  })

  test('sin política, modo declarado y hint que no coincide: modo cambiado', () => {
    const { deps } = harness()
    deps.state.getCurrentMode = () => ({ mode: 'default' })
    const message = peerMessage({ origin: { kind: 'peer', fromMode: 'bypass' } })
    expect(gatePeerMessage(message, deps)).toBe('held')
    expect(announcedHoldCause(message, deps.state)).toBe('mode-mismatch')
  })

  test('sin política, hint que coincide con el modo actual: acepta', () => {
    const { deps } = harness({ checkFeatureGate: () => true })
    deps.state.getCurrentMode = () => ({ mode: 'bypassPermissions' })
    const message = peerMessage({ origin: { kind: 'peer', fromMode: 'bypass' } })
    expect(gatePeerMessage(message, deps)).toBe('accept')
  })

  test('sin política, en bypass y sin modo asertado: retiene por no-mode-asserted', () => {
    const { deps } = harness({ checkFeatureGate: () => false })
    deps.state.getCurrentMode = () => ({ mode: 'bypassPermissions' })
    const message = peerMessage()
    expect(gatePeerMessage(message, deps)).toBe('held')
    expect(announcedHoldCause(message, deps.state)).toBe('no-mode-asserted')
  })

  test('sin política, en modo prompting y sin modo asertado: acepta', () => {
    const { deps } = harness({ checkFeatureGate: () => false })
    deps.state.getCurrentMode = () => ({ mode: 'default' })
    expect(gatePeerMessage(peerMessage(), deps)).toBe('accept')
  })

  test('un mensaje propio (selfSent) siempre acepta, sin importar el modo', () => {
    const { deps } = harness()
    const message = peerMessage({ origin: { kind: 'peer', selfSent: true } })
    expect(gatePeerMessage(message, deps)).toBe('accept')
  })

  test('host-injected siempre honra el modo declarado, feature flag apagada o no', () => {
    const { deps } = harness({ checkFeatureGate: () => false })
    deps.state.getCurrentMode = () => ({ mode: 'default' })
    const message = peerMessage({ origin: { kind: 'peer', fromMode: 'bypass' } })
    expect(gateHostInjectedMessage(message, deps)).toBe('held')
  })

  test('gateInboundMessage despacha por clasificación', () => {
    const { deps } = harness({ policyReaders: readers('accept') })
    expect(gateInboundMessage(undefined, peerMessage(), deps)).toBe('accept')
    expect(gateInboundMessage({ kind: 'peer' }, peerMessage(), deps)).toBe('accept')
  })

  test('coordinator sin política explícita pasa directo, sin tocar la cola', () => {
    const { deps } = harness()
    const message = peerMessage({ origin: { kind: 'task-notification', subkind: 'peer-send-message' } })
    expect(gateInboundMessage({ kind: 'task-notification', subkind: 'peer-send-message' }, message, deps)).toBe('accept')
    expect(deps.state.held).toEqual([])
  })

  test('coordinator con política explícita sí pasa por la cola', () => {
    const { deps } = harness({ policyReaders: readers('hold') })
    const message = peerMessage({ origin: { kind: 'task-notification', subkind: 'peer-send-message' } })
    expect(gateInboundMessage({ kind: 'task-notification', subkind: 'peer-send-message' }, message, deps)).toBe('held')
  })
})

describe('la retención y su desenlace (R7e)', () => {
  test('gone: un mensaje que ya no está retenido', () => {
    const { deps } = harness()
    expect(resolveHeldMessage(peerMessage(), 'approve', deps)).toBe('gone')
  })

  test('delivered: aprobado y admitido', () => {
    const { deps, receipts } = harness({ policyReaders: readers('accept') })
    const message = peerMessage()
    deps.state.held.push(message)
    expect(resolveHeldMessage(message, 'approve', deps)).toBe('delivered')
    expect(receipts.at(-1)).toMatchObject({ status: 'delivered' })
  })

  test('dropped: aprobado pero la política ya es refuse', () => {
    const { deps, receipts } = harness({ policyReaders: readers('refuse') })
    const message = peerMessage()
    deps.state.held.push(message)
    expect(resolveHeldMessage(message, 'approve', deps)).toBe('dropped')
    expect(receipts.at(-1)).toMatchObject({ status: 'refused' })
  })

  test('dropped-by-guard: aprobado, la política acepta, pero el guardián de ingreso lo rechaza', () => {
    const { deps } = harness({ policyReaders: readers('accept'), admitForDelivery: () => ({ admitted: false, reason: 'dup' }) })
    const message = peerMessage()
    deps.state.held.push(message)
    expect(resolveHeldMessage(message, 'approve', deps)).toBe('dropped-by-guard')
  })

  test('denied: se deniega explícitamente', () => {
    const { deps, receipts } = harness()
    const message = peerMessage()
    deps.state.held.push(message)
    expect(resolveHeldMessage(message, 'deny', deps)).toBe('dropped')
    expect(receipts.at(-1)).toMatchObject({ status: 'denied' })
  })

  test('expired: se cancela o vence', () => {
    const { deps, receipts } = harness()
    const message = peerMessage()
    deps.state.held.push(message)
    expect(resolveHeldMessage(message, 'expire', deps)).toBe('dropped')
    expect(receipts.at(-1)).toMatchObject({ status: 'expired' })
  })
})

describe('publishAvailability (k7e), reportRefused (nSe) y currentRefuseCause (C7e)', () => {
  test('disponible cuando la política no rechaza', () => {
    const { deps, state } = harness({ policyReaders: readers('accept') })
    const published: unknown[] = []
    state.publishAvailability = (...args: unknown[]) => void published.push(args[0])
    publishAvailability(deps)
    expect(published).toEqual([true])
    expect(currentRefuseCause(deps)).toBeUndefined()
  })

  test('no disponible cuando refuse', () => {
    const { deps, state } = harness({ policyReaders: readers('refuse') })
    const published: unknown[] = []
    state.publishAvailability = (...args: unknown[]) => void published.push(args[0])
    publishAvailability(deps)
    expect(published).toEqual([false])
    expect(currentRefuseCause(deps)).toBe('opt-out')
  })

  test('reportRefused distingue el interruptor de un refuse explícito', () => {
    const { deps } = harness()
    expect(() => reportRefused('x', 'kill-switch', deps)).not.toThrow()
    expect(() => reportRefused('x', 'opt-out', deps)).not.toThrow()
  })
})

describe('la cola de retenidos: getters y anulación de cada guarda', () => {
  test('heldMessages, heldMessageCount, isShuttingDown y announcedHoldCause', () => {
    const { deps, state } = harness({ policyReaders: readers('hold') })
    const message = peerMessage()
    gatePeerMessage(message, deps)
    expect(heldMessages(state)).toEqual([message])
    expect(heldMessageCount(state)).toBe(1)
    expect(isShuttingDown(state)).toBe(false)
    expect(announcedHoldCause(message, state)).toBeDefined()
    expect(announcedHoldCause(peerMessage(), state)).toBeUndefined()
  })

  test('el tope de retenidos desaloja al más viejo como expired (anulación: sin tope, no se desaloja)', () => {
    const { deps, state, receipts } = harness({ policyReaders: readers('hold') })
    for (let i = 0; i < 101; i++) gatePeerMessage(peerMessage({ value: `m${i}` }), deps)
    expect(state.held).toHaveLength(100)
    expect(state.held[0]).toMatchObject({ value: 'm1' })
    expect(receipts.some(r => r.status === 'expired')).toBe(true)
  })

  test('en apagado, un mensaje que llega tarde se resuelve expired en vez de retenerse', () => {
    const { deps, state, receipts } = harness({ policyReaders: readers('hold') })
    state.shuttingDown = true
    expect(gatePeerMessage(peerMessage(), deps)).toBe('refused')
    expect(state.held).toEqual([])
    expect(receipts.at(-1)).toMatchObject({ status: 'expired' })
  })
})

describe('settleHeldMessagesAsExpired (dbt) y wireCurrentModeGetter (abt)', () => {
  test('al apagar, cada retenido se resuelve expired y se marca shuttingDown', async () => {
    const { deps, state, receipts, dropped } = harness({ policyReaders: readers('hold') })
    gatePeerMessage(peerMessage(), deps)
    await settleHeldMessagesAsExpired(deps)
    expect(state.shuttingDown).toBe(true)
    expect(state.held).toEqual([])
    expect(receipts.filter(r => r.status === 'expired')).toHaveLength(1)
    expect(dropped).toHaveLength(1)
  })

  test('sin retenidos, apagar no hace nada más que marcar el estado', async () => {
    const { deps, state } = harness()
    await settleHeldMessagesAsExpired(deps)
    expect(state.shuttingDown).toBe(true)
  })

  test('cablear un getter reactiva shuttingDown en falso y reevalúa la disponibilidad', () => {
    const { deps, state } = harness({ policyReaders: readers('accept') })
    state.shuttingDown = true
    wireCurrentModeGetter(() => ({ mode: 'default' }), deps)
    expect(state.shuttingDown).toBe(false)
    expect(state.getCurrentMode).not.toBeNull()
  })

  test('descablear retiene sólo el mode (divergencia forzada por messagingState.ts)', () => {
    const { deps, state } = harness()
    wireCurrentModeGetter(() => ({ mode: 'bypassPermissions', isBypassPermissionsModeAvailable: true }), deps)
    wireCurrentModeGetter(null, deps)
    expect(state.modeAtUnwire).toBe('bypassPermissions')
  })

  test('descablear con un getter que lanza deja modeAtUnwire indefinido', () => {
    const { deps, state } = harness()
    state.getCurrentMode = () => {
      throw new Error('boom')
    }
    wireCurrentModeGetter(null, deps)
    expect(state.modeAtUnwire).toBeUndefined()
  })
})

describe('currentModeClassForTelemetry (f9r)', () => {
  test('apagada la compuerta de kite mode, no reporta nada', () => {
    const { deps } = harness({ checkFeatureGate: () => false })
    deps.state.getCurrentMode = () => ({ mode: 'bypassPermissions' })
    expect(currentModeClassForTelemetry(deps)).toBeUndefined()
  })

  test('con getter cableado, usa el modo actual', () => {
    const { deps } = harness({ checkFeatureGate: () => true })
    deps.state.getCurrentMode = () => ({ mode: 'bypassPermissions' })
    expect(currentModeClassForTelemetry(deps)).toBe('bypass')
  })

  test('sin getter, cae al mode retenido al descablear', () => {
    const { deps } = harness({ checkFeatureGate: () => true })
    deps.state.modeAtUnwire = 'default'
    expect(currentModeClassForTelemetry(deps)).toBe('prompting')
  })

  test('sin getter ni mode retenido, indefinido', () => {
    const { deps } = harness({ checkFeatureGate: () => true })
    expect(currentModeClassForTelemetry(deps)).toBeUndefined()
  })

  test('un getter que lanza no propaga: indefinido', () => {
    const { deps } = harness({ checkFeatureGate: () => true })
    deps.state.getCurrentMode = () => {
      throw new Error('boom')
    }
    expect(currentModeClassForTelemetry(deps)).toBeUndefined()
  })
})

describe('kiteModeEmitEnabled (E7e) y modeClassLabel (T7e/S)', () => {
  test('delega en la compuerta de feature flag con su default', () => {
    expect(kiteModeEmitEnabled(() => true)).toBe(true)
    expect(kiteModeEmitEnabled(() => false)).toBe(false)
  })

  test('bypassPermissions siempre es bypass; plan sólo si está disponible y es interactivo', () => {
    expect(modeClassLabel({ mode: 'bypassPermissions' }, false)).toBe('bypass')
    expect(modeClassLabel({ mode: 'plan', isBypassPermissionsModeAvailable: true }, false)).toBe('bypass')
    expect(modeClassLabel({ mode: 'plan', isBypassPermissionsModeAvailable: true }, true)).toBe('prompting')
    expect(modeClassLabel({ mode: 'default' }, false)).toBe('prompting')
  })
})

describe('el cableado de callbacks (lbt/anr/lnr/ubt/pbt/cbt) y el recibo vacío (kJr)', () => {
  test('cada wire deja el callback puesto, y null lo retira', () => {
    const state = new InboundState()
    const cb = () => {}
    wireOnPeerHeld(cb, state)
    expect(state.onPeerHeld).toBe(cb)
    wireOnPeerHeld(null, state)
    expect(state.onPeerHeld).toBeNull()
    wireSendPeerReceipt(cb, state)
    expect(state.sendPeerReceipt).toBe(cb)
    wireRecordCorrespondent(cb, state)
    expect(state.recordCorrespondent).toBe(cb)
    wireOnPeerHoldDropped(cb, state)
    expect(state.onPeerHoldDropped).toBe(cb)
    wireOnPeerHoldReleased(cb, state)
    expect(state.onPeerHoldReleased).toBe(cb)
  })

  test('wirePublishAvailability publica de inmediato y se resuscribe a la recarga de settings', () => {
    const { deps, state } = harness({ policyReaders: readers('accept') })
    const published: unknown[] = []
    let refresh: (() => void) | undefined
    const unsubscribed: boolean[] = []
    const depsWithSub: InboundGateDeps = {
      ...deps,
      subscribeToSettingsRefresh: callback => {
        refresh = callback
        return () => unsubscribed.push(true) && undefined
      },
    }
    wirePublishAvailability((...args: unknown[]) => void published.push(args[0]), depsWithSub)
    expect(published).toEqual([true])
    expect(refresh).toBeDefined()
    refresh?.()
    expect(published).toEqual([true, true])
    wirePublishAvailability(null, depsWithSub)
    expect(state.publishAvailability).toBeNull()
    expect(unsubscribed).toEqual([true])
  })

  test('sendRefusalReceipt arma un prompt vacío con el origen y el id del agente', () => {
    const { deps, receipts } = harness()
    sendRefusalReceipt({ kind: 'peer', from: 'uds:/a.sock' }, 'refused', deps)
    expect(receipts).toEqual([{ message: { mode: 'prompt', agentId: 'agent-1', value: '', origin: { kind: 'peer', from: 'uds:/a.sock' } }, status: 'refused', extra: undefined }])
  })
})
