// Sonda: el mismo servidor HTTPS de Bun, frente a https.request, curl y tls.connect con write/end.
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import { generateMitmCa, issueLeafCert } from '../../../src/packages/mitm/src/dynamicCert.ts'
const ca = await generateMitmCa('up')
const up = process.env.PROBE_LEAF === '1' ? await issueLeafCert('127.0.0.1', ca) : ca
console.log('certificado del servidor:', process.env.PROBE_LEAF === '1' ? 'hoja' : 'CA')
let served = 0
const upstream = https.createServer({ key: up.key, cert: up.cert }, (req, res) => { served++; res.end(`ok:${req.url}`) })
await new Promise<void>(r => upstream.listen(0, '127.0.0.1', () => r()))
const port = (upstream.address() as net.AddressInfo).port
const viaRequest = await new Promise<string>(r => https.get({ host: '127.0.0.1', port, path: '/req', rejectUnauthorized: false }, res => { let b = ''; res.on('data', d => (b += d)); res.on('end', () => r(`${res.statusCode} ${b}`)) }).on('error', e => r(`ERROR ${e.message}`)))
console.log('https.get:', viaRequest, 'served=', served)
const curl = Bun.spawnSync(['curl', '-sk', '--max-time', '3', `https://127.0.0.1:${port}/curl`])
console.log('curl:', curl.stdout.toString(), 'served=', served)
for (const how of ['write', 'end']) {
  const got = await new Promise<string>(r => {
    const s = tls.connect({ host: '127.0.0.1', port, rejectUnauthorized: false })
    let b = ''
    s.on('data', d => (b += d))
    s.on('close', () => r(b))
    s.on('error', e => r(`ERROR ${e.message}`))
    s.once('secureConnect', () => { const req = 'GET /tls HTTP/1.1\r\nhost: x\r\nconnection: close\r\n\r\n'; how === 'write' ? s.write(req) : s.end(req) })
    setTimeout(() => r(`TIMEOUT ${b}`), 3000)
  })
  console.log(`tls.connect ${how}:`, JSON.stringify(got.slice(0, 40)), 'served=', served)
}
process.exit(0)
