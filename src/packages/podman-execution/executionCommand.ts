/**
 * La orden `bin/podman-execution-execute`: compone una ExecutionAuthorization desde la línea
 * de comandos y la entrega a la primitiva (ADR-THYROX-007, enmienda 1.16.0).
 *
 * El payload —el comando tras `--`, o el guion leído de stdin con
 * `--script-stdin`— corre dentro de la ExecutionUnit, nunca en el shell que
 * invoca la orden. Esta orden es plano de control: decide qué se autoriza y
 * publica el veredicto.
 *
 * `build-image` construye una imagen por `buildImage` de la primitiva; sus
 * RUN son también ejecución gestionada.
 */

import { appendFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

import { EXECUTION_REFERENCE_LABEL_KEY, runExecution, InvalidExecutionAuthorizationError, TASK_CITATION_PATTERN, type ExecutionAuthorization, type ExecutionKind, type ExecutionReference, type ExecutionSecret } from './executionAuthorization.js'
import { ensureSecretValue } from './resourceMaterialization.js'
import { buildImage, removeImage } from './imageStore.js'
import { inspectContainer, inspectContainerDocument, inspectVolume, listAllImages, listContainers, listVolumes, secretLabels, snapshot, storageInfo } from './podmanObservation.js'
import { retireOrphanedWorkerContainers, type ContainerOwner } from './workerContainerLifecycle.js'
import type { PodmanExecutor } from './podmanExecutor.js'
import type { WorkerMountMode, WorkerNetworkMode, WorkerResourceMount } from './workerResourceProfile.js'

export const DEFAULT_EXECUTION_IMAGE = 'localhost/thyrox-task-runner:dev'
/** Prefijo de los secretos de Podman que una ejecución recibe desde el entorno de quien la pide. */
const EXECUTION_SECRET_PREFIX = 'thyrox-exec-'
export const PROXY_CA_BUILD_PATH = '/etc/ssl/certs/proxy-ca.crt'
const EXECUTION_IMAGE_KEY = 'THYROX_EXEC_IMAGE'
const PROXY_CA_KEY = 'GIT_SSL_CAINFO'
const POOL_OWNER_KIND = 'pool'
const PROXY_KEYS = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'NO_PROXY', 'no_proxy']
const GIT_IDENTITY_KEYS = ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_TERMINAL_PROMPT', 'GIT_EDITOR']
const IMAGE_LIFECYCLE_LABEL = 'io.thyrox.image.lifecycle'
const EXIT_FAILED = 1
const EXIT_USAGE = 2
const DEFAULT_CPUS = 4
const DEFAULT_MEMORY_MIB = 4096
const DEFAULT_PIDS = 4096

export type ExecutionCommandOutput = {
  stdout(text: string): void
  stderr(text: string): void
}

export type ExecutionCommandDeps = {
  env: Readonly<Record<string, string | undefined>>
  readStdin(): Promise<string>
  output: ExecutionCommandOutput
  pid: number
  now(): number
  podman: PodmanExecutor
  repositoryRoot: string
  /** Sonda de vida del PID de un dueño, en el espacio de PIDs del anfitrión. */
  isProcessAlive(pid: number): boolean
}

const USAGE = [
  'uso: podman-execution-execute run (--task TASK-<CAPA>-NNNN | --work CONSUMIDOR:ID) [--owner pool:ID] --kind <tipo> [--image REF] [--network none|host] [--attest ARCHIVO]',
  '                    [--mount ORIGEN[:DESTINO][:ro|rw]]... [--workdir DIR] [--env NOMBRE]...',
  '                    [--cpus N] [--memory-mib N] [--pids N] [--output RUTA]... [--secret-from-env NOMBRE]...',
  '                    (--script-stdin | -- ARGV...)',
  '     podman-execution-execute reconcile-orphans',
  '     podman-execution-execute observe container NOMBRE [--raw] | volume NOMBRE | secret-labels NOMBRE | containers | volumes | images | storage | snapshot',
  '     podman-execution-execute remove-image --task TASK-<CAPA>-NNNN --id ID',
  '     podman-execution-execute build-image (--task TASK-<CAPA>-NNNN | --work CONSUMIDOR:ID) --context DIR --tag TAG [--containerfile F] [--network host] [--lifecycle cache|permanent]',
].join('\n')

