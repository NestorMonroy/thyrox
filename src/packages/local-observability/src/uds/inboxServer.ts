/**
 * El servidor del buzón `mn` de 2.1.283 (`chunk-yg53q7yp.js`): resuelve la
 * ruta, la vincula, publica su clave y cablea el resto de la sesión para
 * responder a un par (recibo de retención, aviso de inactividad, cesión de
 * artefactos, correspondiente anotado, telemetría del modo). Porte COMPLETO
 * de `mn`, `nn`, `$e`, `W` y `hn` (con `m9r`, ya portado en `inboxState.ts`
 * como `removeActiveKeyFileSync`), y de la clase de error `_m` como
 * `MessagingStartError`, más sus internos `Oe` (el de este chunk, distinto
 * del homónimo privado de `inboxDelivery.ts` — anota al remitente de un
 * mensaje RETENIDO, no de uno ya entregado), `gn` y `pn`.
 *
 * `kee` (el envío a un par, UDS C) no está portado: llega inyectada como
 * `sendToPeer` en todo lo que la referencia le pasa (el recibo de retención,
 * el aviso de inactividad, la respuesta de cesión de artefactos). `zRr`
 * (quién resuelve el buzón de un pid), `Cgo` (el vaciado de recibos de
 * descarte) y `Ur` (la marca de perfil de arranque) llegan igual, inyectadas.
 * El backend de storage que `mn` reparte a `publishInboxKey`/`closeInbox`
 * (la `n` de la referencia) también es dependencia: es otra fase.
 *
 * `deliverUserMessage`, la entrega de un `user` (`ze` de `inboxDelivery.ts`),
 * y las tres piezas de `InboxControlActionDeps` (`isSelfSent`,
 * `findLiveSession`, `isDefinitelyUndelivered`) no tienen aún con qué
 * cablearse a la cola real de la sesión ni al registro de sesiones vivas —
 * eso es F6 y una fase de registro que este alcance no cubre —, así que
 * `processMessagingStartDeps` los deja en un respaldo declarado: ningún
 * mensaje de un par se pierde en silencio, pero tampoco llega a ningún sitio
 * todavía.
 */
import { chmod, unlink } from 'node:fs/promises'
import { createServer, type Server } from 'node:net'
import { dirname, isAbsolute, resolve } from 'node:path'

import { getPlatform } from '@thyrox/config/platform'
import { registerCleanup } from '@thyrox/app-host/bootstrap/cleanupRegistry.js'

import { getErrnoCode, errorMessage } from '../errorHelpers.ts'
import { logForDebugging } from '../debug.ts'
import {
  bindAutoSocket,
  clearActiveInbox,
  closeInbox,
  defaultInboundGateDeps,
  isSocketLive,
  listenOn,
  MESSAGING_SOCKET_ENV,
  MESSAGING_TOKEN_ENV,
  processChildEnv,
  type ChildProcessEnv,
} from './bind.ts'
import { type ExplicitSocketPathDeps, validateExplicitSocketPath } from './explicitSocketPath.ts'
import { inboxControlActions } from './controlActions.ts'
import { type ArtifactReplyControlDeps, type ArtifactReplySender, setArtifactReplySender } from './artifactReplyYield.ts'
import { authRequiredByDefault, createInboxTokens } from './inboxAuth.ts'
import { handleInboxConnection, processConnectionDeps, type PeerIdentity } from './inboxConnection.ts'
import { type PeerOrigin, replyableTarget } from './inboxDelivery.ts'
import { currentModeClassForTelemetry, type InboundGateDeps, type PeerReceiptStatus, wireRecordCorrespondent, wireSendPeerReceipt } from './inboundGate.ts'
import { publishInboxKey, type InboxKeyDeps, type SessionKeyStorage } from './inboxKeys.ts'
import { removeActiveKeyFileSync, recordDegraded, type InboxState } from './inboxState.ts'
import { routeInboxMessage, type InboxRoutingDeps } from './inboxRouting.ts'
import { type SendIdleNotice, setRegisteredInboxOfPid, setSendNotice } from './idleNotification.ts'
import { redactLogFragment, withholdTokenText } from './logRedaction.ts'
import type { HeldPeerMessage } from './messagingState.ts'
import { messagingState } from './messagingState.ts'
import { udsAddress } from './peerAddress.ts'
import type { EnvelopeMode } from './peerEnvelope.ts'
import { isRegistrySweepPermitted } from './registrySweep.ts'
import { sessionNameState } from './sessionNameState.ts'
import { canFallBackToPerUid, prepareSocketsDirectory, refusedComponentDetail, socketsDirHint, type SocketsDirDeps } from './socketsDir.ts'
import { hostUidForPeerDirs } from './uidNamespace.ts'
import { isUsableLocalSocketAddress, perUidFallbackSocketPath } from './socketPath.ts'

