#!/usr/bin/env bun
/**
 * El proxy local con el upstream `claude-cli` como proceso
 * (`bin/provider-local-proxy`).
 *
 *   localProxy --socket <ruta> [--model <id>]... [--cli <ejecutable>]
 *
 * Es la otra mitad del túnel para quien no tiene credencial propia: escucha
 * en `<ruta>` y atiende cada petición lanzando `claude -p` —el del PATH, o el
 * de `--cli`—, que autentica solo con su propia configuración. Quien habla
 * por el socket lleva `ANTHROPIC_UNIX_SOCKET=<ruta>` y el marcador
 * `ssh-placeholder` como credencial (`i1` de 2.1.283); las tools de la
 * petición vuelven al cliente como `tool_use` por el puente MCP
 * (`proxy/claudeCli/forwarder.ts`), así que las ejecuta el bucle del cliente.
 *
 * Compone dos piezas ya existentes: `startProxyServer` (HTTP en loopback, con
 * clave de acceso) y `startCredentialProxy` (el socket Unix), que pone la
 * clave de acceso —aleatoria, de este proceso, nunca publicada— delante de
 * cada petición. Un modelo pasa tal cual sólo si se declaró con `--model`;
 * los del catálogo resuelven por familia.
 *
 * Con `THYROX_OPENAI_COMPAT_BASE_URL` y `THYROX_OPENAI_COMPAT_MODEL`
 * declaradas (y `THYROX_OPENAI_COMPAT_API_KEY` si el servidor la pide),
 * conecta además un upstream compatible con OpenAI
 * (`src/proxy/openaiCompat/`) que sirve sólo ese modelo; los demás siguen a
 * `claude-cli`. Sin declararlas, nada cambia; con una sola, rehúsa con exit 2.
 *
 * Imprime `socket=<ruta>` cuando ya escucha y atiende hasta SIGTERM o SIGINT,
 * cuando cierra, borra el socket y sale 0. Sin `claude` rehúsa con exit 2 y
 * no escucha: un proxy sin ejecutable aceptaría peticiones que no puede
 * atender.
 */
import { randomUUID } from 'node:crypto'
import { startCredentialProxy } from '../src/credentialProxy.ts'
import { openAICompatDeclarationOf, type OpenAICompatDeclaration } from '../src/proxy/openaiCompat/declaration.ts'
import { startProxyServer } from '../src/proxy/startServer.ts'
import type { GatewayModelEntry, GatewayUpstream } from '../src/proxy/upstreamRouting.ts'

const UPSTREAM_NAME = 'claude-cli'
const OPENAI_COMPAT_UPSTREAM_NAME = 'openai-compat'
const OPENAI_COMPAT_PROVIDER = 'openai-compatible'
const LOOPBACK_HOST = '127.0.0.1'
const ANY_FREE_PORT = 0
const REFUSAL_EXIT_CODE = 2

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function repeatedArgument(name: string): string[] {
  return process.argv.flatMap((token, index) => (token === name && process.argv[index + 1] !== undefined ? [process.argv[index + 1] as string] : []))
}

function refuse(message: string): never {
  process.stderr.write(`localProxy: ${message}. NO se escucha.\n`)
  process.exit(REFUSAL_EXIT_CODE)
}

function declarationOrRefuse(): OpenAICompatDeclaration | undefined {
  try {
    return openAICompatDeclarationOf(process.env)
  } catch (error) {
    return refuse(error instanceof Error ? error.message : String(error))
  }
}

/** El upstream abierto va primero y sólo con su modelo: los demás caen a `claude-cli`. */
function openUpstreams(open: OpenAICompatDeclaration | undefined): GatewayUpstream[] {
  return open ? [{ name: OPENAI_COMPAT_UPSTREAM_NAME, provider: OPENAI_COMPAT_PROVIDER, models: [open.model] }] : []
}

function openModels(open: OpenAICompatDeclaration | undefined): GatewayModelEntry[] {
  return open ? [{ id: open.model, upstream_model: { [OPENAI_COMPAT_UPSTREAM_NAME]: open.model } }] : []
}

const openModel = declarationOrRefuse()
const socketPath = argument('--socket') ?? refuse('falta --socket <ruta>')
const executable = argument('--cli') ?? Bun.which('claude') ?? refuse('sin ejecutable de claude: declara --cli <ruta> o ponlo en el PATH')
const passthroughModels = repeatedArgument('--model')
const { version } = (await Bun.file(new URL('../package.json', import.meta.url)).json()) as { version: string }
// La clave de acceso vive sólo en este proceso: el socket la pone por el
// cliente, y el cliente sólo conoce el marcador.
const accessKey = randomUUID()

const proxy = startProxyServer({
  host: LOOPBACK_HOST,
  port: ANY_FREE_PORT,
  accessKeys: [accessKey],
  routing: {
    upstreams: [...openUpstreams(openModel), { name: UPSTREAM_NAME, provider: 'anthropic' }],
    models: [...openModels(openModel), ...passthroughModels.map(id => ({ id, upstream_model: { [UPSTREAM_NAME]: id } }))],
    auto_include_builtin_models: true,
  },
  endpoints: {},
  credentials: {},
  selector: 'fill-first',
  version,
  env: process.env,
  claudeCli: { upstreams: [{ name: UPSTREAM_NAME, command: { executable }, cwd: process.cwd() }] },
  openaiCompat: {
    upstreams: openModel ? [{ name: OPENAI_COMPAT_UPSTREAM_NAME, baseUrl: openModel.baseUrl, apiKey: openModel.apiKey }] : [],
  },
})
// Para el socket, la clave de acceso es «la credencial» que antepone: viaja
// como `x-api-key`, que es lo que `createConfigApiKeyProvider` lee.
const tunnel = await startCredentialProxy({
  socketPath,
  upstream: proxy.url,
  credential: { source: 'ANTHROPIC_API_KEY', kind: 'api_key', secret: accessKey },
})
// Los manejadores van ANTES de anunciar: el anuncio es la señal de «listo»,
// y quien lo lee puede mandar SIGTERM en seguida.
const stop = (): void => {
  void tunnel.close().then(() => proxy.stop()).then(() => process.exit(0))
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
process.stdout.write(`socket=${tunnel.socketPath}\n`)
