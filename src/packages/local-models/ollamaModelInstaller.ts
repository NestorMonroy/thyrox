/**
 * El adapter de `ModelInstaller` para el Ollama gestionado (TASK-THYROX-0729,
 * ADR-THYROX-007 1.7.x: el adapter traduce, no decide).
 *
 * `install` no habla con Ollama desde el anfitrión: corre
 * `bin/installModel.ts` como trabajo de la primitiva de Podman, con el GGUF
 * montado de sólo lectura, la red del anfitrión (Ollama escucha en su
 * loopback) y ningún secreto. El trabajo deja su veredicto en un archivo del
 * montaje de trabajo; la salida estándar es diagnóstico.
 *
 * La composición pasa por la autorización canónica (clase `maintenance`, con
 * la cita de la tarea que deja el modelo disponible): el instalador no compone
 * un spec ni alcanza ninguna función interna de la primitiva.
 *
 * Que el trabajo diga `installed` no basta: después se vuelve a inspeccionar
 * el runtime, y sólo es `installed` si el nombre resuelve al contenido
 * pedido (H-THYROX-304).
 */
import { mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { runExecution, type ExecutionAuthorization } from '@thyrox/podman-execution/executionAuthorization.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import type { ContainerOwner } from '@thyrox/podman-execution/workerContainerLifecycle.ts'
import type { WorkerResourceProfile } from '@thyrox/podman-execution/workerResourceProfile.ts'

import { managedOllama, type Environment } from './managedOllama.js'
import type { InstallOutcome, InstalledModelState, ModelInstaller, ModelInstallRequest } from './modelInstaller.js'
import { OllamaApi } from './ollamaApi.js'
import { modelBlobOfModelfile } from './volumeBlobs.js'

export const INSTALL_REPORT_NAME = 'install.json'

/** La cita de la tarea que autoriza la instalación; el llamador puede declarar otra. */
export const DEFAULT_INSTALL_TASK_CITATION = 'TASK-THYROX-0729'

const CONTAINER_BUN = '/usr/local/bin/bun'
const CONTAINER_REPOSITORY = '/w'
const CONTAINER_SCRATCH = '/scratch'
const CONTAINER_ARTIFACT = '/artifact/model.gguf'
const INSTALL_ENTRY = `${CONTAINER_REPOSITORY}/src/packages/local-models/bin/installModel.ts`
/** Cola del stderr del trabajo que se conserva como causa de un fallo sin reporte. */
const DIAGNOSTIC_TAIL_CHARS = 400

export interface OllamaModelInstallerOptions {
  readonly podman: PodmanExecutor
  /** Imagen del trabajo, ya resuelta a un ID o digest inmutable. */
  readonly image: string
  readonly bunPath: string
  readonly repositoryRoot: string
  /** Directorio del anfitrión para el reporte del trabajo; se vacía antes y después. */
  readonly scratchDir: string
  /** Entorno declarado del que `managedOllama` lee dónde escucha Ollama. */
  readonly environment: Environment
  readonly owner: ContainerOwner
  readonly workerId: string
  readonly limits: Pick<WorkerResourceProfile, 'cpus' | 'memoryMib' | 'pidsLimit'>
  /** Cita de la tarea que autoriza la instalación; por defecto, la del flujo que deja el modelo disponible. */
  readonly taskCitation?: string
}

/**
 * La instalación compuesta en la autorización canónica: clase `maintenance`
 * con la cita de su tarea, red del anfitrión para alcanzar el Ollama gestionado
 * y los montajes de siempre —intérprete, repositorio y GGUF de sólo lectura,
 * scratch de escritura—. El raíz se declara de sólo lectura: lo que el trabajo
 * escribe vive en el montaje, y HOME y TMPDIR apuntan a él.
 */
export function installAuthorization(options: OllamaModelInstallerOptions, request: ModelInstallRequest): ExecutionAuthorization {
  return {
    executionId: options.workerId,
    reference: { kind: 'task', citation: options.taskCitation ?? DEFAULT_INSTALL_TASK_CITATION },
    owner: options.owner,
    kind: 'maintenance',
    image: options.image,
    command: [
      CONTAINER_BUN, INSTALL_ENTRY,
      '--ollama-url', managedOllama(options.environment).baseUrl,
      '--name', request.name,
      '--artifact', CONTAINER_ARTIFACT,
      '--sha256', request.contentSha256,
      '--report', `${CONTAINER_SCRATCH}/${INSTALL_REPORT_NAME}`,
    ],
    mounts: [
      { source: options.bunPath, destination: CONTAINER_BUN, mode: 'ro' },
      { source: options.repositoryRoot, destination: CONTAINER_REPOSITORY, mode: 'ro' },
      { source: request.artifactPath, destination: CONTAINER_ARTIFACT, mode: 'ro' },
      { source: options.scratchDir, destination: CONTAINER_SCRATCH, mode: 'rw' },
    ],
    resources: options.limits,
    network: 'host',
    readOnlyRootfs: true,
    environment: { HOME: `${CONTAINER_SCRATCH}/home`, TMPDIR: `${CONTAINER_SCRATCH}/tmp` },
  }
}

export class OllamaModelInstaller implements ModelInstaller {
  private readonly api: OllamaApi

  constructor(private readonly options: OllamaModelInstallerOptions) {
    this.api = new OllamaApi(managedOllama(options.environment).baseUrl)
  }

  async inspect(name: string): Promise<InstalledModelState | undefined> {
    const details = await this.api.findModelDetails(name)
    if (details === undefined) return undefined
    return { name, contentSha256: modelBlobOfModelfile(details.modelfile).sha256 }
  }

  async install(request: ModelInstallRequest): Promise<InstallOutcome> {
    const reported = await this.runInstallJob(request)
    if (reported.status === 'failed') return reported
    return this.confirmInstalled(request)
  }

  /** Corre el trabajo y devuelve su reporte; sin reporte legible, `failed` con el diagnóstico. */
  private async runInstallJob(request: ModelInstallRequest): Promise<InstallOutcome> {
    const { scratchDir } = this.options
    await rm(scratchDir, { recursive: true, force: true })
    await Promise.all(['home', 'tmp'].map(name => mkdir(join(scratchDir, name), { recursive: true })))
    try {
      const job = await runExecution(this.options.podman, installAuthorization(this.options, request))
      const report = await readReport(join(scratchDir, INSTALL_REPORT_NAME))
      if (report) return report
      return { status: 'failed', reason: `${job.containerName} salió ${job.exitCode} sin reporte: ${job.stderr.trim().slice(-DIAGNOSTIC_TAIL_CHARS)}` }
    } finally {
      await rm(scratchDir, { recursive: true, force: true })
    }
  }

  /** `/api/create` con 200 no es éxito: el runtime tiene que resolver el nombre al contenido pedido. */
  private async confirmInstalled(request: ModelInstallRequest): Promise<InstallOutcome> {
    const state = await this.inspect(request.name)
    if (state === undefined) return { status: 'failed', reason: `tras instalar, Ollama no resuelve ${request.name}` }
    if (state.contentSha256 !== request.contentSha256) {
      return { status: 'failed', reason: `tras instalar, ${request.name} resuelve sha256 ${state.contentSha256}, no el pedido ${request.contentSha256}` }
    }
    return { status: 'installed' }
  }
}

async function readReport(path: string): Promise<InstallOutcome | undefined> {
  try {
    const report = JSON.parse(await readFile(path, 'utf8')) as unknown
    return isInstallOutcome(report) ? report : undefined
  } catch {
    return undefined
  }
}

function isInstallOutcome(value: unknown): value is InstallOutcome {
  if (typeof value !== 'object' || value === null) return false
  const report = value as { status?: unknown, reason?: unknown }
  return report.status === 'installed' || (report.status === 'failed' && typeof report.reason === 'string')
}
