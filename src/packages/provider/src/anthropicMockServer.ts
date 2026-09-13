/**
 * Servidor local (loopback) con la forma de la Messages API de Anthropic,
 * para que `AnthropicHttpProvider` le pegue de verdad en pruebas -- via
 * `--connection <id>` cuyo `endpoint` apunte aqui -- en vez de contra
 * `https://api.anthropic.com`. Pedido del ejecutor 2026-09-13, con
 * `OmniRoute/bin/cli/utils/serverHost.mjs` como precedente de forma.
 *
 * `resolveMockServerHost`/`resolveMockServerExposureWarning` son un PORTE
 * fiel de `resolveServerHost`/`resolveExposureWarning` de esa fuente: misma
 * logica, mismo `LOOPBACK_HOSTS`, mismo comportamiento en win32. La UNICA
 * DIVERGENCIA DECLARADA es el nombre de las dos variables de entorno --
 * `THYROX_MOCK_SERVER_HOST` en vez de `OMNIROUTE_SERVER_HOST`,
 * `THYROX_MOCK_SERVER_REQUIRE_API_KEY` en vez de `REQUIRE_API_KEY` -- porque
 * el nombre de la variable es del consumidor, no del mecanismo (DEC-04); el
 * `HOSTNAME` legado de win32 se porta verbatim, sin renombrar, porque ESE
 * nombre es del sistema operativo, no de este arbol.
 *
 * `startAnthropicMockServer` es codigo NUEVO de thyrox -- la fuente no trae
 * un servidor Anthropic-shaped, sólo el resolver de host. Usa `node:http`
 * (sin dependencia nueva): parsea el `POST /v1/messages`, y responde con la
 * forma minima que `AnthropicHttpProvider` sabe leer -- la misma que su
 * propia suite fabrica a mano (`provider.test.ts::respuesta()`): `id`,
 * `model`, `stop_reason`, `content`, `usage`. Sin streaming (SSE): ningun
 * consumidor de este servidor pide `stream: true` todavia -- declarado, no
 * omitido en silencio.
 */
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

type EnvLike = Record<string, string | undefined>

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

/** Porte de `resolveServerHost`. Ver docstring del modulo para la divergencia declarada. */
export function resolveMockServerHost(
  env: EnvLike = process.env,
  runtimePlatform: NodeJS.Platform = process.platform,
  machineHostname = ''
): string {
  if (env.THYROX_MOCK_SERVER_HOST) return env.THYROX_MOCK_SERVER_HOST
  if (runtimePlatform === 'win32' && env.HOSTNAME && env.HOSTNAME !== machineHostname) {
    return env.HOSTNAME
  }
  return '0.0.0.0'
}

/** Porte de `resolveExposureWarning`. Ver docstring del modulo para la divergencia declarada. */
export function resolveMockServerExposureWarning(
  env: EnvLike = process.env,
  host: string = resolveMockServerHost(env)
): string | null {
  if (LOOPBACK_HOSTS.has(host)) return null
  const requireKey = String(env.THYROX_MOCK_SERVER_REQUIRE_API_KEY || '').trim().toLowerCase()
  if (requireKey === 'true' || requireKey === '1' || requireKey === 'yes') return null
  return (
    `SECURITY: listening on ${host} with NO API-key requirement -- the mock ` +
    `Anthropic Messages API is reachable by ANY device that can route to this ` +
    `host. This is a TEST-ONLY server; bind loopback ` +
    '(THYROX_MOCK_SERVER_HOST=127.0.0.1) unless you specifically need the exposure.'
  )
}

/** Una peticion recibida, tal como el servidor la vio -- para que el test la audite. */
export type AnthropicMockRequest = {
  method: string
  path: string
  headers: Record<string, string | string[] | undefined>
  body: unknown
}

export type AnthropicMockServerOptions = {
  host?: string
  port?: number
  /** Personaliza la respuesta por peticion; por defecto un `end_turn` fijo. */
  respond?: (body: unknown, request: AnthropicMockRequest) => Record<string, unknown>
}

export type AnthropicMockServer = {
  host: string
  port: number
  url: string
  /** Cada peticion recibida, en el orden en que llegaron. */
  requests: AnthropicMockRequest[]
  close: () => Promise<void>
}

const DEFAULT_REPLY = (): Record<string, unknown> => ({
  id: 'msg_mock', stop_reason: 'end_turn',
  content: [{ type: 'text', text: 'ok desde el servidor local' }],
  usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
})

function leerCuerpo(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const trozos: Buffer[] = []
    req.on('data', (c: Buffer) => trozos.push(c))
    req.on('end', () => resolve(Buffer.concat(trozos).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Arranca el servidor y resuelve cuando ya esta escuchando -- `port: 0` pide
 * un puerto efimero al SO, evitando la fragilidad de un puerto fijo entre
 * ejecuciones de test concurrentes.
 */
export function startAnthropicMockServer(
  opts: AnthropicMockServerOptions = {}
): Promise<AnthropicMockServer> {
  const requests: AnthropicMockRequest[] = []
  const server: Server = createServer((req, res) => {
    void (async () => {
      const crudo = await leerCuerpo(req)
      let cuerpo: unknown = null
      try {
        cuerpo = crudo ? JSON.parse(crudo) : null
      } catch {
        cuerpo = crudo
      }
      const peticion: AnthropicMockRequest = {
        method: req.method ?? 'GET', path: req.url ?? '/', headers: req.headers, body: cuerpo,
      }
      requests.push(peticion)
      const modeloDelCuerpo = (cuerpo as { model?: string } | null)?.model
      const respuesta = {
        id: 'msg_mock', model: modeloDelCuerpo, ...DEFAULT_REPLY(),
        ...(opts.respond ? opts.respond(cuerpo, peticion) : {}),
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(respuesta))
    })()
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(opts.port ?? 0, opts.host ?? resolveMockServerHost(), () => {
      const direccion = server.address() as AddressInfo
      const host = opts.host ?? resolveMockServerHost()
      resolve({
        host,
        port: direccion.port,
        url: `http://${host}:${direccion.port}`,
        requests,
        close: () => new Promise<void>((res, rej) => server.close((err) => (err ? rej(err) : res()))),
      })
    })
  })
}
