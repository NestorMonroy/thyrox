/**
 * El motor de captura TLS del modo TPROXY: termina el TLS de una conexión
 * interceptada con una hoja del host firmada por la CA dinámica, lee la
 * petición en claro, la guarda en el búfer del inspector con `source: tproxy`,
 * la reenvía al destino real y devuelve la respuesta.
 *
 * Bajo Bun, la terminación no puede ser la de la referencia: Bun no invoca
 * `SNICallback` y no inicia TLS sobre un socket entregado con
 * `emit('connection')`. Por eso el motor lee la SNI del ClientHello, levanta
 * (una vez por host) un servidor HTTPS en loopback con la hoja de ese host, y
 * retransmite ahí la conexión cruda, ClientHello incluido. El destino original
 * de cada petición se recupera por el puerto de origen de esa conexión de
 * loopback, que el servidor ve como `remotePort`.
 *
 * El reenvío sale por el socket de `connectRaw` (marcado en producción) y
 * habla HTTP/1.1 sobre él: sin la marca, el tráfico propio volvería a entrar a
 * TPROXY en bucle.
 *
 * Porte de `omniroute: src/mitm/tproxy/tlsCapture.ts` (MIT).
 */
import http from 'node:http'
import https from 'node:https'
import { once } from 'node:events'
import net from 'node:net'
import tls from 'node:tls'
import { randomUUID } from 'node:crypto'
import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'

import type { DynamicCertStore } from '../dynamicCert.ts'
import { globalTrafficBuffer } from '../inspector/buffer.ts'
import type { InterceptedRequest } from '../inspector/types.ts'
import { maskSecret } from '../maskSecrets.ts'
import { sanitizeHeaders } from '../sanitizeHeaders.ts'
import { MITM_IDLE_TIMEOUT_MS } from '../socketTimeouts.ts'
import { readClientHelloSni } from './clientHello.ts'
import { formatHttpRequest, parseHttpResponse } from './httpResponse.ts'

export const DEFAULT_BYPASS_MARK = 0x539

/** El primer byte de un registro de handshake de TLS. */
export function isTlsClientHello(firstByte: number): boolean {
  return firstByte === 0x16
}

/** El host capturado: la SNI, o el Host sin puerto, o la IP de destino. */
export function resolveCaptureHost(sniServername: string | undefined, hostHeader: string | undefined, destIp: string): string {
  const sni = (sniServername ?? '').trim()
  if (sni) return sni
  const host = (hostHeader ?? '').trim()
  if (host) return host.replace(/:\d+$/, '')
  return destIp
}

export interface DecryptedDest {
  ip: string
  port: number
  sni?: string
}

export interface ForwardInit {
  method: string
  path: string
  headers: Record<string, string>
  body: Buffer
}

export interface ForwardResult {
  status: number
  headers: Record<string, string>
  body: Buffer
}

export interface TlsCaptureDeps {
  buffer: Pick<typeof globalTrafficBuffer, 'push' | 'update'>
  forward: (dest: DecryptedDest, init: ForwardInit) => Promise<ForwardResult>
  now: () => number
  randomId: () => string
}

const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-length',
])

async function readBody(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks)
}

/**
 * Las cabeceras para el upstream: sin las de salto a salto, con el Host fijado
 * y con `Authorization` intacta (el upstream la necesita; sólo lo guardado en
 * el búfer va enmascarado).
 */
export function buildForwardHeaders(raw: http.IncomingHttpHeaders, host: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue
    const lower = name.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    out[lower] = Array.isArray(value) ? value.join(', ') : String(value)
  }
  out.host = host
  return out
}

function asksToClose(req: http.IncomingMessage): boolean {
  return String(req.headers.connection ?? '')
    .split(',')
    .some(option => option.trim().toLowerCase() === 'close')
}

/**
 * Un cliente que pidió `Connection: close` espera que el servidor cierre tras
 * la respuesta final (RFC 9112 §9.6); si lee hasta el cierre, sin él se queda
 * esperando.
 */
function closeAfterResponseIfAsked(req: http.IncomingMessage, res: http.ServerResponse): void {
  if (!asksToClose(req)) return
  res.setHeader('connection', 'close')
  res.once('finish', () => req.socket.end())
}

