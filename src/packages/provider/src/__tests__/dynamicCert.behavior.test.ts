import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

import { DynamicCertStore, generateMitmCa, issueLeafCert } from '../mitm/dynamicCert.ts'

/**
 * CA dinamica por SNI — el almacen que emite una hoja por host a demanda.
 *
 * Porte de `omniroute: src/mitm/tproxy/dynamicCert.ts`. El mecanismo que la
 * fuente usa —`selfsigned` v5 con `options.ca`— viaja verbatim: es una
 * dependencia externa que este arbol podia traer, asi que no hay divergencia
 * que declarar en la emision.
 *
 * EL VERIFICADOR ES OTRO PROGRAMA, y esa es la mitad que hace al control
 * discriminar. Comprobar que `tls.createSecureContext` acepta el PEM mide que
 * el PEM PARSEA, no que la cadena VALIDE: un contexto se construye igual con
 * una hoja autofirmada que no encadena a la CA. Por eso la cadena se verifica
 * con `openssl verify`, que es una implementacion independiente de la que
 * emite.
 *
 * Metrica: el veredicto de `openssl verify -CAfile <ca> <hoja>`, y el texto
 * que `openssl x509 -text` imprime de cada certificado.
 * Ciega a: si un cliente TLS real acepta la hoja en un apreton de manos — eso
 * exige un listener, y lo mide el escalon siguiente; y a la politica de
 * confianza del sistema operativo, que este modulo no toca.
 */

/** `openssl` es precondicion del CONTROL, no del modulo: sin el no se mide. */
function requireOpenssl(): void {
  const probe = spawnSync('openssl', ['version'], { encoding: 'utf8' })
  if (probe.status !== 0) {
    throw new Error(
      'falta `openssl`: el control no puede verificar la cadena con un ' +
        'programa independiente. NO se emite veredicto — un verde sin ' +
        'verificador seria un verde falso.',
    )
  }
}

/** Vuelca un PEM a un archivo temporal y devuelve su ruta. */
function writePem(dir: string, name: string, pem: string): string {
  const path = join(dir, name)
  writeFileSync(path, pem)
  return path
}

/** El texto que `openssl x509 -text` imprime de un certificado PEM. */
function describeCert(dir: string, name: string, pem: string): string {
  const path = writePem(dir, name, pem)
  const out = spawnSync('openssl', ['x509', '-in', path, '-noout', '-text'], {
    encoding: 'utf8',
  })
  return out.stdout ?? ''
}

describe('DynamicCertStore — CA dinamica por SNI', () => {
  test('la CA se emite con basicConstraints CA:TRUE', async () => {
    requireOpenssl()
    const dir = mkdtempSync(join(tmpdir(), 'thyrox-ca-'))
    try {
      const ca = await generateMitmCa('THYROX MITM CA')
      expect(describeCert(dir, 'ca.pem', ca.cert)).toContain('CA:TRUE')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('la hoja lleva el hostname pedido en su subjectAltName', async () => {
    requireOpenssl()
    const dir = mkdtempSync(join(tmpdir(), 'thyrox-leaf-'))
    try {
      const ca = await generateMitmCa('THYROX MITM CA')
      const leaf = await issueLeafCert('api.ejemplo.test', ca)
      expect(describeCert(dir, 'leaf.pem', leaf.cert)).toContain(
        'DNS:api.ejemplo.test',
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('openssl verify acepta la cadena hoja -> CA', async () => {
    requireOpenssl()
    const dir = mkdtempSync(join(tmpdir(), 'thyrox-chain-'))
    try {
      const ca = await generateMitmCa('THYROX MITM CA')
      const leaf = await issueLeafCert('api.ejemplo.test', ca)
      const caPath = writePem(dir, 'ca.pem', ca.cert)
      const leafPath = writePem(dir, 'leaf.pem', leaf.cert)
      const verify = spawnSync('openssl', ['verify', '-CAfile', caPath, leafPath], {
        encoding: 'utf8',
      })
      expect(`${verify.stdout}${verify.stderr}`).toContain('OK')
      expect(verify.status).toBe(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('el bundle de la hoja trae DOS certificados: la hoja y su CA', async () => {
    const ca = await generateMitmCa('THYROX MITM CA')
    const leaf = await issueLeafCert('api.ejemplo.test', ca)
    const count = leaf.cert.match(/-----BEGIN CERTIFICATE-----/g)?.length ?? 0
    expect(count).toBe(2)
  })

  test('el segundo pedido del mismo host sale de la cache', async () => {
    const store = new DynamicCertStore('THYROX MITM CA')
    const first = await store.getSecureContext('api.ejemplo.test')
    expect(store.size).toBe(1)
    const second = await store.getSecureContext('api.ejemplo.test')
    expect(second).toBe(first)
    expect(store.size).toBe(1)
  })

  test('dos hosts distintos son dos entradas de cache', async () => {
    const store = new DynamicCertStore('THYROX MITM CA')
    await store.getSecureContext('uno.ejemplo.test')
    await store.getSecureContext('dos.ejemplo.test')
    expect(store.size).toBe(2)
  })

  test('una CA declarada se reutiliza en vez de generarse', async () => {
    const existing = await generateMitmCa('THYROX CA DECLARADA')
    const store = new DynamicCertStore('ignorado', existing)
    expect(await store.getCaCertPem()).toBe(existing.cert)
  })

  test('el SNICallback entrega el contexto del servername', async () => {
    const store = new DynamicCertStore('THYROX MITM CA')
    const callback = store.createSNICallback()
    const ctx = await new Promise((resolve, reject) => {
      callback('sni.ejemplo.test', (err, secureContext) =>
        err ? reject(err) : resolve(secureContext),
      )
    })
    expect(ctx).toBeDefined()
    expect(store.size).toBe(1)
  })
})