class UsageError extends Error {}

function requireValue(value: string | undefined, name: string): string {
  if (!value) throw new UsageError(`falta --${name}`)
  return value
}

function parseCount(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new UsageError(`--${name} debe ser un número > 0, recibido: ${value}`)
  return parsed
}

function isMountMode(value: string | undefined): value is WorkerMountMode {
  return value === 'ro' || value === 'rw'
}

/** `ORIGEN[:DESTINO][:ro|rw]`; sin destino, la misma ruta; sin modo, sólo lectura. */
export function parseMount(text: string): WorkerResourceMount {
  const parts = text.split(':')
  const source = parts[0] ?? ''
  const last = parts[parts.length - 1]
  const mode: WorkerMountMode = parts.length > 1 && isMountMode(last) ? last : 'ro'
  const destination = parts.length > 2 || (parts.length === 2 && !isMountMode(last)) ? (parts[1] ?? source) : source
  if (!source.startsWith('/')) throw new UsageError(`el origen del montaje debe ser absoluto: ${text}`)
  return { source, destination, mode }
}

function forwardedEnvironment(env: ExecutionCommandDeps['env'], keys: readonly string[]): Record<string, string> {
  const forwarded: Record<string, string> = {}
  for (const key of keys) {
    const value = env[key]
    if (value !== undefined) forwarded[key] = value
  }
  return forwarded
}

function requestedEnvironment(env: ExecutionCommandDeps['env'], names: readonly string[]): Record<string, string> {
  const missing = names.filter(name => env[name] === undefined)
  if (missing.length > 0) throw new UsageError(`--env nombra variables ausentes: ${missing.join(', ')}`)
  return forwardedEnvironment(env, names)
}

function proxyEgress(env: ExecutionCommandDeps['env']): { environment: Record<string, string>; mounts: WorkerResourceMount[] } {
  const ca = env[PROXY_CA_KEY]
  const environment = forwardedEnvironment(env, PROXY_KEYS)
  if (!ca) return { environment, mounts: [] }
  return {
    environment: { ...environment, [PROXY_CA_KEY]: ca, SSL_CERT_FILE: ca, NODE_EXTRA_CA_CERTS: ca },
    mounts: [{ source: ca, destination: ca, mode: 'ro' }],
  }
}

function parseNetwork(value: string | undefined): WorkerNetworkMode {
  if (value === undefined || value === 'none' || value === 'host') return value ?? 'none'
  throw new UsageError(`--network admite none o host, recibido: ${value}`)
}

/** Nombre del secreto de Podman que guarda la variable de entorno `name`. */
export function executionSecretName(name: string): string {
  return `${EXECUTION_SECRET_PREFIX}${name.toLowerCase().replace(/_/g, '-')}`
}

/**
 * Convierte cada variable nombrada en un secreto de Podman montado en
 * `/run/secrets/<NOMBRE>`. El valor sale del entorno de quien pide la
 * ejecución y sólo viaja por stdin a la primitiva; nunca entra en argv,
 * en `--env` ni en la salida.
 */
async function materializeSecretsFromEnvironment(deps: ExecutionCommandDeps, names: readonly string[]): Promise<ExecutionSecret[]> {
  const secrets: ExecutionSecret[] = []
  for (const name of names) {
    const secretName = executionSecretName(name)
    await ensureSecretValue(deps, secretName, deps.env[name] as string)
    secrets.push({ name: secretName, target: name })
  }
  return secrets
}

