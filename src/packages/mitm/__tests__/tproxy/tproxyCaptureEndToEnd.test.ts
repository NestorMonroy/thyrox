/**
 * La captura TPROXY de extremo a extremo, contra el kernel real y dentro de
 * un espacio de red propio: una petición HTTPS a un destino cualquiera se
 * intercepta, se descifra con la CA de la sesión, llega al upstream por la
 * salida marcada, y queda en el búfer del inspector con su host y su ruta.
 *
 * Exige crear espacios de red, el binario `ip` y el nativo transparente; sin
 * ellos, el caso se salta nombrando la razón.
 */
import { afterEach, expect, test } from 'bun:test'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { isTransparentSocketAvailable } from '@thyrox/transparent-napi'

import { generateMitmCa, issueLeafCertForHosts } from '../../src/dynamicCert.ts'
import { openNetworkNamespace, type NetworkNamespace } from '../../src/tproxy/networkNamespace.ts'

function works(bin: string, args: string[]): boolean {
  try {
    execFileSync(bin, args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const missing = [
  works('unshare', ['--net', '--', 'true']) ? null : 'sin permiso para crear espacios de red',
  works('ip', ['-V']) ? null : 'sin el binario ip (THYROX_INSTALL_IPROUTE2=1 lo instala)',
  isTransparentSocketAvailable() ? null : 'sin el nativo transparente',
].filter(Boolean)
const unavailable = missing.length > 0
if (unavailable) console.warn(`tproxyCaptureEndToEnd: ${missing.join('; ')}; se salta`)

const FIXTURE = path.join(import.meta.dir, 'fixtures', 'captureInNamespace.ts')

let ns: NetworkNamespace | undefined
let dir: string | undefined
afterEach(async () => {
  await ns?.close()
  ns = undefined
  if (dir) fs.rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

test.skipIf(unavailable)('an HTTPS request is intercepted, decrypted, forwarded and recorded', async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-tproxy-e2e-'))
  const upstreamCa = await generateMitmCa('upstream CA')
  const upstreamLeaf = await issueLeafCertForHosts(['api.example.test'], upstreamCa)
  const files = {
    ca: path.join(dir, 'upstream-ca.pem'),
    key: path.join(dir, 'upstream.key'),
    cert: path.join(dir, 'upstream.crt'),
  }
  fs.writeFileSync(files.ca, upstreamCa.cert)
  fs.writeFileSync(files.key, upstreamLeaf.key)
  fs.writeFileSync(files.cert, upstreamLeaf.cert)

  ns = await openNetworkNamespace()
  const run = spawnSync('nsenter', [`--net=${ns.path}`, '--', process.execPath, FIXTURE], {
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, NODE_EXTRA_CA_CERTS: files.ca, UPSTREAM_KEY: files.key, UPSTREAM_CERT: files.cert },
  })
  expect(run.stderr).toBe('')
  const result = JSON.parse(run.stdout)

  expect(result.client).toEqual({ status: 200, body: 'upstream saw POST /v1/messages' })
  expect(result.intercepts).toEqual(['10.77.0.1:443'])
  expect(result.entries).toContainEqual({ host: 'api.example.test', method: 'POST', path: '/v1/messages', status: 200 })
}, 30_000)
