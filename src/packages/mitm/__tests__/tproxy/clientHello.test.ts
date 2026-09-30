// La SNI se lee del ClientHello antes de terminar TLS: Bun no invoca SNICallback, así que el
// motor de captura elige la hoja del host él mismo. Los ClientHello son reales: los escribe
// tls.connect contra un servidor TCP que sólo guarda los primeros bytes.
import { test } from 'bun:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import tls from 'node:tls'

import { readClientHelloSni } from '../../src/tproxy/clientHello.ts'

async function captureClientHello(servername?: string): Promise<Buffer> {
  let resolveBytes!: (bytes: Buffer) => void
  const captured = new Promise<Buffer>(resolve => (resolveBytes = resolve))
  const server = net.createServer(socket => {
    socket.once('data', (chunk: Buffer) => {
      resolveBytes(chunk)
      socket.destroy()
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  const port = (server.address() as net.AddressInfo).port
  const client = tls.connect({ host: '127.0.0.1', port, servername, rejectUnauthorized: false })
  client.on('error', () => {})
  try {
    return await captured
  } finally {
    client.destroy()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
}

test('lee el nombre del servidor de un ClientHello real', async () => {
  const hello = await captureClientHello('api.example.com')
  assert.deepEqual(readClientHelloSni(hello), { kind: 'sni', servername: 'api.example.com' })
})

test('un ClientHello cortado pide más bytes', async () => {
  const hello = await captureClientHello('api.example.com')
  assert.equal(readClientHelloSni(hello.subarray(0, 20)).kind, 'incomplete')
  assert.equal(readClientHelloSni(hello.subarray(0, 3)).kind, 'incomplete')
})

// Bun envía SNI aunque no se le pida (`localhost` al conectar a 127.0.0.1), así que el caso
// sin SNI se construye a mano: un ClientHello mínimo válido, sin extensiones.
function minimalClientHelloWithoutExtensions(): Buffer {
  const body = Buffer.concat([
    Buffer.from([0x03, 0x03]), // versión
    Buffer.alloc(32), // aleatorio
    Buffer.from([0x00]), // id de sesión vacío
    Buffer.from([0x00, 0x02, 0x13, 0x01]), // una suite
    Buffer.from([0x01, 0x00]), // compresión nula
  ])
  const handshake = Buffer.concat([Buffer.from([0x01, 0x00, body.length >> 8, body.length & 0xff]), body])
  return Buffer.concat([Buffer.from([0x16, 0x03, 0x01, handshake.length >> 8, handshake.length & 0xff]), handshake])
}

test('un ClientHello sin SNI se reconoce como TLS sin nombre', () => {
  assert.deepEqual(readClientHelloSni(minimalClientHelloWithoutExtensions()), { kind: 'tls-without-sni' })
})

test('lo que no empieza con un registro de handshake no es TLS', () => {
  assert.equal(readClientHelloSni(Buffer.from('GET / HTTP/1.1\r\n\r\n')).kind, 'not-tls')
})
