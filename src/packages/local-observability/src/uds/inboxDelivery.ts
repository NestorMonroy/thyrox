/**
 * La entrega de un mensaje `user` de un par a la cola de la sesión. Porte de
 * `ze`, `Oe` y `aEn` (`chunk-yg53q7yp.js`), `E2e` (`chunk-csayct82.js`) y
 * `B4e` (`chunk-mwe1v51h.js`) de 2.1.283.
 *
 * El orden es el de la referencia, y cada paso puede cortar la entrega: el
 * contenido tiene que ser texto; el mensaje, de esta sesión; la política de
 * entrada no puede estar en `refuse` (se rechaza antes de tocar los
 * adjuntos, con recibo al emisor); un hook de `session.receive` puede
 * consumirlo; la aceptación puede retenerlo. Lo que llega a la cola es el
 * texto neutralizado, con los adjuntos antepuestos, y un origen `peer` con lo
 * verificado de la conexión y lo declarado en el sobre.
 *
 * Los subsistemas que decide cada paso llegan como dependencias y tienen fase
 * propia: la compuerta de rechazo, el recibo y la aceptación (`C7e`, `nSe`,
 * `kJr`, `fbt`) son F4d; `session.receive` (`Aot`) es F4c-2d; los adjuntos
 * (`nlt` y `chunk-yrfq0b3e.js`) son F4c-2e; el registro de correspondientes
 * (`Wkr`) es F4c-2f; y la cola de la sesión (`gE`) se cablea en F6.
 */
import type { PeerIdentity } from './inboxConnection.ts'
import { sessionIdMatches } from './inboxRouting.ts'
import type { InboxState } from './inboxState.ts'
import { redactLogFragment, withholdTokenText } from './logRedaction.ts'
import { isPeerAddress, isReplyableSocket, parseAddress } from './peerAddress.ts'
import { dropChangedBody, envelopeOriginFields, pluginOrigin, type EnvelopeMode } from './peerEnvelope.ts'
import { scrubPeerMessageText } from './peerTextScrub.ts'

export type QueuePriority = 'now' | 'next' | 'later'

/** `s` de `chunk-mwe1v51h.js`: la forma de un UUID. */
const MESSAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ROUTED_PREVIEW_CHARS = 80
const REFUSED_BEFORE_ATTACHMENTS = 'uds: dropped before attachment materialization'

/** `E2e`. */
export function parsePriority(value: unknown): QueuePriority | undefined {
  return value === 'now' || value === 'next' || value === 'later' ? value : undefined
}

/** `B4e`. */
export function isMessageId(value: unknown): value is string {
  return typeof value === 'string' && MESSAGE_ID.test(value)
}

export type PeerOrigin = {
  kind: 'peer'
  from: string
  verifiedPeerPid?: number
  verifiedPeerProcStart?: string
  selfSent?: true
  msg_id?: string
  plugin?: string
  name?: string
  fromSession?: string
  hopChain?: string[]
  fromMode?: EnvelopeMode
  body?: string
}

export type QueuedPrompt = {
  mode: 'prompt'
  agentId: string
  value: string
  uuid: string
  priority: QueuePriority
  origin: PeerOrigin
  skipSlashCommands: true
  isMeta: true
  skipAttachments: true
}

/** El recibo que la referencia arma para `sendPeerReceipt`: un prompt vacío con el origen. */
export type ReceiptEnvelope = { mode: 'prompt'; agentId: string; value: ''; origin: PeerOrigin }

/** La reserva de sitio en la cola que abre `session.receive`: se marca al encolar y se suelta siempre. */
export type ReceiveQueueing = { queued(): void; [Symbol.dispose](): void }
export type ReceiveResult = { consumed: string } | { consumed?: undefined; content: unknown; queueing: ReceiveQueueing }

export type FileAttachmentHandler = {
  materialize: (attachments: unknown) => Promise<{ received: number; verified: number; prefix: string }>
  injectPrefix: (text: string, prefix: string) => string
  emitTelemetry: (channel: 'uds', received: number, verified: number) => void
}

export interface PeerDeliveryDeps {
  state: InboxState
  /** `Y`. */
  sessionId: () => string
  /** `t`: el registro de depuración, con nivel opcional. */
  log: (message: string, level?: 'warn') => void
  /** `C7e`: la causa si la política de entrada rechaza, o `undefined`. */
  refuseCause: () => string | undefined
  /** `nSe`. */
  reportRefused: (reason: string, cause: string) => void
  /** `kJr`. */
  sendReceipt: (receipt: ReceiptEnvelope, status: 'refused') => void
  /** `Aot`. */
  receive: (input: { origin: { kind: 'peer'; plugin?: string }; content: string }) => Promise<ReceiveResult>
  /** `nlt` y `chunk-yrfq0b3e.js`: ausente cuando el envío de archivos no está habilitado. */
  fileAttachments: FileAttachmentHandler | undefined
  /** `ce`. */
  isSelfSent: (peer: PeerIdentity) => Promise<boolean>
  /** `qe`. */
  agentId: () => string
  /** `fbt`: `accept` para encolar; cualquier otro veredicto retiene el mensaje. */
  accept: (prompt: QueuedPrompt) => string
  /** `gE`. */
  enqueue: (prompt: QueuedPrompt) => void
  /** `Wkr`. */
  noteCorrespondent: (address: string, pid: number, procStart: string | undefined) => void
  randomUUID: () => string
}

