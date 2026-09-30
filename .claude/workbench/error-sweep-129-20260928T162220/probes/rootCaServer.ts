// Arranca el servidor MITM en modo root-ca y vuelca la cadena que presenta, para `openssl verify`.
import fs from 'node:fs'
import tls from 'node:tls'
import { loadOrCreateMitmCa } from '../../../../src/packages/mitm/src/cert/rootCa.ts'
import { generateMitmCa, issueLeafCertForHosts } from '../../../../src/packages/mitm/src/dynamicCert.ts'
import { createMitmServer } from '../../../../src/packages/mitm/src/server/mitmServer.ts'
import { openMitmStateStore } from '../../../../src/packages/mitm/src/state/stateStore.ts'

const dataDir = process.argv[2]!
fs.writeFileSync(`${dataDir}/targets.json`, JSON.stringify({ targets: [{ id: 'cursor', hosts: ['api2.cursor.sh'] }] }))
const legacyCa = await generateMitmCa('test CA')
const legacy = await issueLeafCertForHosts(['x.example'], legacyCa)
fs.writeFileSync(`${dataDir}/server.key`, legacy.key)
fs.writeFileSync(`${dataDir}/server.crt`, legacy.cert)
const mitm = await createMitmServer(
  { localPort: 0, dataDir, routerBaseUrl: 'http://127.0.0.1:1', apiKey: 'k', certMode: 'root-ca', verbose: 0, disableTlsVerify: true, ingestToken: '', ingestBaseUrl: 'http://127.0.0.1:1' },
  { db: openMitmStateStore(':memory:'), resolveTargetIp: async () => '127.0.0.1', upstreamPort: 1, writeLine: () => {} },
)
const port = await mitm.listen(0)
const ca = await loadOrCreateMitmCa(dataDir)
fs.writeFileSync(`${dataDir}/ca.pem`, ca.cert)
fs.writeFileSync(`${dataDir}/legacy-ca.pem`, legacyCa.cert)
const socket: tls.TLSSocket = tls.connect({ host: '127.0.0.1', port, servername: 'daily-cloudcode-pa.googleapis.com', ca: ca.cert, rejectUnauthorized: false }, () => {
  console.log('authorized:', socket.authorized, socket.authorizationError)
  const chain: string[] = []
  for (let c = socket.getPeerCertificate(true) as tls.DetailedPeerCertificate; c && !chain.includes(c.fingerprint256); c = c.issuerCertificate) {
    chain.push(c.fingerprint256)
    fs.appendFileSync(`${dataDir}/served.pem`, `-----BEGIN CERTIFICATE-----\n${c.raw.toString('base64').match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`)
    console.log('served:', c.subject?.CN, 'issuer:', c.issuer?.CN, c.subjectaltname?.slice(0, 120))
  }
  socket.destroy(); mitm.close(); process.exit(0)
})
