// El modo de captura TPROXY sobre el puente en C. Portado de omniroute:
// tests/unit/tproxy-capture-mode.test.ts (MIT) con los mismos casos, adaptados: la referencia
// adopta el descriptor del socket transparente con listen({ fd }) y el del upstream con
// net.Socket({ fd }), que Bun no admite. Aquí el puente entrega cada conexión a un servidor de
// Bun (la «entrada») con una cabecera PROXY v1, y el reenvío crudo sale por la salida marcada
// anunciando el destino con la misma cabecera.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import net from 'node:net'

import { formatProxyV1Header, parseProxyV1Header } from '@thyrox/transparent-napi/proxyHeader'

import { handleTproxyConnection, normalizeDest, startTproxyCapture } from '../../src/tproxy/captureMode.ts'

const CFG = { dport: 443, mark: 0x2333, onPort: 8443, routeTable: 233, bypassMark: 0x539 }
const closers: Array<() => Promise<void> | void> = []
afterEach(async () => {
  while (closers.length > 0) await closers.pop()!()
})

async function listen(server: net.Server): Promise<number> {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  closers.push(() => new Promise<void>(resolve => server.close(() => resolve())))
  return (server.address() as net.AddressInfo).port
}

// Una salida marcada falsa: guarda la cabecera y el primer tramo que recibe, y responde.
async function fakeEgress(): Promise<{ port: number; received: Promise<string> }> {
  let resolveReceived!: (text: string) => void
  const received = new Promise<string>(resolve => (resolveReceived = resolve))
  const server = net.createServer(socket => {
    let buffered = ''
    socket.on('data', chunk => {
      buffered += chunk
      if (buffered.includes('hola')) {
        resolveReceived(buffered)
        socket.end('respuesta')
      }
    })
  })
  return { port: await listen(server), received }
}

// La entrada con handleTproxyConnection, y un cliente que habla como el puente.
async function intake(handler: (client: net.Socket) => void): Promise<number> {
  return listen(net.createServer(handler))
}

function sendAsBridge(port: number, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = net.connect(port, '127.0.0.1', () => client.write(payload))
    let data = ''
    client.on('data', chunk => (data += chunk))
    client.on('close', () => resolve(data))
    client.on('error', reject)
  })
}

const HEADER = formatProxyV1Header({ srcIp: '10.0.0.2', srcPort: 51000, dstIp: '198.51.100.7', dstPort: 443 })

test('normalizeDest quita el prefijo IPv4 en IPv6 que Node informa', () => {
  assert.equal(normalizeDest('::ffff:198.51.100.7'), '198.51.100.7')
  assert.equal(normalizeDest('10.0.0.1'), '10.0.0.1')
  assert.equal(normalizeDest(undefined), '')
})

test('lee el destino original de la cabecera, lo informa y reenvía por la salida marcada', async () => {
  const egress = await fakeEgress()
  const seen: Array<{ destIp: string; destPort: number }> = []
  const port = await intake(client => handleTproxyConnection(client, { egressPort: egress.port }, info => seen.push(info)))
  const reply = await sendAsBridge(port, `${HEADER}hola`)
  assert.equal(reply, 'respuesta')
  assert.deepEqual(seen, [{ destIp: '198.51.100.7', destPort: 443 }])
  const forwarded = await egress.received
  const parsed = parseProxyV1Header(Buffer.from(forwarded))
  assert.equal(parsed.kind, 'header')
  if (parsed.kind !== 'header') return
  assert.deepEqual([parsed.header.dstIp, parsed.header.dstPort], ['198.51.100.7', 443])
  assert.equal(parsed.rest.toString(), 'hola')
})

test('sin una cabecera PROXY válida no hay destino: se cierra el cliente sin reenviar', async () => {
  let dialed = false
  const egressServer = net.createServer(() => void (dialed = true))
  const egressPort = await listen(egressServer)
  const port = await intake(client => handleTproxyConnection(client, { egressPort }))
  assert.equal(await sendAsBridge(port, 'GET / HTTP/1.1\r\n\r\n'), '')
  assert.equal(dialed, false)
})

