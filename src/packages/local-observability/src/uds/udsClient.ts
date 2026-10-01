/**
 * El cliente del buzón: enviar un mensaje `user` o de control a un par por su
 * socket, con ritmo de envío, recibos y verificación del extremo conectado;
 * y el listado de sesiones vivas, sobre el barrido del registro.
 *
 * Porte completo de `chunk-qcy58j4w.js` (41 exports) de 2.1.283, repartido
 * por responsabilidad: el guardián de bucles y el ritmo de envío viven en
 * `peerLoopGuard.ts`; el listado de sesiones vivas, en
 * `liveSessionRegistry.ts`. Este archivo es la fachada — reexporta los dos y
 * añade lo que falta: el envío en sí (`VOt`, `kee`, `iat`, `Pe` interno), la
 * clasificación de errores de envío (`MV`, `cG`, `R4e`, `x4e`, `A1n`, `C1n`,
 * `Mae`, `I4e`, `BRr`, `dsn`), los recibos de envíos propios (`WRr`, `GRr`,
 * `jRr`, `R1n`) y el rechazo por uid de una conexión de control (`Ako`).
 *
 * `Bf`/`TB` (`withholdTokenText`/`redactLogFragment`, `logRedaction.ts`) y
 * `lsn` (`peerPid`, `peerCredentials.ts`) ya estaban portados de este mismo
 * chunk — se reexportan aquí, no se duplican.
 *
 * Divergencia declarada: `I` (`chunk-ern0s5ks.js`, la base con
 * `telemetryMessage`/`errorClass` de la que cuelgan `ce`/`fe`/`j`) ya tiene
 * un puerto en `errorHelpers.ts`
 * (`TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS`), pero sin
 * `errorClass` — y ese archivo no pertenece a este ítem. Aquí se declara una
 * base propia y más chica (`TelemetrySafeClassifiedError`), sólo para las
 * tres clases que este chunk necesita distinguir por `errorClass`.
 *
 * `J`/`b` (`chunk-zkn0228z.js`, `JSON.parse`/`JSON.stringify` instrumentados
 * para telemetría) ya se leen en otro puerto de este árbol
 * (`remoteSessionClaims.ts`) como lo que son aquí: `JSON.parse`/
 * `JSON.stringify` lisos, sin instrumentación propia.
 */
import { connect, type Socket } from 'node:net'
import { lstat } from 'node:fs/promises'

import { getPlatform } from '@thyrox/config/platform'

import { logForDebugging } from '../debug.ts'
import { getErrnoCode, isENOENT } from '../errorHelpers.ts'
import { authFrameLine, authRequiredByDefault, canonicalSocketAddress } from './inboxAuth.ts'
import { readPeerToken, type PeerTokenLookup, type SessionKeyStorage } from './inboxKeys.ts'
import { redactLogFragment, withholdTokenText } from './logRedaction.ts'
import { messagingState } from './messagingState.ts'
import { peerPid, readPeerCredentials, readStartTokenSync, socketFd } from './peerCredentials.ts'
import { isUsableLocalSocketAddress, localPipeName } from './socketPath.ts'
import { parseAddress, udsAddress } from './peerAddress.ts'
import { extendHopChain, formatEnvelope, type EnvelopeMode } from './peerEnvelope.ts'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { hostSessionId } from './sessionRegistration.ts'
import type { DropTally, PeerMessageStatus } from './peerMessageStatus.ts'
import { MAX_AWAITING_TERMINAL } from './peerMessageStatus.ts'
import {
  createOutboundPacer,
  createPeerDropReporter,
  createPeerLoopGuard,
  asKnownDropReason,
  describeDroppedPeerMessage,
  DEFAULT_PEER_LOOP_GUARD_LIMITS,
  MAX_TRACKED_DROP_MESSAGE_IDS,
  ownAddressHopIds,
  ownHopMask,
  outboundPacingEnabled,
  peerMessageLimits,
  setOwnBridgePeerAddressResolver,
  setOwnUdsHopToken,
  type PeerDropReporter,
  type PeerLoopGuard,
  type PeerLoopGuardLimits,
  type PeerLoopGuardMessage,
  type PeerLoopGuardVerdict,
  type PeerMessageLimits,
} from './peerLoopGuard.ts'
import {
  claimParkedJobPeer,
  hasConflictingMessagingSocketOwner,
  hasLiveInboxAtAddress,
  listAllLiveSessions,
  listAllSessionRecords,
  liveNonSpareSessions,
  livePeerByAddress,
  liveSocketsByPid,
  messagingSocketEnvOverride,
  sessionSpansForeignPidDomain,
  SessionRecordsUnreadableError,
  type LiveSessionRecord,
  type RegistryStorage,
} from './liveSessionRegistry.ts'

