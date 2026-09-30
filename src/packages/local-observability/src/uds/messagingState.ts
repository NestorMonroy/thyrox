/**
 * El estado de mensajería de una sesión, uno por anfitrión: lo que la
 * sesión retiene de los mensajes entrantes, los recibos de lo que envió, el
 * ritmo de sus envíos, las fichas de salto propias, los permisos pendientes
 * del equipo, el libro de lo que escribió en los buzones y la lista de
 * tareas del equipo.
 *
 * Porte de `ti`, `g`, `o`, `d`, `l`, `a`, `u`, `p`, `m`, `i`, `t` y `f`
 * (`chunk-s7j2aven.js`) y de `Fm` (`chunk-r47b55y6.js`) de 2.1.283.
 */
import { createHash } from 'node:crypto'

import { PerHost, createSignal, processHost } from './sessionNameState.ts'

/** `h`: cuántas entradas recuerda el libro por buzón si nadie lo retiene. */
export const MAILBOX_LEDGER_LIMIT = 2048
/** `n` de `Fm`: cuántas veces drena la cola lo que se encoló mientras drenaba. */
const MAX_DRAIN_PASSES = 5

export type MailboxEntry = {
  msg_id?: string
  from: string
  timestamp: string
  text: string
  summary?: string
  color?: string
  from_plugin?: string
}

/** `t`: la huella de una entrada del buzón. */
export function mailboxEntryDigest(entry: MailboxEntry): string {
  return createHash('sha256')
    .update(JSON.stringify([entry.from, entry.timestamp, entry.text, entry.summary ?? null, entry.color ?? null, entry.from_plugin ?? null]))
    .digest('hex')
}

/** `i`: qué entradas escribió esta sesión en cada buzón, por `msg_id`. */
export class MailboxWriteLedger {
  readonly #byMailbox = new Map<string, Map<string, string>>()
  readonly #retained = new Set<string>()

  record(mailbox: string, entry: MailboxEntry): void {
    if (entry.msg_id === undefined) return
    let entries = this.#byMailbox.get(mailbox)
    if (entries === undefined) {
      entries = new Map()
      this.#byMailbox.set(mailbox, entries)
    }
    entries.set(entry.msg_id, mailboxEntryDigest(entry))
    if (!this.#retained.has(mailbox)) dropOldestOverLimit(entries)
  }

  wrote(mailbox: string, entry: MailboxEntry): boolean {
    return entry.msg_id !== undefined && this.#byMailbox.get(mailbox)?.get(entry.msg_id) === mailboxEntryDigest(entry)
  }

  retire(mailbox: string, msgIds: Iterable<string>): void {
    const retired = new Set(msgIds)
    this.#keepOnly(mailbox, msgId => !retired.has(msgId))
  }

  /** Conserva sólo `msgIds` y deja el buzón sin tope desde entonces. */
  retain(mailbox: string, msgIds: ReadonlySet<string>): void {
    this.#retained.add(mailbox)
    this.#keepOnly(mailbox, msgId => msgIds.has(msgId))
  }

  forget(mailbox: string): void {
    this.#byMailbox.delete(mailbox)
  }

  #keepOnly(mailbox: string, keep: (msgId: string) => boolean): void {
    const entries = this.#byMailbox.get(mailbox)
    if (entries === undefined) return
    for (const msgId of entries.keys()) if (!keep(msgId)) entries.delete(msgId)
    if (entries.size === 0) this.#byMailbox.delete(mailbox)
  }
}

/** `f`. */
function dropOldestOverLimit(entries: Map<string, string>): void {
  if (entries.size <= MAILBOX_LEDGER_LIMIT) return
  const [oldest] = entries.keys()
  if (oldest !== undefined) entries.delete(oldest)
}

/** `Fm`: una cola de trabajos por clave; los de claves distintas corren a la vez. */
export function createKeyedLocks() {
  const tails = new Map<string, Promise<void>>()
  return {
    run<T>(key: string, job: () => T | Promise<T>): Promise<T> {
      const result = (tails.get(key) ?? Promise.resolve()).then(() => job())
      const tail = result.then(
        () => {},
        () => {},
      )
      tails.set(key, tail)
      void tail.then(() => {
        if (tails.get(key) === tail) tails.delete(key)
      })
      return result
    },
    has(key: string): boolean {
      return tails.has(key)
    },
    get size(): number {
      return tails.size
    },
    async settle(): Promise<void> {
      await Promise.all([...tails.values()])
    },
    async drain(): Promise<void> {
      for (let pass = 0; pass < MAX_DRAIN_PASSES; pass++) {
        const pending = [...tails.values()]
        if (pending.length === 0) return
        await Promise.all(pending)
      }
    },
    clearForTest(): void {
      tails.clear()
    },
  }
}

