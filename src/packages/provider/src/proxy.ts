/**
 * Porte COMPLETO de `ccnmt: packages/provider/src/proxy.ts` — sus 13
 * exportaciones, ninguna omitida. Autocontenido salvo `./caCerts.js` y
 * `./mtls.js`, ambos resueltos dentro de este mismo paquete.
 */

import axios, { type AxiosInstance } from 'axios'
import type { LookupOptions } from 'node:dns'
import { BlockList, isIP } from 'node:net'
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

/**
 * URL de proxy activa, elegida POR PROTOCOLO del destino.
 *
 * Con `targetUrl` declarado, un destino `http://` recibe el proxy de http y
 * uno `https://` el de https. Sin él —que es como los consumidores de hoy la
 * llaman— se conserva la precedencia anterior: https antes que http.
 *
 * `ALL_PROXY` es el respaldo de ambos caminos. No se leía en NINGÚN archivo
 * de este árbol antes de TASK-THYROX-0187 (medido: 0), asi que un entorno
 * que sólo lo declarara salía sin proxy.
 *
 * La forma se adapta de `omniroute: open-sse/utils/proxyFetch.ts:502-526`
 * (MIT). DIVERGENCIA declarada en la precedencia de caja: la referencia pone
 * la MAYÚSCULA primero y aquí gana la minúscula, que es lo que `getNoProxy`
 * ya hace y lo que curl documenta. Cambiarlo alteraría el comportamiento de
 * un entorno que declare las dos con valores distintos.
 *
 * Una `targetUrl` que no parsea cae al camino sin destino en vez de reventar:
 * el llamador pregunta por el proxy, no por la validez de su URL.
 *
 * Un protocolo que no es `https:` toma la cadena de http — el ternario de la
 * referencia, portado. No es un descuido suyo sobre `wss:`: medido quien
 * llama a `resolveEnvProxyUrl` (`proxyFallback.ts:206`, `proxyFetch.ts:552`)
 * y a `resolveProxyForRequest` (`tlsClientProxy.ts:21`, `proxyFetch.ts:779`),
 * su poblacion es la del camino de fetch y TLS; el websocket de la referencia
 * viaja por otro camino (`executors/uc/ws.ts`) y nunca llega al ternario. El
 * eje es «es https», no «es TLS», y esa es la forma, no un efecto colateral.
 * TASK-THYROX-0191.
 */
export function getProxyUrl(
  env: EnvLike = getAllEnv(),
  targetUrl?: string,
): string | undefined {
  const anyProxy = env.all_proxy || env.ALL_PROXY

  if (targetUrl !== undefined) {
    let protocol: string | undefined
    try {
      protocol = new URL(targetUrl).protocol
    } catch {
      protocol = undefined
    }
    if (protocol !== undefined) {
      return protocol === 'https:'
        ? env.https_proxy || env.HTTPS_PROXY || anyProxy
        : env.http_proxy || env.HTTP_PROXY || anyProxy
    }
  }

  return env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY || anyProxy
}

/** Valor de NO_PROXY (minúscula gana sobre MAYÚSCULA). */
export function getNoProxy(env: EnvLike = getAllEnv()): string | undefined {
  return env.no_proxy || env.NO_PROXY
}

/**
 * ¿El nombre de host casa un patrón con comodín?
 *
 * Escaneo lineal, no `RegExp` compuesto: un patrón de `NO_PROXY` es entrada
 * no confiable, y componer una expresión regular desde ella admite ReDoS. La
 * forma se adapta de `omniroute: open-sse/utils/proxyFetch.ts:449` (MIT), que
 * declara esa misma razón en su comentario.
 */
function matchesGlobPattern(hostname: string, pattern: string): boolean {
  const segments = pattern.split('*')
  if (!hostname.startsWith(segments[0]!)) return false

  let cursor = segments[0]!.length
  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index]!
    if (index === segments.length - 1) {
      // El último segmento ancla al final; vacío significa «cualquier cola».
      if (segment === '') return true
      return hostname.endsWith(segment) && hostname.length - segment.length >= cursor
    }
    const found = segment ? hostname.indexOf(segment, cursor) : cursor
    if (found === -1) return false
    cursor = found + segment.length
  }
  return true
}

/**
 * ¿La dirección cae dentro del bloque CIDR declarado?
 *
 * **Divergencia declarada frente a la referencia.** Ni
 * `ccnmt: packages/provider/src/proxy.ts` ni
 * `omniroute: open-sse/utils/proxyFetch.ts:422` leen CIDR: aquélla lo ignora,
 * y ésta cubre los rangos privados con una lista paralela codificada a mano
 * (`isLocalAddress`, `:480`). Esa lista es un segundo significante para el
 * mismo significado y puede divergir de lo que el entorno declaró; aquí se lee
 * el bloque tal como viene en `NO_PROXY`.
 *
 * **Ciega a IPv6.** Un bloque como `fc00::/7` devuelve `false`, no un error:
 * la lista de este entorno declara `::1` y `::` como hosts literales, que el
 * camino de host exacto ya cubre. Su cierre es TASK-THYROX-0188.
 */