/** Captura y reenvía una petición ya descifrada. */
export function handleDecryptedRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  dest: DecryptedDest,
  deps: TlsCaptureDeps,
): void {
  closeAfterResponseIfAsked(req, res)
  const startedAt = deps.now()
  const host = resolveCaptureHost(dest.sni, req.headers.host, dest.ip)
  const path = req.url ?? '/'
  const intercepted: InterceptedRequest = {
    id: deps.randomId(),
    source: 'tproxy',
    timestamp: new Date().toISOString(),
    method: req.method ?? 'GET',
    host,
    path,
    requestHeaders: sanitizeHeaders(req.headers),
    requestBody: null,
    requestSize: 0,
    responseHeaders: {},
    responseBody: null,
    responseSize: 0,
    status: 'in-flight',
  }
  deps.buffer.push(intercepted)

  void (async () => {
    try {
      const body = await readBody(req)
      intercepted.requestSize = body.length
      intercepted.requestBody = body.length > 0 ? maskSecret(body.toString('utf8')) : null
      const result = await deps.forward(
        { ip: dest.ip, port: dest.port, sni: dest.sni },
        { method: req.method ?? 'GET', path, headers: buildForwardHeaders(req.headers, host), body },
      )
      const totalLatencyMs = deps.now() - startedAt
      intercepted.responseHeaders = sanitizeHeaders(result.headers)
      intercepted.responseBody = maskSecret(result.body.toString('utf8'))
      intercepted.responseSize = result.body.length
      intercepted.status = result.status
      intercepted.totalLatencyMs = totalLatencyMs
      intercepted.upstreamLatencyMs = totalLatencyMs
      intercepted.proxyLatencyMs = 0
      const safeHeaders: Record<string, string> = {}
      for (const [k, v] of Object.entries(result.headers)) {
        const lk = k.toLowerCase()
        if (lk !== 'content-length' && lk !== 'transfer-encoding' && lk !== 'connection') safeHeaders[k] = v
      }
      res.writeHead(result.status, safeHeaders)
      res.end(result.body)
      deps.buffer.update(intercepted.id, intercepted)
    } catch (err) {
      intercepted.status = 'error'
      intercepted.error = sanitizeErrorMessage(err)
      intercepted.totalLatencyMs = deps.now() - startedAt
      deps.buffer.update(intercepted.id, intercepted)
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'text/plain' })
        res.end('Bad Gateway')
      } else {
        res.end()
      }
    }
  })()
}

export interface TlsCaptureServer {
  /** Termina el TLS de una conexión cruda; `initial` son los bytes ya leídos de ella. */
  terminate(rawClient: net.Socket, dest: DecryptedDest, initial?: Buffer): void
  close(): Promise<void>
}

interface HostServer {
  server: https.Server
  port: number
}

function pipeBothWays(a: net.Socket, b: net.Socket): void {
  a.on('error', () => b.destroy())
  b.on('error', () => a.destroy())
  a.on('close', () => b.destroy())
  b.on('close', () => a.destroy())
  a.pipe(b)
  b.pipe(a)
}

