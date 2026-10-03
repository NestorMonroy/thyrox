#!/usr/bin/env bun
/**
 * El proxy local con el upstream `claude-cli` como proceso
 * (`bin/provider-local-proxy`).
 *
 *   localProxy --socket <ruta> [--model <id>]... [--cli <ejecutable>]
 *              [--local-model <id>]... [--context-tokens N]
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
 * Con `--local-model <id>` (repetible) sirve además esos modelos del catálogo
 * local por el relé admitido (`src/proxy/openaiCompat/admittedUpstream.ts`):
 * cada petición pide una admisión al coordinador del anfitrión por su socket
 * (`--coordinator-socket`, por defecto el del hogar de runtime) y sólo
 * alcanza el endpoint de la unidad del ticket (ADR-007 1.14.0, M8). Sin
 * coordinador escuchando arranca igual y cada petición responde nombrando el
 * socket que falta. Con `--context-tokens N`, cada admisión pide ese contexto;
 * sin él, el resolver concede el máximo del modelo (A6 r4). La declaración por entorno `THYROX_OPENAI_COMPAT_*` está
 * retirada: declararla rehúsa con exit 2.
 *
 * Sin `claude` y con modelos locales, arranca sirviendo sólo esos: una
 * petición a otro responde 400 nombrando el modelo y que no hay upstream
 * `claude-cli`, en vez del «no lo sirve» genérico del enrutamiento.
 *
 * Imprime `socket=<ruta>` cuando ya escucha y atiende hasta SIGTERM o SIGINT,
 * cuando cierra, borra el socket y sale 0. Sin `claude` ni modelo local
 * rehúsa con exit 2 y no escucha: un proxy sin upstream aceptaría peticiones
 * que no puede atender.
 */
import { randomUUID } from 'node:crypto'
import { CoordinatorUnavailableError, ModelCoordinatorClient } from '@thyrox/model-scheduling/coordinatorClient.ts'
import { modelCoordinatorSocketPath } from '@thyrox/model-scheduling/coordinatorProtocol.ts'
import type { AdmissionRequest, CoordinatorAdmission } from '@thyrox/model-scheduling/hostCoordinator.ts'
import { startCredentialProxy } from '../src/credentialProxy.ts'
import { startAdmittedUpstream, type AdmissionSource, type AdmittedUpstream } from '../src/proxy/openaiCompat/admittedUpstream.ts'
import { startProxyServer } from '../src/proxy/startServer.ts'
import type { GatewayModelEntry, GatewayUpstream } from '../src/proxy/upstreamRouting.ts'

const UPSTREAM_NAME = 'claude-cli'
const LOCAL_UPSTREAM_NAME = 'local-admitted'
const OPENAI_COMPAT_PROVIDER = 'openai-compatible'
const LOCAL_PROXY_CLIENT = 'local-proxy'
const LOOPBACK_HOST = '127.0.0.1'
const ANY_FREE_PORT = 0
const REFUSAL_EXIT_CODE = 2
const INVALID_REQUEST_STATUS = 400
/**
 * La declaración por entorno retirada: un modelo y una base URL, sin admisión (M8). Son los
 * nombres que construían un upstream (`check_model_execution_grant.py`); una credencial de la
 * misma familia no declara nada (`env_sensitivity.tsv` la clasifica `credential`) y su
 * presencia no puede impedir que el proxy sirva modelos locales.
 */
const RETIRED_DECLARATION_NAMES = ['THYROX_OPENAI_COMPAT_BASE_URL', 'THYROX_OPENAI_COMPAT_MODEL'] as const

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

/** `--context-tokens N`: el contexto que el consumidor declaró, para cada admisión; ausente, ninguno. */
function contextTokensArgument(): number | undefined {
  const raw = argument('--context-tokens')
  if (raw === undefined) return undefined
  if (!/^[1-9][0-9]*$/.test(raw)) refuse(`--context-tokens exige un entero positivo de tokens, no: ${raw}`)
  return Number(raw)
}

function refuseRetiredDeclaration(): void {
  const declared = RETIRED_DECLARATION_NAMES.find(name => (process.env[name] ?? '') !== '')
  if (declared) refuse(`${declared} está retirada: un modelo local se sirve con --local-model <nombre-contractual>, por admisión del coordinador`)
}

/**
 * El coordinador del anfitrión como fuente de admisiones: conecta en la
 * primera petición y reconecta si la conexión cayó; sin coordinador, cada
 * admisión lanza `CoordinatorUnavailableError` nombrando el socket.
 */
class CoordinatorAdmissionSource implements AdmissionSource {
  private client: ModelCoordinatorClient | undefined

  constructor(private readonly socketPath: string) {}

  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    try {
      return await (await this.connected()).admit(request)
    } catch (error) {
      this.client = undefined
      if (error instanceof CoordinatorUnavailableError) throw error
      throw new CoordinatorUnavailableError(this.socketPath, error instanceof Error ? error.message : String(error))
    }
  }

  async finish(admissionId: string): Promise<'finished' | 'absent'> {
    return this.client ? this.client.finish(admissionId) : 'absent'
  }

  async close(): Promise<void> {
    await this.client?.close()
  }

  private async connected(): Promise<ModelCoordinatorClient> {
    this.client ??= await ModelCoordinatorClient.connect(this.socketPath)
    return this.client
  }
}

