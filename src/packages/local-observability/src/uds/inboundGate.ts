/**
 * La compuerta de entrada de mensajes entre sesiones: qué política aplica a
 * un mensaje según su origen (par, inyectado por el host, coordinador o sin
 * compuerta), la retención de los que no se pueden resolver aún, y el
 * cableado del estado que otras piezas alimentan (el modo de permisos
 * actual, el recibo al par, la disponibilidad publicada, el correspondiente
 * anotado).
 *
 * Porte COMPLETO de `E7e`, `abt`, `lbt`, `anr`, `kJr`, `cbt`, `k7e`, `lnr`,
 * `dbt`, `cnr`, `ubt`, `pbt`, `T7e`, `tSe`, `dnr`, `fbt`, `mbt`, `gbt`,
 * `hbt`, `A7e`, `C7e`, `pnr`, `nSe`, `rSe`, `R7e`, `TJr`, `x7e`, `fnr` y sus
 * internos (`O`, `f`, `F`, `y`, `N`, `h`, `w`, `H`, `P`, `E`, `k`, `S`, `D`,
 * `v`, `G`, `T`, `M`, `A`, `R`, `m`, `j`) de `chunk-dv9ctjss.js`, más `f9r`
 * de `chunk-yg53q7yp.js`, de 2.1.283.
 *
 * `zje` y `unr` NO se reimplementan aquí: ya están portados en
 * `inboundPolicy.ts` como `inboundPolicyValue` y `needsSelfSentVerdict`
 * (medido con `git grep -n '\`zje\`'`/`'\`unr\`'` -- src/packages antes de
 * escribir este archivo), y se usan importados. `kJr`, `fbt`, `C7e`, `nSe` y
 * `x7e` aparecen citados en `inboxDelivery.ts` (como tipo de un campo
 * inyectado, no como implementación real: medido con el mismo `git grep`,
 * cero definiciones de función fuera de este archivo) y en `x7e` una
 * colisión de nombre ajena en `storage/claudemd.ts` (dominio distinto, sin
 * relación); los cinco se implementan aquí, que es su F4d declarado.
 *
 * `S` (la clase de modo) reutiliza `isBypassClassMode`, ya portado en
 * `inboundPolicy.ts`; `C` reutiliza `currentPermissionMode`; `ar`/`he`/`gb`
 * están encapsulados dentro de `resolveInboundPolicy`/`inboundPolicyValue`,
 * ya portados. `gt` (registra una función de limpieza de proceso) reutiliza
 * `registerCleanup` de `@thyrox/app-host/bootstrap/cleanupRegistry.js`, ya
 * usado con la misma firma en `debug.ts` de este mismo paquete.
 *
 * Fuera de alcance, inyectado en `InboundGateDeps` con su símbolo de
 * referencia en el docstring del campo: `x` (compuerta de feature flag),
 * `Ws` (interruptor global de mensajería entre sesiones), `Te` (sesión sin
 * interacción), `qe` (id del agente), `Pwr` (admisión de un mensaje ya
 * resuelto) y `Yd` (suscripción a la recarga de settings).
 *
 * `Q` (una espera con `unref`, sin señal de aborto) se porta PARCIAL como
 * `settleTimeoutUnref`: sólo la rama que `dbt` ejerce (sin `AbortSignal`).
 * Divergencia forzada por el estado ya portado en `messagingState.ts` (no se
 * edita): `InboundState.modeAtUnwire` es `string | undefined`, no el objeto
 * `{mode, isBypassPermissionsModeAvailable?}` que la referencia retiene —
 * así que `wireCurrentModeGetter` sólo guarda `.mode`, y
 * `currentModeClassForTelemetry` reconstruye ese caso sin
 * `isBypassPermissionsModeAvailable` (la rama "plan + bypass disponible" no
 * puede distinguirse ahí). Los campos `onPeerHeld`, `onPeerHoldDropped` y
 * `onPeerHoldReleased` de `InboundState` toman un único argumento (el
 * mensaje); la referencia les pasa además el conteo, la causa o la razón —
 * se llaman aquí sólo con el mensaje, y esa información adicional se pierde
 * hacia esos oyentes (no hacia el recibo al par, que sí la lleva).
 */
