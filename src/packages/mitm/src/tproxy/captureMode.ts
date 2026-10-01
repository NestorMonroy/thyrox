/**
 * El modo de captura TPROXY: aplica las reglas de firewall y enrutado, arranca
 * la salida marcada y el puente transparente del addon, y atiende cada
 * conexión interceptada en un servidor de Bun en loopback (la «entrada»).
 *
 * El puente entrega cada conexión con una cabecera PROXY v1 que nombra el
 * destino original. Con descifrado, la conexión va al motor de captura TLS;
 * sin él, se reenvía cruda por la salida marcada anunciando el destino con la
 * misma cabecera. La salida pone SO_MARK antes de conectar, y la regla de
 * OUTPUT excluye esa marca: el tráfico propio no vuelve a entrar.
 *
 * Porte de `omniroute: src/mitm/tproxy/captureMode.ts` (MIT). La referencia
 * adopta en Node el descriptor del socket transparente con `listen({ fd })` y
 * el del upstream con `net.Socket({ fd })`; Bun no admite ninguno de los dos,
 * así que los sockets se quedan en el addon y cruzan a Bun por loopback.
 */
import net from 'node:net'
import {
  isTransparentSocketAvailable,
  startMarkedEgress,
  startTransparentBridge,
  stopRelay,
} from '@thyrox/transparent-napi'
import { formatProxyV1Header, parseProxyV1Header } from '@thyrox/transparent-napi/proxyHeader'

import type { DynamicCertStore } from '../dynamicCert.ts'
import { type TproxyConfig, validateTproxyConfig } from './commands.ts'
import { applyTproxy, type CommandRunner, revertTproxy } from './setup.ts'
import { createForward, createTlsCaptureServer, DEFAULT_BYPASS_MARK, type TlsCaptureServer } from './tlsCapture.ts'

/** Quita el prefijo de IPv4 en IPv6 (`::ffff:`) con que Node informa una dirección. */
export function normalizeDest(localAddress: string | undefined): string {
  return (localAddress ?? '').replace(/^::ffff:/, '')
}

export interface TproxyInterceptInfo {
  destIp: string
  destPort: number
}

export interface TproxyDeps {
  applyTproxy: (cfg: TproxyConfig, run?: CommandRunner) => Promise<void>
  revertTproxy: (cfg: TproxyConfig, run?: CommandRunner) => Promise<void>
  startBridge: (ip: string, port: number, intakePort: number) => number
  startEgress: (mark: number) => { handle: number; port: number }
  stopRelay: (handle: number) => void
  isAvailable: () => boolean
}

const realDeps: TproxyDeps = {
  applyTproxy,
  revertTproxy,
  startBridge: startTransparentBridge,
  startEgress: startMarkedEgress,
  stopRelay,
  isAvailable: isTransparentSocketAvailable,
}

export interface TproxyDecryptOptions {
  certStore: Pick<DynamicCertStore, 'getLeaf' | 'getCaCertPem'>
  installCa?: (caPem: string) => Promise<void>
  uninstallCa?: () => Promise<void>
}

export interface TproxyCaptureOptions {
  listenIp?: string
  onIntercept?: (info: TproxyInterceptInfo) => void
  decrypt?: TproxyDecryptOptions
  deps?: Partial<TproxyDeps>
}

export interface TproxyCaptureHandle {
  cfg: TproxyConfig
  server: net.Server
  stop: () => Promise<void>
}

type Terminate = (client: net.Socket, dest: { ip: string; port: number }, initial: Buffer) => void

/** Conecta a la salida marcada y le anuncia el destino; resuelve ya conectado. */
export function connectViaEgress(egressPort: number, ip: string, port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(egressPort, '127.0.0.1', () => {
      socket.write(formatProxyV1Header({ srcIp: '127.0.0.1', srcPort: socket.localPort ?? 0, dstIp: ip, dstPort: port }))
      resolve(socket)
    })
    socket.once('error', reject)
  })
}

