// Igual que emitPair.ts, pero la hoja con notBefore una hora atrás, firmada por selfsigned con la CA.
import fs from 'node:fs'
import selfsigned from 'selfsigned'
import { generateMitmCa } from '../../../../src/packages/mitm/src/dynamicCert.ts'
const out = process.argv[2]!
const ca = await generateMitmCa()
const notBeforeDate = new Date(Date.now() - 3600_000)
const pems = await selfsigned.generate([{ name: 'commonName', value: 'a.example' }], {
  keySize: 2048, algorithm: 'sha256', notBeforeDate,
  extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'a.example' }] }],
  ca: { key: ca.key, cert: ca.cert },
})
fs.writeFileSync(`${out}/ca.crt`, ca.cert)
fs.writeFileSync(`${out}/leaf.key`, pems.private)
fs.writeFileSync(`${out}/leaf.crt`, pems.cert)