import { registerCleanup } from '@thyrox/app-host/bootstrap/cleanupRegistry.js'

import { logForDebugging } from '../debug.ts'
import { reportFeatureOk, reportFeatureSad } from './featureTelemetry.ts'
import {
  currentPermissionMode,
  inboundPolicyOrigin,
  inboundPolicyValue,
  isBypassClassMode,
  PERMISSION_MODES,
  resolveInboundPolicy,
  type InboundPolicyReaders,
  type InboundPolicyValue,
  type PermissionModeState,
} from './inboundPolicy.ts'
import { withholdTokenText } from './logRedaction.ts'
import type { HeldPeerMessage, InboundState } from './messagingState.ts'
import type { EnvelopeMode } from './peerEnvelope.ts'

/** `F`: mensajes retenidos como máximo antes de desalojar el más viejo. */
const HOLD_BUFFER_LIMIT = 100
/** `N`: cuánto espera el apagado a que los recibos de "expired" salgan. */
const SHUTDOWN_SETTLE_TIMEOUT_MS = 750
/** Longitud del segundo `Bf` de `m`. */
const HOLD_LOG_PREVIEW_CHARS = 60
/** `Fte`. */
const MCP_SEND_MESSAGE_INBOUND_ORIGIN = 'mcp_send_message'
/** `S6e`. */
const SLACK_BOT_INBOUND_ORIGIN = 'slack_bot'
/** `x`, gate de `E7e`. */
const KITE_MODE_EMIT_GATE = 'tengu_harbor_kite_mode_emit'

type InboundPolicyOrigin = ReturnType<typeof inboundPolicyOrigin>

export type InboundHoldCause = 'mode-unknown' | 'bypass-default' | 'mode-mismatch' | 'no-mode-asserted' | InboundPolicyOrigin
export type InboundRefuseCause = 'opt-out' | 'kill-switch'
export type InboundPolicyKind = 'accept' | 'hold' | 'refuse'
export type InboundGateOutcome = 'accept' | 'refused' | 'held'
export type PeerReceiptStatus = 'held' | 'denied' | 'expired' | 'delivered' | 'refused' | 'dropped'

export type InboundVerdict = { policy: 'accept' } | { policy: 'hold'; holdCause: InboundHoldCause } | { policy: 'refuse'; refuseCause: InboundRefuseCause }

/** `b`: lo que un mensaje de un par declara sobre su modo de origen. */
export type ModeAssertionHint = { fromMode?: EnvelopeMode; selfSent?: boolean }

/** Lo que `mbt`/`A7e` necesitan de un origen para clasificarlo. */
export type InboundOriginContext = { kind?: string; hostInjected?: boolean; subkind?: string; inbound_origin?: string }

export interface InboundGateDeps {
  state: InboundState
  /** `x`: la compuerta de feature flag, con su valor por defecto. */
  checkFeatureGate: (gate: string, defaultValue: boolean) => boolean
  /** `Ws`: si el interruptor global de mensajería entre sesiones sigue encendido. */
  crossSessionMessagingEnabled: () => boolean
  /** `Te`: la sesión corre sin interacción. */
  nonInteractive: () => boolean
  /** `qe`: el id del agente actual, para armar el recibo vacío. */
  agentId: () => string
  /** `Pwr`: admite o no, ya resuelta la política, un mensaje para encolarlo. */
  admitForDelivery: (message: HeldPeerMessage, options: { receipt: 'caller' }) => { admitted: boolean; reason?: string }
  /** `Yd`: se suscribe a la recarga de settings; devuelve cómo desuscribirse. */
  subscribeToSettingsRefresh: (callback: () => void) => () => void
  /** Lector de la política ya resuelta (`I`/`B`/`O`, `ar`/`he`/`gb`); por defecto el de `inboundPolicy.ts`. */
  policyReaders?: InboundPolicyReaders
}

