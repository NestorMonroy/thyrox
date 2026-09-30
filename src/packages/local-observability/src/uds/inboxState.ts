/**
 * El estado del buzón de una sesión: lo que `c()` guarda en 2.1.283
 * (`O_t.of(host)`), con los campos que el servidor escribe y los que la
 * interfaz de estado lee.
 *
 * `Lqo` y `z1o` arrancan el servidor (`mn`) y son otra fase: no se portan
 * aquí.
 */
import { unlinkSync } from 'node:fs'
import type { Socket } from 'node:net'

import type { InboxTokens } from './inboxAuth.ts'

/** `lEn`: cuánto espera el buzón la primera línea completa de una conexión. */
export const FIRST_LINE_DEADLINE_MS = 30000

/** Por qué no arrancó el buzón: los valores que `mn` escribe en `lastStartFailureCause`. */
export type InboxStartFailureCause =
  | 'bind_failed'
  | 'path_refused'
  | 'socket_dir_refused'
  | 'key_publish_failed'
  | 'post_bind_setup_failed'

/** Con qué degradación arrancó, sin impedirlo. */
export type InboxStartDegradedCause = 'primary_dir_refused_fell_back' | 'key_publish_failed'

/** El estado de un mensaje enviado a un par, según lo notifica `peer_message_status`. */
export type PeerMessageStatusHandler = (
  status: string,
  id: string,
  details?: { dropReason: string; droppedCount: number },
) => void

export type InboxState = {
  activeSocketPath: string | undefined
  connectedClients: Set<Socket>
  lastStartFailureCause: InboxStartFailureCause | undefined
  lastStartFailureDetail: string | undefined
  lastStartDegradedCause: InboxStartDegradedCause | undefined
  startInFlight: boolean
  /** Los mensajes se procesan en orden: cada uno espera al anterior. */
  processingChain: Promise<void>
  /** Si toda conexión tiene que abrir con la línea de autenticación. */
  authRequired: boolean
  firstLineDeadlineMs: number
  /** Los tokens de esta sesión mientras el buzón está abierto. */
  activeTokens: InboxTokens | undefined
  /** Cada caída se reporta una vez por proceso, no una por conexión. */
  silentDropReported: boolean
  authDropReported: boolean
  authOkReported: boolean
  /** Los uid dueños de los directorios por defecto donde se buscan los pares. */
  peerDirOwnerUids: number[] | undefined
  /** `onEnqueue`: se llama tras encolar un mensaje de un par. */
  onEnqueue: (() => void) | undefined
  /** `onRename`: otro proceso renombró esta sesión. */
  onRename: ((name: string) => void) | undefined
  /**
   * `onEnableRemoteControl`: activa el control remoto de esta sesión. La
   * acción de control que lo dispara (`enable_remote_control`) no está en el
   * alcance de F4 — se declara sin argumentos hasta portar su emisor.
   */
  onEnableRemoteControl: (() => void) | undefined
  /** `onPeerMessageStatus`: notifica el estado de un mensaje enviado a un par. */
  onPeerMessageStatus: PeerMessageStatusHandler | undefined
  /** `activeKeyFile`: la ruta de la clave publicada mientras el buzón está abierto. */
  activeKeyFile: string | undefined
}

export function createInboxState(): InboxState {
  return {
    activeSocketPath: undefined,
    connectedClients: new Set(),
    lastStartFailureCause: undefined,
    lastStartFailureDetail: undefined,
    lastStartDegradedCause: undefined,
    startInFlight: false,
    processingChain: Promise.resolve(),
    authRequired: false,
    firstLineDeadlineMs: FIRST_LINE_DEADLINE_MS,
    activeTokens: undefined,
    silentDropReported: false,
    authDropReported: false,
    authOkReported: false,
    peerDirOwnerUids: undefined,
    onEnqueue: undefined,
    onRename: undefined,
    onEnableRemoteControl: undefined,
    onPeerMessageStatus: undefined,
    activeKeyFile: undefined,
  }
}

/** `we`: registra la degradación, sin que un fallo de clave tape el respaldo de directorio. */
export function recordDegraded(state: InboxState, cause: InboxStartDegradedCause): void {
  if (cause === 'key_publish_failed' && state.lastStartDegradedCause === 'primary_dir_refused_fell_back') return
  state.lastStartDegradedCause = cause
}

/** `Pqo`: por qué falló el último arranque del buzón. */
export function readLastStartFailureCause(state: InboxState): InboxStartFailureCause | undefined {
  return state.lastStartFailureCause
}

/** `Oqo`: con qué degradación arrancó el buzón, si con alguna. */
export function readLastStartDegradedCause(state: InboxState): InboxStartDegradedCause | undefined {
  return state.lastStartDegradedCause
}

/** `Dqo`: la ruta del socket activo, si el buzón está arrancado. */
export function readActiveSocketPath(state: InboxState): string | undefined {
  return state.activeSocketPath
}

/**
 * `RVt`: por qué el buzón no está disponible, en prosa; `undefined` si está
 * arrancando, ya arrancado, o nunca falló.
 */
export function describeStartFailure(state: InboxState): string | undefined {
  if (state.startInFlight || state.activeSocketPath !== undefined) return undefined
  switch (state.lastStartFailureCause) {
    case 'socket_dir_refused':
      return state.lastStartFailureDetail !== undefined
        ? `its socket directory could not be set up: ${state.lastStartFailureDetail}`
        : 'its socket directory could not be set up'
    case 'path_refused':
      return 'its socket path is not a usable local address'
    case 'bind_failed':
      return 'it could not be started'
    case 'key_publish_failed':
      return 'its peer key could not be published'
    case 'post_bind_setup_failed':
      return 'setting it up after bind failed'
    case undefined:
      return undefined
  }
}

/** `oEn`: el mensaje de `describeStartFailure` sobre el estado activo. */
export function readStartFailureMessage(state: InboxState): string | undefined {
  return describeStartFailure(state)
}

/** `sEn`: fija el aviso de renombre de esta sesión. */
export function setOnRename(state: InboxState, handler: ((name: string) => void) | undefined): void {
  state.onRename = handler
}

/** `Hqo`: fija el aviso de activación de control remoto. */
export function setOnEnableRemoteControl(state: InboxState, handler: (() => void) | undefined): void {
  state.onEnableRemoteControl = handler
}

/** `iEn`: fija el aviso de estado de un mensaje enviado a un par. */
export function setOnPeerMessageStatus(state: InboxState, handler: PeerMessageStatusHandler | undefined): void {
  state.onPeerMessageStatus = handler
}

/** `Mqo`: fija el aviso de mensaje de un par encolado. */
export function setOnEnqueue(state: InboxState, handler: (() => void) | undefined): void {
  state.onEnqueue = handler
}

/**
 * `m9r`: borra el archivo de clave activo, de mejor esfuerzo. Que ya no
 * exista no es un error (mismo criterio que `removeInboxKey` en
 * `inboxKeys.ts`); es síncrona porque corre en un cierre que no puede
 * esperar una promesa.
 */
export function removeActiveKeyFileSync(state: InboxState): void {
  try {
    const path = state.activeKeyFile
    if (path === undefined) return
    unlinkSync(path)
  } catch {
    // Salida de mejor esfuerzo: el barrido retira lo que quede.
  }
}
