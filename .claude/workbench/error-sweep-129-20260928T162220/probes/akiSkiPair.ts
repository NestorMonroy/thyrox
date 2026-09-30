// CA con identificador de clave de sujeto y hoja con el de autoridad: ¿elige BoringSSL la CA correcta
// aunque el almacén del entorno tenga otra con el mismo nombre?
import * as x509 from '@peculiar/x509'
import tls from 'node:tls'
import { webcrypto } from 'node:crypto'

x509.cryptoProvider.set(webcrypto as unknown as Crypto)
const alg = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', publicExponent: new Uint8Array([1, 0, 1]), modulusLength: 2048 }
const pem = async (key: CryptoKey) => `-----BEGIN PRIVATE KEY-----\n${Buffer.from(await webcrypto.subtle.exportKey('pkcs8', key)).toString('base64')}\n-----END PRIVATE KEY-----\n`
const caKeys = await webcrypto.subtle.generateKey(alg, true, ['sign', 'verify'])
const ca = await x509.X509CertificateGenerator.createSelfSigned({
  serialNumber: '0a', name: 'CN=THYROX MITM CA', notBefore: new Date(Date.now() - 60_000), notAfter: new Date(Date.now() + 86_400_000),
  signingAlgorithm: alg, keys: caKeys,
  extensions: [
    new x509.BasicConstraintsExtension(true, undefined, true),
    new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true),
    await x509.SubjectKeyIdentifierExtension.create(caKeys.publicKey),
  ],
})
const keys = await webcrypto.subtle.generateKey(alg, true, ['sign', 'verify'])
const leaf = await x509.X509CertificateGenerator.create({
  serialNumber: '01', subject: 'CN=a.example', issuer: ca.subject,
  notBefore: new Date(Date.now() - 60_000), notAfter: new Date(Date.now() + 86_400_000),
  signingAlgorithm: alg, publicKey: keys.publicKey, signingKey: caKeys.privateKey,
  extensions: [
    new x509.SubjectAlternativeNameExtension([{ type: 'dns', value: 'a.example' }]),
    await x509.AuthorityKeyIdentifierExtension.create(caKeys.publicKey),
  ],
})
const server = tls.createServer({ key: await pem(keys.privateKey), cert: leaf.toString('pem') }, s => s.end())
server.listen(0, '127.0.0.1', () => {
  const socket = tls.connect({ host: '127.0.0.1', port: (server.address() as { port: number }).port, servername: 'a.example', ca: ca.toString('pem'), rejectUnauthorized: false }, () => {
    console.log('CA with SKI, leaf with AKI:', socket.authorized, socket.authorizationError ?? '')
    process.exit(0)
  })
})
