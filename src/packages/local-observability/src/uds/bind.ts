/**
 * Escuchar en la ruta del buzón sin pisar a otra sesión, y cerrarlo. Porte de
 * `me`, `ne`, `tn`, `sn`, `rn`, `B` y `H` de 2.1.283 (`chunk-yg53q7yp.js`),
 * con sus internos `enr`, `dbt`, `Ze` y `Je` (`B`) y `$Rr`, `anr`, `lnr`,
 * `JEn`, `mlr`, `ZEn` y `wS` (`H`).
 *
 * Divergencia de la referencia: `ne` detecta la colisión sólo por
 * `EADDRINUSE`, y Bun escucha sin error sobre un socket vivo y se queda con
 * sus clientes. Aquí la vida del socket se mide antes de escuchar.
 *
 * `Ze` (una espera de `processingChain` con tope, sin señal de aborto) se
 * porta directo y no como dependencia inyectada pese a que el ITEM que trae
 * este archivo la nombra fuera de alcance: sólo depende de
 * `state.processingChain`, ya portado, así que inyectarla sería un parámetro
 * que siempre hace lo mismo. `Cgo` (el vaciado de recibos de descarte a un
 * par, UDS C) sí queda inyectada: depende de un subsistema que no está
 * portado.
 *
 * `H` no necesita casi ninguna dependencia propia: `wireSendPeerReceipt`,
 * `wireRecordCorrespondent`, `setSendNotice`, `setArtifactReplySender`,
 * `setRegisteredInboxOfPid` y `sessionNameState` ya traen su propio anfitrión
 * por omisión (`processHost` de cada módulo), así que sólo `childEnv` (el
 * `Gw` de la referencia, el entorno de los procesos hijo — sin porte propio,
 * inyectado con un respaldo sobre `process.env`) necesita un parámetro.
 */
import { randomBytes } from 'node:crypto'
import { readdir, unlink } from 'node:fs/promises'
import { Socket, type Server } from 'node:net'
import { basename, dirname, join } from 'node:path'

import { getErrnoCode } from '../errorHelpers.ts'
import { setArtifactReplySender } from './artifactReplyYield.ts'
import { flushIdleNotices, refreshParkedHoldBack, setRegisteredInboxOfPid, setSendNotice } from './idleNotification.ts'
import { settleHeldMessagesAsExpired, wireRecordCorrespondent, wireSendPeerReceipt, type InboundGateDeps } from './inboundGate.ts'
import type { InboxState } from './inboxState.ts'
import { removeInboxKey, type InboxKeyDeps, type SessionKeyStorage } from './inboxKeys.ts'
import { messagingState } from './messagingState.ts'
import { sessionNameState } from './sessionNameState.ts'
import { MAX_SOCKET_PATH_BYTES } from './socketPath.ts'

/** Cuánto espera `me` a que el socket acepte antes de darlo por muerto. */
const LIVENESS_TIMEOUT_MS = 250
const MOVED_ASIDE_ATTEMPTS = 3
/** `Je`: cuánto espera `B` a que se asiente un `processingChain` o un aviso de salida. */
const SETTLE_TIMEOUT_MS = 3000

/** El entorno que ven los procesos hijos de esta sesión (`Gw`); sin porte propio. */
export type ChildProcessEnv = {
  set: (name: string, value: string) => void
  unset: (name: string) => void
}

/** Respaldo honesto de `Gw` hasta que exista un entorno de hijos propio: opera sobre `process.env`. */
export const processChildEnv: ChildProcessEnv = {
  set: (name, value) => {
    process.env[name] = value
  },
  unset: name => {
    delete process.env[name]
  },
}

export const MESSAGING_SOCKET_ENV = 'THYROX_CODE_MESSAGING_SOCKET'
export const MESSAGING_TOKEN_ENV = 'THYROX_CODE_MESSAGING_TOKEN'

/** El resto de `InboundGateDeps` que `settleHeldMessagesAsExpired` no usa; sólo `.state` importa aquí. */
export function defaultInboundGateDeps(): InboundGateDeps {
  return {
    state: messagingState().inbound,
    checkFeatureGate: (_gate, defaultValue) => defaultValue,
    crossSessionMessagingEnabled: () => true,
    nonInteractive: () => false,
    agentId: () => '',
    admitForDelivery: () => ({ admitted: false }),
    subscribeToSettingsRefresh: () => () => {},
  }
}

/** `Ze`/`Q`: espera `promise` hasta que se resuelva o hasta `ms`, sin bloquear la salida del proceso. */
function settleWithTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return Promise.race([
    promise,
    new Promise<void>(resolve => {
      const timer = setTimeout(resolve, ms)
      timer.unref()
    }),
  ])
}

/** `me`: si alguien escucha en la ruta. */
export function isSocketLive(path: string): Promise<'live' | 'dead'> {
  return new Promise(resolve => {
    const probe = new Socket()
    const settle = (verdict: 'live' | 'dead') => {
      probe.destroy()
      resolve(verdict)
    }
    probe.on('connect', () => settle('live'))
    probe.on('error', () => settle('dead'))
    probe.setTimeout(LIVENESS_TIMEOUT_MS, () => settle('dead'))
    probe.connect({ path })
  })
}

