/**
 * Porte de `ccnmt: packages/provider/src/caCerts.ts` — no es uno de los 18
 * módulos asignados a este pase, pero `mtls.ts` y `proxy.ts` (ambos
 * asignados) lo importan, y en la fuente tampoco es parte de la superficie
 * pública del paquete (no aparece en su `index.ts`). Se porta como soporte
 * interno, mismas 4 exportaciones.
 */

import memoize from 'lodash-es/memoize.js'
import { readEnv } from '@thyrox/config/env/utils'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { hasNodeOption } from './pendingCrossPackageDeps.ts'

/**
 * Carga certificados CA para conexiones TLS.
 *
 * Fijar `ca` en un agente HTTPS reemplaza el almacén de certificados por
 * defecto, así que siempre hay que incluir las CA base (del sistema o las
 * de Mozilla empaquetadas) al devolver algo.
 *
 * `undefined` significa "sin configuración custom" — el runtime aplica su
 * manejo de certificados por defecto.
 */
export const getCACertificates = memoize((): string[] | undefined => {
  const useSystemCA = hasNodeOption('--use-system-ca') || hasNodeOption('--use-openssl-ca')
  const extraCertsPath = readEnv('NODE_EXTRA_CA_CERTS')

  logForDebugging(`CA certs: useSystemCA=${useSystemCA}, extraCertsPath=${extraCertsPath}`)

  if (!useSystemCA && !extraCertsPath) {
    return undefined
  }

  // Carga diferida: node:tls materializa ~150 certificados raíz Mozilla al
  // importarse. La mayoría de los casos caen en el early-return de arriba.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tls = require('tls') as typeof import('tls')

  const certs: string[] = []

  if (useSystemCA) {
    const getCACerts = (
      tls as typeof tls & { getCACertificates?: (type: string) => string[] }
    ).getCACertificates
    const systemCAs = getCACerts?.('system')
    if (systemCAs && systemCAs.length > 0) {
      certs.push(...systemCAs)
      logForDebugging(
        `CA certs: Loaded ${certs.length} system CA certificates (--use-system-ca)`,
      )
    } else if (!getCACerts && !extraCertsPath) {
      logForDebugging(
        'CA certs: --use-system-ca set but system CA API unavailable, deferring to runtime',
      )
      return undefined
    } else {
      certs.push(...tls.rootCertificates)
      logForDebugging(
        `CA certs: Loaded ${certs.length} bundled root certificates as base (--use-system-ca fallback)`,
      )
    }
  } else {
    certs.push(...tls.rootCertificates)
    logForDebugging(`CA certs: Loaded ${certs.length} bundled root certificates as base`)
  }

  if (extraCertsPath) {
    try {
      const extraCert = getFsImplementation().readFileSync(extraCertsPath, {
        encoding: 'utf8',
      })
      certs.push(extraCert)
      logForDebugging(
        `CA certs: Appended extra certificates from NODE_EXTRA_CA_CERTS (${extraCertsPath})`,
      )
    } catch (error) {
      logForDebugging(
        `CA certs: Failed to read NODE_EXTRA_CA_CERTS file (${extraCertsPath}): ${error}`,
        { level: 'error' },
      )
    }
  }

  return certs.length > 0 ? certs : undefined
})

/**
 * Limpia la caché de certificados CA. Llamar cuando cambien las variables
 * de entorno que los afectan (NODE_EXTRA_CA_CERTS, NODE_OPTIONS).
 */
export function clearCACertsCache(): void {
  getCACertificates.cache.clear?.()
  logForDebugging('Cleared CA certificates cache')
}