async function runCommand(argv: string[], deps: ExecutionCommandDeps): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      task: { type: 'string' },
      work: { type: 'string' },
      owner: { type: 'string' },
      kind: { type: 'string' },
      image: { type: 'string' },
      network: { type: 'string' },
      mount: { type: 'string', multiple: true },
      workdir: { type: 'string' },
      env: { type: 'string', multiple: true },
      cpus: { type: 'string' },
      'memory-mib': { type: 'string' },
      pids: { type: 'string' },
      output: { type: 'string', multiple: true },
      'script-stdin': { type: 'boolean' },
      'secret-from-env': { type: 'string', multiple: true },
      attest: { type: 'string' },
    },
  })
  const reference = referenceOf(values.task, values.work)
  const kind = requireValue(values.kind, 'kind') as ExecutionKind
  const secretNames = values['secret-from-env'] ?? []
  const missing = secretNames.filter(name => !deps.env[name])
  if (missing.length > 0) throw new UsageError(`credencial ausente: ${missing.join(', ')}`)
  const command = values['script-stdin'] ? ['bash', '-c', await deps.readStdin()] : positionals
  if (command.length === 0) throw new UsageError('falta el payload: --script-stdin o -- ARGV')
  const network = parseNetwork(values.network)
  const egress = network === 'host' ? proxyEgress(deps.env) : { environment: {}, mounts: [] }
  const authorization: ExecutionAuthorization = {
    executionId: `${kind}-${deps.now().toString(36)}-${deps.pid}`,
    reference,
    owner: ownerOf(values.owner, reference, deps.pid),
    kind,
    image: values.image ?? deps.env[EXECUTION_IMAGE_KEY] ?? DEFAULT_EXECUTION_IMAGE,
    command,
    workdir: values.workdir ?? deps.repositoryRoot,
    mounts: [{ source: deps.repositoryRoot, destination: deps.repositoryRoot, mode: 'rw' }, ...egress.mounts, ...(values.mount ?? []).map(parseMount)],
    resources: {
      cpus: parseCount(values.cpus, DEFAULT_CPUS, 'cpus'),
      memoryMib: parseCount(values['memory-mib'], DEFAULT_MEMORY_MIB, 'memory-mib'),
      pidsLimit: parseCount(values.pids, DEFAULT_PIDS, 'pids'),
    },
    network,
    environment: { ...forwardedEnvironment(deps.env, GIT_IDENTITY_KEYS), ...egress.environment, ...requestedEnvironment(deps.env, values.env ?? []) },
    outputs: values.output,
    secrets: await materializeSecretsFromEnvironment(deps, secretNames),
  }
  const result = await runExecution(deps.podman, authorization)
  if (values.attest !== undefined) attestExecution(values.attest, authorization, result)
  deps.output.stdout(result.stdout)
  deps.output.stderr(result.stderr)
  deps.output.stderr(`execution ${result.containerName} kind=${kind} ${referenceText(reference)} exit=${result.exitCode}\n`)
  return result.exitCode
}

/** `--task` o `--work CONSUMIDOR:ID`, uno solo: el consumidor cita su trabajo sin volverlo una TASK de thyrox. */
function referenceOf(task: string | undefined, work: string | undefined): ExecutionReference {
  if ((task === undefined) === (work === undefined)) throw new UsageError('declara --task o --work, uno solo')
  if (task !== undefined) return { kind: 'task', citation: task }
  const separator = work!.indexOf(':')
  if (separator <= 0) throw new UsageError(`--work va CONSUMIDOR:ID, recibido: ${work}`)
  return { kind: 'work', consumer: work!.slice(0, separator), workId: work!.slice(separator + 1) }
}

/** El dueño por defecto es la propia referencia; por línea de orden sólo se declara un dueño `pool`. */
function ownerOf(declared: string | undefined, reference: ExecutionReference, pid: number): ContainerOwner {
  if (declared !== undefined) {
    const [kind, id] = [declared.slice(0, declared.indexOf(':')), declared.slice(declared.indexOf(':') + 1)]
    if (kind !== POOL_OWNER_KIND || !id) throw new UsageError(`--owner va pool:ID, recibido: ${declared}`)
    return { kind: POOL_OWNER_KIND, id, pid }
  }
  if (reference.kind === 'task') return { kind: 'task', id: reference.citation.toLowerCase(), pid }
  if (reference.kind === 'work') return { kind: 'task', id: `${reference.consumer}.${reference.workId}`.replace(/[^A-Za-z0-9_.-]/g, '-'), pid }
  throw new UsageError(`una ejecución por línea de orden no se autoriza por ${reference.kind}`)
}

/** La etiqueta que cita a quién pertenece la imagen: la de hoy para una tarea, la referencia para un consumidor. */
function imageReferenceLabels(reference: ExecutionReference): Record<string, string> {
  if (reference.kind === 'task') return { 'thyrox.task': reference.citation }
  return { [EXECUTION_REFERENCE_LABEL_KEY]: referenceText(reference).replace('=', ':') }
}

