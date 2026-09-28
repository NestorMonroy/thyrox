/**
 * La puerta entre los dos modelos de certificado: la hoja autofirmada
 * estática (`generate.ts`: `server.crt`/`server.key`) y la CA persistida que
 * emite una hoja por host (`rootCa.ts`: `ca.crt`/`ca.key`).
 *
 * Una CA de confianza que firma para CUALQUIER host es mucho más poderosa que
 * una hoja de SAN fijos, así que pasar a ella una instalación ya de confianza
 * es una decisión explícita, nunca una mejora silenciosa que dispare (o se
 * salte) una petición de confianza del sistema. Es una función pura: sólo
 * mira qué archivos hay en el directorio que recibe.
 *
 * Porte de `omniroute: src/mitm/cert/migration.ts` (MIT).
 */
import fs from 'node:fs'
import path from 'node:path'

export type CertMigrationDecision = 'use-legacy-leaf' | 'use-root-ca'

/**
 * Qué modelo usa esta ejecución:
 * - una hoja anterior sin CA todavía es una instalación ya de confianza: se
 *   sigue sirviendo la hoja, salvo que se haya optado por la CA
 *   (`rootCaEnabled`);
 * - cualquier otro caso (instalación nueva, u optar por ella) va a la CA, que
 *   `loadOrCreateMitmCa()` genera una vez o carga.
 */
export function decideCertMigration(certDir: string, rootCaEnabled: boolean): CertMigrationDecision {
  if (rootCaEnabled) return 'use-root-ca'
  const hasLegacyLeaf =
    fs.existsSync(path.join(certDir, 'server.crt')) && fs.existsSync(path.join(certDir, 'server.key'))
  const hasCaPair = fs.existsSync(path.join(certDir, 'ca.crt')) && fs.existsSync(path.join(certDir, 'ca.key'))
  if (hasLegacyLeaf && !hasCaPair) return 'use-legacy-leaf'
  return 'use-root-ca'
}
