// La misma hoja que issueLeafCertForHosts, pero con identificador de clave de autoridad; ¿la acepta Bun?
import * as x509 from '@peculiar/x509'
import tls from 'node:tls'
import { webcrypto } from 'node:crypto'
import { generateMitmCa } from '../../../../src/packages/mitm/src/dynamicCert.ts'

x509.cryptoProvider.set(webcrypto as unknown as Crypto)
const alg = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', publicExponent: new Uint8Array([1, 0, 1]), modulusLength: 2048 }
const ca = await generateMitmCa()
const caCert = new x509.X509Certificate(ca.cert)
const caKey = await webcrypto.subtle.importKey('pkcs8', Buffer.from(ca.key.replace(/-----[^-]+-----|\s/g, ''), 'base64'), alg, false, ['sign'])
const keys = await webcrypto.subtle.generateKey(alg, true, ['sign', 'verify'])
const leaf = await x509.X509CertificateGenerator.create({
  serialNumber: '01', subject: 'CN=a.example', issuer: caCert.subject,
  notBefore: new Date(Date.now() - 60_000), notAfter: new Date(Date.now() + 86_400_000),
  signingAlgorithm: alg, publicKey: keys.publicKey, signingKey: caKey,
  extensions: [
    new x509.SubjectAlternativeNameExtension([{ type: 'dns', value: 'a.example' }]),
    await x509.AuthorityKeyIdentifierExtension.create(caCert.publicKey),
  ],
})
const pkcs8 = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', keys.privateKey)).toString('base64')
const server = tls.createServer({ key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----\n`, cert: leaf.toString('pem') }, s => s.end())
server.listen(0, '127.0.0.1', () => {
  const socket = tls.connect({ host: '127.0.0.1', port: (server.address() as { port: number }).port, servername: 'a.example', ca: ca.cert, rejectUnauthorized: false }, () => {
    console.log('leaf with AKI:', socket.authorized, socket.authorizationError ?? '')
    process.exit(0)
  })
})