export {
  createPeerLoopGuard,
  asKnownDropReason,
  describeDroppedPeerMessage,
  DEFAULT_PEER_LOOP_GUARD_LIMITS,
  MAX_TRACKED_DROP_MESSAGE_IDS,
  ownAddressHopIds,
  peerMessageLimits,
  setOwnBridgePeerAddressResolver,
  setOwnUdsHopToken,
  createPeerDropReporter,
  type PeerDropReporter,
  type PeerLoopGuard,
  type PeerLoopGuardLimits,
  type PeerLoopGuardMessage,
  type PeerLoopGuardVerdict,
  type PeerMessageLimits,
}
export {
  claimParkedJobPeer,
  hasConflictingMessagingSocketOwner,
  listAllLiveSessions,
  listAllSessionRecords,
  liveNonSpareSessions,
  livePeerByAddress,
  liveSocketsByPid,
  messagingSocketEnvOverride,
  sessionSpansForeignPidDomain,
  SessionRecordsUnreadableError,
  type LiveSessionRecord,
  type RegistryStorage,
}
export { withholdTokenText, redactLogFragment, peerPid }

/** `WOt`: cuántos caracteres puede tener la línea que se escribe en el socket. */
export const MAX_UDS_MESSAGE_CHARS = 1048576
const MAX_AUTH_FRAME_OVERHEAD_CHARS = authFrameLine('0'.repeat(32)).length
const SEND_TIMEOUT_MS = 5000
const MACOS_HALF_CLOSE_DELAY_MS = 150

/** `K`/`Ako`: quién puede conectarse a un socket de control — sólo el mismo uid que el demonio. */
export type ControlUidGetter = (socket: Socket) => number | null
const defaultControlUidGetter: ControlUidGetter = socket => readPeerCredentials(socketFd(socket))?.uid ?? null

/** `Ako`: por qué se rechaza una conexión de control, o `undefined` si el uid coincide. */
export function controlConnectionUidRefusal(socket: Socket, getPeerUid: ControlUidGetter = defaultControlUidGetter): string | undefined {
  const ownUid = process.getuid?.()
  if (ownUid == null) return undefined
  const peerUid = getPeerUid(socket)
  if (peerUid == null) return undefined
  if (peerUid === ownUid) return undefined
  const reason = `permission denied: connecting uid ${peerUid} != daemon uid ${ownUid} (retry without sudo, or as the daemon owner)`
  logForDebugging(`[daemon] rejecting control connection: ${reason}`, { level: 'error' })
  return reason
}

/** `I` recortada a lo que este chunk necesita: mensaje seguro de loguear, y una clase de error para discriminar. */
class TelemetrySafeClassifiedError extends Error {
  readonly telemetryMessage: string
  readonly errorClass: string
  constructor(message: string, telemetryMessage: string, errorClass: string) {
    super(message)
    this.name = 'TelemetrySafeError'
    this.telemetryMessage = telemetryMessage
    this.errorClass = errorClass
  }
}

const MESSAGE_TOO_LARGE_ERROR_CLASS = 'message_too_large'
const SENDER_PACED_ERROR_CLASS = 'sender_paced'
const NO_LIVE_INBOX_ERROR_CLASS = 'no_live_inbox'
const NO_LIVE_INBOX_CODE = 'ENOINBOX'

/** `ce`. */
function createMessageTooLargeError(actualChars: number, maxChars: number): TelemetrySafeClassifiedError {
  return new TelemetrySafeClassifiedError(
    `Message too large for cross-session delivery: the serialized message is ${actualChars.toLocaleString('en-US')} characters and the limit is ${maxChars.toLocaleString('en-US')}. Shorten the message text — put bulk content in a file the recipient can read rather than in the message — or split it into smaller messages.`,
    'cross-session message exceeds the line cap',
    MESSAGE_TOO_LARGE_ERROR_CLASS,
  )
}