export function createTlsCaptureServer(
  certStore: Pick<DynamicCertStore, 'getLeaf'>,
  deps: Partial<TlsCaptureDeps> = {},
): TlsCaptureServer {
  const resolved: TlsCaptureDeps = {
    buffer: globalTrafficBuffer,
    forward: deps.forward ?? (() => Promise.reject(new Error('no forward configured'))),
    now: () => performance.now(),
    randomId: () => randomUUID(),
    ...deps,
  }
  const hostServers = new Map<string, Promise<HostServer>>()
  // El destino de cada conexión de loopback, por su puerto de origen.
  const destByLoopbackPort = new Map<number, DecryptedDest>()
  const loopbacks = new Set<net.Socket>()

  function hostServer(host: string): Promise<HostServer> {
    let pending = hostServers.get(host)
    if (!pending) {
      pending = certStore.getLeaf(host).then(
        leaf =>
          new Promise<HostServer>((resolve, reject) => {
            const server = https.createServer({ key: leaf.key, cert: leaf.cert })
            server.requestTimeout = MITM_IDLE_TIMEOUT_MS * 5
            server.headersTimeout = MITM_IDLE_TIMEOUT_MS
            server.keepAliveTimeout = MITM_IDLE_TIMEOUT_MS
            server.on('request', (req, res) => {
              const dest = destByLoopbackPort.get(req.socket.remotePort ?? -1) ?? { ip: '', port: 0 }
              handleDecryptedRequest(req, res, dest, resolved)
            })
            server.once('error', reject)
            server.listen(0, '127.0.0.1', () => resolve({ server, port: (server.address() as net.AddressInfo).port }))
          }),
      )
      hostServers.set(host, pending)
    }
    return pending
  }

  async function handOff(rawClient: net.Socket, dest: DecryptedDest, bytes: Buffer): Promise<void> {
    const sni = readClientHelloSni(bytes)
    const servername = sni.kind === 'sni' ? sni.servername : undefined
    const { port } = await hostServer(servername ?? dest.ip)
    const loopback = net.connect(port, '127.0.0.1')
    loopbacks.add(loopback)
    loopback.once('connect', () => {
      const localPort = loopback.localPort
      if (typeof localPort === 'number') destByLoopbackPort.set(localPort, { ...dest, sni: servername })
      loopback.once('close', () => {
        if (typeof localPort === 'number') destByLoopbackPort.delete(localPort)
        loopbacks.delete(loopback)
      })
      loopback.write(bytes)
      pipeBothWays(rawClient, loopback)
      rawClient.resume()
    })
    loopback.once('error', () => rawClient.destroy())
  }

  return {
    terminate(rawClient, dest, initial = Buffer.alloc(0)) {
      let collected = initial
      rawClient.on('error', () => rawClient.destroy())
      const tryHandOff = () => {
        const sni = readClientHelloSni(collected)
        if (sni.kind === 'incomplete') return false
        rawClient.pause()
        rawClient.removeListener('data', onData)
        void handOff(rawClient, dest, collected).catch(() => rawClient.destroy())
        return true
      }
      const onData = (chunk: Buffer) => {
        collected = Buffer.concat([collected, chunk])
        tryHandOff()
      }
      if (!tryHandOff()) rawClient.on('data', onData)
    },
    async close() {
      for (const socket of loopbacks) socket.destroy()
      const servers = await Promise.allSettled(hostServers.values())
      await Promise.all(
        servers.map(entry =>
          entry.status === 'fulfilled'
            ? new Promise<void>(resolve => {
                entry.value.server.closeAllConnections?.()
                entry.value.server.close(() => resolve())
              })
            : Promise.resolve(),
        ),
      )
    },
  }
}

/**
 * El reenvío al upstream real sobre el socket crudo que da `connectRaw` (el de
 * la salida marcada en producción). Se habla HTTP/1.1 directamente sobre el
 * TLS de ese socket porque Bun ignora `createConnection` en
 * `http.request`/`https.request`: con él, la petición saldría por un socket
 * propio sin marca y volvería a entrar a TPROXY.
 */
export function createForward(
  connectRaw: (ip: string, port: number) => net.Socket | Promise<net.Socket>,
  opts: { rejectUnauthorized?: boolean } = {},
): TlsCaptureDeps['forward'] {
  const rejectUnauthorized = opts.rejectUnauthorized ?? true
  return async (dest, init) => {
    const servername = dest.sni || String(init.headers.host || dest.ip)
    const raw = await connectRaw(dest.ip, dest.port)
    // Bun sólo envuelve en TLS un socket ya conectado ("Invalid socket" si no).
    if (raw.connecting) await once(raw, 'connect')
    return new Promise<ForwardResult>((resolve, reject) => {
      const socket = tls.connect({ socket: raw, servername, rejectUnauthorized })
      const chunks: Buffer[] = []
      socket.on('data', (chunk: Buffer) => chunks.push(chunk))
      socket.once('error', reject)
      socket.once('end', () => {
        try {
          resolve(parseHttpResponse(Buffer.concat(chunks)))
        } catch (err) {
          reject(err)
        }
      })
      socket.write(formatHttpRequest(init))
    })
  }
}