/** El modo del socket una vez vinculado: sólo su dueño puede conectar. */
const SOCKET_MODE = 0o600

/** `_m`: lo que el usuario pidió con `--messaging-socket-path` no se puede cumplir; se muestra tal cual. */
export class MessagingStartError extends Error {
  override name = 'CliUserError'
}

export type MessagingStartOptions = {
  isExplicit: boolean
  requireAuth?: boolean
  firstLineDeadlineMs?: number
  profileStartup?: boolean
}

/** Lo que `kee` recibe además de la dirección y el cuerpo: a quién se espera al otro lado. */
export type SendToPeerOptions = {
  expectPeerPid?: number
  expectPeerProcStart?: string
  storageV5?: SessionKeyStorage
}

/** `nn`: para el buzón y desregistra su limpieza de apagado. */
export type MessagingStop = () => Promise<void>

type InboxMessage = Record<string, unknown> & { type: string }

export type MessagingStartDeps = {
  state: InboxState
  storage?: SessionKeyStorage
  sessionId: () => string
  deliverUserMessage: (message: InboxMessage, peer: PeerIdentity) => Promise<void>
  isSelfSent: (peer: PeerIdentity) => Promise<boolean>
  findLiveSession: ArtifactReplyControlDeps['findLiveSession']
  isDefinitelyUndelivered: ArtifactReplyControlDeps['isDefinitelyUndelivered']
  inboundGateDeps: InboundGateDeps
  /** `kee`: el envío a un par (UDS C), sin portar. */
  sendToPeer: (address: string, payload: Record<string, unknown>, options: SendToPeerOptions) => Promise<void>
  /** `zRr`. */
  registeredInboxOfPid: (pids: number[]) => Promise<Map<number, string>>
  /** `Cgo`. */
  flushPeerDropReceipts: () => Promise<void>
  /** `Ur`. */
  markStartupProfile: (label: string) => void
  /** `Gw`. */
  childEnv: ChildProcessEnv
  /** `unr` (el de `inboxConnection.ts`, distinto del homónimo de `inboundPolicy.ts`). */
  trustsAncestry: () => boolean
  explicitSocketPathDeps?: ExplicitSocketPathDeps
  socketsDirDeps?: SocketsDirDeps
  /** Anula de qué directorio y con qué identidad se publica/retira la clave; por defecto, `processInboxKeyDeps`. */
  inboxKeyDeps?: InboxKeyDeps
}

/** Las dependencias por defecto de esta sesión: `state` es lo único sin respaldo razonable. */
export function processMessagingStartDeps(state: InboxState): MessagingStartDeps {
  return {
    state,
    sessionId: () => '',
    deliverUserMessage: async (_message, _peer) => {
      logForDebugging('[uds-messaging] deliverUserMessage no está cableado todavía (F6); mensaje descartado')
    },
    isSelfSent: async () => false,
    findLiveSession: async () => undefined,
    isDefinitelyUndelivered: () => false,
    inboundGateDeps: defaultInboundGateDeps(),
    sendToPeer: async () => {},
    registeredInboxOfPid: async () => new Map(),
    flushPeerDropReceipts: async () => {},
    markStartupProfile: () => {},
    childEnv: processChildEnv,
    trustsAncestry: () => false,
  }
}

