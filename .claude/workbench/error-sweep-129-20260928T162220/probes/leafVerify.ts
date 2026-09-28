// Emite una CA y una hoja con las funciones del paquete y deja los PEM para `openssl verify`.
import fs from 'node:fs'
import { loadOrCreateMitmCa } from '../../../../src/packages/mitm/src/cert/rootCa.ts'
import { issueLeafCertForHosts } from '../../../../src/packages/mitm/src/dynamicCert.ts'

const out = process.argv[2]!
const ca = await loadOrCreateMitmCa(out)
const leaf = await issueLeafCertForHosts(JSON.parse(process.argv[3] ?? '["daily-cloudcode-pa.googleapis.com"]'), ca)
fs.writeFileSync(`${out}/ca.pem`, ca.cert)
fs.writeFileSync(`${out}/leaf.pem`, leaf.cert.split('-----END CERTIFICATE-----')[0] + '-----END CERTIFICATE-----\n')
