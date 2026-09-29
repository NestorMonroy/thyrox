/**
 * El buzón por socket de la sesión: arranca `mn` con las dependencias por
 * defecto del proceso, sobre un `InboxState` propio de este módulo.
 */
import { createInboxState, type InboxState } from './inboxState.ts'
import {
  type MessagingStartDeps,
  type MessagingStartOptions,
  type MessagingStop,
  processMessagingStartDeps,
  startMessagingInbox,
} from './inboxServer.ts'
import { defaultUdsSocketPath } from './socketPath.ts'

const state: InboxState = createInboxState()

export const getDefaultUdsSocketPath = (): string => defaultUdsSocketPath()

/** `mn`, con las dependencias por defecto de esta sesión; `deps` sobreescribe lo que haga falta. */
export const startUdsMessaging = (
  socketPath: string,
  options: MessagingStartOptions,
  deps: Partial<MessagingStartDeps> = {},
): Promise<MessagingStop | undefined> => startMessagingInbox(socketPath, options, { ...processMessagingStartDeps(state), ...deps })