/** `E7e`. */
export function kiteModeEmitEnabled(checkFeatureGate: InboundGateDeps['checkFeatureGate']): boolean {
  return checkFeatureGate(KITE_MODE_EMIT_GATE, true)
}

/** `T7e`/`S`: la clase de modo (`isBypassClassMode`, ya portado). */
export function modeClassLabel(state: PermissionModeState, nonInteractive: boolean): EnvelopeMode {
  return isBypassClassMode(state, nonInteractive) ? 'bypass' : 'prompting'
}

/** `f9r` (`chunk-yg53q7yp.js`): la clase de modo actual, sólo para telemetría. */
export function currentModeClassForTelemetry(deps: InboundGateDeps): EnvelopeMode | undefined {
  if (!kiteModeEmitEnabled(deps.checkFeatureGate)) return undefined
  const getter = deps.state.getCurrentMode
  if (getter) {
    try {
      return modeClassLabel(getter(), deps.nonInteractive())
    } catch {
      return undefined
    }
  }
  const modeAtUnwire = deps.state.modeAtUnwire
  return modeAtUnwire !== undefined ? modeClassLabel({ mode: modeAtUnwire }, deps.nonInteractive()) : undefined
}

/** `h`: el valor resuelto de la política, como veredicto. */
function policyValueToVerdict(value: InboundPolicyValue, deps: InboundGateDeps): InboundVerdict {
  switch (value) {
    case 'accept':
      return { policy: 'accept' }
    case 'hold':
      return { policy: 'hold', holdCause: inboundPolicyOrigin(resolveInboundPolicy(deps.policyReaders).decidedBy) }
    case 'refuse':
      return { policy: 'refuse', refuseCause: 'opt-out' }
  }
}

/** `w`: el interruptor global, primero. */
function killSwitchVerdict(deps: InboundGateDeps): InboundVerdict | undefined {
  return deps.crossSessionMessagingEnabled() ? undefined : { policy: 'refuse', refuseCause: 'kill-switch' }
}

/** `H`: el veredicto general, sin mensaje concreto. */
function resolveGeneralInboundVerdict(deps: InboundGateDeps): InboundVerdict {
  const killed = killSwitchVerdict(deps)
  if (killed) return killed
  const explicit = inboundPolicyValue(deps.policyReaders)
  if (explicit !== undefined) return policyValueToVerdict(explicit, deps)
  const modeState = currentPermissionMode(deps.state.getCurrentMode)
  if (modeState === null) return { policy: 'hold', holdCause: 'mode-unknown' }
  if (!PERMISSION_MODES.has(modeState.mode)) {
    logForDebugging(`[cross-session-inbound] unrecognized permission mode '${modeState.mode}' (fail-closed → hold)`)
    return { policy: 'hold', holdCause: 'mode-unknown' }
  }
  return isBypassClassMode(modeState, deps.nonInteractive()) ? { policy: 'hold', holdCause: 'bypass-default' } : { policy: 'accept' }
}

/** `tSe`. */
export function inboundGateStatus(deps: InboundGateDeps): InboundPolicyKind {
  return resolveGeneralInboundVerdict(deps).policy
}

/** `C7e`. */
export function currentRefuseCause(deps: InboundGateDeps): InboundRefuseCause | undefined {
  const verdict = resolveGeneralInboundVerdict(deps)
  return verdict.policy === 'refuse' ? verdict.refuseCause : undefined
}