/** `ne`: escucha en la ruta; `false` si otra sesión ya escucha ahí. */
export async function listenOn(server: Server, path: string): Promise<boolean> {
  if ((await isSocketLive(path)) === 'live') return false
  return new Promise((resolve, reject) => {
    const onError = (error: unknown) => {
      if (getErrnoCode(error) === 'EADDRINUSE') resolve(false)
      else reject(error)
    }
    server.once('error', onError)
    server.listen(path, () => {
      server.removeListener('error', onError)
      resolve(true)
    })
  })
}

/** `tn`: una ruta hermana única; si no cabe en `sun_path`, un nombre corto en el mismo directorio. */
export function movedAsidePath(path: string): string {
  const candidate = `${path.replace(/\.sock$/, '')}-${randomBytes(4).toString('hex')}.sock`
  if (Buffer.byteLength(candidate) <= MAX_SOCKET_PATH_BYTES) return candidate
  const dir = dirname(path)
  const room = MAX_SOCKET_PATH_BYTES - Buffer.byteLength(join(dir, '.sock'))
  return join(dir, `${randomBytes(8).toString('hex').slice(0, Math.max(1, room))}.sock`)
}

/** `sn`: retira las rutas apartadas de esta ruta que ya nadie escucha. */
export async function reapMovedAsideSockets(path: string): Promise<void> {
  const prefix = `${basename(path).replace(/\.sock$/, '')}-`
  let names: string[]
  try {
    names = await readdir(dirname(path))
  } catch {
    return
  }
  for (const name of names) {
    if (!name.startsWith(prefix) || !/^[0-9a-f]{8}\.sock$/.test(name.slice(prefix.length))) continue
    const sibling = join(dirname(path), name)
    if ((await isSocketLive(sibling)) === 'live') continue
    await unlink(sibling).catch(() => {})
  }
}

/**
 * `rn`: escucha en la ruta automática. Un socket muerto se retira; uno vivo
 * es de otra sesión (un espacio de pids hermano), y se escucha a su lado.
 */
export async function bindAutoSocket(server: Server, path: string): Promise<string> {
  await reapMovedAsideSockets(path)
  if (await listenOn(server, path)) return path
  if ((await isSocketLive(path)) !== 'live') {
    await unlink(path).catch(() => {})
    if (await listenOn(server, path)) return path
  }
  for (let attempt = 0; attempt < MOVED_ASIDE_ATTEMPTS; attempt++) {
    const aside = movedAsidePath(path)
    if (await listenOn(server, aside)) return aside
  }
  throw new Error('listen EADDRINUSE on the auto socket path and its moved-aside siblings')
}

/**
 * `H`: el buzón deja de estar activo — se olvida la ruta, los tokens, la
 * variable de entorno publicada y todo lo que `mn` cableó para responder a
 * un par (el recibo de retención, el correspondiente anotado, el aviso de
 * inactividad, la cesión de artefactos y quién resuelve el buzón de un pid).
 */
export function clearActiveInbox(state: InboxState, childEnv: ChildProcessEnv = processChildEnv): void {
  state.activeSocketPath = undefined
  state.activeTokens = undefined
  delete process.env[MESSAGING_SOCKET_ENV]
  childEnv.unset(MESSAGING_TOKEN_ENV)
  messagingState().ingress.ownUdsHopToken = undefined
  wireSendPeerReceipt(null, messagingState().inbound)
  wireRecordCorrespondent(null, messagingState().inbound)
  setSendNotice(null)
  setArtifactReplySender(null)
  setRegisteredInboxOfPid(null)
  sessionNameState().senderMode = null
}

export type CloseInboxOptions = {
  /** `r`/`settleHeld`: si se expiran los retenidos y se avisa la salida antes de cerrar. */
  settleHeld?: boolean
  /** `n`: el backend de storage de esta sesión, inyectado (fuera de alcance de F2). */
  storage?: SessionKeyStorage
  inboundGateDeps?: InboundGateDeps
  /** `Cgo`: vacía los recibos de descarte pendientes a un par (UDS C, sin portar). */
  flushPeerDropReceipts?: () => Promise<void>
  childEnv?: ChildProcessEnv
  inboxKeyDeps?: InboxKeyDeps
}

/**
 * `B`: cierra los clientes y el servidor; si `settleHeld`, expira los
 * mensajes retenidos (`dbt`) y avisa la salida a quien pidió aviso de
 * inactividad, con el mismo tope (`Je`) para las dos esperas. Borra el
 * socket, retira la clave publicada y limpia el estado (`H`).
 */
export async function closeInbox(state: InboxState, server: Server, path: string, options: CloseInboxOptions = {}): Promise<void> {
  const {
    settleHeld = true,
    storage,
    inboundGateDeps = defaultInboundGateDeps(),
    flushPeerDropReceipts = async () => {},
    childEnv,
    inboxKeyDeps,
  } = options
  for (const client of state.connectedClients) client.destroy()
  state.connectedClients.clear()
  server.close()
  if (settleHeld) refreshParkedHoldBack()
  const settlingHeld = settleHeld ? settleHeldMessagesAsExpired(inboundGateDeps) : undefined
  await settleWithTimeout(state.processingChain, SETTLE_TIMEOUT_MS)
  const settlingExit = settleHeld ? settleWithTimeout(flushIdleNotices('exited'), SETTLE_TIMEOUT_MS) : undefined
  await settlingHeld
  await settlingExit
  if (settleHeld) await flushPeerDropReceipts()
  await unlink(path).catch(() => {})
  if (state.activeKeyFile !== undefined) {
    await removeInboxKey(state.activeKeyFile, storage, inboxKeyDeps)
    state.activeKeyFile = undefined
  }
  clearActiveInbox(state, childEnv)
}
