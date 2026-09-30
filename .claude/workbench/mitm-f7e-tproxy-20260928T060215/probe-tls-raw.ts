// Sonda: eventos y bytes de tls.connect({ socket }) en Bun, escribiendo en secureConnect.
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import { generateMitmCa } from '../../../src/packages/mitm/src/dynamicCert.ts'
const up = await generateMitmCa('up')
let served = 0
const upstream = https.createServer({ key: up.key, cert: up.cert }, (req, res) => { served++; res.end(`ok:${req.url}`) })
await new Promise<void>(r => upstream.listen(0, '127.0.0.1', () => r()))
const port = (upstream.address() as net.AddressInfo).port
for (const mode of ['socket', 'host']) {
  const events: string[] = []
  const chunks: Buffer[] = []
  const sock = mode === 'socket'
    ? tls.connect({ socket: await new Promise<net.Socket>(r => { const s = net.connect(port, '127.0.0.1', () => r(s)) }), servername: 'api.example.com', rejectUnauthorized: false, ALPNProtocols: ['http/1.1'] })
    : tls.connect({ host: '127.0.0.1', port, servername: 'api.example.com', rejectUnauthorized: false, ALPNProtocols: ['http/1.1'] })
  for (const e of ['secureConnect', 'end', 'close']) sock.on(e, () => events.push(e))
  sock.on('data', c => { events.push(`data:${c.length}`); chunks.push(c) })
  sock.on('error', e => events.push(`error:${e.message}`))
  sock.once('secureConnect', () => sock.write('GET /y HTTP/1.1\r\nhost: api.example.com\r\nconnection: close\r\n\r\n'))
  await new Promise<void>(r => { sock.on('close', () => r()); setTimeout(r, 3000) })
  console.log(mode, events.join(' '), JSON.stringify(Buffer.concat(chunks).toString('latin1').slice(0, 60)), 'served=', served)
}
process.exit(0)