/** `R4e`. */
export function isMessageTooLargeError(error: unknown): boolean {
  return error instanceof TelemetrySafeClassifiedError && error.errorClass === MESSAGE_TOO_LARGE_ERROR_CLASS
}

/** `fe`. */
function createSenderPacedError(sentInBurst: number): TelemetrySafeClassifiedError {
  return new TelemetrySafeClassifiedError(
    `Too many messages to this session just now: ${sentInBurst} were sent recently and more would be dropped by its rate limit, so this one was not sent. Batch what remains into one message, or wait a little before sending more.`,
    'cross-session sends to one target outpaced its inbox rate limit',
    SENDER_PACED_ERROR_CLASS,
  )
}

/** `x4e`. */
export function isSenderPacedError(error: unknown): boolean {
  return error instanceof TelemetrySafeClassifiedError && error.errorClass === SENDER_PACED_ERROR_CLASS
}

/** `j`: no hay buzón vivo registrado para el pipe de destino. */
export class NoLiveInboxError extends TelemetrySafeClassifiedError {
  constructor(
    public readonly kind: Exclude<PeerTokenLookup['kind'], 'token'>,
    message: string,
  ) {
    super(message, 'no live inbox registered for the target pipe', NO_LIVE_INBOX_ERROR_CLASS)
    this.name = 'NoLiveInboxError'
  }
}

/** `A1n`. */
export function isNoLiveInboxError(error: unknown): boolean {
  const code = getErrnoCode(error)
  return code === 'ENOENT' || code === 'ECONNREFUSED' || (error instanceof TelemetrySafeClassifiedError && error.errorClass === NO_LIVE_INBOX_ERROR_CLASS)
}

/** `C1n`. */
export function isUnusableInboxError(error: unknown): boolean {
  return error instanceof NoLiveInboxError && error.kind === 'unusable'
}

/** `Mae`. */
export function classifySendFailure(error: unknown): 'busy' | 'gone' | 'other' {
  if (isUnusableInboxError(error)) return 'busy'
  if (isNoLiveInboxError(error)) return 'gone'
  const code = getErrnoCode(error)
  return code === 'EBUSY' || code === 'EAGAIN' ? 'busy' : 'other'
}

/** `I4e`. */
export function staleSocketHint(refreshCommand: string): string {
  return ` — the peer process may have restarted, so this socket path is stale. Call ${refreshCommand} to get the current address.`
}

/** `BRr`. */
export const BUSY_PIPE_HINT = ' — the peer is alive but its pipe is momentarily busy. Retry the same address shortly.'
const REGISTRY_UNREADABLE_HINT = " — this machine's session registry could not be read just now (a transient local condition). Retry the same address shortly."

/** `dsn`. */
export function sendFailureHint(error: unknown): string {
  return isUnusableInboxError(error) ? REGISTRY_UNREADABLE_HINT : BUSY_PIPE_HINT
}

/** `MV`: se rehúsa a enviar — el destino no es una ruta local usable, o el extremo conectado no verifica. */
export class UdsSendRefusedError extends Error {
  constructor(
    public readonly refusal: string,
    message: string,
  ) {
    super(message)
    this.name = 'UdsSendRefusedError'
  }
}

/** `cG`: si vale la pena reintentar tras este error. */
export function isRetryableSendError(error: unknown): boolean {
  if (error instanceof UdsSendRefusedError || isNoLiveInboxError(error) || isSenderPacedError(error) || isMessageTooLargeError(error)) return true
  const code = getErrnoCode(error)
  return code === 'EBUSY' || code === 'EAGAIN' || code === 'EACCES'
}

/** `ye`: el JSON del mensaje, comprobando que la línea completa (con su posible marco de auth) quepa. */
function preflightMessageJson(message: Record<string, unknown>): string {
  const json = JSON.stringify(message)
  const total = MAX_AUTH_FRAME_OVERHEAD_CHARS + json.length + 1
  if (total > MAX_UDS_MESSAGE_CHARS) throw createMessageTooLargeError(total, MAX_UDS_MESSAGE_CHARS)
  return json
}

/** `dG`: el sobre nuevo de un mensaje — su versión y un id propio. */
function nextMessageEnvelope(): { msgV: number; msg_id: string } {
  return { msgV: 1, msg_id: crypto.randomUUID() }
}

