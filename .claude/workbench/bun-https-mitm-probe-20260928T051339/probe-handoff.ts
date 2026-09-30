// Sonda: traspaso de un túnel CONNECT al servidor TLS con emit('connection'), y
// https.request a una IP con servername, bajo Bun.
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import { generateMitmCa, issueLeafCertForHosts } from '/home/user/thyrox/src/packages/mitm/src/dynamicCert.ts'

const ca = await generateMitmCa('probe CA')
const leaf = await issueLeafCertForHosts(['target.test', 'upstream.test'], ca)
const out: Record<string, string> = {}

// Un servidor https que atiende CONNECT desde texto plano (proxy HTTP clásico) y traspasa.
const server = https.createServer({ key: leaf.key, cert: leaf.cert }, (req, res) => res.end(`decrypted host=${req.headers.host}`))
server.on('connect', (_req, socket, head) => {
  socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
  if (head && head.length > 0) socket.unshift(head)
  server.emit('connection', socket)
})
await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
const port = (server.address() as { port: number }).port

// CONNECT dentro de TLS: el cliente abre TLS, manda CONNECT y luego abre un TLS interior.
out.connectInsideTls = await new Promise<string>(resolve => {
  const outer = tls.connect({ host: '127.0.0.1', port, servername: 'target.test', ca: ca.cert }, () => {
    outer.write('CONNECT target.test:443 HTTP/1.1\r\nHost: target.test:443\r\n\r\n')
    outer.once('data', d => {
      const line = d.toString().split('\r\n')[0]
      const inner = tls.connect({ socket: outer, servername: 'target.test', ca: ca.cert }, () => {
        inner.write('GET / HTTP/1.1\r\nHost: target.test\r\n\r\n')
        inner.on('data', x => { resolve(`${line} | ${x.toString().split('\r\n').pop()}`); inner.destroy() })
      })
      inner.on('error', e => resolve(`${line} | inner ERR ${e.message}`))
    })
  })
  outer.on('error', e => resolve('ERR ' + e.message))
  setTimeout(() => resolve('TIMEOUT'), 3000)
})

// https.request a una IP con servername y la CA.
const upstream = https.createServer({ key: leaf.key, cert: leaf.cert }, (req, res) => res.end(`upstream saw host=${req.headers.host} path=${req.url}`))
await new Promise<void>(r => upstream.listen(0, '127.0.0.1', () => r()))
const upPort = (upstream.address() as { port: number }).port
out.httpsRequestToIp = await new Promise<string>(resolve => {
  const req = https.request({ hostname: '127.0.0.1', port: upPort, path: '/x?y=1', method: 'GET', headers: { host: 'upstream.test' }, servername: 'upstream.test', ca: ca.cert }, res => {
    let b = ''; res.on('data', d => (b += d)); res.on('end', () => resolve(`${res.statusCode} ${b}`))
  })
  req.on('error', e => resolve('ERR ' + e.message))
  req.end()
})
out.httpsRequestUnverified = await new Promise<string>(resolve => {
  const req = https.request({ hostname: '127.0.0.1', port: upPort, path: '/', method: 'GET', headers: { host: 'upstream.test' }, servername: 'upstream.test', rejectUnauthorized: true }, res => { res.resume(); resolve(`${res.statusCode}`) })
  req.on('error', e => resolve('ERR ' + e.message.slice(0, 50)))
  req.end()
})
// fetch con Host propio y sin verificar
out.fetchHostOverride = await fetch(`https://127.0.0.1:${upPort}/h`, { headers: { host: 'upstream.test' }, tls: { rejectUnauthorized: false } } as RequestInit).then(r => r.text()).catch(e => 'ERR ' + e.message)
console.log(JSON.stringify({ bun: Bun.version, ...out }, null, 2))
process.exit(0)
