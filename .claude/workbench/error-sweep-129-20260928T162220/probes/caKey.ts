// Emite la CA de dynamicCert.ts con su clave, para re-firmar hojas con openssl.
import fs from 'node:fs'
import { generateMitmCa } from '../../../../src/packages/mitm/src/dynamicCert.ts'
const ca = await generateMitmCa()
fs.writeFileSync(`${process.argv[2]}/ca.crt`, ca.cert)
fs.writeFileSync(`${process.argv[2]}/ca.key`, ca.key)