/** Retira los corchetes con que una URL envuelve un literal IPv6. */
function stripIpv6Brackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
}

function matchesCidrBlock(hostname: string, pattern: string): boolean {
  const slashAt = pattern.indexOf('/')
  if (slashAt === -1) return false

  const blockAddress = pattern.slice(0, slashAt)
  const prefixLength = Number(pattern.slice(slashAt + 1))
  if (!Number.isInteger(prefixLength) || prefixLength < 0) return false

  // La familia la decide `node:net`, no la forma de la cadena. La referencia
  // que este archivo ya cita —`golang.org/x/net/http/httpproxy`— resuelve el
  // bloque con `net.ParseCIDR`, que cubre las dos familias; `isIP` es su
  // equivalente en este stack y devuelve 4, 6 o 0.
  const blockFamily = isIP(blockAddress)
  const hostFamily = isIP(hostname)
  if (blockFamily === 0 || hostFamily === 0) return false

  const maxPrefix = blockFamily === 4 ? 32 : 128
  if (prefixLength > maxPrefix) return false

  // `BlockList` es el mecanismo de Node para esto, asi que no se escribe una
  // segunda aritmetica de mascara: la de 32 bits que vivia aqui no se podia
  // extender a 128 sin BigInt, y una implementacion propia de la comparacion
  // es una segunda fuente de verdad que nadie mantiene contra el stack.
  //
  // Un bloque IPv4 SI casa una direccion IPv4-mapeada (`::ffff:127.0.0.1`
  // contra `127.0.0.0/8` da true, medido). Es la conducta de `BlockList` y
  // coincide con el `ParseIP().To4()` de la referencia: se adopta, no se
  // corrige.
  const block = new BlockList()
  block.addSubnet(blockAddress, prefixLength, blockFamily === 4 ? 'ipv4' : 'ipv6')
  try {
    return block.check(hostname, hostFamily === 4 ? 'ipv4' : 'ipv6')
  } catch {
    // `check` lanza ante una direccion que `isIP` acepto y el mas no: se lee
    // como «no casa», nunca como «casa», porque el fallo abierto aqui manda
    // trafico fuera del proxy que el operador declaro.
    return false
  }
}

/** ¿Una URL debe saltarse el proxy según NO_PROXY? */
export function shouldBypassProxy(urlString: string, noProxy: string | undefined = getNoProxy()): boolean {
  if (!noProxy) return false
  if (noProxy === '*') return true

  try {
    const url = new URL(urlString)
    // `URL.hostname` CONSERVA los corchetes de un literal IPv6 — medido:
    // `new URL('http://[::1]:8080').hostname` da `'[::1]'`, e `isIP` sobre esa
    // forma devuelve 0. Toda comparacion de IP de aqui abajo trabaja sobre el
    // host desnudo. La idea se adopta de `omniroute: src/shared/network/
    // privateHost.ts::normalizeHost`; su regex vendorizada NO se porta, porque
    // existe alli para esquivar un `node:net` que rompia su bundle de
    // navegador — un problema que este arbol no tiene.
    const hostname = stripIpv6Brackets(url.hostname.toLowerCase())
    const port = url.port || (url.protocol === 'https:' ? '443' : '80')
    const hostWithPort = `${hostname}:${port}`

    const noProxyList = noProxy.split(/[,\s]+/).filter(Boolean)

    return noProxyList.some(rawPattern => {
      const pattern = rawPattern.toLowerCase().trim()

      // El CIDR se resuelve ANTES que el par `host:puerto`: un bloque IPv6
      // lleva dos puntos y la rama de puerto lo leería como un host.
      if (pattern.includes('/')) {
        return matchesCidrBlock(hostname, pattern)
      }
      // Un literal IPv6 desnudo (`::1`, `fd00::1`) lleva dos puntos y la rama
      // de `host:puerto` lo leia como tal: `'::1:8080' === '::1'` es falso, asi
      // que NUNCA casaba. `isIP` separa las dos formas — un `host:puerto` no es
      // una IP valida y da 0.
      if (isIP(pattern) === 6) {
        return hostname === pattern
      }
      if (pattern.includes(':')) {
        return hostWithPort === pattern
      }
      if (pattern.includes('*')) {
        return matchesGlobPattern(hostname, pattern)
      }
      if (pattern.startsWith('.')) {
        return hostname === pattern.substring(1) || hostname.endsWith(pattern)
      }
      // Un patrón desnudo cubre el dominio y todo lo que cuelgue de él, que es
      // la convención de curl y de `golang.org/x/net/http/httpproxy`. La
      // referencia exigía igualdad exacta, así que `example.com` no cubría
      // `api.example.com`: divergencia declarada, no porte parcial.
      return hostname === pattern || hostname.endsWith(`.${pattern}`)
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
