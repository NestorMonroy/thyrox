/**
 * El buzón por socket de la sesión: arranca `mn` con las dependencias por
 * defecto del proceso, sobre un `InboxState` propio de este módulo, y expone
 * los accesores que sus consumidores reales necesitan sobre ESE mismo
 * estado.
 *
 * `chunk-9d7mkc64.js` (2.1.283) exporta quince nombres —`export{f9r as
 * currentSenderClass,W1o as getDefaultUdsSocketPath,p9r as
 * getPerUidFallbackUdsSocketPath,oEn as getUdsInboxUnavailableReason,Dqo as
 * getUdsMessagingSocketPath,Oqo as getUdsStartDegradedCause,Pqo as
 * getUdsStartFailureCause,Hqo as setOnEnableRemoteControl,Mqo as
 * setOnEnqueue,iEn as setOnPeerMessageStatus,sEn as setOnRename,Lqo as
 * startCrossSessionInbox,z1o as startUdsMessaging,m9r as
 * unlinkActiveKeyFileSync,G1o as validateExplicitMessagingSocketPath,aEn as
 * vettedPeerReplyTarget}`—, pero este módulo sólo porta los que tienen
 * consumidor de producción en este árbol (`git grep -n
 * "local-observability/uds/udsMessaging"`): `getDefaultUdsSocketPath` y
 * `startUdsMessaging` (ya portados, para `setup.ts`), más
 * `getUdsMessagingSocketPath` (`@thyrox/agent/messages/systemInit.ts`) y
 * `setOnEnqueue` (`@thyrox/cli:
 * headless/sdk/session/run-streaming.ts`). Los once restantes no se portan
 * aquí — no se inventa un nombre que ningún llamador pide; cuando uno lo
 * pida, cada accesor es una línea de delegación sobre `inboxState.ts`, que
 * ya los porta todos (`readLastStartFailureCause`/`Pqo`,
 * `readLastStartDegradedCause`/`Oqo`, `readStartFailureMessage`/`oEn`,
 * `setOnRename`/`sEn`, `setOnEnableRemoteControl`/`Hqo`,
 * `setOnPeerMessageStatus`/`iEn`, `removeActiveKeyFileSync`/`m9r`).
 * `startCrossSessionInbox`/`Lqo` (el default-y-`isExplicit` derivados de si
 * llegó ruta) tampoco se porta como export propio: `setup.ts` ya inlinea
 * exactamente esa derivación al llamar a `startUdsMessaging`.
 *
 * `getUdsMessagingSocketPath` (`Dqo`, `chunk-yg53q7yp.js`) es
 * `readActiveSocketPath(state)`: la ruta bindeada de ESTA sesión, o
 * `undefined` si el buzón no arrancó. `chunk-1q6c162b.js` la llama al
 * construir `system/init` (`Fgt()`:
 * `r=import.meta.require("/$bunfs/root/chunk-9d7mkc64.js").
 * getUdsMessagingSocketPath()`), el mismo punto que porta
 * `@thyrox/agent/messages/systemInit.ts`.
 *
 * `setOnEnqueue` (`Mqo`, `inboxState.ts`) toma `(state, handler)`; el export
 * de este módulo lo cierra sobre el `state` de ESTA sesión para que
 * `run-streaming.ts` —que llama `setOnEnqueue(cb)` sin estado, como hace
 * `chunk-ycnq45th.js`: `let{setOnEnqueue:S}=import.meta.require(...);
 * S(()=>{...})`— reciba la misma firma sin conocer el `InboxState` interno.
 */
import { createInboxState, setOnEnqueue as setStateOnEnqueue, readActiveSocketPath, type InboxState } from './inboxState.ts'
import {
  type MessagingStartDeps,
  type MessagingStartOptions,
  type MessagingStop,
  processMessagingStartDeps,
  startMessagingInbox,
} from './inboxServer.ts'
import { defaultUdsSocketPath } from './socketPath.ts'

const state: InboxState = createInboxState()

/** Sólo para pruebas: el `InboxState` de este módulo, para verificar que un accesor (`setOnEnqueue`) escribe sobre el mismo estado que `startUdsMessaging` lee. */
export const udsMessagingStateForTesting: InboxState = state

export const getDefaultUdsSocketPath = (): string => defaultUdsSocketPath()

/** `mn`, con las dependencias por defecto de esta sesión; `deps` sobreescribe lo que haga falta. */
export const startUdsMessaging = (
  socketPath: string,
  options: MessagingStartOptions,
  deps: Partial<MessagingStartDeps> = {},
): Promise<MessagingStop | undefined> => startMessagingInbox(socketPath, options, { ...processMessagingStartDeps(state), ...deps })

/** `Dqo`: la ruta del socket activo de esta sesión, si el buzón está arrancado. */
export const getUdsMessagingSocketPath = (): string | undefined => readActiveSocketPath(state)

/** `Mqo`: fija (o retira, con `undefined`) el aviso de mensaje de un par encolado. */
export const setOnEnqueue = (handler: (() => void) | undefined): void => setStateOnEnqueue(state, handler)

export type { MessagingStop }