function referenceText(reference: ExecutionReference): string {
  return reference.kind === 'task' ? `task=${reference.citation}` : reference.kind === 'work' ? `work=${reference.consumer}:${reference.workId}` : reference.kind
}

/** El nombre con que el primitivo firma lo que materializó; ningún otro escritor lo emite. */
export const PRIMITIVE_MATERIALIZER = 'podman-execution-primitive'

/**
 * Atestación del primitivo: la unidad que ESTE proceso materializó, con el id
 * de contenedor que devolvió `podman create`. Es la mitad del anfitrión de la
 * contención; la otra mitad la escribe el payload desde dentro de su cgroup.
 */
function attestExecution(file: string, authorization: ExecutionAuthorization, result: { containerName: string; containerId: string; exitCode: number }): void {
  const { reference } = authorization
  appendFileSync(file, `${JSON.stringify({
    materializer: PRIMITIVE_MATERIALIZER,
    executionId: authorization.executionId,
    ...(reference.kind === 'task' ? { task: reference.citation } : {}),
    reference: referenceText(reference).replace('=', ':'),
    kind: authorization.kind,
    containerName: result.containerName,
    containerId: result.containerId,
    exitCode: result.exitCode,
    utc: new Date().toISOString(),
  })}\n`)
}

const BUILD_LIFECYCLES = ['cache', 'permanent'] as const

/** El ciclo de vida que declara una construcción: `cache` por defecto; `permanent` sólo para una candidata a publicar. */
function parseLifecycle(value: string | undefined): (typeof BUILD_LIFECYCLES)[number] {
  if (value === undefined) return 'cache'
  const known = BUILD_LIFECYCLES.find(lifecycle => lifecycle === value)
  if (known === undefined) throw new InvalidExecutionAuthorizationError('lifecycle', `ciclo de vida desconocido: ${value} (${BUILD_LIFECYCLES.join(', ')})`)
  return known
}

async function buildImageCommand(argv: string[], deps: ExecutionCommandDeps): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      task: { type: 'string' },
      work: { type: 'string' },
      context: { type: 'string' },
      containerfile: { type: 'string' },
      tag: { type: 'string' },
      network: { type: 'string' },
      lifecycle: { type: 'string' },
    },
  })
  // Un consumidor construye su imagen de ejecución bajo su propia referencia de trabajo.
  const reference = referenceOf(values.task, values.work)
  const network = parseNetwork(values.network)
  const lifecycle = parseLifecycle(values.lifecycle)
  const ca = deps.env[PROXY_CA_KEY]
  const egress = network === 'host'
  const id = await buildImage(deps.podman, {
    context: requireValue(values.context, 'context'),
    containerfile: values.containerfile,
    tag: requireValue(values.tag, 'tag'),
    labels: { ...imageReferenceLabels(reference), [IMAGE_LIFECYCLE_LABEL]: lifecycle },
    network: egress ? 'host' : undefined,
    // El proxy no va como argumento de build: Podman lo grabaría con su valor en
    // la historia de cada RUN. `podman build` reenvía por defecto (--http-proxy)
    // las variables de proxy de su propio entorno a cada RUN sin grabarlas.
    buildArgs: egress && ca ? { PROXY_CA: PROXY_CA_BUILD_PATH } : undefined,
    readOnlyMounts: egress && ca ? [{ source: ca, destination: PROXY_CA_BUILD_PATH }] : undefined,
  })
  deps.output.stdout(`${id}\n`)
  return 0
}

/**
 * Retira las unidades de tarea cuyo dueño —el proceso que pidió la ejecución—
 * ya no vive: si quien espera muere, su unidad queda sin nadie que la recoja.
 * Los contenedores de otros dueños (pool, daemon, laboratorio) tienen su propia
 * política de huérfanos y no se tocan.
 */
