/**
 * Una conexión entrante al buzón: la lee por líneas JSON, exige la línea de
 * autenticación cuando el buzón la pide, cierra la conexión que calla o que
 * excede el tope, y entrega cada mensaje al enrutado con la identidad del par.
 *
 * Porte de `en` (`chunk-yg53q7yp.js`) de 2.1.283, con `WOt`
 * (`chunk-qcy58j4w.js`). El enrutado (`Qe`) y la decisión de confiar en la
 * ancestría del par (`unr`) llegan como dependencias.
 */
import type { Socket } from 'node:net'

import { logForDebugging } from '../debug.ts'
import { reportFeatureBad, reportFeatureOk, reportFeatureSad } from './featureTelemetry.ts'
import { isAuthFrame, matchInboxToken, type TokenOrigin } from './inboxAuth.ts'
import type { InboxState } from './inboxState.ts'
import { redactLogFragment, withholdTokenText } from './logRedaction.ts'
import { parentPidChain, peerPid, readStartTokenSync } from './peerCredentials.ts'

/** `WOt`: la línea más larga que el buzón acumula antes de cortar la conexión. */
export const LINE_LIMIT_CHARS = 1048576
const AUTH_FEATURE = 'cross_session_inbox_auth'

/** Lo que se sabe del proceso que envió un mensaje. */
export type PeerIdentity = {
  pid: number | undefined
  startToken: string | undefined
  /** Sus padres, sólo cuando se confía en la ancestría; vacía si el par cambió desde que conectó. */
  ancestry: number[] | undefined
  origin: TokenOrigin | undefined
}

export interface InboxConnectionDeps {
  state: InboxState
  /** `Qe`: entrega un mensaje ya autenticado. */
  route: (message: unknown, peer: PeerIdentity) => void
  /** `unr`: si el modo de permisos permite confiar en la ancestría del par. */
  trustsAncestry: () => boolean
  ownPid: number
  peerPid: (socket: Socket) => number | undefined
  startTokenOf: (pid: number) => string | undefined
  parentChain: (pid: number) => number[]
  log: (message: string) => void
  warn: (message: string) => void
  telemetry: {
    ok: (feature: string) => void
    bad: (feature: string, code: string) => void
    sad: (feature: string, code: string) => void
  }
}

/** `le`: un objeto con un `type` de texto. */
function hasMessageType(value: unknown): value is { type: string } {
  return typeof value === 'object' && value !== null && 'type' in value && typeof (value as { type: unknown }).type === 'string'
}

export function processConnectionDeps(state: InboxState, route: InboxConnectionDeps['route'], trustsAncestry: () => boolean): InboxConnectionDeps {
  return {
    state,
    route,
    trustsAncestry,
    ownPid: process.pid,
    peerPid: socket => peerPid(socket),
    startTokenOf: pid => readStartTokenSync(pid),
    parentChain: pid => parentPidChain(pid),
    log: message => logForDebugging(message),
    warn: message => logForDebugging(message, { level: 'warn' }),
    telemetry: {
      ok: feature => reportFeatureOk(feature),
      bad: (feature, code) => reportFeatureBad(feature, code),
      sad: (feature, code) => reportFeatureSad(feature, code),
    },
  }
}

