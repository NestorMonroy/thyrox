/**
 * Cuando una sesión cede su nombre, avisa a las sesiones con las que ya se
 * había escrito: de otro modo seguirían dirigiéndose a ella por el nombre
 * que ahora lleva otra. Sólo avisa a un correspondiente cuyo socket sigue
 * siendo el que el registro asocia a su pid, y nunca a su propio socket.
 *
 * Porte de `zkr` (`chunk-bhsyyycy.js`) de 2.1.283. El envío (`VOt`), el
 * registro (`D3`), la bandera de mensajería (`Ws`) y el socket propio (`DV`)
 * llegan como dependencias.
 */
import { errorMessage, getErrnoCode } from '../errorHelpers.ts'
import { withholdTokenText } from './logRedaction.ts'
import { mayBeSameSocket, parseAddress } from './peerAddress.ts'
import type { LiveSession, SessionNameState } from './sessionNameState.ts'
import { sanitizeSessionName } from './sessionRename.ts'

/** `VOt` con los argumentos que el aviso usa. */
export type SendPeerMessage = (
  target: string,
  text: string,
  scope: unknown,
  fromName: string,
  attachments: undefined,
  hopChain: undefined,
  mode: string | undefined,
  options: { trackReceipts: false; expectPeerPid: number; expectPeerProcStart?: string },
) => Promise<unknown>

export type RenameNoticeDeps = {
  state: SessionNameState
  /** `N`. */
  uniquenessEnabled: () => boolean
  /** `Ws`. */
  messagingEnabled: () => boolean
  /** `DV`: el socket del buzón de esta sesión. */
  ownSocket: () => string | undefined
  /** `D3`. */
  listLive: (scope: unknown) => Promise<LiveSession[]>
  send: SendPeerMessage
  log: (message: string) => void
}

/** `zkr`. */
export async function notifyCorrespondentsOfRename(previousName: string, newName: string, heldName: string, scope: unknown, deps: RenameNoticeDeps): Promise<void> {
  if (!deps.uniquenessEnabled() || !deps.messagingEnabled() || deps.state.correspondents.size === 0) return
  const ownSocket = deps.ownSocket()
  const [previous, renamed, held] = [previousName, newName, heldName].map(sanitizeSessionName)
  const text = `This session was renamed from "${previous}" to "${renamed}" ("${held}" is held by another live session on this machine). Address this one as "${renamed}" from now on.`
  let socketsByPid: Map<number, string | undefined>
  try {
    socketsByPid = new Map((await deps.listLive(scope)).map(session => [session.pid, session.sock]))
  } catch (error) {
    deps.log(`[session-name] rename notice skipped: registry unreadable (${getErrnoCode(error) ?? errorMessage(error)})`)
    return
  }
  await Promise.all(
    [...deps.state.correspondents].map(async ([address, { pid, procStart }]) => {
      const { scheme, target } = parseAddress(address)
      if (scheme !== 'uds' || !target || (ownSocket !== undefined && mayBeSameSocket(target, ownSocket)) || socketsByPid.get(pid) !== target) return
      try {
        await deps.send(target, text, scope, renamed!, undefined, undefined, deps.state.senderMode?.(), {
          trackReceipts: false,
          expectPeerPid: pid,
          ...(procStart !== undefined && { expectPeerProcStart: procStart }),
        })
      } catch (error) {
        deps.log(`[session-name] rename notice to ${withholdTokenText(address)} failed: ${getErrnoCode(error) ?? 'send error'}`)
      }
    }),
  )
}
