// Sonda: en qué paso se detiene el traspaso CONNECT -> servidor TLS bajo Bun.
import https from 'node:https'
import tls from 'node:tls'
import { generateMitmCa, issueLeafCertForHosts } from '/home/user/thyrox/src/packages/mitm/src/dynamicCert.ts'

const ca = await generateMitmCa('probe CA')
const leaf = await issueLeafCertForHosts(['target.test'], ca)
const steps: string[] = []
const server = https.createServer({ key: leaf.key, cert: leaf.cert }, (req, res) => { steps.push('request-handler'); res.end(`decrypted host=${req.headers.host}`) })
server.on('connection', () => steps.push('connection-event'))
server.on('connect', (_req, socket, head) => {
  steps.push(`connect-event head=${head?.length ?? 0}`)
  socket.write('HTTP/1.1 200 Connection Established\r\n\r\n', () => steps.push('200-written'))
  if (head && head.length > 0) socket.unshift(head)
  const emitted = server.emit('connection', socket)
  steps.push(`emit-connection returned=${emitted}`)
})
await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
const port = (server.address() as { port: number }).port
const outer = tls.connect({ host: '127.0.0.1', port, servername: 'target.test', ca: ca.cert }, () => {
  steps.push('outer-tls-up')
  outer.write('CONNECT target.test:443 HTTP/1.1\r\nHost: target.test:443\r\n\r\n')
})
outer.on('data', d => {
  steps.push(`outer-data ${JSON.stringify(d.toString().slice(0, 40))}`)
  const inner = tls.connect({ socket: outer, servername: 'target.test', ca: ca.cert }, () => {
    steps.push('inner-tls-up')
    inner.write('GET / HTTP/1.1\r\nHost: target.test\r\n\r\n')
  })
  inner.on('data', x => steps.push(`inner-data ${JSON.stringify(x.toString().split('\r\n').pop())}`))
  inner.on('error', e => steps.push('inner-error ' + e.message))
})
outer.on('error', e => steps.push('outer-error ' + e.message))
await Bun.sleep(2500)
console.log(JSON.stringify({ bun: Bun.version, steps }, null, 2))
process.exit(0)