async function reconcileOrphansCommand(deps: ExecutionCommandDeps): Promise<number> {
  const lifecycle = { podman: deps.podman, isProcessAlive: deps.isProcessAlive, killProcess: (pid: number, signal: NodeJS.Signals) => { process.kill(pid, signal) } }
  const retired = await retireOrphanedWorkerContainers(lifecycle, ({ owner }) =>
    owner.kind === 'task' && owner.pid !== null && !deps.isProcessAlive(owner.pid))
  for (const retirement of retired) deps.output.stdout(`retirado ${retirement.name} removed=${retirement.removed}\n`)
  deps.output.stdout(`${retired.length} huérfano(s) retirado(s)\n`)
  return retired.every(retirement => retirement.removed) ? 0 : EXIT_FAILED
}

/**
 * Observación de sólo lectura del estado de Podman (P3): el consumidor la pide
 * aquí y nunca emite el verbo de Podman. Imprime JSON; un recurso nombrado que
 * no existe imprime `null` y sale 1.
 */
async function observeCommand(args: string[], deps: ExecutionCommandDeps): Promise<number> {
  const [what, name] = args
  const named = (label: string) => requireValue(name, label)
  const observations: Record<string, () => Promise<unknown>> = {
    container: () => (args.includes('--raw') ? inspectContainerDocument : inspectContainer)(deps.podman, named('container NOMBRE')),
    volume: () => inspectVolume(deps.podman, named('volume NOMBRE')),
    'secret-labels': () => secretLabels(deps.podman, named('secret-labels NOMBRE')),
    containers: () => listContainers(deps.podman),
    volumes: () => listVolumes(deps.podman),
    images: () => listAllImages(deps.podman),
    storage: () => storageInfo(deps.podman),
    snapshot: () => snapshot(deps.podman),
  }
  const observe = what === undefined ? undefined : observations[what]
  if (!observe) throw new UsageError(`observe: qué observar (${Object.keys(observations).join(', ')})`)
  const observed = await observe()
  deps.output.stdout(`${JSON.stringify(observed, null, 1)}\n`)
  return observed === null ? EXIT_FAILED : 0
}

/**
 * Retira una imagen por id, a nombre de una tarea. Rehúsa si algún contenedor,
 * vivo o detenido, la usa: borrarla no es la forma de retirar un contenedor.
 */
async function removeImageCommand(args: string[], deps: ExecutionCommandDeps): Promise<number> {
  const { values } = parseArgs({ args, options: { task: { type: 'string' }, id: { type: 'string' } }, strict: true })
  const task = requireValue(values.task, 'task')
  if (!TASK_CITATION_PATTERN.test(task)) throw new UsageError(`la tarea se cita como TASK-<CAPA>-NNNN, recibido: ${task}`)
  const id = requireValue(values.id, 'id').replace(/^sha256:/, '')
  const users = (await listContainers(deps.podman)).filter(container => container.imageId.replace(/^sha256:/, '').startsWith(id))
  if (users.length > 0) {
    deps.output.stderr(`podman-execution-execute: la imagen ${id} la usan ${users.map(c => c.name).join(', ')}; no se retira\n`)
    return EXIT_USAGE
  }
  await removeImage(deps.podman, id)
  deps.output.stdout(`retirada ${id}\n`)
  return 0
}

/** Despacha la orden; devuelve el código de salida. 2 es uso inválido o autorización rehusada. */
export async function runExecutionCommand(argv: string[], deps: ExecutionCommandDeps): Promise<number> {
  const [subcommand, ...rest] = argv
  try {
    if (subcommand === 'run') return await runCommand(rest, deps)
    if (subcommand === 'build-image') return await buildImageCommand(rest, deps)
    if (subcommand === 'reconcile-orphans') return await reconcileOrphansCommand(deps)
    if (subcommand === 'observe') return await observeCommand(rest, deps)
    if (subcommand === 'remove-image') return await removeImageCommand(rest, deps)
    throw new UsageError(`orden desconocida: ${subcommand ?? '(ninguna)'}`)
  } catch (error) {
    if (error instanceof UsageError) {
      deps.output.stderr(`podman-execution-execute: ${error.message}\n${USAGE}\n`)
      return EXIT_USAGE
    }
    if (error instanceof InvalidExecutionAuthorizationError) {
      deps.output.stderr(`podman-execution-execute: autorización rehusada (${error.field}): ${error.message}\n`)
      return EXIT_USAGE
    }
    deps.output.stderr(`podman-execution-execute: ${error instanceof Error ? error.message : String(error)}\n`)
    return EXIT_FAILED
  }
}
