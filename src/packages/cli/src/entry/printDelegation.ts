/**
 * `thyrox -p` sin credencial propia: la máscara pasa por el proxy local.
 *
 * La referencia no delega: sin credencial, el cliente habla con un socket
 * local que la pone —`ANTHROPIC_UNIX_SOCKET` más el marcador
 * `ssh-placeholder` (`i1` y `nRe` de 2.1.283)— y con ese túnel cuenta como
 * autenticado (`NB`). Aquí el socket lo sirve el proxy local con el upstream
 * `claude-cli` (`bin/provider-local-proxy`): `claude -p` autentica solo y
 * las herramientas las ejecuta el bucle de thyrox por el puente. Decisión
 * del ejecutor 2026-09-29: todo pasa por el proxy, nunca por `claude -p`
 * directo. Sin proxy —declarado y ausente, o que no arranca— se rehúsa con
 * causa. Análisis: `.claude/workbench/task-thyrox-0500-local-proxy-route-*`.
 *
 * thyrox no lee ni reenvía ninguna credencial: el proxy es otro proceso, y
 * el `claude` que lanza resuelve la suya.
 */
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseThyroxModelName } from '@thyrox/model-artifacts/modelName.ts'
import type { ConnectionStore } from '@thyrox/provider/accounts/connectionStoreHome'
import { resolveCredential, SSH_PLACEHOLDER, type ReadFd } from '@thyrox/provider/credentials'

type Env = Record<string, string | undefined>

/** El socket de un proxy local que alguien ya levantó (un pool, una sesión). */
export const LOCAL_PROXY_SOCKET_ENV = 'THYROX_LOCAL_PROXY_SOCKET'
/**
 * El contexto, en tokens, que el consumidor declaró para un modelo local
 * (`headless-pool --context-tokens`). Va al proxy como `--context-tokens`, que
 * lo pide en cada admisión; sin él, el resolver concede el máximo del modelo.
 */
export const LOCAL_MODEL_CONTEXT_LENGTH_ENV = 'THYROX_LOCAL_MODEL_CONTEXT_LENGTH'
/**
 * Los respaldos locales del modelo pedido, separados por coma y en orden
 * (`fallbackModels` de la recomendación, TASK-THYROX-0921). Van al proxy como
 * un `--fallback-model` por modelo; el relé avanza por ellos si el pedido no
 * se puede servir.
 */
export const LOCAL_MODEL_FALLBACKS_ENV = 'THYROX_LOCAL_MODEL_FALLBACKS'
/** El lanzador del proxy local por su ruta en el árbol; `bin/provider-local-proxy` es su envoltorio. */
const LOCAL_PROXY_LAUNCHER = fileURLToPath(new URL('../../../provider/bin/localProxy.ts', import.meta.url))
const ANNOUNCEMENT_PREFIX = 'socket='
const DEFAULT_ANNOUNCE_TIMEOUT_MS = 15_000
const DEFAULT_PROVIDER = 'http'
/**
 * La URL base dentro del túnel, porte de `Ae` (chunk-2r9e48vs.js de 2.1.283):
 * con túnel, `http://localhost`; si no, la del servicio. Con `unix`, `fetch`
 * ignora el host pero el esquema sigue decidiendo TLS: medido, `https://`
 * sobre el socket no conecta y `http://` responde.
 */
export const TUNNEL_BASE_URL = 'http://localhost'
/** Las credenciales propias que el túnel sustituye; ninguna viaja por el socket. */
const OWN_CREDENTIAL_VARS = ['ANTHROPIC_AUTH_TOKEN', 'THYROX_CODE_OAUTH_TOKEN', 'THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR']

export type PrintRoute =
  | { kind: 'own'; reason: string }
  | { kind: 'declared-proxy'; socketPath: string }
  | { kind: 'launch-proxy' }

function flagValue(argv: string[], name: string): string | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] as string
    if (a === name) return argv[i + 1]
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1)
  }
  return undefined
}

