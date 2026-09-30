// Sonda: qué error registra el reenvío del motor de captura bajo Bun.
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import { DynamicCertStore, generateMitmCa } from '../../../src/packages/mitm/src/dynamicCert.ts'
import { globalTrafficBuffer } from '../../../src/packages/mitm/src/inspector/buffer.ts'
import { createForward, createTlsCaptureServer } from '../../../src/packages/mitm/src/tproxy/tlsCapture.ts'
const up = await generateMitmCa('up')
const upstream = https.createServer({ key: up.key, cert: up.cert }, (req, res) => res.end(`ok:${req.url}`))
await new Promise<void>(r => upstream.listen(0, '127.0.0.1', () => r()))
const upPort = (upstream.address() as net.AddressInfo).port
let rawCalls = 0
const direct = await createForward((ip, port) => { rawCalls++; return net.connect(port, ip) }, { rejectUnauthorized: false })(
  { ip: '127.0.0.1', port: upPort, sni: 'api.example.com' }, { method: 'GET', path: '/direct', headers: { host: 'api.example.com' }, body: Buffer.alloc(0) },
).then(r => `status=${r.status} body=${r.body}`, e => `ERROR ${e?.message}`)
console.log('forward directo:', direct, 'connectRaw llamado:', rawCalls)
const store = new DynamicCertStore('t')
const engine = createTlsCaptureServer(store, { forward: (d, i) => { console.log('dest recibido:', JSON.stringify(d)); return Promise.reject(new Error('x')) } })
const listener = net.createServer(s => engine.terminate(s, { ip: '127.0.0.1', port: upPort }))
await new Promise<void>(r => listener.listen(0, '127.0.0.1', () => r()))
const p = (listener.address() as net.AddressInfo).port
await new Promise<void>(r => { const c = tls.connect({ host: '127.0.0.1', port: p, servername: 'api.example.com', rejectUnauthorized: false }, () => c.write('GET /x HTTP/1.1\r\nHost: api.example.com\r\nConnection: close\r\n\r\n')); c.on('data', () => {}); c.on('close', () => r()); c.on('error', () => r()) })
console.log('último error del búfer:', globalTrafficBuffer.list().at(-1)?.error)
process.exit(0)