/** `Xe`: recuerda un envío propio a la espera de su recibo, con tope. */
function rememberOutstandingSend(msgId: string, to: string): void {
  const outstandingSends = messagingState().receipts.outstandingSends
  if (outstandingSends.length >= MAX_AWAITING_TERMINAL) outstandingSends.shift()
  outstandingSends.push({ msgId, to })
}

/** `ze`: olvida un envío propio — su recibo ya no importa (se reembolsó el ritmo). */
function forgetOutstandingSend(msgId: string): void {
  const outstandingSends = messagingState().receipts.outstandingSends
  const index = outstandingSends.findIndex(entry => entry.msgId === msgId)
  if (index !== -1) outstandingSends.splice(index, 1)
}

/** `WRr`: retira el envío con este id de lo pendiente; si el estado es `held`, pasa a retenido. */
export function resolveOutstandingReceipt(msgId: unknown, status: PeerMessageStatus): { destination: string; wasHeld: boolean } | undefined {
  if (typeof msgId !== 'string') return undefined
  const { outstandingSends, awaitingTerminal } = messagingState().receipts
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

/** `GRr`: retira de lo pendiente cada envío de `messageIds`, contado por destino. */
export function tallyDroppedReceipts(messageIds: readonly string[]): Map<string, DropTally> {
  const tallies = new Map<string, DropTally>()
  if (messageIds.length === 0) return tallies
  const remaining = new Set(messageIds)
  const { outstandingSends, awaitingTerminal } = messagingState().receipts
  for (const list of [outstandingSends, awaitingTerminal]) {
    const wasHeldList = list === awaitingTerminal
    for (let index = 0; index < list.length; ) {
      const entry = list[index]!
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

/** `Se`: aplica `action` al ritmo de salida de `target`, si ya existe uno y el destino es `uds:`. */
function withPacerForUdsTarget(target: string, action: (pacer: NonNullable<ReturnType<typeof messagingState>['outbound']['pacer']>, canonical: string) => void): void {
  const pacer = messagingState().outbound.pacer
  if (!pacer) return
  const { scheme, target: address } = parseAddress(target)
  if (scheme !== 'uds') return
  action(pacer, canonicalSocketAddress(address) ?? address)
}

/** `jRr`. */
export function creditSendPacer(target: string): void {
  withPacerForUdsTarget(target, (pacer, canonical) => pacer.credit(canonical))
}

/** `R1n`. */
export function debitSendPacer(target: string): void {
  withPacerForUdsTarget(target, (pacer, canonical) => pacer.debit(canonical))
}

/** `je`: el ritmo de salida de este proceso, creado la primera vez que hace falta. */
function getOrCreateOutboundPacer(): NonNullable<ReturnType<typeof messagingState>['outbound']['pacer']> {
  const outbound = messagingState().outbound
  return (outbound.pacer ??= createOutboundPacer(peerMessageLimits))
}

const NO_OP_RESERVATION = { ok: true as const, refund: () => {} }

/** `Pe`: conecta al socket de `target`, vetado por auth y por identidad, y escribe la línea. */
async function sendRawMessage(
  target: string,
  message: Record<string, unknown>,
  storage: SessionKeyStorage | undefined,
  options: { noFollowSymlink?: boolean; expectPeerPid?: number; expectPeerProcStart?: string; preflightedJson?: string } = {},
): Promise<void> {
  const { noFollowSymlink = false, expectPeerPid, expectPeerProcStart, preflightedJson } = options
  const json = preflightedJson ?? preflightMessageJson(message)
  if (!isUsableLocalSocketAddress(target)) {
    throw new UdsSendRefusedError(
      'non-local',
      `Refusing to connect: not a usable local IPC path (remote/UNC host, or a pipe name with extra segments or a trailing dot/space): ${target}`,
    )
  }
  const requireLiveOwner = authRequiredByDefault(getPlatform())
  const lookup = await readPeerToken(target, { requireLiveOwner, storage })
  let token = lookup.kind === 'token' ? lookup.token : undefined
  if (requireLiveOwner && lookup.kind !== 'token') {
    if (!(lookup.kind === 'no-key' && (await hasLiveInboxAtAddress(target)))) {
      throw new NoLiveInboxError(lookup.kind, `No running session has registered an inbox at ${target} (${NO_LIVE_INBOX_CODE}: ${lookup.kind}) — refusing to send to an unvouched pipe`)
    }
    token = undefined
  }
  const authLine = token !== undefined ? authFrameLine(token) : ''
  if (noFollowSymlink && !(getPlatform() === 'windows' && localPipeName(target) !== undefined)) {
    let isSymlink: boolean
    try {
      isSymlink = (await lstat(target)).isSymbolicLink()
    } catch (error) {
      if (isENOENT(error)) throw error
      logForDebugging(`[uds-client] reply target unvettable: ${getErrnoCode(error) ?? 'lstat failed'}`)
      throw new UdsSendRefusedError('unvettable', 'Refusing to send: cannot vet reply target')
    }
    if (isSymlink) throw new UdsSendRefusedError('symlink', 'Refusing to send: reply target is a symlink')
  }
  const payload = `${authLine}${json}\n`
  return new Promise((resolve, reject) => {
    const socket = connect({ path: target })
    let settled = false
    socket.setTimeout(SEND_TIMEOUT_MS, () => {
      settled = true
      socket.destroy()
      reject(new Error(`Timed out sending to ${target}`))
    })
    socket.on('error', error => {
      settled = true
      reject(error)
    })
    socket.on('connect', () => {
      if (expectPeerPid !== undefined && getPlatform() !== 'windows') {
        const connectedPid = peerPid(socket)
        if (connectedPid === undefined) {
          settled = true
          socket.destroy()
          reject(new UdsSendRefusedError('endpoint-unverifiable', 'Refusing to send: connected endpoint identity could not be read'))
          return
        }
        if (connectedPid !== expectPeerPid) {
          settled = true
          socket.destroy()
          logForDebugging(`[uds-client] connected endpoint is pid ${connectedPid}, expected ${expectPeerPid} — refusing to write`)
          reject(new UdsSendRefusedError('wrong-endpoint', 'Refusing to send: connected endpoint is not the expected process'))
          return
        }
        const ownUid = process.getuid?.()
        const connectedUid = readPeerCredentials(socketFd(socket))?.uid ?? null
        if (ownUid !== undefined && connectedUid === null) {
          settled = true
          socket.destroy()
          reject(new UdsSendRefusedError('endpoint-unverifiable', 'Refusing to send: connected endpoint owner could not be read'))
          return
        }
        if (ownUid !== undefined && connectedUid !== null && connectedUid !== ownUid) {
          settled = true
          socket.destroy()
          logForDebugging(`[uds-client] connected endpoint is owned by uid ${connectedUid}, not ours — refusing to write`)
          reject(new UdsSendRefusedError('wrong-endpoint', 'Refusing to send: connected endpoint is not owned by this user'))
          return
        }
        if (expectPeerProcStart !== undefined && readStartTokenSync(connectedPid) !== expectPeerProcStart) {
          settled = true
          socket.destroy()
          logForDebugging(`[uds-client] connected endpoint pid ${connectedPid} is not the process that wrote to us (start token differs — recycled pid) — refusing to write`)
          reject(new UdsSendRefusedError('wrong-endpoint', 'Refusing to send: connected endpoint is a different process with the expected pid'))
          return
        }
      }
      socket.write(payload)
      if (getPlatform() === 'macos') {
        setTimeout(target_ => {
          if (!target_.destroyed) target_.end()
        }, MACOS_HALF_CLOSE_DELAY_MS, socket)
      } else {
        socket.end()
      }
    })
    socket.on('close', () => {
      if (!settled) logForDebugging(`[uds-client] Sent to ${withholdTokenText(target)}`)
      resolve()
    })
  })
}

export type SendPeerUserMessageOptions = {
  trackReceipts?: boolean
  expectPeerPid?: number
  expectPeerProcStart?: string
  fromPlugin?: string
}

/** `VOt`: envía un mensaje `user` a un par, con sobre, ritmo de salida y recibo. */
export async function sendPeerUserMessage(
  target: string,
  text: string,
  storage: SessionKeyStorage | undefined,
  fromName: string | undefined,
  fileAttachments: readonly unknown[] | undefined,
  hopChain: readonly string[] | undefined,
  fromMode: EnvelopeMode | undefined,
  options: SendPeerUserMessageOptions = {},
): Promise<{ msgId: string }> {
  const { trackReceipts = true, expectPeerPid, expectPeerProcStart, fromPlugin } = options
  const ownSocket = messagingSocketEnvOverride()
  const from = ownSocket ? udsAddress(ownSocket) : undefined
  const fromSession = getFeatureValue_CACHED_MAY_BE_STALE('tengu_tidy_fern', true) ? hostSessionId() : undefined
  const body = formatEnvelope({
    from,
    fromName,
    body: text,
    fromSession,
    hopChain: extendHopChain(hopChain, from ? ownHopMask(from) : undefined),
    fromMode,
    fromPlugin,
  })
  const envelope = nextMessageEnvelope()
  const message: Record<string, unknown> = {
    ...envelope,
    type: 'user',
    message: { role: 'user', content: body },
    priority: 'next',
    from,
    ...(fromPlugin !== undefined && { from_plugin: fromPlugin }),
    ...((fileAttachments?.length ?? 0) > 0 && { file_attachments: fileAttachments }),
  }
  const preflighted = preflightMessageJson(message)
  const reservation =
    (from !== undefined || getPlatform() !== 'windows') && outboundPacingEnabled() ? getOrCreateOutboundPacer().reserve(canonicalSocketAddress(target) ?? target) : NO_OP_RESERVATION
  if (!reservation.ok) {
    logForDebugging(`[uds-client] paced: not sending to ${withholdTokenText(target)} — ${reservation.sentInBurst} sent this burst; its inbox rate limit would drop more`)
    throw createSenderPacedError(reservation.sentInBurst)
  }
  logForDebugging(`[uds-client] Sending ${text.length} chars to ${withholdTokenText(target)}`)
  if (trackReceipts) rememberOutstandingSend(envelope.msg_id, canonicalSocketAddress(target) ?? target)
  try {
    await sendRawMessage(target, message, storage, {
      noFollowSymlink: true,
      preflightedJson: preflighted,
      ...(expectPeerPid !== undefined && { expectPeerPid }),
      ...(expectPeerProcStart !== undefined && { expectPeerProcStart }),
    })
  } catch (error) {
    if (isRetryableSendError(error)) {
      reservation.refund()
      if (trackReceipts) forgetOutstandingSend(envelope.msg_id)
    }
    throw error
  }
  return { msgId: envelope.msg_id }
}

export type ControlAction = { action: string; [field: string]: unknown }

/** `iat`: envía un mensaje de control a un par y devuelve su id. */
export async function sendControlMessageWithReceipt(
  target: string,
  action: ControlAction,
  storage: SessionKeyStorage | undefined = undefined,
  options: { expectPeerPid?: number; expectPeerProcStart?: string; storageV5?: SessionKeyStorage } = {},
): Promise<{ msgId: string }> {
  const { expectPeerPid, expectPeerProcStart, storageV5 } = options
  const envelope = nextMessageEnvelope()
  logForDebugging(`[uds-client] Sending control:${action.action} to ${withholdTokenText(target)}`)
  await sendRawMessage(
    target,
    { type: 'control', ...action, ...envelope },
    storageV5 ?? storage,
    { noFollowSymlink: true, ...(expectPeerPid !== undefined && { expectPeerPid }), ...(expectPeerProcStart !== undefined && { expectPeerProcStart }) },
  )
  return { msgId: envelope.msg_id }
}

/** `kee`: como `sendControlMessageWithReceipt`, sin devolver el id. */
export function sendControlMessage(target: string, action: ControlAction, storage?: SessionKeyStorage, options: { expectPeerPid?: number; expectPeerProcStart?: string } = {}): Promise<void> {
  return sendControlMessageWithReceipt(target, action, storage, options).then(() => {})
}

/** `sendToUdsSocket`: envío simple para quien no necesita sobre, adjuntos ni recibo —
 * ausente en la referencia como función propia; compone `sendPeerUserMessage` con
 * los valores por omisión que sus dos consumidores (`SendMessageTool.ts`,
 * `conversationRecovery.tsx`) ya usaban antes de este porte. */
export async function sendToUdsSocket(target: string, message: string): Promise<void> {
  await sendPeerUserMessage(target, message, undefined, undefined, undefined, undefined, undefined)
}
