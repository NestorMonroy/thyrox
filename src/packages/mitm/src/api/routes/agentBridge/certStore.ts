/**
 * El certificado del modelo vigente (la CA o la hoja) y cómo confiar en él:
 * un fallo del entorno devuelve la guía para instalarlo a mano en vez de un
 * error.
 */
import fs from 'node:fs'

import { sanitizeErrorMessage } from '@thyrox/provider/sanitize/errorSanitization'

import { resolveActiveCertPath } from '../../../cert/activeCert.ts'
import { generateCert } from '../../../cert/generate.ts'
import {
  checkCertInstalled,
  installCaCert,
  installCertResult,
  uninstallCert,
  type CertInstallResult,
} from '../../../cert/install.ts'
import type { CertMigrationDecision } from '../../../cert/migration.ts'
import { resolveMitmDataDir } from '../../../dataDir.ts'
import { errorResponse } from '../../http.ts'
import type { SudoRequest } from '../sudoRequest.ts'

export interface ActiveCert {
  certPath: string
  mode: CertMigrationDecision
}

export interface CertStore {
  active(): ActiveCert
  exists(certPath: string): boolean
  /** El PEM, que es texto. */
  read(certPath: string): string
  trusted(certPath: string): Promise<boolean>
  install(password: string, certPath: string, mode: CertMigrationDecision): Promise<CertInstallResult>
  uninstall(password: string, certPath: string): Promise<void>
  generate(force: boolean): Promise<{ cert: string; key: string }>
}

function rootCaEnabled(): boolean {
  return process.env.THYROX_MITM_ROOT_CA_ENABLED === 'true'
}

export const realCertStore: CertStore = {
  active: () => resolveActiveCertPath(resolveMitmDataDir(), rootCaEnabled()),
  exists: certPath => fs.existsSync(certPath),
  read: certPath => fs.readFileSync(certPath, 'utf8'),
  trusted: certPath => checkCertInstalled(certPath),
  install: (password, certPath, mode) =>
    mode === 'use-root-ca' ? installCaCert(password, certPath) : installCertResult(password, certPath),
  uninstall: (password, certPath) => uninstallCert(password, certPath),
  generate: force => generateCert({ force }),
}

export async function trustActiveCert(cert: CertStore, sudo: SudoRequest): Promise<Response> {
  const { certPath, mode } = cert.active()
  if (!cert.exists(certPath)) {
    return errorResponse({ status: 404, message: 'Certificate not found. Generate one first.' })
  }
  const result = await cert.install(sudo.password, certPath, mode)
  if (result.installed) {
    sudo.rememberGiven()
    return Response.json({ ok: true, trusted: await cert.trusted(certPath) })
  }
  if (result.reason === 'canceled') return errorResponse({ status: 409, message: 'User canceled authorization' })
  return Response.json({
    ok: false,
    trusted: false,
    skippable: true,
    reason: result.reason,
    message: sanitizeErrorMessage(result.message ?? 'Certificate install failed'),
    manualGuide: result.manualGuide,
  })
}
