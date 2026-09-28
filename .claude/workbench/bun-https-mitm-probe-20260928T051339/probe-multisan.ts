// Sonda: una hoja con varios SAN, firmada por la CA, servida por https de Bun sin SNI.
import https from 'node:https'
import tls from 'node:tls'
import selfsigned from 'selfsigned'
import { generateMitmCa } from '/home/user/thyrox/src/packages/mitm/src/dynamicCert.ts'

const ca = await generateMitmCa('probe CA')
const hosts = ['a.test', 'b.test', 'c.example.com']
const pems = await selfsigned.generate([{ name: 'commonName', value: hosts[0]! }], {
  keySize: 2048, algorithm: 'sha256',
  extensions: [{ name: 'subjectAltName', altNames: hosts.map(value => ({ type: 2, value })) }],
  ca: { key: ca.key, cert: ca.cert },
})
const server = https.createServer({ key: pems.private, cert: `${pems.cert.trim()}\n${ca.cert.trim()}\n` }, (req, res) => res.end(`ok ${req.headers.host}`))
await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
const port = (server.address() as { port: number }).port
const out: Record<string, string> = {}
for (const servername of [...hosts, 'd.test']) {
  out[servername] = await new Promise(resolve => {
    const s = tls.connect({ host: '127.0.0.1', port, servername, ca: ca.cert }, () => { resolve(`verified authorized=${s.authorized}`); s.destroy() })
    s.on('error', e => resolve('ERR ' + e.message.slice(0, 60)))
  })
}
console.log(JSON.stringify({ bun: Bun.version, multiSanLeaf: out }, null, 2))
server.close()
process.exit(0)
