/**
 * El reenviador HTTP del proxy local: lleva una petición ya enrutada
 * (`ForwardRequest`, `./server.ts`) al upstream elegido y devuelve su
 * respuesta sin almacenarla. Es implementación de thyrox y corre sin Mensajes
 * Code instalado: sólo usa el `fetch` de Bun. La referencia de diseño —leída,
 * no importada ni ejecutada— es el upstream `raw` de la pasarela del
 * ejecutable 2.1.283
 * (chunk-wg7ts4cy.js, extracto en
 * `.claude/workbench/omniroute-analysis-20260927T160306/outputs/reflow/`):
 *
 * - `lj`/`aj`: qué cabeceras del cliente pasan (`forwardableRequestHeaders`);
 * - `Mv`: la URL, el user-agent con marca propia, `Hv` (cabeceras
 *   declaradas del upstream) y `applyAuth`;
 * - `Fv`, rama `anthropic`: la autorización por clave o por token OAuth
 *   (`credentialAuth`);
 * - `wj`: el plazo hasta las cabeceras de respuesta, unido a la señal del
 *   cliente;
 * - `gj`/`cj`: qué cabeceras de la respuesta vuelven
 *   (`returnableResponseHeaders`).
 *
 * El material de la credencial se lee con la forma de CLIProxyAPI
 * (`sdk/cliproxy/auth`): la clave en `attributes.api_key`, el token en
 * `metadata.access_token`.
 *
 * Divergencias declaradas, con su razón:
 * - La marca del user-agent es `thyrox-proxy/<versión>`, no
 *   `cc-gateway/<versión>`: el que reenvía es thyrox.
 * - `Kv` (identidad de usuario reenviada) no se porta: el proxy local no
 *   tiene usuarios.
 * - Las ramas de `Fv` por federación de identidad (OIDC) y por proveedor de
 *   nube (`bedrock`, `vertex`, `foundry`) hablan con el SDK del proveedor, no
 *   con HTTP crudo. pendiente: un reenviador por SDK cuando haya un upstream
 *   de nube que servir.
 * - La `baseUrl` se valida con `isSafeUpstreamUrl` en cada petición, no sólo
 *   al cargar la configuración: el reenviador no sabe de dónde vino.
 */
import { OAUTH_BETA } from '../credentials.ts'
import type { ProxyCredential } from './credentialSelectors.ts'
import { isSafeUpstreamUrl } from './netGuards.ts'
import type { ForwardRequest } from './server.ts'

/** `aj`: las cabeceras del cliente que viajan al upstream (más `x-stainless-*`). */
const FORWARDED_REQUEST_HEADERS = new Set([
  'content-type',
  'accept',
  'accept-encoding',
  'anthropic-beta',
  'anthropic-version',
  'user-agent',
])
/** `cj`: las cabeceras de la respuesta que no vuelven al cliente. */
const DROPPED_RESPONSE_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'cf-ray', 'via', 'request-id']
/** Plazo por defecto hasta las cabeceras de respuesta: una hora, como `qs`. */
export const DEFAULT_FIRST_BYTE_TIMEOUT_MS = 3_600_000

export type RawUpstreamEndpoint = { baseUrl: string; headers?: Record<string, string> }

export type HttpForwarderConfig = {
  /** Por nombre de upstream (`GatewayUpstream.name`). */
  upstreams: Record<string, RawUpstreamEndpoint | undefined>
  version: string
  firstByteTimeoutMs?: number
  env?: Record<string, string | undefined>
  fetch?: typeof fetch
}

/** `lj`. */
export function forwardableRequestHeaders(incoming: Headers): Headers {
  const kept = new Headers()
  incoming.forEach((value, name) => {
    const lower = name.toLowerCase()
    if (FORWARDED_REQUEST_HEADERS.has(lower) || lower.startsWith('x-stainless-')) kept.set(name, value)
  })
  return kept
}

/** `gj` con `cj`. */
export function returnableResponseHeaders(upstream: Headers): Headers {
  const kept = new Headers()
  upstream.forEach((value, name) => {
    const lower = name.toLowerCase()
    if (!DROPPED_RESPONSE_HEADERS.includes(lower) && !lower.startsWith('anthropic-ratelimit-')) kept.set(name, value)
  })
  return kept
}

/** El `applyAuth` de `Fv` para un upstream `anthropic`, según el material de la credencial. */
export function credentialAuth(credential: ProxyCredential): (headers: Headers) => void {
  const apiKey = credential.attributes?.api_key
  const token = credential.metadata?.access_token
  return headers => {
    headers.delete('authorization')
    headers.delete('x-api-key')
    if (apiKey) {
      headers.set('x-api-key', apiKey)
    } else if (typeof token === 'string' && token) {
      headers.set('Authorization', `Bearer ${token}`)
      headers.append('anthropic-beta', OAUTH_BETA)
    } else {
      throw new Error(`la credencial "${credential.id}" no trae api_key ni access_token`)
    }
  }
}

/** `Mv` + `wj`: el `forward` que `createProxyHandler` recibe. */
export function createHttpForwarder(config: HttpForwarderConfig): (request: ForwardRequest) => Promise<Response> {
  const send = config.fetch ?? fetch
  const firstByteTimeoutMs = config.firstByteTimeoutMs ?? DEFAULT_FIRST_BYTE_TIMEOUT_MS
  return async request => {
    const endpoint = config.upstreams[request.upstream.name]
    if (!endpoint) throw new Error(`el upstream "${request.upstream.name}" no declara baseUrl`)
    if (!isSafeUpstreamUrl(endpoint.baseUrl, config.env)) {
      throw new Error(`baseUrl insegura para el upstream "${request.upstream.name}"`)
    }
    const url = `${endpoint.baseUrl.replace(/\/$/, '')}${request.path}${request.search}`
    const headers = forwardableRequestHeaders(request.headers)
    const agent = headers.get('user-agent')
    const mark = `thyrox-proxy/${config.version}`
    headers.set('user-agent', agent ? `${agent} ${mark}` : mark)
    for (const [name, value] of Object.entries(endpoint.headers ?? {})) headers.set(name, value)
    credentialAuth(request.credential)(headers)

    const deadline = new AbortController()
    const timer = setTimeout(() => deadline.abort(), firstByteTimeoutMs)
    let upstream: Response
    try {
      upstream = await send(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.body),
        signal: AbortSignal.any([request.signal, deadline.signal]),
      })
    } finally {
      clearTimeout(timer)
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: returnableResponseHeaders(upstream.headers),
    })
  }
}
