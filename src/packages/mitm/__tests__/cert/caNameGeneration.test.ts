/**
 * Cada CA generada lleva un nombre propio (H-THYROX-236).
 *
 * BoringSSL, bajo Bun, elige el emisor de una cadena POR NOMBRE dentro del
 * almacén de `SSL_CERT_FILE`. Con un nombre fijo, una CA vieja del MITM que
 * sigue en el almacén del sistema tapa a la recién generada: la hoja se valida
 * contra la clave equivocada y el apretón de manos falla. Un nombre por
 * generación deja a las dos distinguibles.
 *
 * Qué lo haría fallar: volver al nombre fijo en `generateMitmCa()`.
 */
import { X509Certificate } from 'node:crypto'

import { expect, test } from 'bun:test'

import { generateMitmCa, MITM_CA_NAME_PREFIX } from '../../src/dynamicCert.ts'

function subjectName(certPem: string): string {
  return new X509Certificate(certPem).subject.replace(/^CN=/, '')
}

test('dos CA generadas sin nombre declarado no comparten sujeto', async () => {
  const [first, second] = await Promise.all([generateMitmCa(), generateMitmCa()])
  expect(subjectName(first.cert)).not.toBe(subjectName(second.cert))
})

test('el nombre generado conserva el prefijo que identifica al MITM', async () => {
  const ca = await generateMitmCa()
  expect(subjectName(ca.cert).startsWith(`${MITM_CA_NAME_PREFIX} `)).toBe(true)
})

test('un nombre declarado se respeta tal cual', async () => {
  const ca = await generateMitmCa('corporate CA')
  expect(subjectName(ca.cert)).toBe('corporate CA')
})
