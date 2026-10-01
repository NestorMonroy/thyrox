/**
 * Las acciones de control del buzón, en un solo mapa para
 * `InboxRoutingDeps.controlActions`. `be` (`chunk-yg53q7yp.js`, 2.1.283)
 * despacha siete: `rename` la resuelve el despacho mismo
 * (`inboxRouting.ts`) y las seis restantes viven en tres módulos, cada uno
 * con su subsistema:
 *
 * - `peer_message_status` — el desenlace de un envío propio
 *   (`peerMessageStatus.ts`);
 * - `notify_when_idle` y `peer_idle_notice` — el aviso de inactividad entre
 *   sesiones (`idleNotification.ts`);
 * - `yield_artifact_replies`, `unyield_artifact_replies` y
 *   `artifact_replies_yielded` — la cesión de las respuestas de un artefacto
 *   (`artifactReplyYield.ts`).
 *
 * Quien arranca el buzón pasa aquí las dependencias de los tres; este
 * módulo no añade conducta, sólo junta los manejadores bajo el nombre de la
 * acción que los dispara.
 */
import { type ArtifactReplyControlDeps, artifactReplyControlActions } from './artifactReplyYield.ts'
import { type IdleNotificationDeps, idleNotificationControlActions } from './idleNotification.ts'
import type { ControlActionHandler } from './inboxRouting.ts'
import { type PeerMessageStatusDeps, peerMessageStatusControlActions } from './peerMessageStatus.ts'

/** Las acciones de `be` que no son `rename`, con el nombre literal del marco. */
export const INBOX_CONTROL_ACTIONS = [
  'peer_message_status',
  'notify_when_idle',
  'peer_idle_notice',
  'yield_artifact_replies',
  'unyield_artifact_replies',
  'artifact_replies_yielded',
] as const
export type InboxControlAction = (typeof INBOX_CONTROL_ACTIONS)[number]

export interface InboxControlActionDeps {
  peerMessageStatus: PeerMessageStatusDeps
  idleNotification: IdleNotificationDeps
  artifactReplies: ArtifactReplyControlDeps
}

export function inboxControlActions(deps: InboxControlActionDeps): Record<InboxControlAction, ControlActionHandler> {
  const peerMessageStatus = peerMessageStatusControlActions(deps.peerMessageStatus).peer_message_status
  if (peerMessageStatus === undefined) throw new Error('peerMessageStatusControlActions no devolvió peer_message_status')
  return {
    peer_message_status: peerMessageStatus,
    ...idleNotificationControlActions(deps.idleNotification),
    ...artifactReplyControlActions(deps.artifactReplies),
  }
}
