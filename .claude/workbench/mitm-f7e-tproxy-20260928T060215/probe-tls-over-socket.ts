// Sonda: tls.connect({ socket }) en Bun con el socket TCP aún conectándose y ya conectado.
import https from 'node:https'
import net from 'node:net'
import { generateMitmCa } from '../../../src/packages/mitm/src/dynamicCert.ts'
import { createForward } from '../../../src/packages/mitm/src/tproxy/tlsCapture.ts'
const up = await generateMitmCa('up')
const upstream = https.createServer({ key: up.key, cert: up.cert }, (req, res) => res.end(`ok:${req.url}`))
await new Promise<void>(r => upstream.listen(0, '127.0.0.1', () => r()))
const port = (upstream.address() as net.AddressInfo).port
const init = { method: 'GET', path: '/x', headers: { host: 'api.example.com' }, body: Buffer.alloc(0) }
const dest = { ip: '127.0.0.1', port, sni: 'api.example.com' }
const pending = await createForward((ip, p) => net.connect(p, ip), { rejectUnauthorized: false })(dest, init).then(r => `status=${r.status} body=${r.body}`, e => `ERROR ${e.message}`)
console.log('socket conectándose:', pending)
const connected = (ip: string, p: number) => { const s = net.connect(p, ip); return s }
const pre = await new Promise<net.Socket>(r => { const s = net.connect(port, '127.0.0.1', () => r(s)) })
const ready = await createForward(() => pre, { rejectUnauthorized: false })(dest, init).then(r => `status=${r.status} body=${r.body}`, e => `ERROR ${e.message}`)
console.log('socket ya conectado:', ready)
void connected
process.exit(0)
