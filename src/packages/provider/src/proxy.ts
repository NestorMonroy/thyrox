/**
 * Porte COMPLETO de `ccnmt: packages/provider/src/proxy.ts` — sus 13
 * exportaciones, ninguna omitida. Autocontenido salvo `./caCerts.js` y
 * `./mtls.js`, ambos resueltos dentro de este mismo paquete.
 */

import axios, { type AxiosInstance } from 'axios'
import type { LookupOptions } from 'node:dns'
import type { Agent } from 'node:http'
import { HttpsProxyAgent, type HttpsProxyAgentOptions } from 'https-proxy-agent'
import memoize from 'lodash-es/memoize.js'
import type * as undici from 'undici'
import { getAllEnv, isEnvTruthy, readEnv } from '@thyrox/config/env/utils'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getCACertificates } from './internal/caCerts.ts'
import { getMTLSAgent, getMTLSConfig, getTLSFetchOptions, type TLSConfig } from './mtls.ts'

let keepAliveDisabled = false

export function disableKeepAlive(): void {
  keepAliveDisabled = true
}

export function _resetKeepAliveForTesting(): void {
  keepAliveDisabled = false
}

/** Convierte `dns.LookupOptions.family` a un valor numérico de familia. */
export function getAddressFamily(options: LookupOptions): 0 | 4 | 6 {
  switch (options.family) {
    case 0:
    case 4:
    case 6:
      return options.family
    case 'IPv6':
      return 6
    case 'IPv4':
    case undefined:
      return 4
    default:
      throw new Error(`Unsupported address family: ${options.family}`)
  }
}

type EnvLike = Record<string, string | undefined>

/** URL de proxy activa, si hay una configurada (minúscula gana sobre MAYÚSCULA). */
export function getProxyUrl(env: EnvLike = getAllEnv()): string | undefined {
  return env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY
}

/** Valor de NO_PROXY (minúscula gana sobre MAYÚSCULA). */
export function getNoProxy(env: EnvLike = getAllEnv()): string | undefined {
  return env.no_proxy || env.NO_PROXY
}

/** ¿Una URL debe saltarse el proxy según NO_PROXY? */
export function shouldBypassProxy(urlString: string, noProxy: string | undefined = getNoProxy()): boolean {
  if (!noProxy) return false
  if (noProxy === '*') return true

  try {
    const url = new URL(urlString)
    const hostname = url.hostname.toLowerCase()
    const port = url.port || (url.protocol === 'https:' ? '443' : '80')
    const hostWithPort = `${hostname}:${port}`

    const noProxyList = noProxy.split(/[,\s]+/).filter(Boolean)

    return noProxyList.some(rawPattern => {
      const pattern = rawPattern.toLowerCase().trim()
      if (pattern.includes(':')) {
        return hostWithPort === pattern
      }
      if (pattern.startsWith('.')) {
        return hostname === pattern.substring(1) || hostname.endsWith(pattern)
      }
      return hostname === pattern
    })
  } catch {
    return false
  }
}

function createHttpsProxyAgent(
  proxyUrl: string,
  extra: HttpsProxyAgentOptions<string> = {},
): HttpsProxyAgent<string> {
  const mtlsConfig = getMTLSConfig()
  const caCerts = getCACertificates()

  const agentOptions: HttpsProxyAgentOptions<string> = {
    ...(mtlsConfig && {
      cert: mtlsConfig.cert,
      key: mtlsConfig.key,
      passphrase: mtlsConfig.passphrase,
    }),
    ...(caCerts && { ca: caCerts }),
  }

  if (isEnvTruthy(readEnv('CLAUDE_CODE_PROXY_RESOLVES_HOSTS'))) {
    agentOptions.lookup = (hostname, options, callback) => {
      callback(null, hostname, getAddressFamily(options))
    }
  }

  return new HttpsProxyAgent(proxyUrl, { ...agentOptions, ...extra })
}

/** Instancia de axios con su propio agente de proxy. */
export function createAxiosInstance(extra: HttpsProxyAgentOptions<string> = {}): AxiosInstance {
  const proxyUrl = getProxyUrl()
  const mtlsAgent = getMTLSAgent()
  const instance = axios.create({ proxy: false })

  if (!proxyUrl) {
    if (mtlsAgent) instance.defaults.httpsAgent = mtlsAgent
    return instance
  }

  const proxyAgent = createHttpsProxyAgent(proxyUrl, extra)
  instance.interceptors.request.use(config => {
    if (config.url && shouldBypassProxy(config.url)) {
      config.httpsAgent = mtlsAgent
      config.httpAgent = mtlsAgent
    } else {
      config.httpsAgent = proxyAgent
      config.httpAgent = proxyAgent
    }
    return config
  })
  return instance
}