test('en modo de descifrado entrega la conexión a terminate con los bytes que siguen a la cabecera', async () => {
  let dialed = false
  const egressPort = await listen(net.createServer(() => void (dialed = true)))
  const handed: Array<{ dest: { ip: string; port: number }; initial: string }> = []
  const port = await intake(client =>
    handleTproxyConnection(client, { egressPort }, undefined, (socket, dest, initial) => {
      handed.push({ dest, initial: initial.toString() })
      socket.destroy()
    }),
  )
  await sendAsBridge(port, `${HEADER}hola`)
  assert.deepEqual(handed, [{ dest: { ip: '198.51.100.7', port: 443 }, initial: 'hola' }])
  assert.equal(dialed, false)
})

interface Recorder {
  events: string[]
}

function fakeDeps(rec: Recorder, over: Record<string, unknown> = {}) {
  return {
    applyTproxy: async () => void rec.events.push('apply'),
    revertTproxy: async () => void rec.events.push('revert'),
    startBridge: (ip: string, port: number, intakePort: number) => {
      rec.events.push(`bridge:${ip}:${port}->${intakePort > 0 ? 'intake' : 'none'}`)
      return 7
    },
    startEgress: (mark: number) => {
      rec.events.push(`egress:${mark}`)
      return { handle: 8, port: 1 }
    },
    stopRelay: (handle: number) => void rec.events.push(`stop:${handle}`),
    isAvailable: () => true,
    ...over,
  }
}

test('startTproxyCapture aplica las reglas, arranca salida y puente, y stop() lo deshace', async () => {
  const rec: Recorder = { events: [] }
  const handle = await startTproxyCapture(CFG, { listenIp: '0.0.0.0', deps: fakeDeps(rec) })
  assert.deepEqual(rec.events, ['apply', `egress:${CFG.bypassMark}`, `bridge:0.0.0.0:${CFG.onPort}->intake`])
  await handle.stop()
  assert.deepEqual(rec.events.slice(3), ['stop:7', 'stop:8', 'revert'])
})

test('una configuración inválida se rechaza sin aplicar ni revertir nada', async () => {
  const rec: Recorder = { events: [] }
  await assert.rejects(startTproxyCapture({ ...CFG, dport: 0 }, { deps: fakeDeps(rec) }), /dport/)
  assert.deepEqual(rec.events, [])
})

test('sin el addon rehúsa antes de tocar nada', async () => {
  const rec: Recorder = { events: [] }
  await assert.rejects(startTproxyCapture(CFG, { deps: fakeDeps(rec, { isAvailable: () => false }) }), /native addon/)
  assert.deepEqual(rec.events, [])
})

const certStore = { getLeaf: async () => ({ key: '', cert: '' }), getCaCertPem: async () => 'CA-PEM' }

test('en modo de descifrado instala la CA, y stop() la retira y revierte', async () => {
  const rec: Recorder = { events: [] }
  const handle = await startTproxyCapture(CFG, {
    deps: fakeDeps(rec),
    decrypt: {
      certStore,
      installCa: async pem => void rec.events.push(`installCa:${pem}`),
      uninstallCa: async () => void rec.events.push('uninstallCa'),
    },
  })
  assert.ok(rec.events.includes('installCa:CA-PEM'))
  await handle.stop()
  assert.deepEqual(rec.events.slice(-2), ['uninstallCa', 'revert'])
})

test('si el puente no arranca, retira la CA, detiene la salida y revierte', async () => {
  const rec: Recorder = { events: [] }
  const deps = fakeDeps(rec, {
    startBridge: () => {
      throw new Error('EIP_TRANSPARENT: Operation not permitted')
    },
  })
  await assert.rejects(
    startTproxyCapture(CFG, {
      deps,
      decrypt: { certStore, installCa: async () => void rec.events.push('installCa'), uninstallCa: async () => void rec.events.push('uninstallCa') },
    }),
    /EIP_TRANSPARENT/,
  )
  assert.deepEqual(rec.events.slice(-3), ['stop:8', 'uninstallCa', 'revert'])
})
