// Sonda: qué de node:https usa el servidor MITM funciona bajo Bun.
import https from 'node:https'
import tls from 'node:tls'
import { generateMitmCa, issueLeafCert } from '/home/user/thyrox/src/packages/mitm/src/dynamicCert.ts'

const ca = await generateMitmCa('probe CA')
const leafA = await issueLeafCert('a.test', ca)
const leafB = await issueLeafCert('b.test', ca)
const results: Record<string, string> = {}
let sniSeen: string[] = []

const server = https.createServer(
  {
    key: leafA.key,
    cert: leafA.cert,
    SNICallback: (name, cb) => {
      sniSeen.push(name)
      const leaf = name === 'b.test' ? leafB : leafA
      cb(null, tls.createSecureContext({ key: leaf.key, cert: leaf.cert }))
    },
  },
  (req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end(`host=${req.headers.host}`)
  },
)
let connectFired = false
server.on('connect', (_req, socket) => {
  connectFired = true
  socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
  socket.end()
})
await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
const port = (server.address() as { port: number }).port

function tlsRequest(servername: string, payload: string): Promise<{ text: string; subject: string }> {
  return new Promise((resolve, reject) => {
    const s = tls.connect({ host: '127.0.0.1', port, servername, ca: ca.cert }, () => {
      const subject = String(s.getPeerCertificate().subject?.CN ?? '')
      s.write(payload)
      let text = ''
      s.on('data', d => (text += d))
      s.on('end', () => resolve({ text, subject }))
      setTimeout(() => { s.destroy(); resolve({ text, subject }) }, 1500)
    })
    s.on('error', reject)
  })
}

const b = await tlsRequest('b.test', 'GET / HTTP/1.1\r\nHost: b.test\r\nConnection: close\r\n\r\n').catch(e => ({ text: 'ERR ' + e.message, subject: '' }))
results.sniCallback = `seen=${JSON.stringify(sniSeen)} cn=${b.subject} verified-ok=${!b.text.startsWith('ERR')}`
results.request = b.text.split('\r\n').pop() ?? ''
const c = await tlsRequest('a.test', 'CONNECT x.test:443 HTTP/1.1\r\nHost: x.test:443\r\n\r\n').catch(e => ({ text: 'ERR ' + e.message, subject: '' }))
results.connectEvent = `fired=${connectFired} reply=${JSON.stringify(c.text.split('\r\n')[0])}`
console.log(JSON.stringify({ bun: Bun.version, ...results }, null, 2))
server.close()
process.exit(0)