/** Por dónde habla `thyrox -p` con el modelo: directo, por un proxy declarado, o por uno que hay que levantar. */
export function decidePrintRoute(argv: string[], env: Env, readFd?: ReadFd, store?: ConnectionStore): PrintRoute {
  const provider = flagValue(argv, '--provider') ?? DEFAULT_PROVIDER
  if (provider !== DEFAULT_PROVIDER) return { kind: 'own', reason: `el proveedor ${provider} no usa credencial` }
  if (resolveCredential(env, readFd, store).source !== 'none') return { kind: 'own', reason: 'thyrox tiene credencial propia' }
  const declared = env[LOCAL_PROXY_SOCKET_ENV]?.trim()
  return declared ? { kind: 'declared-proxy', socketPath: declared } : { kind: 'launch-proxy' }
}

/** El entorno con el que el bucle entra al túnel: el socket, el marcador y la URL llana, sin ninguna credencial propia. */
export function tunnelEnv(env: Env, socketPath: string): Env {
  const tunnel: Env = { ...env }
  for (const name of OWN_CREDENTIAL_VARS) delete tunnel[name]
  return { ...tunnel, ANTHROPIC_UNIX_SOCKET: socketPath, ANTHROPIC_API_KEY: SSH_PLACEHOLDER, ANTHROPIC_BASE_URL: TUNNEL_BASE_URL }
}

/** Lo que el lanzamiento lee de un proxy local en marcha: la forma de un `Bun.spawn` con tuberías. */
export type LocalProxyChild = {
  stdout: ReadableStream<Uint8Array>
  stderr: ReadableStream<Uint8Array>
  exited: Promise<number>
  kill: () => void
}

export type SpawnLocalProxy = (argv: string[], options: { env: Env; cwd: string }) => LocalProxyChild

/** Lanza el lanzador real; el stdin no se hereda, porque el proxy no lo lee. */
export const spawnLocalProxy: SpawnLocalProxy = (argv, options) =>
  Bun.spawn([process.execPath, LOCAL_PROXY_LAUNCHER, ...argv], {
    env: options.env as Record<string, string>,
    cwd: options.cwd,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })

export type CredentialEnvironmentOptions = {
  env: Env
  cwd: string
  /**
   * Los modelos que pide la sesión. Uno con nombre contractual del catálogo va
   * como `--local-model`: el proxy lo pide al coordinador (ADR-007 1.14.0, M8);
   * cualquier otro pasa tal cual a `claude-cli` con `--model`.
   */
  models: readonly string[]
  spawn?: SpawnLocalProxy
  announceTimeoutMs?: number
}

/** El entorno del que el proveedor resuelve su credencial, y cómo soltar lo que se levantó para tenerlo. */
export type CredentialEnvironment = { env: Env; close: () => Promise<void> }

type LaunchOutcome =
  | { kind: 'announced'; socketPath: string | undefined }
  | { kind: 'exited'; code: number }
  | { kind: 'timeout' }

/** La ruta anunciada en la primera línea `socket=<ruta>`, o nada si el flujo se cierra antes. */
async function readAnnouncement(stdout: ReadableStream<Uint8Array>): Promise<string | undefined> {
  const reader = stdout.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) return undefined
      buffer += decoder.decode(value, { stream: true })
      const line = buffer.split('\n').find(l => l.startsWith(ANNOUNCEMENT_PREFIX))
      if (line) return line.slice(ANNOUNCEMENT_PREFIX.length)
    }
  } finally {
    reader.releaseLock()
  }
}

function announcedSocket(outcome: LaunchOutcome): string | undefined {
  return outcome.kind === 'announced' ? outcome.socketPath : undefined
}

/** Un modelo del catálogo local entra por admisión; el resto, por `claude-cli`. */
function proxyModelArguments(model: string): string[] {
  return parseThyroxModelName(model) === undefined ? ['--model', model] : ['--local-model', model]
}

/** El contexto declarado pasa tal cual: lo valida el proxy, que rehúsa con su causa. */
function contextArguments(env: Env): string[] {
  const declared = env[LOCAL_MODEL_CONTEXT_LENGTH_ENV]?.trim()
  return declared ? ['--context-tokens', declared] : []
}

/** Los respaldos declarados, en su orden, uno por `--fallback-model`; vacíos o repetidos los descarta el proxy. */
function fallbackArguments(env: Env): string[] {
  const declared = env[LOCAL_MODEL_FALLBACKS_ENV] ?? ''
  return declared.split(',').map(model => model.trim()).filter(model => model !== '').flatMap(model => ['--fallback-model', model])
}

