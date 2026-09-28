// ¿El setGlobalDispatcher de undici cambia a quién confía el fetch de Bun?
import https from 'node:https'
import { Agent, setGlobalDispatcher } from 'undici'
import { generateMitmCa, issueLeafCert } from '../../../src/packages/mitm/src/dynamicCert.ts'

const ca = await generateMitmCa('probe CA')
const leaf = await issueLeafCert('localhost', ca)
const server = https.createServer({ key: leaf.key, cert: leaf.cert }, (_q, r) => r.end('ok'))
await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
const url = `https://localhost:${(server.address() as { port: number }).port}/`

async function attempt(label: string, init?: RequestInit): Promise<void> {
  try {
    const res = await fetch(url, init)
    console.log(`${label}: ${res.status} ${await res.text()}`)
  } catch (e) {
    console.log(`${label}: FAIL ${(e as Error).message.split('\n')[0]}`)
  }
}
await attempt('sin CA')
setGlobalDispatcher(new Agent({ connect: { ca: ca.cert } }))
await attempt('con setGlobalDispatcher')
await attempt('con tls.ca de Bun', { tls: { ca: ca.cert } } as RequestInit)
server.close()
