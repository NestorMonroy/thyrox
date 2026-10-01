/**
 * Dónde escucha el proxy local y con qué clave se entra, declarado en el
 * entorno. El proxy y sus clientes —los handlers MITM— leen la misma
 * declaración, así que ninguno adivina la dirección del otro.
 *
 *   THYROX_PROXY_HOST      host de escucha; por defecto 127.0.0.1
 *   THYROX_PROXY_PORT      puerto; por defecto 20128, el de OmniRoute
 *   THYROX_PROXY_API_KEYS  claves locales separadas por comas
 *
 * Un valor mal formado rehúsa en vez de caer al defecto: caer escucharía en
 * otro sitio del declarado, y el cliente no encontraría al proxy.
 */
import { isLoopbackListenHost } from './netGuards.ts'

export type ProxyEnv = Record<string, string | undefined>

export type ProxyEndpoint = { host: string; port: number; accessKeys: string[] }

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 20128

export function resolveProxyEndpoint(env: ProxyEnv = process.env): ProxyEndpoint {
  const host = env.THYROX_PROXY_HOST?.trim() || DEFAULT_HOST
  if (!isLoopbackListenHost(host)) {
    throw new Error(`THYROX_PROXY_HOST=${host} no es loopback: el proxy lleva las credenciales de sus upstreams`)
  }
  const rawPort = env.THYROX_PROXY_PORT?.trim()
  const port = rawPort ? Number(rawPort) : DEFAULT_PORT
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`THYROX_PROXY_PORT=${rawPort} no es un puerto entre 1 y 65535`)
  }
  const accessKeys = (env.THYROX_PROXY_API_KEYS ?? '').split(',').map(k => k.trim()).filter(Boolean)
  return { host, port, accessKeys }
}

/** La URL base con que un cliente llega al proxy. */
export function proxyBaseUrl(env: ProxyEnv = process.env): string {
  const { host, port } = resolveProxyEndpoint(env)
  return `http://${host.includes(':') ? `[${host}]` : host}:${port}`
}

/** La clave con que un cliente local se presenta: la primera declarada. */
export function proxyClientKey(env: ProxyEnv = process.env): string {
  return resolveProxyEndpoint(env).accessKeys[0] ?? ''
}