/** `hn`/`m9r`: borra la clave publicada al salir, registrado una sola vez por estado. */
const exitCleanupHandlers = new WeakMap<InboxState, () => void>()
function registerActiveKeyFileCleanupOnExit(state: InboxState): void {
  let handler = exitCleanupHandlers.get(state)
  if (handler === undefined) {
    handler = () => removeActiveKeyFileSync(state)
    exitCleanupHandlers.set(state, handler)
  }
  if (!process.listeners('exit').includes(handler)) process.on('exit', handler)
}

/** `W`: retira lo que este buzón publicó para los procesos hijos. */
function clearMessagingEnv(childEnv: ChildProcessEnv): void {
  delete process.env[MESSAGING_SOCKET_ENV]
  childEnv.unset(MESSAGING_TOKEN_ENV)
}

/** `$e`: el directorio de sockets rechazó el arranque; sin respaldo posible, se cierra sin bindear. */
function handleSocketsDirRefused(dir: string, error: unknown, hint: string, state: InboxState, childEnv: ChildProcessEnv): void {
  state.lastStartFailureCause = 'socket_dir_refused'
  const refusedDetail = refusedComponentDetail(error)
  state.lastStartFailureDetail = refusedDetail
  clearActiveInbox(state, childEnv)
  logForDebugging(
    `[uds-messaging] Failed to set up sockets directory ${dir} (refusing to bind — cross-session messaging is OFF for this session): ${errorMessage(error)}.${refusedDetail !== undefined ? ` Refused component: ${refusedDetail}.` : ''}${hint ? ` ${hint}` : ''}`,
    { level: 'error' },
  )
  clearMessagingEnv(childEnv)
}

/** `gn`: el `from_mode` opcional, según la clase de modo actual para telemetría. */
function fromModeField(inboundGateDeps: InboundGateDeps): { from_mode?: EnvelopeMode } {
  const mode = currentModeClassForTelemetry(inboundGateDeps)
  return mode === undefined ? {} : { from_mode: mode }
}

/** `pn`: por qué el remitente ve este desenlace de su mensaje. */
function peerMessageStatusReasonText(status: PeerReceiptStatus): string {
  switch (status) {
    case 'held':
      return "Your message is held for the recipient user's approval before it reaches their session (permission-mode parity)."
    case 'denied':
      return 'The recipient user declined your message; it was not delivered to their session.'
    case 'expired':
      return "Your held message expired without approval and was not delivered to the recipient's session."
    case 'delivered':
      return "Your previously-held message was approved and released to the recipient's session."
    case 'refused':
      return 'The recipient session is not accepting cross-session messages (the feature is off there, or a setting or policy there refuses them); your message was not delivered to it.'
    case 'dropped':
      return "The recipient's session dropped your message at its inbox (rate limit, duplicate, relay loop, or full queue); it was not delivered and will not be."
  }
}

/** `Oe` (`chunk-yg53q7yp.js`): anota al remitente de un mensaje RETENIDO como correspondiente, si es replyable. */
function recordHeldPeerCorrespondent(message: HeldPeerMessage, state: InboxState): void {
  const origin = message.origin
  if (origin === null || typeof origin !== 'object' || (origin as { kind?: unknown }).kind !== 'peer') return
  const peer = origin as PeerOrigin
  const ownSocket = state.activeSocketPath
  if (peer.selfSent === true || peer.verifiedPeerPid === undefined || ownSocket === undefined) return
  if (replyableTarget(peer.from, ownSocket, peer.verifiedPeerPid, state) === undefined) return
  sessionNameState().noteCorrespondent(peer.from, peer.verifiedPeerPid, peer.verifiedPeerProcStart)
}

type SendPeerReceiptDropDetail = { dropReason?: string; droppedMsgIds?: string[] }