/** Prefijo de lo que el proxy local escribe en stderr una vez anunciado. */
const PROXY_DIAGNOSTIC_PREFIX = 'proxy local: '

/**
 * Reenvía al stderr de thyrox -p, línea a línea, lo que el proxy escribe tras
 * anunciar su socket: el error de un relé es la causa de un turno fallido, y
 * sin leer la tubería se perdía (A6 r2) o podía llenarla y bloquear al proxy.
 */
async function forwardDiagnostics(stderr: ReadableStream<Uint8Array>): Promise<void> {
  const decoder = new TextDecoder()
  let pending = ''
  try {
    for await (const chunk of stderr) {
      pending += decoder.decode(chunk, { stream: true })
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) process.stderr.write(`${PROXY_DIAGNOSTIC_PREFIX}${line}\n`)
    }
  } catch {
    // La tubería se cierra con el proxy: no hay más que reenviar.
  }
  if (pending !== '') process.stderr.write(`${PROXY_DIAGNOSTIC_PREFIX}${pending}\n`)
}

async function launchLocalProxy(options: CredentialEnvironmentOptions): Promise<{ socketPath: string; stop: () => Promise<void> }> {
  const dir = mkdtempSync(join(tmpdir(), 'thyrox-local-proxy-'))
  const requestedSocket = join(dir, 'proxy.sock')
  const spawn = options.spawn ?? spawnLocalProxy
  const argv = ['--socket', requestedSocket, ...options.models.flatMap(proxyModelArguments), ...contextArguments(options.env), ...fallbackArguments(options.env)]
  const child = spawn(argv, { env: options.env, cwd: options.cwd })
  const stop = async (): Promise<void> => {
    child.kill()
    await child.exited
    rmSync(dir, { recursive: true, force: true })
  }
  const timeoutMs = options.announceTimeoutMs ?? DEFAULT_ANNOUNCE_TIMEOUT_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<LaunchOutcome>(resolve => { timer = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs) })
  let outcome: LaunchOutcome
  try {
    outcome = await Promise.race([
      readAnnouncement(child.stdout).then(socketPath => ({ kind: 'announced', socketPath }) as LaunchOutcome),
      child.exited.then(code => ({ kind: 'exited', code }) as LaunchOutcome),
      deadline,
    ])
  } finally {
    clearTimeout(timer)
  }
  const socketPath = announcedSocket(outcome)
  if (socketPath !== undefined) {
    const forwarding = forwardDiagnostics(child.stderr)
    return { socketPath, stop: async () => { await stop(); await forwarding } }
  }
  if (outcome.kind === 'timeout') {
    await stop()
    throw new Error(`el proxy local no anunció el socket en ${timeoutMs} ms`)
  }
  // Salió, o cerró su salida, sin anunciar: el código y el stderr son la causa.
  child.kill()
  const code = await child.exited
  const cause = (await new Response(child.stderr).text()).trim()
  rmSync(dir, { recursive: true, force: true })
  throw new Error(`el proxy local salió con código ${code} antes de anunciar el socket${cause ? `: ${cause}` : ''}`)
}

const NOTHING_TO_CLOSE = async (): Promise<void> => {}

function declaredProxyEnvironment(socketPath: string, env: Env): CredentialEnvironment {
  if (!existsSync(socketPath)) {
    throw new Error(`el proxy local declarado en ${LOCAL_PROXY_SOCKET_ENV} no existe: ${socketPath}`)
  }
  return { env: tunnelEnv(env, socketPath), close: NOTHING_TO_CLOSE }
}

/** Localiza o levanta el proxy local según la ruta; con la propia, el entorno queda como está. */
export async function credentialEnvironmentFor(route: PrintRoute, options: CredentialEnvironmentOptions): Promise<CredentialEnvironment> {
  if (route.kind === 'own') return { env: options.env, close: NOTHING_TO_CLOSE }
  if (route.kind === 'declared-proxy') return declaredProxyEnvironment(route.socketPath, options.env)
  const proxy = await launchLocalProxy(options)
  return { env: tunnelEnv(options.env, proxy.socketPath), close: proxy.stop }
}
