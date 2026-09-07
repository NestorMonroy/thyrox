/**
 * Servidor del socket de control del daemon. Escucha en la ruta del
 * socket de control, acepta conexiones de clientes CLI, despacha op codes
 * a un registro de manejadores.
 *
 * Cada conexión es de un solo tiro para la mayoría de los ops
 * (request → response → close); `subscribe`, `attach` y `lease` son de
 * larga vida.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/socketServer.ts`.
 */

import { existsSync, mkdirSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import {
  type Server,
  type Socket,
  createServer,
} from 'node:net'
import { dirname } from 'node:path'

import { logEvent } from './internal/pendingCrossPackageDeps.js'
import { checkPeerUid } from './peerUid.js'
import {
  type ErrorResponse,
  type OkResponse,
  type ProtoOp,
  type Response,
  PROTO_VERSION,
  createLineDecoder,
  encodeFrame,
} from './socketProto.js'
import { getControlSocketPath } from './socketPaths.js'

/**
 * Un manejador puede devolver un Response (de un solo tiro) o iniciar un
 * stream de larga vida escribiendo directamente al socket y sin devolver
 * nunca.
 */
export type OpHandler = (
  msg: Record<string, unknown>,
  socket: Socket,
) => Promise<Response | undefined>

export interface DaemonServer {
  /** Número de clientes conectados actualmente (incl. lease holders). */
  readonly clientCount: number
  /** Deja de aceptar nuevas conexiones + cierra todos los clientes actuales. */
  close(): Promise<void>
}

/**
 * Ata el socket de control en la ruta estándar y arranca a servir.
 * Pre-limpia cualquier archivo de socket rancio. Devuelve un handle
 * DaemonServer con una sonda de clientCount + método close.
 */
export async function startSocketServer(
  handlers: Partial<Record<ProtoOp, OpHandler>>,
  opts: { socketPath?: string } = {},
): Promise<DaemonServer> {
  const socketPath = opts.socketPath ?? getControlSocketPath()
  // Asegura que el directorio padre exista (modo 0o700 — sólo el dueño).
  mkdirSync(dirname(socketPath), { recursive: true, mode: 0o700 })
  // Pre-limpia un socket rancio.
  if (existsSync(socketPath)) {
    await unlink(socketPath).catch(() => {})
  }

  const clients = new Set<Socket>()

  function reply(socket: Socket, resp: Response): void {
    if (socket.destroyed) return
    socket.write(encodeFrame(resp))
  }

  function dispatch(socket: Socket, msg: unknown): void {
    if (typeof msg !== 'object' || msg === null) {
      reply(socket, {
        ok: false,
        code: 'EBADREQ',
        error: 'request must be an object',
      } as ErrorResponse)
      socket.end()
      return
    }
    const m = msg as Record<string, unknown>
    // Handshake de versión de protocolo de `ant 4138.js`: los clientes
    // pasan `proto: PROTO_VERSION`. Si no coincide, emite
    // tengu_bg_proto_mismatch + rechaza antes de despachar el op.
    const proto = m.proto as number | undefined
    if (typeof proto === 'number' && proto !== PROTO_VERSION) {
      logEvent('tengu_bg_proto_mismatch', {
        client_proto: String(proto),
        server_proto: String(PROTO_VERSION),
      })
      reply(socket, {
        ok: false,
        code: 'EUNSUPPORTED',
        error: `proto mismatch: client=${proto} server=${PROTO_VERSION}`,
      } as ErrorResponse)
      socket.end()
      return
    }
    const op = m.op as ProtoOp | undefined
    if (!op || typeof op !== 'string') {
      reply(socket, {
        ok: false,
        code: 'EBADREQ',
        error: 'missing op',
      } as ErrorResponse)
      socket.end()
      return
    }
    const handler = handlers[op]
    if (!handler) {
      reply(socket, {
        ok: false,
        code: 'EUNSUPPORTED',
        error: `unknown op: ${op}`,
      } as ErrorResponse)
      socket.end()
      return
    }
    Promise.resolve(handler(m, socket))
      .then(resp => {
        if (resp) {
          reply(socket, resp)
          // Los ops de un solo tiro cierran tras responder. Los ops de
          // larga vida manejan su propio ciclo de vida (devuelven void).
          socket.end()
        }
      })
      .catch(err => {
        reply(socket, {
          ok: false,
          code: 'EBADREQ',
          error: (err as Error).message,
        } as ErrorResponse)
        socket.end()
      })
  }

  const server: Server = createServer(socket => {
    clients.add(socket)
    socket.on('error', () => socket.destroy())
    socket.once('close', () => clients.delete(socket))
    // `ant 5164.js` — rechaza conexiones de un uid distinto antes de que
    // fluya cualquier dato. SO_PEERCRED en Linux / LOCAL_PEERCRED en
    // macOS. Best-effort: que checkPeerUid devuelva null significa que no
    // se puede verificar (Windows / fallo de FFI / handle sin fd) y se
    // acepta.
    const peerErr = checkPeerUid(socket)
    if (peerErr) {
      logEvent('tengu_daemon_peer_uid_reject', {})
      // ant difiere la respuesta hasta el primer byte de datos para darle
      // al decoder del cliente la oportunidad de mostrar un error limpio.
      // Se espeja.
      socket.once('data', () => {
        reply(socket, {
          ok: false,
          code: 'EPEERUID',
          error: peerErr,
        } as ErrorResponse)
        socket.end()
      })
      return
    }
    const decoder = createLineDecoder(
      msg => dispatch(socket, msg),
      err => {
        reply(socket, {
          ok: false,
          code: 'EBADREQ',
          error: err,
        } as ErrorResponse)
        socket.end()
      },
    )
    socket.on('data', decoder)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(socketPath, () => resolve())
  })

  return {
    get clientCount(): number {
      return clients.size
    },
    async close(): Promise<void> {
      for (const c of clients) c.destroy()
      clients.clear()
      await new Promise<void>(resolve => server.close(() => resolve()))
      if (process.platform !== 'win32') {
        await unlink(socketPath).catch(() => {})
      }
    },
  }
}

/** Constructor de conveniencia para respuestas OK. */
export function ok<T extends Record<string, unknown>>(extras: T): OkResponse {
  return { ok: true, ...extras }
}

/** Constructor de conveniencia para respuestas de error. */
export function err(
  code: ErrorResponse['code'],
  error: string,
  extras: Record<string, unknown> = {},
): ErrorResponse {
  return { ok: false, code, error, ...extras }
}
