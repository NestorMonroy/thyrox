/**
 * Cliente del socket de rendezvous (control) — lado supervisor.
 *
 * Puerto 1:1 de `ant 5016.js` `naK`. El WorkerVm del daemon abre uno de
 * éstos contra el socket de rendezvous de cada worker (`<jobDir>/rv.sock`).
 * Es el canal de control fuera de banda, SEPARADO del socket de datos PTY:
 *
 *   - socket PTY  (ptyHost/ptyAdopter): bytes de pantalla, attach/replay.
 *   - socket rv   (éste + rvServer):    state/done/heartbeat autoritativos
 *                                       empujados por el REPL interno, más
 *                                       shutdown/repaint/reply/attacher-caps
 *                                       supervisor→worker.
 *
 * Modelo de conexión (ant naK, verbatim):
 *   - Al construirse, conecta de inmediato.
 *   - Al conectar: resetea el contador de intentos, manda la trama de
 *     handshake `{ proto, role: 'supervisor', supervisorPid }`, luego lee
 *     tramas JSON delimitadas por newline y reenvía cada mensaje tipado a
 *     `onMessage`.
 *   - Al cerrarse una conexión YA ESTABLECIDA: llama a `onDisconnect` (el
 *     WorkerVm lo usa para re-chequear de inmediato el pid del worker),
 *     luego programa una reconexión.
 *   - Backoff de reconexión: `[100, 250, 500, 1000, 2000]` ms (acotado a la
 *     última entrada), con tope de 30 intentos. Agotados, registra
 *     `tengu_bg_rv_connect_exhausted` y se detiene — el poll de pid del
 *     WorkerVm es el respaldo de vivacidad desde ese punto (rv es una
 *     optimización sobre el poll de pid, nunca la única señal).
 *   - `send()`: si no hay socket vivo y ya se había agotado, resetea el
 *     contador y reintenta (un send es evidencia de que el supervisor
 *     todavía le importa este worker). Devuelve false cuando la trama no
 *     se pudo escribir.
 *
 * El framing de cable coincide con el resto del protocolo del daemon
 * (socketProto.ts): un objeto JSON por línea, terminado en `\n`. El
 * handshake lleva un campo `role`; el servidor (rvServer.ts) descarta
 * cualquier trama que lo tenga, así que el handshake es un marcador puro y
 * nunca llega al manejador de comandos del worker (ant kb3:
 * `if("role"in _)return`).
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/rvClient.ts`.
 */

import { Socket } from 'node:net'

import { logEvent } from './internal/pendingCrossPackageDeps.js'

import { PROTO_VERSION, createLineDecoder, encodeFrame } from './socketProto.js'

/**
 * Mensajes que el servidor rv del worker empuja al supervisor. Espeja los
 * sends `no({type:...})` de `ant 4291.js` + el despacho onMessage
 * `connectRv` de 5017.js. El supervisor sólo ACTÚA sobre estos cinco
 * `type`s; tipos desconocidos se ignoran (compatible hacia adelante).
 */
export type RvServerMessage =
  | { type: 'heartbeat' }
  | { type: 'done'; outcome: 'done' | 'crashed' | 'killed' }
  | { type: 'state'; patch: Record<string, unknown> }
  | { type: 'detach-request'; msg?: string }
  | { type: 'repaint-done' }
  | { type: 'shutting-down' }

/**
 * Mensajes que el supervisor manda al worker. Espeja las llamadas
 * `this.rv.send({type:...})` de `ant 5017.js` + el manejador `kb3` de
 * 4291.js.
 */
export type RvClientMessage =
  | { type: 'shutdown' }
  | { type: 'repaint' }
  | { type: 'reply'; text: string }
  | { type: 'attacher-caps'; caps: unknown }

export interface RvClient {
  /** Manda una trama de control al worker. Devuelve false si no es entregable. */
  send(msg: RvClientMessage): boolean
  /** Desmonta: deja de reconectar + destruye el socket. */
  close(): void
}

