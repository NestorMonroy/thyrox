/**
 * Una hoja por cada host de herramienta: el servidor MITM cubre todos los
 * hosts de `MITM_TOOL_HOSTS` emitiendo la hoja al pedirla, no con una lista
 * de SAN fijada de antemano.
 *
 * Porte de `omniroute: tests/unit/mitm-root-ca-leaf-issuance-6684.test.ts`
 * (MIT).
 */
import { expect, test } from 'bun:test'
import { X509Certificate } from 'node:crypto'

import { DynamicCertStore, generateMitmCa, issueLeafCert } from '../../src/dynamicCert.ts'
import { MITM_TOOL_HOSTS } from '../../src/targets/toolHosts.ts'

function allToolHosts(): string[] {
  return [...new Set(Object.values(MITM_TOOL_HOSTS).flat())]
}

function leafOf(bundle: string): X509Certificate {
  return new X509Certificate(bundle.split(/(?=-----BEGIN CERTIFICATE-----)/)[0]!)
}

test('every tool host gets a leaf whose SAN names exactly that host', async () => {
  const hosts = allToolHosts()
  expect(hosts.length).toBeGreaterThan(0)
  const ca = await generateMitmCa('Test MITM CA')
  for (const host of hosts) {
    const san = (leafOf((await issueLeafCert(host, ca)).cert).subjectAltName ?? '').split(',').map(e => e.trim())
    expect(san).toContain(`DNS:${host}`)
  }
}, 60_000)

test('the leaf chain validates against the CA', async () => {
  const ca = await generateMitmCa('Test MITM CA')
  const leaf = leafOf((await issueLeafCert('chain-check.example.com', ca)).cert)
  const caCert = new X509Certificate(ca.cert)
  // En Bun, checkIssued devuelve el certificado emisor, no un booleano como en Node.
  expect(leaf.checkIssued(caCert)).toBeTruthy()
  expect(leaf.issuer).toBe(caCert.subject)
  expect(leaf.verify(caCert.publicKey)).toBe(true)
})

test('a host never registered as a tool host still gets a context', async () => {
  const ca = await generateMitmCa('Test MITM CA')
  const store = new DynamicCertStore('Test MITM CA', ca)
  const host = 'some-brand-new-tool-host.example.com'
  expect(allToolHosts()).not.toContain(host)
  expect(await store.getSecureContext(host)).toBeTruthy()
})
