/**
 * Porte COMPLETO de `ccnmt: packages/provider/src/mtls.ts` — sus 6
 * exportaciones, ninguna omitida.
 *
 * `./caCerts.js` de la fuente → `internal/caCerts.ts` (soporte interno, no
 * asignado a este pase; ver su cabecera).
 */

import type * as https from 'node:https'
import { Agent as HttpsAgent } from 'node:https'
import memoize from 'lodash-es/memoize.js'
import type * as tls from 'node:tls'
import type * as undici from 'undici'
import { readEnv } from '@thyrox/config/env/utils'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { getCACertificates } from './internal/caCerts.ts'

export type MTLSConfig = {
  cert?: string
  key?: string
  passphrase?: string
}

export type TLSConfig = MTLSConfig & {
  ca?: string | string[] | Buffer
}

/** Configuración mTLS desde variables de entorno. */
export const getMTLSConfig = memoize((): MTLSConfig | undefined => {
  const config: MTLSConfig = {}

  const certPath = readEnv('CLAUDE_CODE_CLIENT_CERT')
  if (certPath) {
    try {
      config.cert = getFsImplementation().readFileSync(certPath, { encoding: 'utf8' })
      logForDebugging('mTLS: Loaded client certificate from CLAUDE_CODE_CLIENT_CERT')
    } catch (error) {
      logForDebugging(`mTLS: Failed to load client certificate: ${error}`, { level: 'error' })
    }
  }

  const keyPath = readEnv('CLAUDE_CODE_CLIENT_KEY')
  if (keyPath) {
    try {
      config.key = getFsImplementation().readFileSync(keyPath, { encoding: 'utf8' })
      logForDebugging('mTLS: Loaded client key from CLAUDE_CODE_CLIENT_KEY')
    } catch (error) {
      logForDebugging(`mTLS: Failed to load client key: ${error}`, { level: 'error' })
    }
  }

  const passphrase = readEnv('CLAUDE_CODE_CLIENT_KEY_PASSPHRASE')
  if (passphrase) {
    config.passphrase = passphrase
    logForDebugging('mTLS: Using client key passphrase')
  }

  if (Object.keys(config).length === 0) return undefined
  return config
})

/** Agente HTTPS con configuración mTLS. */
export const getMTLSAgent = memoize((): HttpsAgent | undefined => {
  const mtlsConfig = getMTLSConfig()
  const caCerts = getCACertificates()

  if (!mtlsConfig && !caCerts) return undefined

  const agentOptions: https.AgentOptions = {
    ...mtlsConfig,
    ...(caCerts && { ca: caCerts }),
    keepAlive: true,
  }

  logForDebugging('mTLS: Creating HTTPS agent with custom certificates')
  return new HttpsAgent(agentOptions)
})

/** Opciones TLS para conexiones WebSocket. */
export function getWebSocketTLSOptions(): tls.ConnectionOptions | undefined {
  const mtlsConfig = getMTLSConfig()
  const caCerts = getCACertificates()
  if (!mtlsConfig && !caCerts) return undefined
  return { ...mtlsConfig, ...(caCerts && { ca: caCerts }) }
}

/** Opciones de fetch con configuración TLS (mTLS + CA certs) para undici. */
export function getTLSFetchOptions(): {
  tls?: TLSConfig
  dispatcher?: undici.Dispatcher
} {
  const mtlsConfig = getMTLSConfig()
  const caCerts = getCACertificates()

  if (!mtlsConfig && !caCerts) return {}

  const tlsConfig: TLSConfig = { ...mtlsConfig, ...(caCerts && { ca: caCerts }) }

  if (typeof Bun !== 'undefined') {
    return { tls: tlsConfig }
  }
  logForDebugging('TLS: Created undici agent with custom certificates')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const undiciMod = require('undici') as typeof undici
  const agent = new undiciMod.Agent({
    connect: {
      cert: tlsConfig.cert,
      key: tlsConfig.key,
      passphrase: tlsConfig.passphrase,
      ...(tlsConfig.ca && { ca: tlsConfig.ca }),
    },
    pipelining: 1,
  })

  return { dispatcher: agent }
}

/** Limpia la caché de configuración mTLS. */
export function clearMTLSCache(): void {
  getMTLSConfig.cache.clear?.()
  getMTLSAgent.cache.clear?.()
  logForDebugging('Cleared mTLS configuration cache')
}

/** Configura settings TLS globales de Node.js. */
export function configureGlobalMTLS(): void {
  const mtlsConfig = getMTLSConfig()
  if (!mtlsConfig) return

  if (readEnv('NODE_EXTRA_CA_CERTS')) {
    logForDebugging('NODE_EXTRA_CA_CERTS detected - Node.js will automatically append to built-in CAs')
  }
}