/** `k`/`S`: el veredicto según el modo, honrando (o no) el modo que el mensaje declara. */
function resolveModeAwareVerdict(hint: ModeAssertionHint | undefined, alwaysHonorFromModeHint: boolean, deps: InboundGateDeps): InboundVerdict {
  const explicit = inboundPolicyValue(deps.policyReaders)
  if (explicit !== undefined) return policyValueToVerdict(explicit, deps)
  if (hint?.selfSent) return { policy: 'accept' }
  const modeState = currentPermissionMode(deps.state.getCurrentMode)
  if (modeState === null || !PERMISSION_MODES.has(modeState.mode)) {
    if (modeState !== null) {
      logForDebugging(`[cross-session-inbound] unrecognized permission mode '${modeState.mode}' (fail-closed → hold)`)
    }
    return { policy: 'hold', holdCause: 'mode-unknown' }
  }
  const currentClass = modeClassLabel(modeState, deps.nonInteractive())
  const assertedClass = alwaysHonorFromModeHint || kiteModeEmitEnabled(deps.checkFeatureGate) ? hint?.fromMode : undefined
  if (assertedClass !== undefined) {
    return assertedClass === currentClass ? { policy: 'accept' } : { policy: 'hold', holdCause: 'mode-mismatch' }
  }
  return currentClass === 'bypass' ? { policy: 'hold', holdCause: 'no-mode-asserted' } : { policy: 'accept' }
}

/** `P`: veredicto para un mensaje de un par (el interruptor global manda primero). */
function resolvePeerVerdict(hint: ModeAssertionHint | undefined, deps: InboundGateDeps): InboundVerdict {
  return killSwitchVerdict(deps) ?? resolveModeAwareVerdict(hint, false, deps)
}

/** `E`: veredicto para un mensaje inyectado por el host (el modo declarado siempre se honra). */
function resolveHostInjectedVerdict(hint: ModeAssertionHint | undefined, deps: InboundGateDeps): InboundVerdict {
  return resolveModeAwareVerdict(hint, true, deps)
}

/** `dnr`. */
export function peerVerdictStatus(hint: ModeAssertionHint | undefined, deps: InboundGateDeps): InboundPolicyKind {
  return resolvePeerVerdict(hint, deps).policy
}

/** `G`: veredicto de coordinador, sin pasar por el modo. */
function resolveCoordinatorVerdict(deps: InboundGateDeps): InboundVerdict {
  const explicit = inboundPolicyValue(deps.policyReaders)
  return explicit !== undefined ? policyValueToVerdict(explicit, deps) : { policy: 'accept' }
}

/** `b`: lo que un mensaje ya encolable declara sobre su origen de modo. */
function peerOriginHint(message: HeldPeerMessage): ModeAssertionHint | undefined {
  const origin = message.origin as { kind?: string; fromMode?: EnvelopeMode; selfSent?: boolean } | undefined
  if (!origin || origin.kind !== 'peer') return undefined
  return { fromMode: origin.fromMode, selfSent: origin.selfSent }
}

/** `mbt`. */
export function classifyInboundOrigin(origin: InboundOriginContext | null | undefined): 'peer' | 'host-injected' | 'coordinator' | 'ungated' {
  if (!origin) return 'ungated'
  if (origin.kind === 'peer') return origin.hostInjected === true ? 'host-injected' : 'peer'
  if (origin.kind === 'task-notification' && origin.subkind === 'peer-send-message') return 'coordinator'
  return 'ungated'
}

/** `j`: el origen es un par verificado por el bridge de Slack. */
function isVerifiedPeerOrigin(origin: InboundOriginContext | null | undefined): boolean {
  return !!origin && origin.kind === 'peer' && origin.hostInjected !== true && origin.inbound_origin === SLACK_BOT_INBOUND_ORIGIN
}