/** El recibo de un mensaje entrante, cableado a `InboundState.sendPeerReceipt` (`anr`). */
function buildSendPeerReceipt(
  ownSocketPath: string,
  ownAddress: string,
  storage: SessionKeyStorage | undefined,
  sendToPeer: MessagingStartDeps['sendToPeer'],
  state: InboxState,
): (...args: unknown[]) => void {
  return (...args: unknown[]) => {
    const [message, status, dropDetail] = args as [HeldPeerMessage, PeerReceiptStatus, SendPeerReceiptDropDetail?]
    const origin = message.origin
    const peer = origin !== null && typeof origin === 'object' && (origin as { kind?: unknown }).kind === 'peer' ? (origin as PeerOrigin) : undefined
    const from = peer?.from
    if (typeof from !== 'string') return
    const target = replyableTarget(from, ownSocketPath, peer?.verifiedPeerPid as number, state)
    if (target === undefined) {
      logForDebugging(`[uds-messaging] hold-receipt skipped: reply address unshaped or outside our socket namespace (${withholdTokenText(from)})`)
      return
    }
    const payload: Record<string, unknown> = {
      action: 'peer_message_status',
      ...(status === 'refused' ? { status: 'expired', status_detail: 'refused' } : { status }),
      reason: peerMessageStatusReasonText(status),
      from: ownAddress,
      ...(typeof peer?.msg_id === 'string' && { orig_msg_id: peer.msg_id }),
      ...(status === 'dropped' && dropDetail !== undefined && { drop_reason: dropDetail.dropReason, dropped_msg_ids: dropDetail.droppedMsgIds }),
    }
    sendToPeer(target, payload, {
      ...(peer?.verifiedPeerPid !== undefined && { expectPeerPid: peer.verifiedPeerPid }),
      ...(peer?.verifiedPeerProcStart !== undefined && { expectPeerProcStart: peer.verifiedPeerProcStart }),
      storageV5: storage,
    }).catch(error => logForDebugging(`[uds-messaging] hold-receipt send failed to ${withholdTokenText(from)}: ${redactLogFragment(String(error))}`))
  }
}

/** El aviso de inactividad a un par, cableado con `setSendNotice` (`JEn`). */
function buildSendIdleNotice(sendToPeer: MessagingStartDeps['sendToPeer'], ownAddress: string, inboundGateDeps: InboundGateDeps): SendIdleNotice {
  return (target, payload, verifiedPeerPid, verifiedRecipient, verifiedPeerProcStart) =>
    sendToPeer(
      target,
      { action: 'peer_idle_notice', ...payload, from: ownAddress, ...(verifiedRecipient ? fromModeField(inboundGateDeps) : {}) },
      {
        ...(verifiedPeerPid !== undefined && { expectPeerPid: verifiedPeerPid }),
        ...(verifiedPeerProcStart !== undefined && { expectPeerProcStart: verifiedPeerProcStart }),
      },
    )
}

/** La respuesta de cesión de artefactos a un par, cableada con `setArtifactReplySender` (`mlr`). */
function buildArtifactReplySender(sendToPeer: MessagingStartDeps['sendToPeer'], ownAddress: string, storage: SessionKeyStorage | undefined): ArtifactReplySender {
  return (address, payload, pid, verifiedProcStart) =>
    sendToPeer(
      address,
      { action: 'artifact_replies_yielded', ...payload, from: ownAddress },
      {
        ...(pid !== undefined && { expectPeerPid: pid }),
        ...(verifiedProcStart !== undefined && { expectPeerProcStart: verifiedProcStart }),
        storageV5: storage,
      },
    )
}

/**
 * `mn`: arranca el buzón de esta sesión. Devuelve `undefined` si no pudo
 * arrancar y la ruta era la automática (nada que hacer salvo el aviso ya
 * logueado); lanza `MessagingStartError` si la ruta era explícita, porque
 * ahí el usuario la pidió y tiene que saber por qué no sirvió. En éxito
 * devuelve `nn`: la función que cierra el buzón y desregistra su limpieza de
 * apagado.
 */
