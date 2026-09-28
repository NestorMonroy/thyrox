// Sonda: alternativas a SNICallback de https bajo Bun para servir un certificado por host.
import https from 'node:https'
import tls from 'node:tls'
import { generateMitmCa, issueLeafCert } from '/home/user/thyrox/src/packages/mitm/src/dynamicCert.ts'

const ca = await generateMitmCa('probe CA')
const leafA = await issueLeafCert('a.test', ca)
const leafB = await issueLeafCert('b.test', ca)

function cnFor(port: number, servername: string): Promise<string> {
  return new Promise(resolve => {
    const s = tls.connect({ host: '127.0.0.1', port, servername, ca: ca.cert, rejectUnauthorized: false }, () => {
      resolve(String(s.getPeerCertificate().subject?.CN ?? ''))
      s.destroy()
    })
    s.on('error', e => resolve('ERR ' + e.message))
    setTimeout(() => resolve('TIMEOUT'), 2000)
  })
}
async function listen(server: { listen: Function; address: Function }): Promise<number> {
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
  return (server.address() as { port: number }).port
}
const out: Record<string, string> = {}

// 1. tls.createServer con SNICallback
let tlsSni: string[] = []
const t1 = tls.createServer({
  key: leafA.key, cert: leafA.cert,
  SNICallback: (name, cb) => { tlsSni.push(name); cb(null, tls.createSecureContext(name === 'b.test' ? { key: leafB.key, cert: leafB.cert } : { key: leafA.key, cert: leafA.cert })) },
}, s => s.end())
const p1 = await listen(t1)
out.tlsServerSniCallback = `cn=${await cnFor(p1, 'b.test')} seen=${JSON.stringify(tlsSni)}`
t1.close()

// 2. https.createServer + addContext
const h2 = https.createServer({ key: leafA.key, cert: leafA.cert }, (_q, r) => r.end())
let addContextNote = 'ok'
try { (h2 as unknown as tls.Server).addContext('b.test', { key: leafB.key, cert: leafB.cert }) } catch (e) { addContextNote = 'throws ' + (e as Error).message }
const p2 = await listen(h2)
out.httpsAddContext = `${addContextNote} cn=${await cnFor(p2, 'b.test')}`
h2.close()

// 3. Bun.serve con varios certificados por serverName
const s3 = Bun.serve({
  port: 0, hostname: '127.0.0.1',
  tls: [
    { serverName: 'a.test', key: leafA.key, cert: leafA.cert },
    { serverName: 'b.test', key: leafB.key, cert: leafB.cert },
  ],
  fetch: () => new Response('ok'),
})
out.bunServeTlsArray = `cn=${await cnFor(s3.port, 'b.test')} / a=${await cnFor(s3.port, 'a.test')}`
s3.stop(true)
console.log(JSON.stringify({ bun: Bun.version, ...out }, null, 2))
process.exit(0)