/** `gbt`. */
export function isCrossSessionMessage(input: { ingressOrigin: InboundOriginContext | null | undefined; inboundOrigin: unknown; envelopePeer?: boolean }): boolean {
  const envelopePeer = input.envelopePeer ?? false
  return envelopePeer || (classifyInboundOrigin(input.ingressOrigin) !== 'ungated' && !isVerifiedPeerOrigin(input.ingressOrigin)) || input.inboundOrigin === MCP_SEND_MESSAGE_INBOUND_ORIGIN
}

/** `A7e`. */
export function refuseCauseForOrigin(originContext: InboundOriginContext | null | undefined, deps: InboundGateDeps): InboundRefuseCause | undefined {
  switch (classifyInboundOrigin(originContext)) {
    case 'peer':
      return currentRefuseCause(deps)
    case 'coordinator':
    case 'host-injected':
      return inboundPolicyValue(deps.policyReaders) === 'refuse' ? 'opt-out' : undefined
    case 'ungated':
      return undefined
  }
}

/** `k7e`. */
export function publishAvailability(deps: InboundGateDeps): void {
  deps.state.publishAvailability?.(currentRefuseCause(deps) === undefined)
}

/** `nSe`. */
export function reportRefused(reason: string, cause: InboundRefuseCause, deps: InboundGateDeps): void {
  publishAvailability(deps)
  if (cause === 'kill-switch') {
    logForDebugging(`[cross-session-inbound] refused inbound peer message — cross-session messaging disabled (kill switch) (${reason})`)
    reportFeatureSad('peer_inbound_gate', 'kill_switch')
    return
  }
  logForDebugging(`[cross-session-inbound] refused inbound peer message (${reason})`)
  reportFeatureSad('peer_inbound_gate', 'refused')
}

/** `m`: una cita corta y segura del mensaje, para el log. */
function describeMessageForLog(message: HeldPeerMessage): string {
  const origin = message.origin as { kind?: string; from?: unknown } | undefined
  const from = origin?.kind === 'peer' && typeof origin.from === 'string' ? origin.from : 'unknown'
  const value = typeof message.value === 'string' ? message.value : '[blocks]'
  return `from=${withholdTokenText(from)} "${withholdTokenText(value, HOLD_LOG_PREVIEW_CHARS)}"`
}

/** `Q` (parcial, sólo la rama sin señal de aborto que `dbt` usa). */
function settleTimeoutUnref(ms: number): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms)
    timer.unref()
  })
}

/** `dbt`. */
export async function settleHeldMessagesAsExpired(deps: InboundGateDeps): Promise<void> {
  const { state } = deps
  state.shutdownSettleHandle?.()
  state.shutdownSettleHandle = null
  state.shuttingDown = true
  if (state.held.length === 0) return
  const pending = state.held.splice(0, state.held.length)
  logForDebugging(`[cross-session-inbound] shutdown: settling ${pending.length} still-held peer message(s) as expired`)
  const receipts: unknown[] = []
  for (const message of pending) {
    receipts.push(state.sendPeerReceipt?.(message, 'expired'))
    state.onPeerHoldDropped?.(message)
  }
  await Promise.race([Promise.allSettled(receipts), settleTimeoutUnref(SHUTDOWN_SETTLE_TIMEOUT_MS)])
}

/** `R`: registra el apagado una sola vez. */
function scheduleShutdownSettle(deps: InboundGateDeps): void {
  if (deps.state.shutdownSettleHandle === null) deps.state.shutdownSettleHandle = registerCleanup(() => settleHeldMessagesAsExpired(deps))
}

/** `D`: la compuerta de ingreso, ya con la política resuelta. */
function admitToQueue(message: HeldPeerMessage, deps: InboundGateDeps): boolean {
  let forAdmission = message
  if (message.priority === 'later') {
    forAdmission = { ...message }
    delete forAdmission.priority
  }
  const admission = deps.admitForDelivery(forAdmission, { receipt: 'caller' })
  if (!admission.admitted) {
    deps.state.sendPeerReceipt?.(message, 'dropped', { dropReason: admission.reason, droppedMsgIds: [] })
    return false
  }
  deps.state.recordCorrespondent?.(message)
  return true
}

