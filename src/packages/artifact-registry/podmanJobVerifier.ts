/**
 * La verificación de un artefacto publicado, ejecutada como trabajo de la
 * primitiva de Podman (ADR-THYROX-007, TASK-THYROX-0728).
 *
 * El trabajo prueba lo que un consumidor externo vería: no monta el
 * almacenamiento de Podman de esta sesión ni recibe credencial alguna. Lee
 * el registry de forma anónima, materializa cada blob en su montaje de
 * trabajo y deja su veredicto en `verification.json` de ese montaje: la
 * salida estándar del contenedor es diagnóstico, no canal de datos.
 *
 * El intérprete se monta de sólo lectura desde el anfitrión, igual que el
 * repositorio, así que la imagen sólo aporta la libc. La composición pasa por
 * la autorización canónica (`registry-operation`, con la cita de su tarea):
 * el verificador no compone por spec ni alcanza ninguna función interna de la
 * primitiva.
 */
import { mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { runExecution, type ExecutionAuthorization } from '@thyrox/podman-execution/executionAuthorization.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import type { ContainerOwner } from '@thyrox/podman-execution/workerContainerLifecycle.ts'
import type { WorkerResourceProfile } from '@thyrox/podman-execution/workerResourceProfile.ts'

import type { ArtifactLocation, PinnedArtifact } from './artifactRegistry.js'
import type { ArtifactVerifier, VerificationOutcome } from './artifactVerifier.js'
import { jobNetworkProfile, type JobEgress } from './jobEgress.js'

export const VERIFICATION_REPORT_NAME = 'verification.json'

/** La cita de la tarea que autoriza la operación de registry; el llamador puede declarar otra. */
export const DEFAULT_VERIFICATION_TASK_CITATION = 'TASK-THYROX-0728'

const CONTAINER_BUN = '/usr/local/bin/bun'
const CONTAINER_REPOSITORY = '/w'
const CONTAINER_SCRATCH = '/scratch'
const VERIFY_ENTRY = `${CONTAINER_REPOSITORY}/src/packages/artifact-registry/bin/verifyArtifact.ts`

export interface PodmanJobVerifierOptions {
  readonly podman: PodmanExecutor
  /** Imagen del trabajo, ya resuelta a un ID o digest inmutable. */
  readonly image: string
  readonly bunPath: string
  readonly repositoryRoot: string
  /** Directorio del anfitrión donde el trabajo materializa blobs; su disco lo admitió el llamador. */
  readonly scratchDir: string
  readonly registryUrl: string
  readonly egress: JobEgress
  readonly owner: ContainerOwner
  readonly workerId: string
  readonly limits: Pick<WorkerResourceProfile, 'cpus' | 'memoryMib' | 'pidsLimit'>
  /** Cita de la tarea que autoriza la verificación; por defecto, la del flujo que la define. */
  readonly taskCitation?: string
}

/**
 * La verificación compuesta en la autorización canónica: clase
 * `registry-operation` con la cita de su tarea, la red que decide el egress y
 * los montajes de siempre —intérprete y repositorio de sólo lectura, scratch
 * de escritura—. El raíz se declara de sólo lectura: lo que el trabajo escribe
 * vive en el montaje, y HOME y TMPDIR apuntan a él para que no necesite
 * escribir en la imagen.
 */
export function verificationAuthorization(options: PodmanJobVerifierOptions, pinned: PinnedArtifact, location: ArtifactLocation): ExecutionAuthorization {
  const network = jobNetworkProfile(options.egress)
  return {
    executionId: options.workerId,
    reference: { kind: 'task', citation: options.taskCitation ?? DEFAULT_VERIFICATION_TASK_CITATION },
    owner: options.owner,
    kind: 'registry-operation',
    image: options.image,
    command: [
      CONTAINER_BUN, VERIFY_ENTRY,
      '--registry', options.registryUrl,
      '--repository', location.repository,
      '--tag', location.tag,
      '--digest', pinned.digest,
      '--work-dir', `${CONTAINER_SCRATCH}/blobs`,
      '--report', `${CONTAINER_SCRATCH}/${VERIFICATION_REPORT_NAME}`,
    ],
    mounts: [
      { source: options.bunPath, destination: CONTAINER_BUN, mode: 'ro' },
      { source: options.repositoryRoot, destination: CONTAINER_REPOSITORY, mode: 'ro' },
      { source: options.scratchDir, destination: CONTAINER_SCRATCH, mode: 'rw' },
      ...network.mounts,
    ],
    resources: options.limits,
    network: network.network,
    readOnlyRootfs: true,
    environment: { ...network.environment, HOME: `${CONTAINER_SCRATCH}/home`, TMPDIR: `${CONTAINER_SCRATCH}/tmp` },
  }
}

async function readReport(path: string): Promise<VerificationOutcome | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as VerificationOutcome
  } catch {
    return undefined
  }
}

export function createPodmanJobVerifier(options: PodmanJobVerifierOptions): ArtifactVerifier {
  return {
    async verify(pinned, location) {
      await rm(options.scratchDir, { recursive: true, force: true })
      await Promise.all(['home', 'tmp'].map(name => mkdir(join(options.scratchDir, name), { recursive: true })))
      try {
        const job = await runExecution(options.podman, verificationAuthorization(options, pinned, location))
        const report = await readReport(join(options.scratchDir, VERIFICATION_REPORT_NAME))
        if (report) return report
        return {
          status: 'unverified',
          result: { status: 'job_failed', exitCode: job.exitCode, detail: `${job.containerName} no dejó veredicto: ${job.stderr.trim().slice(-400)}` },
        }
      } finally {
        await rm(options.scratchDir, { recursive: true, force: true })
      }
    },
  }
}