/** Los modelos locales van primero y sólo por el relé admitido: los demás caen a `claude-cli`. */
function localUpstreams(localModels: readonly string[]): GatewayUpstream[] {
  return localModels.length > 0 ? [{ name: LOCAL_UPSTREAM_NAME, provider: OPENAI_COMPAT_PROVIDER, models: [...localModels] }] : []
}

function localModelEntries(localModels: readonly string[]): GatewayModelEntry[] {
  return localModels.map(id => ({ id, upstream_model: { [LOCAL_UPSTREAM_NAME]: id } }))
}

/** El cuerpo de error del formato Anthropic con que el proxy rechaza una petición. */
function invalidRequest(message: string): Response {
  return Response.json({ type: 'error', error: { type: 'invalid_request_error', message } }, { status: INVALID_REQUEST_STATUS })
}

/** El `model` de un cuerpo JSON, o nada si el cuerpo no lo trae: ese rechazo es del servidor. */
function requestedModel(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body)
    const model = typeof parsed === 'object' && parsed !== null ? (parsed as { model?: unknown }).model : undefined
    return typeof model === 'string' ? model : undefined
  } catch {
    return undefined
  }
}

function isUnservedModel(model: string | undefined, localModels: readonly string[]): model is string {
  return model !== undefined && !localModels.some(local => local.toLowerCase() === model.toLowerCase())
}

/**
 * Delante del proxy cuando no hay `claude`: rechaza con su causa la petición
 * a un modelo que no es local y deja pasar el resto tal cual.
 */
function startLocalModelGuard(localModels: readonly string[], upstreamUrl: string): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    hostname: LOOPBACK_HOST,
    port: ANY_FREE_PORT,
    async fetch(request) {
      const url = new URL(request.url)
      const body = request.method === 'POST' ? await request.text() : undefined
      const model = body === undefined ? undefined : requestedModel(body)
      if (isUnservedModel(model, localModels)) {
        return invalidRequest(`el modelo ${model} no tiene upstream: este proxy sólo sirve ${localModels.join(', ')} (${LOCAL_UPSTREAM_NAME}) y no hay upstream ${UPSTREAM_NAME} (sin ejecutable de claude)`)
      }
      // Sin el corte de 300 s del fetch de Bun: detrás hay un modelo local que
      // puede tardar minutos en su primer byte (A6 r7).
      return fetch(`${upstreamUrl}${url.pathname}${url.search}`, { method: request.method, headers: request.headers, body, timeout: false } as RequestInit)
    },
  })
}

refuseRetiredDeclaration()
const socketPath = argument('--socket') ?? refuse('falta --socket <ruta>')
const localModels = repeatedArgument('--local-model')
const contextLength = contextTokensArgument()
const executable = argument('--cli') ?? Bun.which('claude') ?? undefined
if (executable === undefined && localModels.length === 0) refuse('sin ejecutable de claude: declara --cli <ruta> o ponlo en el PATH')
const cliUpstreams = executable === undefined ? [] : [{ name: UPSTREAM_NAME, command: { executable }, cwd: process.cwd() }]
const passthroughModels = executable === undefined ? [] : repeatedArgument('--model')
const { version } = (await Bun.file(new URL('../package.json', import.meta.url)).json()) as { version: string }
// La clave de acceso vive sólo en este proceso: el socket la pone por el
// cliente, y el cliente sólo conoce el marcador.
const accessKey = randomUUID()
const admissionSource = new CoordinatorAdmissionSource(argument('--coordinator-socket') ?? modelCoordinatorSocketPath(process.env))
const admitted: AdmittedUpstream | undefined = localModels.length > 0
  ? startAdmittedUpstream({ source: admissionSource, client: LOCAL_PROXY_CLIENT, newRequestId: randomUUID, contextLength })
  : undefined

const proxy = startProxyServer({
  host: LOOPBACK_HOST,
  port: ANY_FREE_PORT,
  accessKeys: [accessKey],
  routing: {
    upstreams: [...localUpstreams(localModels), ...cliUpstreams.map(({ name }) => ({ name, provider: 'anthropic' }))],
    models: [...localModelEntries(localModels), ...passthroughModels.map(id => ({ id, upstream_model: { [UPSTREAM_NAME]: id } }))],
    auto_include_builtin_models: true,
  },
  endpoints: {},
  credentials: {},
  selector: 'fill-first',
  version,
  env: process.env,
  claudeCli: { upstreams: cliUpstreams },
  openaiCompat: {
    upstreams: admitted ? [{ name: LOCAL_UPSTREAM_NAME, baseUrl: admitted.baseUrl, apiKey: undefined }] : [],
  },
})
// Para el socket, la clave de acceso es «la credencial» que antepone: viaja
// como `x-api-key`, que es lo que `createConfigApiKeyProvider` lee.
const guard = executable === undefined && localModels.length > 0 ? startLocalModelGuard(localModels, proxy.url) : undefined
const tunnel = await startCredentialProxy({
  socketPath,
  upstream: guard ? `http://${LOOPBACK_HOST}:${guard.port}` : proxy.url,
  credential: { source: 'ANTHROPIC_API_KEY', kind: 'api_key', secret: accessKey },
})
// Los manejadores van ANTES de anunciar: el anuncio es la señal de «listo»,
// y quien lo lee puede mandar SIGTERM en seguida.
const stop = (): void => {
  void tunnel.close()
    .then(() => guard?.stop(true))
    .then(() => admitted?.stop())
    .then(() => admissionSource.close())
    .then(() => proxy.stop())
    .then(() => process.exit(0))
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
process.stdout.write(`socket=${tunnel.socketPath}\n`)
