// Sonda: ¿qué forma de dar el socket al cliente HTTP respeta Bun?
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
import { generateMitmCa } from '../../../src/packages/mitm/src/dynamicCert.ts'
const up = await generateMitmCa('up')
const upstream = https.createServer({ key: up.key, cert: up.cert }, (req, res) => res.end(`ok:${req.url}`))
await new Promise<void>(r => upstream.listen(0, '127.0.0.1', () => r()))
const port = (upstream.address() as net.AddressInfo).port
function attempt(name: string, make: (onSocket: () => net.Socket) => http.ClientRequest): Promise<void> {
  return new Promise(resolve => {
    let calls = 0
    const onSocket = () => { calls++; return tls.connect({ socket: net.connect(port, '127.0.0.1'), servername: 'api.example.com', rejectUnauthorized: false }) as unknown as net.Socket }
    const t = setTimeout(() => { console.log(name, 'TIMEOUT calls=', calls); resolve() }, 3000)
    let req: http.ClientRequest
    try { req = make(onSocket) } catch (e) { clearTimeout(t); console.log(name, 'THROW', (e as Error).message); return resolve() }
    req.on('response', res => { let b = ''; res.on('data', d => (b += d)); res.on('end', () => { clearTimeout(t); console.log(name, `status=${res.statusCode} body=${b} calls=${calls}`); resolve() }) })
    req.on('error', e => { clearTimeout(t); console.log(name, 'ERROR', e.message, 'calls=', calls); resolve() })
    req.end()
  })
}
await attempt('https.request createConnection sin agent', s => https.request({ host: '127.0.0.1', port: 1, path: '/a', createConnection: s } as https.RequestOptions))
await attempt('http.request createConnection (socket TLS)', s => http.request({ host: '127.0.0.1', port: 1, path: '/b', createConnection: s } as http.RequestOptions))
await attempt('https.request agent.createConnection', s => { const agent = new https.Agent({ keepAlive: false }); (agent as any).createConnection = s; return https.request({ host: '127.0.0.1', port: 1, path: '/c', agent, rejectUnauthorized: false }) })
process.exit(0)
