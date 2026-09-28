// El puente transparente y la salida marcada, en C: Bun no adopta descriptores de socket,
// así que el addon acepta en el socket IP_TRANSPARENT y retransmite a un servidor de Bun con
// una cabecera PROXY v1, y la salida marcada conecta con SO_MARK el destino que Bun le anuncia.
// Sin reglas de iptables el destino original de una conexión local es el propio socket, lo
// que basta para medir la tubería. Necesita CAP_NET_ADMIN (root en este contenedor).
import { test } from 'bun:test'
import assert from 'node:assert/strict'
import net from 'node:net'

import { relayStats, startMarkedEgress, startTransparentBridge, stopRelay } from '../src/index.ts'
import { formatProxyV1Header, parseProxyV1Header } from '../src/proxyHeader.ts'

const canRun = process.platform === 'linux' && process.arch === 'x64' && process.getuid?.() === 0

async function freePort(): Promise<number> {
  const probe = net.createServer()
  await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', () => resolve()))
  const port = (probe.address() as net.AddressInfo).port
  await new Promise<void>(resolve => probe.close(() => resolve()))
  return port
}

// Un servidor de Bun que lee la cabecera PROXY y responde con el destino y el eco del resto.
async function headerEchoServer(): Promise<{ server: net.Server; port: number }> {
  const server = net.createServer(socket => {
    let buffered = Buffer.alloc(0)
    socket.on('data', (chunk: Buffer) => {
      buffered = Buffer.concat([buffered, chunk])
      const parsed = parseProxyV1Header(buffered)
      if (parsed.kind === 'incomplete') return
      if (parsed.kind === 'invalid') return void socket.end('invalid')
      if (parsed.rest.length === 0) return
      socket.end(`dst=${parsed.header.dstIp}:${parsed.header.dstPort}|${parsed.rest}`)
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  return { server, port: (server.address() as net.AddressInfo).port }
}

function roundTrip(port: number, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = net.connect(port, '127.0.0.1', () => client.write(payload))
    let data = ''
    client.on('data', chunk => (data += chunk))
    client.on('end', () => resolve(data))
    client.on('error', reject)
  })
}

test('el puente acepta en el socket transparente y entrega a Bun el destino original y los bytes', async () => {
  if (!canRun) return
  const target = await headerEchoServer()
  const port = await freePort()
  const handle = startTransparentBridge('127.0.0.1', port, target.port)
  try {
    assert.equal(await roundTrip(port, 'hola'), `dst=127.0.0.1:${port}|hola`)
    assert.equal(relayStats(handle).accepted, 1)
  } finally {
    stopRelay(handle)
    await new Promise<void>(resolve => target.server.close(() => resolve()))
  }
})

test('detenido el puente, su puerto deja de aceptar', async () => {
  if (!canRun) return
  const target = await headerEchoServer()
  const port = await freePort()
  stopRelay(startTransparentBridge('127.0.0.1', port, target.port))
  await assert.rejects(roundTrip(port, 'x'), /ECONNREFUSED/)
  await new Promise<void>(resolve => target.server.close(() => resolve()))
})

test('la salida marcada conecta al destino anunciado con SO_MARK puesto', async () => {
  if (!canRun) return
  const upstream = net.createServer(socket => socket.on('data', d => socket.end(`eco:${d}`)))
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', () => resolve()))
  const upstreamPort = (upstream.address() as net.AddressInfo).port
  const egress = startMarkedEgress(0x539)
  try {
    const header = formatProxyV1Header({ srcIp: '127.0.0.1', srcPort: 1, dstIp: '127.0.0.1', dstPort: upstreamPort })
    assert.equal(await roundTrip(egress.port, `${header}hola`), 'eco:hola')
    const stats = relayStats(egress.handle)
    assert.equal(stats.accepted, 1)
    assert.equal(stats.lastUpstreamMark, 0x539)
  } finally {
    stopRelay(egress.handle)
    await new Promise<void>(resolve => upstream.close(() => resolve()))
  }
})

test('la salida marcada cierra una conexión cuya cabecera no es PROXY v1', async () => {
  if (!canRun) return
  const egress = startMarkedEgress(0x539)
  try {
    assert.equal(await roundTrip(egress.port, 'GET / HTTP/1.1\r\n\r\n'), '')
    await Bun.sleep(50)
    assert.equal(relayStats(egress.handle).rejectedHeaders, 1)
    assert.equal(relayStats(egress.handle).lastUpstreamMark, 0)
  } finally {
    stopRelay(egress.handle)
  }
})