/** Agente de proxy memoizado para la URI dada. */
export const getProxyAgent = memoize((uri: string): undici.Dispatcher => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const undiciMod = require('undici') as typeof undici
  const mtlsConfig = getMTLSConfig()
  const caCerts = getCACertificates()

  const proxyOptions: undici.EnvHttpProxyAgent.Options & {
    requestTls?: {
      cert?: string | Buffer
      key?: string | Buffer
      passphrase?: string
      ca?: string | string[] | Buffer
    }
  } = {
    httpProxy: uri,
    httpsProxy: uri,
    noProxy: readEnv('NO_PROXY') || readEnv('no_proxy'),
  }

  if (mtlsConfig || caCerts) {
    const tlsOpts = {
      ...(mtlsConfig && {
        cert: mtlsConfig.cert,
        key: mtlsConfig.key,
        passphrase: mtlsConfig.passphrase,
      }),
      ...(caCerts && { ca: caCerts }),
    }
    proxyOptions.connect = tlsOpts
    proxyOptions.requestTls = tlsOpts
  }

  return new undiciMod.EnvHttpProxyAgent(proxyOptions)
})

/** Agente HTTP configurado para soporte de proxy en WebSocket. */
export function getWebSocketProxyAgent(url: string): Agent | undefined {
  const proxyUrl = getProxyUrl()
  if (!proxyUrl) return undefined
  if (shouldBypassProxy(url)) return undefined
  return createHttpsProxyAgent(proxyUrl)
}

/** URL de proxy para conexiones WebSocket bajo Bun. */
export function getWebSocketProxyUrl(url: string): string | undefined {
  const proxyUrl = getProxyUrl()
  if (!proxyUrl) return undefined
  if (shouldBypassProxy(url)) return undefined
  return proxyUrl
}

/** Opciones de fetch para el SDK de Anthropic con proxy y mTLS. */
export function getProxyFetchOptions(opts?: { forAnthropicAPI?: boolean }): {
  tls?: TLSConfig
  dispatcher?: undici.Dispatcher
  proxy?: string
  unix?: string
  keepalive?: false
} {
  const base = keepAliveDisabled ? ({ keepalive: false } as const) : {}

  if (opts?.forAnthropicAPI) {
    const unixSocket = readEnv('ANTHROPIC_UNIX_SOCKET')
    if (unixSocket && typeof Bun !== 'undefined') {
      return { ...base, unix: unixSocket }
    }
  }

  const proxyUrl = getProxyUrl()

  if (proxyUrl) {
    if (typeof Bun !== 'undefined') {
      return { ...base, proxy: proxyUrl, ...getTLSFetchOptions() }
    }
    return { ...base, dispatcher: getProxyAgent(proxyUrl) }
  }

  return { ...base, ...getTLSFetchOptions() }
}

let proxyInterceptorId: number | undefined

/** Configura agentes HTTP globales tanto para axios como para undici. */
export function configureGlobalAgents(): void {
  const proxyUrl = getProxyUrl()
  const mtlsAgent = getMTLSAgent()

  if (proxyInterceptorId !== undefined) {
    axios.interceptors.request.eject(proxyInterceptorId)
    proxyInterceptorId = undefined
  }

  axios.defaults.proxy = undefined
  axios.defaults.httpAgent = undefined
  axios.defaults.httpsAgent = undefined

  if (proxyUrl) {
    axios.defaults.proxy = false

    const proxyAgent = createHttpsProxyAgent(proxyUrl)

    proxyInterceptorId = axios.interceptors.request.use(config => {
      if (config.url && shouldBypassProxy(config.url)) {
        if (mtlsAgent) {
          config.httpsAgent = mtlsAgent
          config.httpAgent = mtlsAgent
        } else {
          delete config.httpsAgent
          delete config.httpAgent
        }
      } else {
        config.httpsAgent = proxyAgent
        config.httpAgent = proxyAgent
      }
      return config
    })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ;(require('undici') as typeof undici).setGlobalDispatcher(getProxyAgent(proxyUrl))
  } else if (mtlsAgent) {
    axios.defaults.httpsAgent = mtlsAgent

    const mtlsOptions = getTLSFetchOptions()
    if (mtlsOptions.dispatcher) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ;(require('undici') as typeof undici).setGlobalDispatcher(mtlsOptions.dispatcher)
    }
  }
}

/** Configuración de cliente AWS SDK con soporte de proxy. */
export async function getAWSClientProxyConfig(): Promise<object> {
  const proxyUrl = getProxyUrl()
  if (!proxyUrl) return {}

  const [{ NodeHttpHandler }, { defaultProvider }] = await Promise.all([
    import('@smithy/node-http-handler'),
    import('@aws-sdk/credential-provider-node'),
  ])

  const agent = createHttpsProxyAgent(proxyUrl)
  const requestHandler = new NodeHttpHandler({ httpAgent: agent, httpsAgent: agent })

  return {
    requestHandler,
    credentials: defaultProvider({ clientConfig: { requestHandler } }),
  }
}

/** Limpia la caché de agentes de proxy. */
export function clearProxyCache(): void {
  getProxyAgent.cache.clear?.()
  logForDebugging('Cleared proxy agent cache')
}