/**
 * Atiende una conexión de la entrada: lee la cabecera PROXY del puente, informa
 * el destino y, o la entrega a `terminate` (descifrado), o la reenvía cruda
 * por la salida marcada. Sin destino legible, la cierra.
 */
export function handleTproxyConnection(
  client: net.Socket,
  routing: { egressPort: number },
  onIntercept?: (info: TproxyInterceptInfo) => void,
  terminate?: Terminate,
): void {
  let buffered = Buffer.alloc(0)
  client.on('error', () => client.destroy())
  const onData = (chunk: Buffer) => {
    buffered = Buffer.concat([buffered, chunk])
    const parsed = parseProxyV1Header(buffered)
    if (parsed.kind === 'incomplete') return
    client.removeListener('data', onData)
    client.pause()
    if (parsed.kind === 'invalid' || !parsed.header.dstIp || parsed.header.dstPort <= 0) {
      client.destroy()
      return
    }
    const dest = { ip: normalizeDest(parsed.header.dstIp), port: parsed.header.dstPort }
    onIntercept?.({ destIp: dest.ip, destPort: dest.port })
    if (terminate) {
      terminate(client, dest, parsed.rest)
      return
    }
    void connectViaEgress(routing.egressPort, dest.ip, dest.port).then(
      upstream => {
        if (parsed.rest.length > 0) upstream.write(parsed.rest)
        upstream.on('error', () => client.destroy())
        upstream.on('close', () => client.destroy())
        client.on('close', () => upstream.destroy())
        client.pipe(upstream)
        upstream.pipe(client)
        client.resume()
      },
      () => client.destroy(),
    )
  }
  client.on('data', onData)
}

/**
 * Arranca la captura. Si algo falla después de aplicar las reglas, deshace lo
 * que llegó a hacer (salida, CA, reglas) y relanza el error.
 */
export async function startTproxyCapture(cfg: TproxyConfig, options: TproxyCaptureOptions = {}): Promise<TproxyCaptureHandle> {
  const deps: TproxyDeps = { ...realDeps, ...options.deps }
  if (!deps.isAvailable()) throw new Error('TPROXY capture mode requires the native addon (Linux + CAP_NET_ADMIN).')
  const invalid = validateTproxyConfig(cfg)
  if (invalid) throw new Error(invalid)

  await deps.applyTproxy(cfg)

  let egress: { handle: number; port: number } | undefined
  let bridge: number | undefined
  let engine: TlsCaptureServer | undefined
  let uninstallCa: (() => Promise<void>) | undefined
  let intakeServer: net.Server | undefined
  const cleanup = async (): Promise<void> => {
    if (bridge !== undefined) deps.stopRelay(bridge)
    if (egress) deps.stopRelay(egress.handle)
    if (intakeServer) await new Promise<void>(resolve => intakeServer!.close(() => resolve()))
    await engine?.close().catch(() => {})
    await uninstallCa?.().catch(() => {})
    await deps.revertTproxy(cfg).catch(() => {})
  }

  try {
    const mark = cfg.bypassMark ?? DEFAULT_BYPASS_MARK
    egress = deps.startEgress(mark)
    const egressPort = egress.port
    if (options.decrypt) {
      engine = createTlsCaptureServer(options.decrypt.certStore, {
        forward: createForward((ip, port) => connectViaEgress(egressPort, ip, port)),
      })
      if (options.decrypt.installCa) await options.decrypt.installCa(await options.decrypt.certStore.getCaCertPem())
      uninstallCa = options.decrypt.uninstallCa
    }
    const terminate: Terminate | undefined = engine ? (client, dest, initial) => engine!.terminate(client, dest, initial) : undefined
    const server = net.createServer(client => handleTproxyConnection(client, { egressPort }, options.onIntercept, terminate))
    intakeServer = server
    const intakePort = await new Promise<number>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve((server.address() as net.AddressInfo).port))
    })
    bridge = deps.startBridge(options.listenIp ?? '0.0.0.0', cfg.onPort, intakePort)
    return { cfg, server, stop: cleanup }
  } catch (err) {
    await cleanup()
    throw err
  }
}