export async function startMessagingInbox(socketPathInput: string, options: MessagingStartOptions, deps: MessagingStartDeps): Promise<MessagingStop | undefined> {
  const { state } = deps
  let socketPath = socketPathInput
  state.lastStartFailureCause = 'bind_failed'
  state.lastStartDegradedCause = undefined

  if (!isUsableLocalSocketAddress(socketPath)) {
    logForDebugging(
      `[uds-messaging] Refusing socket path — not a usable local socket address (a remote/UNC path, or a pipe name with extra segments or a trailing dot/space): ${socketPath}`,
      { level: 'error' },
    )
    clearMessagingEnv(deps.childEnv)
    state.lastStartFailureCause = 'path_refused'
    if (options.isExplicit) {
      throw new MessagingStartError(
        `--messaging-socket-path ${socketPath} is not a usable local socket address (a remote/UNC path, or a pipe name with extra segments or a trailing dot/space).`,
      )
    }
    return undefined
  }

  if (!options.isExplicit && !isAbsolute(socketPath)) socketPath = resolve(socketPath)

  if (options.isExplicit) {
    socketPath = await validateExplicitSocketPath(socketPath, deps.explicitSocketPathDeps)
    if ((await isSocketLive(socketPath)) === 'live') {
      throw new MessagingStartError(
        `--messaging-socket-path points to a live socket: ${socketPath}. Another process is listening there. Remove it or choose a different path.`,
      )
    }
  } else {
    const dir = dirname(socketPath)
    try {
      await prepareSocketsDirectory(dir, deps.socketsDirDeps)
    } catch (error) {
      const fallbackUid = canFallBackToPerUid(error) ? await hostUidForPeerDirs() : undefined
      const fallbackPath = fallbackUid === undefined ? undefined : resolve(perUidFallbackSocketPath({ uid: fallbackUid }))
      const fallbackDir = fallbackPath === undefined ? undefined : dirname(fallbackPath)
      if (fallbackPath === undefined || fallbackDir === undefined || fallbackDir === dir) {
        handleSocketsDirRefused(dir, error, socketsDirHint(error), state, deps.childEnv)
        return undefined
      }
      const refusedDetail = refusedComponentDetail(error)
      logForDebugging(
        `[uds-messaging] sockets directory ${dir} refused (${errorMessage(error)}${refusedDetail !== undefined ? `; refused component: ${refusedDetail}` : ''}); trying the per-uid fallback ${fallbackDir}`,
        { level: 'warn' },
      )
      try {
        await prepareSocketsDirectory(fallbackDir, deps.socketsDirDeps)
      } catch (fallbackError) {
        handleSocketsDirRefused(fallbackDir, fallbackError, socketsDirHint(fallbackError), state, deps.childEnv)
        return undefined
      }
      socketPath = fallbackPath
      recordDegraded(state, 'primary_dir_refused_fell_back')
    }
  }

  if (options.isExplicit) {
    try {
      await unlink(socketPath)
    } catch {
      // ya se comprobó que no seguía vivo; que no exista no es un error
    }
  }

  state.activeSocketPath = socketPath
  if (options.profileStartup) deps.markStartupProfile('uds_inbox_dir_ready')

  const controlActions = inboxControlActions({
    peerMessageStatus: {
      onPeerMessageStatus: (status, destination, detail) =>
        state.onPeerMessageStatus?.(status, destination, detail === undefined ? undefined : { dropReason: detail.dropReason ?? '', droppedCount: detail.droppedCount }),
    },
    idleNotification: { state, isSelfSent: deps.isSelfSent },
    artifactReplies: { state, sessionId: deps.sessionId, findLiveSession: deps.findLiveSession, isDefinitelyUndelivered: deps.isDefinitelyUndelivered },
  })
  const routingDeps: InboxRoutingDeps = {
    state,
    sessionId: deps.sessionId,
    warn: message => logForDebugging(message, { level: 'warn' }),
    deliverUserMessage: deps.deliverUserMessage,
    onRename: name => state.onRename?.(name),
    controlActions,
  }
  const connectionDeps = processConnectionDeps(state, (message, peer) => routeInboxMessage(message, peer, routingDeps), deps.trustsAncestry)

  let server: Server
  try {
    server = createServer({ allowHalfOpen: true }, socket => {
      state.connectedClients.add(socket)
      logForDebugging('[uds-messaging] Client connected')
      handleInboxConnection(socket, connectionDeps)
      socket.on('close', () => {
        state.connectedClients.delete(socket)
        logForDebugging('[uds-messaging] Client disconnected')
      })
    })
  } catch (error) {
    clearActiveInbox(state, deps.childEnv)
    logForDebugging(`[uds-messaging] Failed to create server: ${String(error)}`, { level: 'error' })
    clearMessagingEnv(deps.childEnv)
    return undefined
  }
  server.on('error', error => {
    logForDebugging(`[uds-messaging] Server error: ${(error as Error).message}`, { level: 'error' })
  })

  state.authRequired = options.requireAuth ?? authRequiredByDefault(getPlatform())
  state.firstLineDeadlineMs = options.firstLineDeadlineMs ?? state.firstLineDeadlineMs
  const tokens = createInboxTokens()
  state.activeTokens = tokens

  const closeOptions = { storage: deps.storage, inboundGateDeps: deps.inboundGateDeps, flushPeerDropReceipts: deps.flushPeerDropReceipts, childEnv: deps.childEnv, inboxKeyDeps: deps.inboxKeyDeps }
  let unregisterCleanup: (() => void) | undefined
  try {
    if (options.isExplicit) {
      if (!(await listenOn(server, socketPath))) throw new Error('listen EADDRINUSE on the requested socket path')
    } else {
      socketPath = await bindAutoSocket(server, socketPath)
      state.activeSocketPath = socketPath
    }
    if (options.profileStartup) deps.markStartupProfile('uds_inbox_listening')
    {
      const hostUid = await hostUidForPeerDirs()
      const ownUid = process.getuid?.()
      state.peerDirOwnerUids = [...(ownUid !== undefined ? [ownUid] : []), ...(hostUid !== undefined && hostUid !== ownUid ? [hostUid] : [])]
    }
    server.unref()
    unregisterCleanup = registerCleanup(async () => {
      logForDebugging('[uds-messaging] Shutting down')
      await closeInbox(state, server, socketPath, closeOptions)
    })
    await chmod(socketPath, SOCKET_MODE)

    try {
      state.activeKeyFile = await publishInboxKey(socketPath, tokens.peerToken, { sweepPermitted: await isRegistrySweepPermitted(), storage: deps.storage }, deps.inboxKeyDeps)
      registerActiveKeyFileCleanupOnExit(state)
    } catch (error) {
      if (state.authRequired) {
        logForDebugging(
          `[uds-messaging] Failed to publish the inbox auth key (refusing to run an inbox no peer can authenticate to): ${error}`,
          { level: 'error' },
        )
        state.lastStartFailureCause = 'key_publish_failed'
        await closeInbox(state, server, socketPath, { ...closeOptions, settleHeld: false })
        unregisterCleanup()
        clearMessagingEnv(deps.childEnv)
        if (options.isExplicit) {
          throw new MessagingStartError(
            `--messaging-socket-path: bound ${socketPath} but could not publish its auth key (${errorMessage(error)}); peers could not authenticate, so the inbox was closed. Check that the session registry directory is writable by you.`,
          )
        }
        return undefined
      }
      logForDebugging(
        `[uds-messaging] Failed to publish the inbox auth key; peers will send unauthenticated (accepted: auth is optional on this platform): ${error}`,
        { level: 'warn' },
      )
      recordDegraded(state, 'key_publish_failed')
    }
    if (options.profileStartup) deps.markStartupProfile('uds_inbox_key_published')

    process.env[MESSAGING_SOCKET_ENV] = socketPath
    deps.childEnv.set(MESSAGING_TOKEN_ENV, tokens.childToken)
    const ownAddress = udsAddress(socketPath)
    messagingState().ingress.ownUdsHopToken = ownAddress
    const inboundState = messagingState().inbound
    wireRecordCorrespondent(message => recordHeldPeerCorrespondent(message as HeldPeerMessage, state), inboundState)
    sessionNameState().senderMode = () => currentModeClassForTelemetry(deps.inboundGateDeps)
    setSendNotice(buildSendIdleNotice(deps.sendToPeer, ownAddress, deps.inboundGateDeps))
    setArtifactReplySender(buildArtifactReplySender(deps.sendToPeer, ownAddress, deps.storage), ownAddress)
    setRegisteredInboxOfPid(deps.registeredInboxOfPid)
    wireSendPeerReceipt(buildSendPeerReceipt(socketPath, ownAddress, deps.storage, deps.sendToPeer, state), inboundState)

    logForDebugging(`[uds-messaging] Listening: ${socketPath}`, { level: 'info' })
    logForDebugging(
      `[uds-messaging] Inject messages (auth line ${state.authRequired ? 'REQUIRED' : 'optional'} here): { echo '{"type":"auth","token":"'"$THYROX_CODE_MESSAGING_TOKEN"'"}'; echo '{"type":"user","message":{"role":"user","content":"hello"}}'; } | socat - UNIX-CONNECT:${socketPath}`,
      { level: 'info' },
    )
    logForDebugging(
      `[uds-messaging] Connect when the data is ready (e.g. out=$(cmd); printf '%s\\n' "$out" | nc -N -U "$THYROX_CODE_MESSAGING_SOCKET" — or the socat form above): a connection that sends no complete line within ${state.firstLineDeadlineMs} ms is closed`,
      { level: 'info' },
    )
    state.lastStartFailureCause = undefined
    const stop = unregisterCleanup
    return async () => {
      await closeInbox(state, server, socketPath, closeOptions)
      stop()
    }
  } catch (error) {
    if (error instanceof MessagingStartError) throw error
    const code = getErrnoCode(error)
    if (options.isExplicit) {
      if (unregisterCleanup !== undefined) {
        await closeInbox(state, server, socketPath, { ...closeOptions, settleHeld: false })
        unregisterCleanup()
        clearMessagingEnv(deps.childEnv)
        state.lastStartFailureCause = 'post_bind_setup_failed'
        throw new MessagingStartError(
          `--messaging-socket-path: bound ${socketPath} but could not finish setting the socket up (${code ?? String(error)}); the inbox was closed. The filesystem there may not support socket permissions — choose another directory.`,
        )
      }
      clearActiveInbox(state, deps.childEnv)
      clearMessagingEnv(deps.childEnv)
      const hint =
        code === 'ENAMETOOLONG'
          ? 'the path is too long for a Unix socket (max ~104 bytes); choose a shorter one'
          : code === 'EADDRINUSE'
            ? 'something already exists at that path and could not be replaced; remove it or choose another path'
            : code === 'EACCES' || code === 'EPERM'
              ? 'permission denied in that directory'
              : 'the socket could not be created there'
      throw new MessagingStartError(`--messaging-socket-path: cannot bind at ${socketPath} (${code ?? String(error)}): ${hint}.`)
    }
    if (unregisterCleanup !== undefined) {
      await closeInbox(state, server, socketPath, { ...closeOptions, settleHeld: false })
      unregisterCleanup()
      state.lastStartFailureCause = 'post_bind_setup_failed'
    }
    if (code === 'ENAMETOOLONG') {
      logForDebugging(
        `[uds-messaging] Socket path too long (${socketPath.length} bytes, max ~104): ${socketPath}. Try a shorter --messaging-socket-path, or set XDG_RUNTIME_DIR or $THYROX_CODE_TMPDIR to a shorter directory.`,
        { level: 'error' },
      )
    } else {
      logForDebugging(`[uds-messaging] Failed to start: ${error}`, { level: 'error' })
    }
    clearActiveInbox(state, deps.childEnv)
    clearMessagingEnv(deps.childEnv)
    return undefined
  }
}