/** `v`: acepta, rechaza o retiene un mensaje según su veredicto ya resuelto. */
function admitOrHold(message: HeldPeerMessage, verdict: InboundVerdict, deps: InboundGateDeps): InboundGateOutcome {
  const { state } = deps
  publishAvailability(deps)
  switch (verdict.policy) {
    case 'accept': {
      reprocessHeldMessages('policy-accepts', deps)
      reportFeatureOk('peer_inbound_gate')
      return 'accept'
    }
    case 'refuse': {
      reportRefused(verdict.refuseCause === 'kill-switch' ? describeMessageForLog(message) : `crossSessionInbound=refuse: ${describeMessageForLog(message)}`, verdict.refuseCause, deps)
      state.sendPeerReceipt?.(message, 'refused')
      return 'refused'
    }
    case 'hold': {
      const { holdCause } = verdict
      if (state.shuttingDown) {
        logForDebugging(`[cross-session-inbound] shutdown: not parking a late peer message — settled as expired: ${describeMessageForLog(message)}`)
        state.sendPeerReceipt?.(message, 'expired')
        reportFeatureSad('peer_inbound_gate', 'shutdown_expired')
        return 'refused'
      }
      if (state.held.length >= HOLD_BUFFER_LIMIT) {
        const evicted = state.held.shift()
        if (evicted) {
          logForDebugging(`[cross-session-inbound] hold buffer full — evicted oldest as expired: ${describeMessageForLog(evicted)}`)
          state.sendPeerReceipt?.(evicted, 'expired')
          state.onPeerHoldDropped?.(evicted)
        }
      }
      state.held.push(message)
      scheduleShutdownSettle(deps)
      logForDebugging(`[cross-session-inbound] held inbound peer message (${state.held.length} held, cause=${holdCause}): ${describeMessageForLog(message)}`)
      reportFeatureSad('peer_inbound_gate', 'held')
      if (state.onPeerHeld) {
        state.onPeerHeld(message)
        state.announced.set(message, holdCause)
      }
      state.sendPeerReceipt?.(message, 'held')
      return 'held'
    }
  }
}

/** `fbt`. */
export function gatePeerMessage(message: HeldPeerMessage, deps: InboundGateDeps): InboundGateOutcome {
  return admitOrHold(message, resolvePeerVerdict(peerOriginHint(message), deps), deps)
}

/** `pnr`. */
export function gateHostInjectedMessage(message: HeldPeerMessage, deps: InboundGateDeps): InboundGateOutcome {
  return admitOrHold(message, resolveHostInjectedVerdict(peerOriginHint(message), deps), deps)
}

/** `T`: un coordinador sin política explícita pasa siempre, sin retención. */
function gateCoordinatorMessage(message: HeldPeerMessage, deps: InboundGateDeps): InboundGateOutcome {
  const explicit = inboundPolicyValue(deps.policyReaders)
  if (explicit === undefined) return 'accept'
  return admitOrHold(message, policyValueToVerdict(explicit, deps), deps)
}

/** `hbt`. */
export function gateInboundMessage(originContext: InboundOriginContext | null | undefined, message: HeldPeerMessage, deps: InboundGateDeps): InboundGateOutcome {
  switch (classifyInboundOrigin(originContext)) {
    case 'peer':
      return gatePeerMessage(message, deps)
    case 'host-injected':
      return gateHostInjectedMessage(message, deps)
    case 'coordinator':
      return gateCoordinatorMessage(message, deps)
    case 'ungated':
      return 'accept'
  }
}

