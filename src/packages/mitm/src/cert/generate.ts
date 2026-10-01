/**
 * La hoja autofirmada estática del modelo anterior, con un SAN por cada host
 * de antigravity: el proxy termina TLS en local para todos ellos, así que un
 * certificado que sólo cubriera el primero rompería la interceptación del
 * resto. La lista sale de `ANTIGRAVITY_TARGET.hosts`, no de una copia.
 *
 * Porte de `omniroute: src/mitm/cert/generate.ts` (MIT). `selfsigned` se
 * importa de forma estática: aquí es una dependencia declarada, no opcional.
 */
import fs from 'node:fs'
import path from 'node:path'

import { logForDebugging } from '@thyrox/local-observability/debug.js'
import selfsigned from 'selfsigned'

import { resolveMitmDataDir } from '../dataDir.ts'
import { ANTIGRAVITY_TARGET } from '../targets/antigravity.ts'

const TARGET_HOSTS: string[] = ANTIGRAVITY_TARGET.hosts
const TARGET_HOST = TARGET_HOSTS[0]!

/**
 * Genera la hoja si no existe. Quien sólo necesita que exista conserva la que
 * hay; `force` la vuelve a emitir, para poder sustituir una hoja vieja a la
 * que le faltan SAN.
 */
export async function generateCert(options?: { force?: boolean }): Promise<{ key: string; cert: string }> {
  const certDir = resolveMitmDataDir()
  const keyPath = path.join(certDir, 'server.key')
  const certPath = path.join(certDir, 'server.crt')

  if (!options?.force && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    logForDebugging('[mitm] el certificado SSL ya existe')
    return { key: keyPath, cert: certPath }
  }
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true })

  const notAfter = new Date()
  notAfter.setFullYear(notAfter.getFullYear() + 1)
  const pems = await selfsigned.generate([{ name: 'commonName', value: TARGET_HOST }], {
    keySize: 2048,
    algorithm: 'sha256',
    notAfterDate: notAfter,
    extensions: [{ name: 'subjectAltName', altNames: TARGET_HOSTS.map(value => ({ type: 2, value })) }],
  })
  fs.writeFileSync(keyPath, pems.private)
  fs.writeFileSync(certPath, pems.cert)
  logForDebugging(`[mitm] certificado SSL generado para ${TARGET_HOSTS.join(', ')}`)
  return { key: keyPath, cert: certPath }
}