type UserMessage = Record<string, unknown> & { type: string }

/** `aEn`: el socket al que se puede responder, si `from` lo nombra. */
export function replyableTarget(from: string, ownSocket: string, peerPid: number, state: InboxState): string | undefined {
  if (!from.startsWith('uds:') || !isPeerAddress(from)) return undefined
  const { target } = parseAddress(from)
  return target && isReplyableSocket(target, ownSocket, { verifiedPeerPid: peerPid, ownerUids: state.peerDirOwnerUids }) ? target : undefined
}

/** `Oe`: anota al emisor como correspondiente si es otro proceso con un socket al que responder. */
function recordCorrespondent(prompt: QueuedPrompt, deps: PeerDeliveryDeps): void {
  const { origin } = prompt
  const ownSocket = deps.state.activeSocketPath
  if (origin.selfSent === true || origin.verifiedPeerPid === undefined || ownSocket === undefined) return
  if (replyableTarget(origin.from, ownSocket, origin.verifiedPeerPid, deps.state) === undefined) return
  deps.noteCorrespondent(origin.from, origin.verifiedPeerPid, origin.verifiedPeerProcStart)
}

/** `ze`. */
export async function deliverPeerUserMessage(message: UserMessage, peer: PeerIdentity, deps: PeerDeliveryDeps): Promise<void> {
  const content = (message.message as { content?: unknown } | undefined)?.content
  if (typeof content !== 'string' || content.length === 0) {
    deps.log('[uds-messaging] Ignoring user message with missing or non-string content', 'warn')
    return
  }
  if (!sessionIdMatches(message, deps.sessionId(), text => deps.log(text, 'warn'))) return
  const from = typeof message.from === 'string' ? message.from : 'unknown'
  const messageId = isMessageId(message.msg_id) ? message.msg_id : undefined
  const uuid = typeof message.uuid === 'string' ? message.uuid : deps.randomUUID()
  const refused = deps.refuseCause()
  if (refused !== undefined) {
    deps.reportRefused(REFUSED_BEFORE_ATTACHMENTS, refused)
    const origin: PeerOrigin = {
      kind: 'peer',
      from,
      ...(peer.pid !== undefined && { verifiedPeerPid: peer.pid }),
      ...(messageId !== undefined && { msg_id: messageId }),
    }
    deps.sendReceipt({ mode: 'prompt', agentId: deps.agentId(), value: '', origin }, 'refused')
    return
  }
  const priority = parsePriority(message.priority) ?? 'next'
  const scrubbed = scrubPeerMessageText(content)
  const plugin = pluginOrigin(message.from_plugin)
  const received = await deps.receive({ origin: { kind: 'peer', ...(plugin !== undefined && { plugin }) }, content: scrubbed })
  if (received.consumed !== undefined) return
  const queueing = received.queueing
  try {
    const afterHook = typeof received.content === 'string' ? received.content : scrubbed
    let value = afterHook
    if (message.file_attachments !== undefined && deps.fileAttachments !== undefined) {
      try {
        const files = await deps.fileAttachments.materialize(message.file_attachments)
        if (files.received > 0) {
          value = deps.fileAttachments.injectPrefix(afterHook, files.prefix)
          deps.fileAttachments.emitTelemetry('uds', files.received, files.verified)
        }
      } catch (error) {
        deps.log(`[uds-messaging] Failed to materialize file_attachments: ${redactLogFragment(String(error))}`, 'warn')
      }
    }
    const selfSent = await deps.isSelfSent(peer)
    const origin = dropChangedBody(
      {
        kind: 'peer' as const,
        from,
        ...(peer.pid !== undefined && { verifiedPeerPid: peer.pid }),
        ...(peer.startToken !== undefined && { verifiedPeerProcStart: peer.startToken }),
        ...(selfSent && { selfSent: true as const }),
        ...(messageId !== undefined && { msg_id: messageId }),
        ...(plugin !== undefined && { plugin }),
        ...envelopeOriginFields(content),
      },
      value,
      content,
    ) as PeerOrigin
    const prompt: QueuedPrompt = {
      mode: 'prompt',
      agentId: deps.agentId(),
      value,
      uuid,
      priority,
      origin,
      skipSlashCommands: true,
      isMeta: true,
      skipAttachments: true,
    }
    if (deps.accept(prompt) !== 'accept') return
    deps.enqueue(prompt)
    queueing.queued()
    deps.log(`[uds-messaging] Routed user message to queue (priority=${priority}): ${withholdTokenText(value, ROUTED_PREVIEW_CHARS)}`)
    deps.state.onEnqueue?.()
    recordCorrespondent(prompt, deps)
  } finally {
    queueing[Symbol.dispose]()
  }
}