/** `M`: el veredicto vigente de un mensaje ya retenido. */
function verdictForHeldMessage(message: HeldPeerMessage, deps: InboundGateDeps): InboundVerdict {
  switch (classifyInboundOrigin(message.origin as InboundOriginContext | undefined)) {
    case 'coordinator':
      return resolveCoordinatorVerdict(deps)
    case 'host-injected':
      return resolveHostInjectedVerdict(peerOriginHint(message), deps)
    case 'peer':
    case 'ungated':
      return resolvePeerVerdict(peerOriginHint(message), deps)
  }
}

/** `A`: reevalúa la cola de retenidos; devuelve cuántos pasaron a aceptados. */
function reprocessHeldMessages(reason: string, deps: InboundGateDeps): number {
  const { state } = deps
  const held = state.held
  if (held.length === 0) return 0
  const stillHeld: HeldPeerMessage[] = []
  const nowAccepted: HeldPeerMessage[] = []
  const causeChanges: Array<[HeldPeerMessage, InboundHoldCause]> = []
  let refusedCount = 0
  let killSwitchRefusedCount = 0
  for (const message of held) {
    const verdict = verdictForHeldMessage(message, deps)
    if (verdict.policy === 'accept') {
      nowAccepted.push(message)
    } else if (verdict.policy === 'refuse') {
      refusedCount += 1
      if (verdict.refuseCause === 'kill-switch') killSwitchRefusedCount += 1
      state.sendPeerReceipt?.(message, 'refused')
      state.onPeerHoldDropped?.(message)
    } else {
      stillHeld.push(message)
      if (state.announced.get(message) !== verdict.holdCause) causeChanges.push([message, verdict.holdCause])
    }
  }
  held.length = 0
  held.push(...stillHeld)
  for (const [message, cause] of causeChanges) {
    state.announced.set(message, cause)
    state.onPeerHeld?.(message)
  }
  if (refusedCount > 0) {
    logForDebugging(
      killSwitchRefusedCount === refusedCount
        ? `[cross-session-inbound] gate off — dropped ${refusedCount} parked peer message(s) (cross-session messaging disabled)`
        : `[cross-session-inbound] dropped ${refusedCount} held peer message(s) — policy is now refuse`,
    )
  }
  if (nowAccepted.length === 0) return 0
  const admitted: HeldPeerMessage[] = []
  for (const message of nowAccepted) {
    if (admitToQueue(message, deps)) {
      admitted.push(message)
      reportFeatureOk('peer_inbound_gate')
    } else {
      state.onPeerHoldDropped?.(message)
    }
  }
  logForDebugging(
    `[cross-session-inbound] released ${nowAccepted.length} held peer message(s) (${reason}) — ${admitted.length} admitted by the ingress guard; ${held.length} still held`,
  )
  for (const message of admitted) state.onPeerHoldReleased?.(message)
  for (const message of admitted) state.sendPeerReceipt?.(message, 'delivered')
  return nowAccepted.length
}

/** `rSe`. */
export function refreshInboundAvailability(reason: string, deps: InboundGateDeps): number {
  publishAvailability(deps)
  return reprocessHeldMessages(reason, deps)
}

/** `R7e`: resuelve un mensaje retenido por su acción (aprobar, denegar o expirar). */
export function resolveHeldMessage(message: HeldPeerMessage, action: 'approve' | 'deny' | 'expire', deps: InboundGateDeps): 'gone' | 'delivered' | 'dropped' | 'dropped-by-guard' {
  const { state } = deps
  const index = state.held.indexOf(message)
  if (index === -1) return 'gone'
  const [held] = state.held.splice(index, 1)
  if (!held) return 'gone'
  if (action === 'approve') {
    const verdict = verdictForHeldMessage(held, deps)
    if (verdict.policy === 'refuse') {
      logForDebugging(`[cross-session-inbound] held peer message approved but policy is now refuse (${verdict.refuseCause === 'kill-switch' ? 'kill switch' : 'opt-out'}) — dropped`)
      state.sendPeerReceipt?.(held, 'refused')
      state.onPeerHoldDropped?.(held)
      return 'dropped'
    }
    if (!admitToQueue(held, deps)) {
      logForDebugging('[cross-session-inbound] held peer message approved but DROPPED by the ingress guard on release')
      state.onPeerHoldDropped?.(held)
      return 'dropped-by-guard'
    }
    logForDebugging('[cross-session-inbound] held peer message APPROVED — released to queue')
    reportFeatureOk('peer_inbound_gate')
    state.onPeerHoldReleased?.(held)
    state.sendPeerReceipt?.(held, 'delivered')
    return 'delivered'
  }
  logForDebugging(`[cross-session-inbound] held peer message ${action === 'deny' ? 'DENIED' : 'EXPIRED/CANCELLED'} — dropped with denial receipt`)
  state.sendPeerReceipt?.(held, action === 'deny' ? 'denied' : 'expired')
  return 'dropped'
}

