// Sonda: traspaso de un túnel CONNECT encauzándolo a una conexión nueva al propio puerto.
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import { generateMitmCa, issueLeafCertForHosts } from '/home/user/thyrox/src/packages/mitm/src/dynamicCert.ts'

const ca = await generateMitmCa('probe CA')
const leaf = await issueLeafCertForHosts(['target.test'], ca)
let port = 0
const server = https.createServer({ key: leaf.key, cert: leaf.cert }, (req, res) => res.end(`decrypted host=${req.headers.host}`))
server.on('connect', (_req, socket, head) => {
  const local = net.connect(port, '127.0.0.1', () => {
    socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
    if (head && head.length > 0) local.write(head)
    local.pipe(socket)
    socket.pipe(local)
  })
  local.on('error', () => socket.destroy())
})
await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
port = (server.address() as { port: number }).port
const result = await new Promise<string>(resolve => {
  const outer = tls.connect({ host: '127.0.0.1', port, servername: 'target.test', ca: ca.cert }, () => {
    outer.write('CONNECT target.test:443 HTTP/1.1\r\nHost: target.test:443\r\n\r\n')
  })
  outer.once('data', d => {
    const line = d.toString().split('\r\n')[0]
    const inner = tls.connect({ socket: outer, servername: 'target.test', ca: ca.cert }, () => {
      inner.write('GET / HTTP/1.1\r\nHost: target.test\r\n\r\n')
    })
    inner.on('data', x => resolve(`${line} | authorized=${inner.authorized} | ${x.toString().split('\r\n').pop()}`))
    inner.on('error', e => resolve(`${line} | inner ERR ${e.message}`))
  })
  setTimeout(() => resolve('TIMEOUT'), 3000)
})
console.log(JSON.stringify({ bun: Bun.version, loopbackHandoff: result }, null, 2))
process.exit(0)
