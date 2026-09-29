/**
 * El desenlace de un envío propio, tal como lo reporta el par: el ramal
 * `peer_message_status` de `be` (`chunk-yg53q7yp.js`), con `WRr`, `GRr`,
 * `R1n`, `jRr`, `Cko`, `Ye`, `Se` (el de despliegue del id, en ese mismo
 * chunk) y las constantes `be`=200 y `NRr`=256 de `chunk-qcy58j4w.js`, de
 * 2.1.283.
 *
 * `WRr` casa el `orig_msg_id` contra lo pendiente de esta sesión (envíos sin
 * recibo y retenidos a la espera de su desenlace); si el estado es `held`,
 * el envío pasa de pendiente a retenido, con tope. `GRr` hace lo mismo por
 * lote, para `dropped_msg_ids`, y tanto `R1n` (débito) como `jRr` (crédito)
 * ajustan el ritmo de envío del destino cuando un retenido se libera o se
 * confirma. `Cko`/`ke`/`he` validan `drop_reason` contra un catálogo fijo.
 *
 * `isMessageId` (`B4e`, `inboxDelivery.ts`) ya cubre la forma de un id; `Ye`
 * es sólo el filtro y el tope de 256 sobre un arreglo, que no tenía porte
 * propio. `Se` de despliegue (que muestra el id sólo si tiene forma válida)
 * tampoco lo tenía. `parseAddress` (`lh`) y `canonicalSocketAddress` (`Iv`)
 * son los de `peerAddress.ts`/`inboxAuth.ts`; el `pacer` es el de
 * `OutboundState` en `messagingState.ts`.
 *
 * `c().onPeerMessageStatus` llega inyectado (`onPeerMessageStatus` en
 * `PeerMessageStatusDeps`): no forma parte del `InboxState` portado en
 * `inboxState.ts`.
 */
import { isMessageId } from './inboxDelivery.ts'
import { canonicalSocketAddress } from './inboxAuth.ts'
import type { ControlActionHandler } from './inboxRouting.ts'
import { type OutboundPacer, type OutstandingSend, messagingState } from './messagingState.ts'
import { parseAddress } from './peerAddress.ts'
import { processHost } from './sessionNameState.ts'
import { logForDebugging } from '../debug.ts'

/** `he`: los motivos de descarte reconocidos. */
const DROP_REASONS = { 'rate-limited': true, duplicate: true, 'hop-loop': true, 'hop-runaway': true, 'queue-full': true } as const
export type DropReason = keyof typeof DROP_REASONS

/** `ke`: si el motivo es uno de los reconocidos. */
function isDropReason(value: unknown): value is DropReason {
  return typeof value === 'string' && Object.hasOwn(DROP_REASONS, value)
}

/** `Cko`. */
function validateDropReason(value: unknown): DropReason | undefined {
  return isDropReason(value) ? value : undefined
}

/** `be` de `chunk-qcy58j4w.js`: cuántos retenidos recuerda una sesión a la vez. */
export const MAX_AWAITING_TERMINAL = 200
/** `NRr`: cuántos ids acepta un lote de `dropped_msg_ids`. */
export const MAX_DROPPED_MESSAGE_IDS = 256

export const PEER_MESSAGE_STATUSES = ['held', 'denied', 'expired', 'delivered', 'refused', 'dropped'] as const
export type PeerMessageStatus = (typeof PEER_MESSAGE_STATUSES)[number]
const ADMITTED_STATUSES = new Set<string>(PEER_MESSAGE_STATUSES)

/** `Ye`: los ids con forma de mensaje de un arreglo, hasta el tope. */
function sanitizeDroppedMessageIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  for (const item of value) {
    if (ids.length >= MAX_DROPPED_MESSAGE_IDS) break
    if (isMessageId(item)) ids.push(item)
  }
  return ids
}

/** `Se` de `chunk-yg53q7yp.js`: el id tal cual si es válido; si no, por qué no se muestra. */
function displayMessageId(value: unknown): string {
  if (isMessageId(value)) return value
  return value === undefined ? '(none)' : '(malformed)'
}

type DeliveryOutcome = { destination: string; wasHeld: boolean }

/**
 * `WRr`: retira el envío con este `msgId` de lo pendiente; si el estado es
 * `held` lo pasa a retenido (con tope, olvidando el más antiguo), y si ya
 * estaba retenido y el estado ya no es `held`, lo cierra.
 */
function resolveDeliveryOutcome(msgId: unknown, status: PeerMessageStatus, host: object = processHost): DeliveryOutcome | undefined {
  if (typeof msgId !== 'string') return undefined
  const { outstandingSends, awaitingTerminal } = messagingState(host).receipts
  const sentIndex = outstandingSends.findIndex(entry => entry.msgId === msgId)
  if (sentIndex !== -1) {
    const [entry] = outstandingSends.splice(sentIndex, 1)
    if (!entry) return undefined
    if (status === 'held') {
      if (awaitingTerminal.length >= MAX_AWAITING_TERMINAL) awaitingTerminal.shift()
      awaitingTerminal.push(entry)
    }
    return { destination: entry.to, wasHeld: false }
  }
  const heldIndex = awaitingTerminal.findIndex(entry => entry.msgId === msgId)
  if (heldIndex !== -1 && status !== 'held') {
    const [entry] = awaitingTerminal.splice(heldIndex, 1)
    return entry ? { destination: entry.to, wasHeld: true } : undefined
  }
  return undefined
}

