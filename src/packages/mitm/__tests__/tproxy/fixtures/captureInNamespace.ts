/**
 * Corre dentro de un espacio de red propio (lo lanza la prueba con nsenter):
 * levanta un upstream HTTPS, arranca la captura TPROXY real con descifrado,
 * hace una petición HTTPS como la haría un agente, y escribe en stdout, como
 * JSON, lo que vio el cliente y lo que quedó en el búfer del inspector.
 *
 * Entrada por entorno: UPSTREAM_KEY y UPSTREAM_CERT (rutas del par del
 * upstream, firmado por la CA que NODE_EXTRA_CA_CERTS hace confiable).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'
import tls from 'node:tls'

import { DynamicCertStore } from '../../../src/dynamicCert.ts'
import { globalTrafficBuffer } from '../../../src/inspector/buffer.ts'
import { startTproxyCapture } from '../../../src/tproxy/captureMode.ts'
import { formatHttpRequest, parseHttpResponse } from '../../../src/tproxy/httpResponse.ts'

const UPSTREAM_IP = '10.77.0.1'
const HOST = 'api.example.test'
const CONFIG = { dport: 443, mark: 17, onPort: 9443, routeTable: 117, bypassMark: 18 }

execFileSync('ip', ['link', 'set', 'lo', 'up'])
execFileSync('ip', ['addr', 'add', `${UPSTREAM_IP}/32`, 'dev', 'lo'])

const upstream = https.createServer(
  { key: fs.readFileSync(process.env.UPSTREAM_KEY!), cert: fs.readFileSync(process.env.UPSTREAM_CERT!) },
  (req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end(`upstream saw ${req.method} ${req.url}`)
  },
)
await new Promise<void>(resolve => upstream.listen(443, UPSTREAM_IP, resolve))

const certStore = new DynamicCertStore()
const intercepts: string[] = []
const capture = await startTproxyCapture(CONFIG, {
  decrypt: { certStore },
  onIntercept: info => intercepts.push(`${info.destIp}:${info.destPort}`),
})

const sessionCa = await certStore.getCaCertPem()
// La petición va a la IP con el nombre sólo en el SNI y en Host, como la
// escribe un agente cuyo DNS ya resolvió: el cliente HTTP de Bun resolvería
// el nombre de la cabecera Host y aquí no hay DNS.
const client = await new Promise<{ status: number; body: string }>((resolve, reject) => {
  const socket = tls.connect({ host: UPSTREAM_IP, port: 443, servername: HOST, ca: sessionCa }, () => {
    socket.write(
      formatHttpRequest({
        method: 'POST',
        path: '/v1/messages',
        headers: { host: HOST, 'content-type': 'application/json', connection: 'close' },
        body: Buffer.from('{"model":"x"}'),
      }),
    )
  })
  const chunks: Buffer[] = []
  socket.on('data', (chunk: Buffer) => chunks.push(chunk))
  socket.once('error', reject)
  // Pidió cerrar: si la respuesta no cierra la conexión, el plazo lo delata.
  const deadline = setTimeout(() => reject(new Error('the capture kept the connection open after Connection: close')), 5_000)
  socket.once('end', () => {
    clearTimeout(deadline)
    const response = parseHttpResponse(Buffer.concat(chunks))
    resolve({ status: response.status, body: response.body.toString('utf8') })
  })
})

await capture.stop()
upstream.close()
const entries = globalTrafficBuffer.list({}).map(e => ({ host: e.host, method: e.method, path: e.path, status: e.status }))
process.stdout.write(JSON.stringify({ client, intercepts, entries }))
process.exit(0)