/** Backoff de ant naK (`daK`, asignado en la init `iaK` de 5017.js). */
const RV_BACKOFF_MS = [100, 250, 500, 1000, 2000] as const
/** Máximo de intentos de ant naK (`caK = 30`). */
const RV_MAX_ATTEMPTS = 30

/**
 * Abre un cliente de rendezvous contra `socketPath`.
 *
 * @param socketPath   la ruta del rv.sock del worker
 * @param onMessage    se invoca por cada trama tipada que el worker empuja
 * @param onDisconnect se invoca cada vez que una conexión YA ESTABLECIDA
 *                     se cae (ant `q`) — el WorkerVm lo conecta a checkPid()
 * @param onConnect    se invoca en cada (re)conexión exitosa (ant `K`) — el
 *                     WorkerVm lo conecta a marcar workerReady + volcar un
 *                     resize diferido + (re)mandar attacher-caps
 */
export function createRvClient(
  socketPath: string,
  onMessage: (msg: RvServerMessage) => void,
  onDisconnect: () => void,
  onConnect: () => void,
): RvClient {
  let socket: Socket | undefined
  let closed = false
  let attempt = 0
  let gaveUp = false
  let reconnectTimer: NodeJS.Timeout | undefined

  /** ant `Y` — abre un intento de conexión. */
  function tryConnect(): void {
    if (closed) return
    const sock = new Socket()
    let opened = false
    sock.on('error', () => scheduleReconnect())
    sock.once('close', () => {
      if (socket === sock) socket = undefined
      if (closed) return
      // Sólo dispara onDisconnect cuando la conexión realmente había
      // abierto — un socket nunca-abierto sólo reintenta (ant: `if(J)q()`).
      if (opened) onDisconnect()
      scheduleReconnect()
    })
    sock.once('connect', () => {
      opened = true
      attempt = 0
      gaveUp = false
      socket = sock
      onConnect()
      // Handshake — `role` marca esta trama como del lado supervisor para
      // que el manejador de comandos del worker la descarte (ant kb3
      // `if("role"in _)return`).
      try {
        sock.write(
          encodeFrame({
            proto: PROTO_VERSION,
            role: 'supervisor',
            supervisorPid: process.pid,
          }),
        )
      } catch {
        // best-effort — un fallo de escritura aquí dispara close/error → reintento.
      }
      const decode = createLineDecoder(
        msg => {
          if (msg && typeof msg === 'object' && 'type' in msg) {
            onMessage(msg as RvServerMessage)
          }
        },
        () => sock.destroy(),
      )
      sock.on('data', decode)
    })
    sock.connect(socketPath)
  }

  /** ant `w` — programa la siguiente reconexión con backoff, o se rinde. */
  function scheduleReconnect(): void {
    if (closed || reconnectTimer || gaveUp) return
    if (attempt >= RV_MAX_ATTEMPTS) {
      gaveUp = true
      logEvent('tengu_bg_rv_connect_exhausted', { attempts: String(attempt) })
      return
    }
    const delay = RV_BACKOFF_MS[Math.min(attempt, RV_BACKOFF_MS.length - 1)]!
    attempt++
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      tryConnect()
    }, delay)
    reconnectTimer.unref()
  }

  tryConnect()

  return {
    send(msg: RvClientMessage): boolean {
      if (!socket || socket.destroyed) {
        // Un send significa que al supervisor todavía le importa — si se
        // había rendido, resetea y arranca un ciclo de reconexión fresco
        // (ant naK send()).
        if (attempt >= RV_MAX_ATTEMPTS) {
          attempt = 0
          gaveUp = false
          scheduleReconnect()
        }
        return false
      }
      try {
        socket.write(encodeFrame(msg))
        return true
      } catch (e) {
        logEvent('tengu_bg_rv_send_failed', { error: String(e).slice(0, 80) })
        return false
      }
    },
    close(): void {
      closed = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = undefined
      }
      socket?.destroy()
      socket = undefined
    },
  }
}
