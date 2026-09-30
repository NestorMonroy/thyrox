/**
 * Confiar en la CA dinámica del modo TPROXY: se instala en su PROPIO lugar del
 * almacén de Linux (`TPROXY_CA_CERT_NAME`), distinto del del certificado MITM
 * estático, para que instalar o retirar una no pise a la otra.
 *
 * Los comandos privilegiados van por `execFileWithPassword` (arreglos de
 * argumentos, nunca una cadena de shell), y el PEM se deja primero en un
 * temporal que se borra pase lo que pase. Sólo Linux: en otra plataforma
 * instalar lanza y retirar no hace nada. Con `THYROX_MITM_SKIP_SYSTEM_TRUST=1`
 * no se toca el almacén (salvo que una prueba inyecte su ejecutor).
 *
 * Porte de `omniroute: src/mitm/tproxy/caTrust.ts` (MIT).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

import { execFileWithPassword } from '../systemCommands.ts'

export const TPROXY_CA_CERT_NAME = `${PRODUCT_NAME}-tproxy-ca.crt`

const LINUX_CERT_PATHS: ReadonlyArray<{ dir: string; cmd: string }> = [
  { dir: '/usr/local/share/ca-certificates', cmd: 'update-ca-certificates' },
  { dir: '/etc/ca-certificates/trust-source/anchors', cmd: 'update-ca-trust' },
  { dir: '/etc/pki/ca-trust/source/anchors', cmd: 'update-ca-trust' },
  { dir: '/etc/pki/trust/anchors', cmd: 'update-ca-certificates' },
]

export type SudoRunner = (command: string, args: string[], password: string) => Promise<unknown>

export interface CaTrustDeps {
  run: SudoRunner
  writeFile: (filePath: string, data: string) => void
  rmFile: (filePath: string) => void
  tmpDir: () => string
  certConfig: () => { dir: string; cmd: string }
  platform: () => string
}

function detectCertConfig(): { dir: string; cmd: string } {
  return LINUX_CERT_PATHS.find(c => fs.existsSync(c.dir)) ?? LINUX_CERT_PATHS[0]!
}

const realDeps: CaTrustDeps = {
  run: (command, args, password) => execFileWithPassword(command, args, password),
  writeFile: (filePath, data) => fs.writeFileSync(filePath, data, { mode: 0o644 }),
  rmFile: filePath => {
    try {
      fs.unlinkSync(filePath)
    } catch {
      // Ya no estaba.
    }
  },
  tmpDir: () => os.tmpdir(),
  certConfig: detectCertConfig,
  platform: () => process.platform,
}

function skipSystemTrust(deps: Partial<CaTrustDeps>): boolean {
  if (process.env.THYROX_MITM_SKIP_SYSTEM_TRUST !== '1' || deps.run !== undefined) return false
  logForDebugging('[tproxy-ca] THYROX_MITM_SKIP_SYSTEM_TRUST=1 — skipping OS trust-store mutation', { level: 'info' })
  return true
}

/** Deja la CA en su lugar del almacén y lo refresca. */
export async function installTproxyCa(caPem: string, sudoPassword = '', deps: Partial<CaTrustDeps> = {}): Promise<void> {
  if (skipSystemTrust(deps)) return
  const d = { ...realDeps, ...deps }
  if (d.platform() !== 'linux') throw new Error('TPROXY CA trust install is Linux-only.')
  const cfg = d.certConfig()
  const staged = path.join(d.tmpDir(), TPROXY_CA_CERT_NAME)
  const dest = `${cfg.dir}/${TPROXY_CA_CERT_NAME}`
  d.writeFile(staged, caPem)
  try {
    await d.run('sudo', ['-S', 'mkdir', '-p', cfg.dir], sudoPassword)
    await d.run('sudo', ['-S', 'cp', staged, dest], sudoPassword)
    await d.run('sudo', ['-S', cfg.cmd], sudoPassword)
  } finally {
    d.rmFile(staged)
  }
}

/** Retira sólo su lugar del almacén y lo refresca. */
export async function uninstallTproxyCa(sudoPassword = '', deps: Partial<CaTrustDeps> = {}): Promise<void> {
  if (skipSystemTrust(deps)) return
  const d = { ...realDeps, ...deps }
  if (d.platform() !== 'linux') return
  const cfg = d.certConfig()
  await d.run('sudo', ['-S', 'rm', '-f', `${cfg.dir}/${TPROXY_CA_CERT_NAME}`], sudoPassword)
  await d.run('sudo', ['-S', cfg.cmd], sudoPassword)
}
