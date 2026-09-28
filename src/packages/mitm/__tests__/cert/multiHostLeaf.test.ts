// La hoja que el servidor MITM presenta con el modelo de CA raíz: una sola, con todos los
// hosts de destino como SAN, porque Bun no invoca SNICallback. Se mide contra un servidor
// https real, no llamando al emisor.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import https from 'node:https'
import tls from 'node:tls'
import { X509Certificate } from 'node:crypto'

import { generateMitmCa, issueLeafCertForHosts } from '../../src/dynamicCert.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function verify(port: number, servername: string, ca: string): Promise<string> {
  return new Promise(resolve => {
    const socket = tls.connect({ host: '127.0.0.1', port, servername, ca }, () => {
      resolve(socket.authorized ? 'authorized' : 'unauthorized')
      socket.destroy()
    })
    socket.on('error', error => resolve(`error: ${error.message}`))
  })
}

test('one leaf signed by the CA validates for every listed host and no other', async () => {
  const ca = await generateMitmCa('test CA')
  const hosts = ['a.test', 'b.test', 'deep.c.example.com']
  const leaf = await issueLeafCertForHosts(hosts, ca)
  const server = https.createServer({ key: leaf.key, cert: leaf.cert }, (_req, res) => res.end())
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
  cleanups.push(() => server.close())
  const port = (server.address() as { port: number }).port
  for (const host of hosts) assert.equal(await verify(port, host, ca.cert), 'authorized', host)
  assert.match(await verify(port, 'd.test', ca.cert), /does not match/)
})

test('the leaf carries its hosts and the CA in the chain, and needs at least one host', async () => {
  const ca = await generateMitmCa('test CA')
  const leaf = await issueLeafCertForHosts(['a.test', 'A.test', 'b.test'], ca)
  const [leafPem] = leaf.cert.split(/(?<=-----END CERTIFICATE-----)\n/)
  const x509 = new X509Certificate(leafPem!)
  assert.equal(x509.subject, 'CN=a.test')
  assert.equal(x509.subjectAltName, 'DNS:a.test, DNS:b.test')
  assert.ok(x509.checkIssued(new X509Certificate(ca.cert)))
  assert.ok(leaf.cert.includes(ca.cert.trim()))
  await assert.rejects(issueLeafCertForHosts([], ca), /al menos un host/)
})
