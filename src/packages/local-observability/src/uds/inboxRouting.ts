/**
 * El despacho de un mensaje que llegó al buzón: por tipo (`user`, `control`)
 * y, dentro de `control`, por acción. Los mensajes se procesan en orden, salvo
 * los que no pueden esperar: un control que no sea `notify_when_idle` y un
 * `user` con prioridad `now` sin adjuntos.
 *
 * Porte de `Qe`, `be`, `le` e `Ie` (`chunk-yg53q7yp.js`) de 2.1.283, con la
 * acción `rename`. La entrega de un `user` (`ze`) y las acciones de control
 * con subsistema propio llegan como dependencias.
 */
import type { PeerIdentity } from './inboxConnection.ts'
import type { InboxState } from './inboxState.ts'
import { withholdTokenText } from './logRedaction.ts'

type Message = Record<string, unknown> & { type: string }

/** Una acción de control; `accepts` decide si el mensaje le corresponde, como las guardas de `be`. */
export type ControlActionHandler =
  | ((message: Message, peer: PeerIdentity) => Promise<void> | void)
  | { accepts: (message: Message) => boolean; handle: (message: Message, peer: PeerIdentity) => Promise<void> | void }

export interface InboxRoutingDeps {
  state: InboxState
  /** `Y`: el id de esta sesión. */
  sessionId: () => string
  warn: (message: string) => void
  /** `ze`: entrega un mensaje `user` a la cola de la sesión. */
  deliverUserMessage: (message: Message, peer: PeerIdentity) => Promise<void>
  /** `onRename` del estado: otro proceso renombró esta sesión. */
  onRename?: (name: string) => void
  controlActions: Partial<Record<string, ControlActionHandler>>
}

/** `le`: un objeto con un `type` de texto. */
export function isInboxMessage(value: unknown): value is Message {
  return typeof value === 'object' && value !== null && 'type' in value && typeof (value as { type: unknown }).type === 'string'
}

/** `Ie`: un mensaje dirigido a otra sesión se descarta. */
export function sessionIdMatches(message: { type: string; session_id?: unknown }, sessionId: string, warn: (message: string) => void): boolean {
  if (message.session_id !== undefined && message.session_id !== sessionId) {
    warn(
      `[uds-messaging] Dropping ${withholdTokenText(message.type)} message: session_id mismatch (got "${withholdTokenText(String(message.session_id))}", expected "${sessionId}")`,
    )
    return false
  }
  return true
}

function resolveControlAction(message: Message, deps: InboxRoutingDeps): ((peer: PeerIdentity) => Promise<void> | void) | undefined {
  const action = message.action
  if (action === 'rename') {
    return typeof message.name === 'string' ? () => deps.onRename?.(message.name as string) : undefined
  }
  if (typeof action !== 'string' || !Object.hasOwn(deps.controlActions, action)) return undefined
  const handler = deps.controlActions[action]
  if (handler === undefined) return undefined
  if (typeof handler === 'function') return peer => handler(message, peer)
  return handler.accepts(message) ? peer => handler.handle(message, peer) : undefined
}

/** `be`: procesa un mensaje según su tipo. */
export async function handleInboxMessage(message: unknown, peer: PeerIdentity, deps: InboxRoutingDeps): Promise<void> {
  if (!isInboxMessage(message)) {
    deps.warn('[uds-messaging] Ignoring message without valid type field')
    return
  }
  if (message.type === 'user') {
    await deps.deliverUserMessage(message, peer)
    return
  }
  if (message.type === 'control') {
    if (!sessionIdMatches(message, deps.sessionId(), deps.warn)) return
    const run = resolveControlAction(message, deps)
    if (run === undefined) {
      deps.warn(`[uds-messaging] Unhandled control action: ${withholdTokenText(String(message.action))}`)
      return
    }
    await run(peer)
    return
  }
  deps.warn(`[uds-messaging] Received unhandled message type: ${withholdTokenText(message.type)}`)
}

/** Si el mensaje se atiende al llegar, sin esperar a los anteriores. */
function bypassesChain(message: unknown): boolean {
  if (!isInboxMessage(message)) return false
  if (message.type === 'control') return message.action !== 'notify_when_idle'
  return message.type === 'user' && message.priority === 'now' && message.file_attachments === undefined
}

/** `Qe`: encola el mensaje tras los anteriores, o lo atiende ya si no puede esperar. */
export function routeInboxMessage(message: unknown, peer: PeerIdentity, deps: InboxRoutingDeps): void {
  const reportFailure = (error: unknown) => deps.warn(`[uds-messaging] Failed to process message: ${error}`)
  if (bypassesChain(message)) {
    handleInboxMessage(message, peer, deps).catch(reportFailure)
    return
  }
  deps.state.processingChain = deps.state.processingChain.then(() => handleInboxMessage(message, peer, deps)).catch(reportFailure)
}
