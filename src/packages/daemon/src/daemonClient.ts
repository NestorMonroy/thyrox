/**
 * Cliente RPC del daemon — lo usa la CLI de ccb para hablar con el daemon
 * por su socket de control.
 *
 * Tres primitivas, cada una portada de `ant 4138.js`:
 *
 *   request(op, payload, opts)   → ant gY  (RPC de un solo tiro)
 *   subscribe(op, payload, on..) → ant Ds7 (stream de larga vida)
 *   leaseKeepalive(label)        → ant Js7 (heartbeat para declarar
 *                                          nuestro proceso al daemon)
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/daemonClient.ts`.
 */

import { type Socket, connect } from 'node:net'

import {
  type ErrorResponse,
  type ProtoOp,
  type Response,
  PROTO_VERSION,
  createLineDecoder,
  encodeFrame,
} from './socketProto.js'

export type { Response, ProtoOp } from './socketProto.js'
import { getControlSocketPath } from './socketPaths.js'

const DEFAULT_TIMEOUT_MS = 5000

/**
 * Manda un único request al daemon y espera su respuesta. Expira tras
 * `timeoutMs` (default 5s). Devuelve una respuesta tipada — el llamador
 * angosta por `ok`. Los errores de conexión / timeouts salen a la
 * superficie como objetos ErrorResponse con `code: 'ENOCONN' | 'ETIMEOUT'`
 * para que los llamadores puedan ramificar sobre ellos sin try/catch.
 */
export async function daemonRequest(
  op: ProtoOp,
  payload: Record<string, unknown> = {},
  opts: { timeoutMs?: number; socketPath?: string } = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const socketPath = opts.socketPath ?? getControlSocketPath()

  return new Promise<Response>(resolve => {
    let resolved = false
    const finish = (resp: Response): void => {
      if (resolved) return
      resolved = true
      socket.destroy()
      resolve(resp)
    }
    const socket = connect(socketPath)
    socket.setTimeout(timeoutMs, () => {
      finish({
        ok: false,
        code: 'ETIMEOUT',
        error: 'control socket timeout',
      })
    })
    socket.on('error', err => {
      finish({
        ok: false,
        code: 'ENOCONN',
        error: (err as Error).message,
      })
    })
    socket.once('connect', () => {
      socket.write(encodeFrame({ proto: PROTO_VERSION, op, ...payload }))
    })
    const decode = createLineDecoder(
      msg => finish(msg as Response),
      err => finish({ ok: false, code: 'ENOCONN', error: err }),
    )
    socket.on('data', decode)
    socket.once('close', () => {
      if (!resolved) {
        finish({
          ok: false,
          code: 'ENOCONN',
          error:
            'connection dropped mid-request — daemon may have restarted; retry',
        })
      }
    })
  })
}

/**
 * Se suscribe a un stream de larga vida del daemon (p. ej. subscribe de
 * logs). Llama a `onMessage` por cada trama recibida, `onError` ante
 * fallo. Devuelve un `dispose()` para cerrar el stream.
 *
 * Espeja ant Ds7 (4138.js:126-152).
 */
export function daemonSubscribe(
  op: ProtoOp,
  payload: Record<string, unknown>,
  onMessage: (msg: Response) => void,
  onError: (err: string) => void,
  opts: { socketPath?: string } = {},
): () => void {
  const socketPath = opts.socketPath ?? getControlSocketPath()
  const socket = connect(socketPath)
  let closed = false
  const finish = (err: string): void => {
    if (closed) return
    closed = true
    socket.destroy()
    onError(err)
  }
  socket.on('error', err => finish((err as Error).message))
  socket.on('close', () => finish('control socket closed'))
  socket.once('connect', () => {
    socket.write(encodeFrame({ proto: PROTO_VERSION, op, ...payload }))
  })
  const decode = createLineDecoder(
    msg => {
      const r = msg as Response
      if (r.ok === false) finish((r as ErrorResponse).error)
      else onMessage(r)
    },
    err => finish(err),
  )
  socket.on('data', decode)
  return () => {
    closed = true
    socket.destroy()
  }
}

/**
 * Keepalive de lease en segundo plano. Conecta, manda `{op: 'lease',
 * client}`, mantiene la conexión. Al cerrarse, reintenta cada 1s. Devuelve
 * una función de stop.
 *
 * Se usa para que el daemon pueda rastrear qué procesos CLI están
 * interesados (para el orden de apagado ordenado).
 *
 * Espeja ant Js7 (4138.js:95-125).
 */
export function leaseKeepalive(label: string): () => void {
  const client = { label, cwd: process.cwd(), pid: process.pid }
  let stopped = false
  let socket: Socket | null = null
  let retryTimer: NodeJS.Timeout | null = null

  const open = (): void => {
    if (stopped) return
    socket = connect(getControlSocketPath())
    socket.on('error', () => socket?.destroy())
    socket.once('connect', () => {
      socket?.write(encodeFrame({ proto: PROTO_VERSION, op: 'lease', client }))
    })
    socket.on('data', () => {
      // El daemon puede mandar ACKs de keep-alive; se ignoran.
    })
    socket.once('close', () => {
      socket = null
      if (stopped) return
      retryTimer = setTimeout(open, 1000)
      retryTimer.unref()
    })
    socket.unref()
  }

  open()
  return () => {
    stopped = true
    if (retryTimer) clearTimeout(retryTimer)
    socket?.destroy()
  }
}
