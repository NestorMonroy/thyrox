// Deja en disco una CA y una hoja del paquete (clave y certificado) para probarlas con otro TLS.
import fs from 'node:fs'
import { generateMitmCa, issueLeafCertForHosts } from '../../../../src/packages/mitm/src/dynamicCert.ts'
const out = process.argv[2]!
const ca = await generateMitmCa()
const leaf = await issueLeafCertForHosts(['a.example'], ca)
fs.writeFileSync(`${out}/ca.crt`, ca.cert)
fs.writeFileSync(`${out}/leaf.key`, leaf.key)
fs.writeFileSync(`${out}/leaf.crt`, leaf.cert)