/** `en`: atiende una conexión aceptada por el servidor del buzón. */
export function handleInboxConnection(socket: Socket, deps: InboxConnectionDeps): void {
  const { state } = deps
  socket.setEncoding('utf8')
  const deadlineMs = state.firstLineDeadlineMs
  let deadline: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    deadline = undefined
    try {
      deps.log(`[uds-messaging] Closing a connection that sent no complete line within ${deadlineMs} ms`)
      if (!state.silentDropReported) {
        state.silentDropReported = true
        deps.telemetry.sad(AUTH_FEATURE, 'silent_connection_deadline')
      }
      socket.destroy()
    } catch (error) {
      deps.warn(`[uds-messaging] Failed to close a silent connection: ${error}`)
    }
  }, deadlineMs)
  deadline.unref()
  const disarmDeadline = () => {
    if (deadline !== undefined) {
      clearTimeout(deadline)
      deadline = undefined
    }
  }
  socket.once('close', disarmDeadline)
  socket.once('error', disarmDeadline)

  const trustsAncestry = deps.ownPid !== 1 && deps.trustsAncestry()
  let connectedPeer: { pid: number; token: string } | undefined
  if (trustsAncestry) {
    const pid = deps.peerPid(socket)
    const token = pid !== undefined ? deps.startTokenOf(pid) : undefined
    if (pid !== undefined && token !== undefined) connectedPeer = { pid, token }
  }

  let identity: Omit<PeerIdentity, 'origin'> | undefined
  let origin: TokenOrigin | undefined
  let sawFirstLine = false
  let buffer = ''

  const dropUnauthenticated = (what: string) => {
    deps.warn(`[uds-messaging] Dropped ${what} from a connection that did not authenticate; closing it`)
    if (!state.authDropReported) {
      state.authDropReported = true
      deps.telemetry.bad(AUTH_FEATURE, 'unauthed_drop')
    }
    socket.destroy()
  }

  const resolveIdentity = (): Omit<PeerIdentity, 'origin'> => {
    const pid = deps.peerPid(socket)
    const startToken =
      pid === undefined ? undefined : connectedPeer !== undefined ? (connectedPeer.pid === pid ? connectedPeer.token : undefined) : deps.startTokenOf(pid)
    let ancestry: number[] | undefined
    if (pid !== undefined && trustsAncestry) {
      const unchanged = connectedPeer !== undefined && connectedPeer.pid === pid && deps.startTokenOf(pid) === connectedPeer.token
      ancestry = unchanged ? deps.parentChain(pid) : []
    }
    return { pid, startToken, ancestry }
  }

  const handleMessage = (message: unknown) => {
    const isFirst = !sawFirstLine
    sawFirstLine = true
    if (isAuthFrame(message)) {
      if (isFirst) {
        origin = matchInboxToken(message.token, state.activeTokens)
        if (origin !== undefined && !state.authOkReported) {
          state.authOkReported = true
          deps.telemetry.ok(AUTH_FEATURE)
        }
        if (origin === undefined && state.authRequired) dropUnauthenticated('a bad auth frame')
      }
      return
    }
    if (state.authRequired && origin === undefined) {
      dropUnauthenticated(hasMessageType(message) ? `a '${withholdTokenText(message.type)}' line` : 'a line')
      return
    }
    identity ??= resolveIdentity()
    deps.route(message, { ...identity, origin })
  }

  const deliver = (message: unknown) => {
    try {
      handleMessage(message)
    } catch (error) {
      deps.warn(`[uds-messaging] Failed to handle line: ${error}`)
    }
  }

  socket.on('data', (chunk: string) => {
    buffer += chunk
    if (buffer.length > LINE_LIMIT_CHARS) {
      deps.warn(`[uds-messaging] Line exceeded ${LINE_LIMIT_CHARS} chars; dropping connection`)
      socket.destroy()
      buffer = ''
      return
    }
    let newline: number
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline)
      buffer = buffer.slice(newline + 1)
      disarmDeadline()
      if (!line.trim()) {
        if (state.authRequired && origin === undefined) {
          sawFirstLine = true
          dropUnauthenticated('a blank line')
          buffer = ''
          return
        }
        continue
      }
      let message: unknown
      try {
        message = JSON.parse(line)
      } catch {
        deps.warn(`[uds-messaging] Failed to parse JSON line: ${redactLogFragment(line)}`)
        if (state.authRequired && origin === undefined) {
          sawFirstLine = true
          dropUnauthenticated('an unparseable line')
          buffer = ''
          return
        }
        continue
      }
      deliver(message)
      if (socket.destroyed) {
        buffer = ''
        return
      }
    }
  })

  socket.on('end', () => {
    if (buffer.trim() && !socket.destroyed) {
      let message: unknown
      let parsed = false
      try {
        message = JSON.parse(buffer)
        parsed = true
      } catch {
        deps.warn(`[uds-messaging] Failed to parse final buffer: ${redactLogFragment(buffer)}`)
        if (state.authRequired && origin === undefined) dropUnauthenticated('an unparseable final fragment')
      }
      if (parsed) deliver(message)
    }
    socket.end()
  })

  socket.on('error', error => {
    deps.warn(`[uds-messaging] Connection error: ${error.message}`)
  })
}
