/**
 * El único sitio que dice qué archivo de certificado está activo en esta
 * ejecución: `decideCertMigration()` decide el MODELO, y todo el que necesita
 * la ruta concreta la toma de aquí en vez de recalcularla (y equivocarse con
 * el `server.crt` fijo cuando el modelo ya es la CA).
 *
 * Porte de `omniroute: src/mitm/cert/activeCert.ts` (MIT).
 */
import path from 'node:path'

import { type CertMigrationDecision, decideCertMigration } from './migration.ts'

/** El certificado activo y el modelo que lo produce. */
export interface ActiveCertInfo {
  certPath: string
  mode: CertMigrationDecision
}

/**
 * `ca.crt` con la CA, `server.crt` con la hoja: aritmética de rutas, sin más
 * E/S que las comprobaciones de existencia de `decideCertMigration()`.
 */
export function resolveActiveCertPath(certDir: string, rootCaEnabled: boolean): ActiveCertInfo {
  const mode = decideCertMigration(certDir, rootCaEnabled)
  const certPath = mode === 'use-root-ca' ? path.join(certDir, 'ca.crt') : path.join(certDir, 'server.crt')
  return { certPath, mode }
}
