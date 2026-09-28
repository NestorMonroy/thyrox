/**
 * El estado del buzón de una sesión: lo que `c()` guarda en 2.1.283
 * (`O_t.of(host)`), con los campos que el servidor escribe y los que la
 * interfaz de estado lee.
 */
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
  }
}

/** `we`: registra la degradación, sin que un fallo de clave tape el respaldo de directorio. */
export function recordDegraded(state: InboxState, cause: InboxStartDegradedCause): void {
  if (cause === 'key_publish_failed' && state.lastStartDegradedCause === 'primary_dir_refused_fell_back') return
  state.lastStartDegradedCause = cause
}