export type DropTally = { dropped: number; wereHeld: number }

/**
 * `GRr`: retira de lo pendiente cada envío cuyo id esté en `messageIds`, y
 * cuenta por destino cuántos se descartaron y cuántos venían retenidos.
 */
function tallyDroppedMessages(messageIds: readonly string[], host: object = processHost): Map<string, DropTally> {
  const tallies = new Map<string, DropTally>()
  if (messageIds.length === 0) return tallies
  const remaining = new Set(messageIds)
  const { outstandingSends, awaitingTerminal } = messagingState(host).receipts
  for (const list of [outstandingSends, awaitingTerminal]) {
    const wasHeldList = list === awaitingTerminal
    for (let index = 0; index < list.length; ) {
      const entry = list[index] as OutstandingSend
      if (remaining.delete(entry.msgId)) {
        list.splice(index, 1)
        const tally = tallies.get(entry.to) ?? { dropped: 0, wereHeld: 0 }
        tally.dropped++
        if (wasHeldList) tally.wereHeld++
        tallies.set(entry.to, tally)
      } else {
        index++
      }
    }
  }
  return tallies
}

/** `Se` de `chunk-qcy58j4w.js`: aplica `action` al ritmo de envío de `target`, si es una dirección `uds:`. */
function withOutboundPacer(target: string, action: (pacer: OutboundPacer, canonicalTarget: string) => void, host: object = processHost): void {
  const pacer = messagingState(host).outbound.pacer
  if (!pacer) return
  const { scheme, target: address } = parseAddress(target)
  if (scheme !== 'uds') return
  action(pacer, canonicalSocketAddress(address) ?? address)
}

/** `jRr`. */
function creditPacerFor(target: string, host?: object): void {
  withOutboundPacer(target, (pacer, canonical) => pacer.credit(canonical), host)
}

/** `R1n`. */
function debitPacerFor(target: string, host?: object): void {
  withOutboundPacer(target, (pacer, canonical) => pacer.debit(canonical), host)
}

export type PeerMessageStatusDetail = { dropReason: DropReason | undefined; droppedCount: number }

export type PeerMessageStatusDeps = {
  /** `c().onPeerMessageStatus`. */
  onPeerMessageStatus: (status: PeerMessageStatus, destination: string, detail?: PeerMessageStatusDetail) => void
  warn?: (message: string) => void
  /** El anfitrión cuyo estado de mensajería se lee y se escribe; por omisión, el de este proceso. */
  host?: object
}

/** El estado normalizado: `expired` con `status_detail: refused` se trata como `refused`. */
function normalizeStatus(status: PeerMessageStatus, statusDetail: unknown): PeerMessageStatus {
  return status === 'expired' && statusDetail === 'refused' ? 'refused' : status
}

function handlePeerMessageStatus(message: Record<string, unknown>, deps: PeerMessageStatusDeps): void {
  const warn = deps.warn ?? (text => logForDebugging(text))
  const host = deps.host ?? processHost
  const status = normalizeStatus(message.status as PeerMessageStatus, message.status_detail)
  const outcome = resolveDeliveryOutcome(message.orig_msg_id, status, host)
  const destination = outcome?.destination

  if (message.status === 'dropped') {
    const dropReason = validateDropReason(message.drop_reason)
    const tallies = tallyDroppedMessages(sanitizeDroppedMessageIds(message.dropped_msg_ids), host)
    if (destination !== undefined) {
      const tally = tallies.get(destination) ?? { dropped: 0, wereHeld: 0 }
      tally.dropped++
      if (outcome?.wasHeld) tally.wereHeld++
      tallies.set(destination, tally)
    }
    if (dropReason === 'queue-full') {
      for (const [target, { wereHeld }] of tallies) {
        for (let count = 0; count < wereHeld; count++) debitPacerFor(target, host)
      }
    }
    if (tallies.size === 0) {
      warn(`[uds-messaging] peer_message_status dropped: neither orig_msg_id=${displayMessageId(message.orig_msg_id)} nor any named id matches an outstanding send`)
    }
    for (const [target, { dropped }] of tallies) deps.onPeerMessageStatus('dropped', target, { dropReason, droppedCount: dropped })
    return
  }

  if (destination === undefined) {
    warn(`[uds-messaging] peer_message_status dropped: no outstanding send matches orig_msg_id=${displayMessageId(message.orig_msg_id)}`)
    return
  }

  if (status === 'held') creditPacerFor(destination, host)
  else if (status === 'delivered' && outcome?.wasHeld) debitPacerFor(destination, host)
  deps.onPeerMessageStatus(status, destination)
}

/** El ramal `peer_message_status` de `be`, como manejador de `controlActions`. */
export function peerMessageStatusControlActions(deps: PeerMessageStatusDeps): Partial<Record<string, ControlActionHandler>> {
  return {
    peer_message_status: {
      accepts: message => ADMITTED_STATUSES.has(message.status as string),
      handle: message => handlePeerMessageStatus(message, deps),
    },
  }
}
