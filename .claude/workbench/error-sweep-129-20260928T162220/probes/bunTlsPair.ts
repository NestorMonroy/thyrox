// ¿Acepta el TLS de Bun una hoja emitida por el paquete? Aísla CA de rootCa.ts frente a la de dynamicCert.ts.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import tls from 'node:tls'
import { loadOrCreateMitmCa } from '../../../../src/packages/mitm/src/cert/rootCa.ts'
import { generateMitmCa, issueLeafCertForHosts } from '../../../../src/packages/mitm/src/dynamicCert.ts'

async function tryCa(label: string, ca: { key: string; cert: string }) {
  const leaf = await issueLeafCertForHosts(['a.example'], ca)
  const onlyLeaf = leaf.cert.slice(0, leaf.cert.indexOf('-----END CERTIFICATE-----') + 25) + '\n'
  const server = tls.createServer({ key: leaf.key, cert: process.env.ONLY_LEAF ? onlyLeaf : leaf.cert }, s => s.end())
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
  const port = (server.address() as { port: number }).port
  const result = await new Promise<string>(resolve => {
    const socket = tls.connect({ host: '127.0.0.1', port, servername: 'a.example', ca: ca.cert, rejectUnauthorized: false }, () => {
      resolve(`${socket.authorized} ${socket.authorizationError ?? ''}`)
      socket.destroy()
    })
  })
  server.close()
  console.log(label, result)
}
await tryCa('dynamicCert CA:', await generateMitmCa())
await tryCa('rootCa CA:', await loadOrCreateMitmCa(fs.mkdtempSync(path.join(os.tmpdir(), 'ca-'))))
process.exit(0)
