/**
 * El `ArtifactFetcher` de producción (ADR-THYROX-007, TASK-THYROX-0729): baja
 * la capa GGUF de un artefacto fijado corriendo
 * `@thyrox/artifact-registry/bin/fetchLayer.ts` como trabajo de la primitiva
 * de Podman.
 *
 * El trabajo lee el registry de forma anónima: no recibe secreto ni el
 * almacenamiento de Podman de esta sesión. Monta de sólo lectura `bun` y el
 * repositorio, y de lectura y escritura sólo el directorio de `destination`,
 * donde deja el parcial; verificarlo contra el catálogo y publicarlo es de
 * `materializeArtifact`. Su resultado lo deja en `fetch.json` de un montaje de
 * trabajo propio, que se borra al terminar: la salida estándar es diagnóstico.
 *
 * Un límite del provider, una capa ajena al manifest o un blob corrupto llegan
 * como reporte y se devuelven como `failed` con su causa: nunca como contenido.
 */
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'

import type { ArtifactResult, MaterializedFile } from '@thyrox/artifact-registry/artifactRegistry.ts'
import { DOCKER_HUB_REGISTRY_URL, dockerHubRepository } from '@thyrox/artifact-registry/dockerHubArtifactRegistry.ts'
import { jobNetworkProfile, type JobEgress } from '@thyrox/artifact-registry/jobEgress.ts'
import { registryBaseUrl } from '@thyrox/artifact-registry/publishCommand.ts'
import type { PinnedModelArtifact } from '@thyrox/model-artifacts/modelArtifactResolver.ts'
import { ContainerRunError, runJobWithOutput } from '@thyrox/podman-execution/containerRun.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import type { ContainerOwner, WorkerContainerSpec } from '@thyrox/podman-execution/workerContainerLifecycle.ts'
import { workerResourceLimitArgv, type WorkerResourceProfile } from '@thyrox/podman-execution/workerResourceProfile.ts'

import type { ArtifactFetcher, FetchOutcome } from './modelArtifactCache.js'

export const FETCH_REPORT_NAME = 'fetch.json'

const CONTAINER_BUN = '/usr/local/bin/bun'
const CONTAINER_REPOSITORY = '/w'
const CONTAINER_DESTINATION = '/destination'
const CONTAINER_SCRATCH = '/scratch'
const FETCH_ENTRY = `${CONTAINER_REPOSITORY}/src/packages/artifact-registry/bin/fetchLayer.ts`
const SCRATCH_PREFIX = 'artifact-fetch-'
/** Cuánto del final del stderr del trabajo acompaña a un fallo sin reporte. */
const DIAGNOSTIC_TAIL_CHARS = 400

export interface PodmanArtifactFetcherOptions {
  readonly podman: PodmanExecutor
  /** Imagen del trabajo, ya resuelta a un ID o digest inmutable. */
  readonly image: string
  readonly bunPath: string
  readonly repositoryRoot: string
  /** La salida de red declarada (`resolveJobEgress`). */
  readonly egress: JobEgress
  readonly owner: ContainerOwner
  readonly workerId: string
  readonly limits: Pick<WorkerResourceProfile, 'cpus' | 'memoryMib' | 'pidsLimit'>
  /** La URL de la API de distribución de un registry declarado por host; sin declarar, `registryBaseUrl`. */
  readonly registryUrlOf?: (registry: string) => string
}

type FetchReport = ArtifactResult<MaterializedFile>

/** Un repositorio de Docker Hub sin usuario vive bajo `library/`; en otro registry se usa tal cual. */
function repositoryFor(registryUrl: string, repository: string): string {
  return registryUrl === DOCKER_HUB_REGISTRY_URL ? dockerHubRepository(repository) : repository
}

export function fetchJobSpec(options: PodmanArtifactFetcherOptions, pinned: PinnedModelArtifact, destination: string, scratchDir: string): WorkerContainerSpec {
  const registryUrl = (options.registryUrlOf ?? registryBaseUrl)(pinned.registry)
  const network = jobNetworkProfile(options.egress)
  const profile: WorkerResourceProfile = {
    ...options.limits,
    network: network.network,
    environment: { ...network.environment, HOME: `${CONTAINER_SCRATCH}/home`, TMPDIR: `${CONTAINER_SCRATCH}/tmp` },
    readOnlyRootfs: true,
    mounts: [
      { source: options.bunPath, destination: CONTAINER_BUN, mode: 'ro' },
      { source: options.repositoryRoot, destination: CONTAINER_REPOSITORY, mode: 'ro' },
      { source: dirname(destination), destination: CONTAINER_DESTINATION, mode: 'rw' },
      { source: scratchDir, destination: CONTAINER_SCRATCH, mode: 'rw' },
      ...network.mounts,
    ],
  }
  return {
    workerId: options.workerId,
    image: options.image,
    owner: options.owner,
    resourceArgv: workerResourceLimitArgv(profile),
    command: [
      CONTAINER_BUN, FETCH_ENTRY,
      '--registry', registryUrl,
      '--repository', repositoryFor(registryUrl, pinned.repository),
      '--manifest-digest', pinned.manifestDigest,
      '--layer-digest', pinned.blobDigest,
      '--destination', `${CONTAINER_DESTINATION}/${basename(destination)}`,
      '--report', `${CONTAINER_SCRATCH}/${FETCH_REPORT_NAME}`,
    ],
  }
}

async function readReport(path: string): Promise<FetchReport | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as FetchReport
  } catch {
    return undefined
  }
}

/** La causa de un fallo del puerto, con los números del límite si el provider los dio. */
function failureReason(report: Exclude<FetchReport, { status: 'success' }>): string {
  if (report.status === 'rate_limited') return `rate_limited: ${report.detail} ${JSON.stringify(report.rateLimit)}`
  return `${report.status}: ${report.detail}`
}

function outcomeOf(report: FetchReport): FetchOutcome {
  return report.status === 'success' ? { status: 'fetched' } : { status: 'failed', reason: failureReason(report) }
}

async function runFetchJob(options: PodmanArtifactFetcherOptions, pinned: PinnedModelArtifact, destination: string, scratchDir: string): Promise<FetchOutcome> {
  try {
    const job = await runJobWithOutput(options.podman, fetchJobSpec(options, pinned, destination, scratchDir))
    const report = await readReport(join(scratchDir, FETCH_REPORT_NAME))
    if (report) return outcomeOf(report)
    return { status: 'failed', reason: `${job.containerName} salió con ${job.exitCode} sin reporte: ${job.stderr.trim().slice(-DIAGNOSTIC_TAIL_CHARS)}` }
  } catch (error) {
    if (error instanceof ContainerRunError) return { status: 'failed', reason: error.message }
    throw error
  }
}

export function createPodmanArtifactFetcher(options: PodmanArtifactFetcherOptions): ArtifactFetcher {
  return {
    async fetch(pinned, destination) {
      await mkdir(dirname(destination), { recursive: true })
      const scratchDir = await mkdtemp(join(tmpdir(), SCRATCH_PREFIX))
      try {
        await Promise.all(['home', 'tmp'].map(name => mkdir(join(scratchDir, name))))
        return await runFetchJob(options, pinned, destination, scratchDir)
      } finally {
        await rm(scratchDir, { recursive: true, force: true })
      }
    },
  }
}