/** `TJr`. */
export function heldMessages(state: InboundState): HeldPeerMessage[] {
  return state.held
}

/** `x7e`. */
export function heldMessageCount(state: InboundState): number {
  return state.held.length
}

/** `fnr`. */
export function isShuttingDown(state: InboundState): boolean {
  return state.shuttingDown
}

/** `cnr`. */
export function announcedHoldCause(message: HeldPeerMessage, state: InboundState): unknown {
  return state.held.includes(message) ? state.announced.get(message) : undefined
}

/** `lbt`. */
export function wireOnPeerHeld(callback: InboundState['onPeerHeld'], state: InboundState): void {
  state.onPeerHeld = callback
}

/** `anr`. */
export function wireSendPeerReceipt(callback: InboundState['sendPeerReceipt'], state: InboundState): void {
  state.sendPeerReceipt = callback
}

/** `lnr`. */
export function wireRecordCorrespondent(callback: InboundState['recordCorrespondent'], state: InboundState): void {
  state.recordCorrespondent = callback
}

/** `ubt`. */
export function wireOnPeerHoldDropped(callback: InboundState['onPeerHoldDropped'], state: InboundState): void {
  state.onPeerHoldDropped = callback
}

/** `pbt`. */
export function wireOnPeerHoldReleased(callback: InboundState['onPeerHoldReleased'], state: InboundState): void {
  state.onPeerHoldReleased = callback
}

/** `kJr`: el recibo vacío que arma esta pieza (no el recibo ya armado por quien entrega). */
export function sendRefusalReceipt(origin: unknown, status: PeerReceiptStatus, deps: Pick<InboundGateDeps, 'state' | 'agentId'>): void {
  deps.state.sendPeerReceipt?.({ mode: 'prompt', agentId: deps.agentId(), value: '', origin }, status)
}

/** `cbt`. */
export function wirePublishAvailability(callback: InboundState['publishAvailability'], deps: InboundGateDeps): void {
  const { state } = deps
  state.publishAvailability = callback
  state.unsubscribeAvailabilityRefresh?.()
  state.unsubscribeAvailabilityRefresh = null
  if (callback) {
    publishAvailability(deps)
    state.unsubscribeAvailabilityRefresh = deps.subscribeToSettingsRefresh(() => publishAvailability(deps))
  }
}

/** `abt`. */
export function wireCurrentModeGetter(getter: InboundState['getCurrentMode'], deps: InboundGateDeps): void {
  const { state } = deps
  if (getter !== null) {
    state.shuttingDown = false
    scheduleShutdownSettle(deps)
    state.modeAtUnwire = undefined
  } else if (state.getCurrentMode !== null) {
    try {
      // Divergencia declarada en el docstring del módulo: sólo `.mode`, el
      // tipo ya portado en `messagingState.ts` no admite el objeto completo.
      state.modeAtUnwire = state.getCurrentMode().mode
    } catch {
      state.modeAtUnwire = undefined
    }
  }
  state.getCurrentMode = getter
  if (getter !== null) refreshInboundAvailability('mode-changed', deps)
}