export type KeyedLocks = ReturnType<typeof createKeyedLocks>

export type HeldPeerMessage = Record<string, unknown>
export type PeerDrop = { from: string; name?: string; reason: string; suppressed: number }
export type OutboundPacer = {
  reserve(target: string): { ok: true; refund: () => void } | { ok: false; sentInBurst: number }
  credit(target: string): void
  debit(target: string): void
}
export type OutstandingSend = { msgId: string; to: string }

/** `o`: lo que la sesión hace con los mensajes entrantes mientras está cableada. */
export class InboundState {
  getCurrentMode: (() => { mode: string; isBypassPermissionsModeAvailable?: boolean }) | null = null
  modeAtUnwire: string | undefined = undefined
  onPeerHeld: ((message: HeldPeerMessage) => void) | null = null
  onPeerHoldReleased: ((message: HeldPeerMessage) => void) | null = null
  onPeerHoldDropped: ((message: HeldPeerMessage) => void) | null = null
  sendPeerReceipt: ((...args: unknown[]) => unknown) | null = null
  recordCorrespondent: ((...args: unknown[]) => unknown) | null = null
  publishAvailability: ((...args: unknown[]) => unknown) | null = null
  unsubscribeAvailabilityRefresh: (() => void) | null = null
  shutdownSettleHandle: (() => void) | null = null
  shuttingDown = false
  held: HeldPeerMessage[] = []
  announced = new WeakMap<object, unknown>()

  reset(): void {
    this.held.length = 0
    this.getCurrentMode = null
    this.modeAtUnwire = undefined
    this.onPeerHeld = null
    this.onPeerHoldReleased = null
    this.onPeerHoldDropped = null
    this.shutdownSettleHandle?.()
    this.shutdownSettleHandle = null
    this.shuttingDown = false
    this.sendPeerReceipt = null
    this.recordCorrespondent = null
    this.publishAvailability = null
    this.unsubscribeAvailabilityRefresh?.()
    this.unsubscribeAvailabilityRefresh = null
  }
}

/** `d`: los envíos que esperan recibo y los retenidos que esperan su desenlace. */
export class ReceiptState {
  outstandingSends: OutstandingSend[] = []
  awaitingTerminal: OutstandingSend[] = []

  reset(): void {
    this.outstandingSends.length = 0
    this.awaitingTerminal.length = 0
  }
}

/** `l`. */
export class OutboundState {
  pacer: OutboundPacer | null = null

  reset(): void {
    this.pacer = null
  }
}

/** `a`: las fichas de salto propias y el aviso de cada mensaje descartado. */
export class IngressState {
  ownUdsHopToken: string | undefined = undefined
  ownBridgePeerAddressResolver: (() => string | undefined) | undefined = undefined
  readonly messageDropped = createSignal<[drop: PeerDrop]>()

  reset(): void {
    this.ownUdsHopToken = undefined
    this.ownBridgePeerAddressResolver = undefined
    this.messageDropped.clear()
  }
}

/** `u`. */
export class SwarmPermissionState {
  pending = new Map<string, unknown>()
  pendingSandbox = new Map<string, unknown>()
  pendingPlanApproval: unknown = null

  clear(): void {
    this.pending.clear()
    this.pendingSandbox.clear()
    this.pendingPlanApproval = null
  }
}

/** `p`. */
export class MailboxState {
  reportedDroppedEntries = new Set<string>()
  pendingPrunes = new Map<string, unknown>()
  ledger = new MailboxWriteLedger()
}

/** `m`. */
export class TaskListState {
  readonly updated = createSignal<[]>()
  locks = createKeyedLocks()
  leaderTeamName: string | undefined = undefined

  reset(): void {
    if (this.leaderTeamName === undefined) return
    this.leaderTeamName = undefined
    try {
      this.updated.emit()
    } catch {
      // un oyente que falla no impide soltar el equipo
    }
  }
}

/** `g`. */
export class MessagingState {
  inbound = new InboundState()
  receipts = new ReceiptState()
  outbound = new OutboundState()
  ingress = new IngressState()
  swarmPermissions = new SwarmPermissionState()
  mailbox = new MailboxState()
  taskList = new TaskListState()
}

/** `y`. */
const statesPerHost = new PerHost(() => new MessagingState())

/** `ti`. */
export function messagingState(host: object = processHost): MessagingState {
  return statesPerHost.of(host)
}
