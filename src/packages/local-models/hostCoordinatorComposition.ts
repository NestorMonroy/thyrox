/**
 * El coordinador de model scheduling de un anfitrión, compuesto con las
 * piezas reales (ADR-007 1.14.0, TASK-THYROX-0734): el catálogo local, la
 * primitiva de Podman sobre `@thyrox/podman-execution`, el adapter de
 * Ollama, el ledger de VRAM, el emisor de grants y la coordinación que
 * declara `THYROX_MODEL_SCHEDULING_COORDINATION` (`shared` exige Redis).
 *
 * La colocación es en CPU: este anfitrión no tiene GPU medida
 * (`bin/hardware-inventory`), y una residencia en CPU no reserva VRAM. La
 * colocación en GPU, que pide al `GpuMemoryBackend` la capacidad por
 * dispositivo, es TASK-THYROX-0736.
 *
 * El artefacto tiene que estar ya en la caché local de modelos (la deja
 * `local-models-ensure` o la instalación de un PermanentArtifact): el adapter
 * lo sube al runtime desde ahí y, si falta, la admisión falla en la etapa
 * `prepare` nombrando la ruta.
 */
import { RuntimeAdapterRouter } from '@thyrox/model-scheduling/runtimeAdapterRouter.ts'
import type { ArtifactFormat } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { ModelRuntime } from '@thyrox/model-artifacts/executionGrant.ts'
import { randomUUID } from 'node:crypto'
import { availableParallelism, hostname } from 'node:os'
import { join } from 'node:path'

import { localArtifactHome, localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import type { ResolvedModel } from '@thyrox/model-artifacts/modelResolver.ts'
import { openModelSchedulingCoordination } from '@thyrox/model-scheduling/coordinationFactory.ts'
import { modelCoordinatorSocketPath } from '@thyrox/model-scheduling/coordinatorProtocol.ts'
import { ModelSchedulingCoordinator, type PlacementDecision } from '@thyrox/model-scheduling/hostCoordinator.ts'
import type { HostCoordinatorServiceOptions } from '@thyrox/model-scheduling/hostCoordinatorService.ts'
import { MemoryGrantIssuer } from '@thyrox/model-scheduling/memoryGrantIssuer.ts'
import { createMemoryResidencyVramLedger } from '@thyrox/model-scheduling/memoryVramLedger.ts'
import { PodmanModelUnitMaterializer } from '@thyrox/model-scheduling/podmanModelUnitMaterializer.ts'
import { ResidencyRegistry } from '@thyrox/model-scheduling/residency.ts'
import { ResidencyController, type CpuCapacity, type RamHeadroom } from '@thyrox/model-scheduling/residencyController.ts'
import { createPodmanExecutor, type PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import type { ContainerOwner } from '@thyrox/podman-execution/workerContainerLifecycle.ts'

import { freeLoopbackPort } from './loopbackPort.ts'
import { unitResourceAdmission } from './resourceAdmission.ts'
import type { Environment } from './managedOllama.ts'
import { OllamaRuntimeAdapter } from './ollamaRuntimeAdapter.ts'
import { TransformersRuntimeAdapter } from './transformersRuntimeAdapter.ts'

export const MODEL_COORDINATOR_OWNER_KIND = 'model-coordinator'
/** La imagen del runtime de cada unidad de Ollama: la versión cuya API pública usa el adapter. */
export const OLLAMA_RUNTIME_IMAGE = 'docker.io/ollama/ollama:0.35.0'
/** La imagen del runtime de Transformers (`transformers-runtime/Containerfile`), construida por la primitiva. */
export const TRANSFORMERS_RUNTIME_IMAGE = 'localhost/thyrox-transformers-runtime:dev'
const TRANSFORMERS_CONTAINER_PORT = 8_080
/** Dónde ve la unidad el snapshot concedido, montado de sólo lectura. */
const TRANSFORMERS_MODEL_DIRECTORY = '/model'
const OLLAMA_CONTAINER_PORT = 11_434
/**
 * El entorno de toda unidad de Ollama. `LLAMA_ARG_CACHE_RAM=0` desactiva la
 * caché de prompts en RAM de llama-server: su tope por defecto, 8192 MiB, es el
 * límite entero de la unidad, y guardar un slot de 13 830 tokens (1945 MiB) la
 * mató por OOM (TASK-THYROX-0919). El prefijo de cada turno sigue en la caché KV.
 */
export const OLLAMA_UNIT_ENVIRONMENT: Readonly<Record<string, string>> = {
  OLLAMA_HOST: `0.0.0.0:${OLLAMA_CONTAINER_PORT}`,
  LLAMA_ARG_CACHE_RAM: '0',
}
/** Límites de una unidad: RAM holgada para un modelo de hasta ~7B en Q4 sobre CPU. */
export const UNIT_LIMITS = { cpus: 2, memoryMib: 8_192, pidsLimit: 256 }

/**
 * Las CPUs que las residencias pueden comprometer (TASK-THYROX-0932): las del
 * anfitrión, sin reserva —el plano de control son procesos ligeros y la RAM ya
 * guarda su piso—, a `UNIT_LIMITS.cpus` por unidad.
 */
export function unitCpuCapacity(hostCpus: number): CpuCapacity {
  return { hostCpus, reserveCpus: 0, unitCpus: UNIT_LIMITS.cpus }
}
const LEASE_TTL_MS = 10 * 60_000
const GRANT_TTL_MS = 10 * 60_000
/** La salud de una unidad recién creada: hasta un minuto, cada medio segundo. */
const HEALTH = { attempts: 120, intervalMs: 500 }

export type ComposedHostCoordinator = {
  options: HostCoordinatorServiceOptions
  owner: ContainerOwner
}

export type CompositionDependencies = { podman?: PodmanExecutor; ramHeadroom?: RamHeadroom }

/** El runtime que sirve cada formato de artefacto: el runtime sale del artefacto, no del llamador. */
const RUNTIME_BY_FORMAT: Readonly<Record<ArtifactFormat, ModelRuntime>> = {
  gguf: 'ollama',
  'ollama-registry': 'ollama',
  safetensors: 'transformers',
}

/** En CPU una residencia no reserva VRAM; el runtime es el del formato del artefacto. */
export function cpuPlacementOf(resolved: ResolvedModel): PlacementDecision {
  return { runtime: RUNTIME_BY_FORMAT[resolved.artifact.format], placement: { kind: 'cpu' }, residencyVramMib: 0, requestVramMib: 0 }
}

export function composeHostCoordinatorService(env: Environment, thyroxRoot: string, dependencies: CompositionDependencies = {}): ComposedHostCoordinator {
  const coordination = openModelSchedulingCoordination(env)
  // El separador es «.»: `requireValidOwner` rehúsa «@» y el nombre de host sólo usa [A-Za-z0-9.-].
  const owner: ContainerOwner = { kind: MODEL_COORDINATOR_OWNER_KIND, id: `${MODEL_COORDINATOR_OWNER_KIND}.${hostname()}`, pid: process.pid }
  const currentGeneration = (residencyKey: string) => coordination.currentGeneration(residencyKey)
  const artifactCache = localArtifactHome(env, thyroxRoot).artifactCache
  const podman = dependencies.podman ?? createPodmanExecutor()
  const primitive = new PodmanModelUnitMaterializer({
    podman,
    currentGeneration,
    profiles: {
      ollama: {
        image: OLLAMA_RUNTIME_IMAGE,
        containerPort: OLLAMA_CONTAINER_PORT,
        environment: OLLAMA_UNIT_ENVIRONMENT,
        // Ollama sirve /v1 con su contexto por defecto si el servidor no recibe el del grant.
        grantEnvironment: grant => ({ OLLAMA_CONTEXT_LENGTH: String(grant.contextLength) }),
      },
      transformers: {
        image: TRANSFORMERS_RUNTIME_IMAGE,
        containerPort: TRANSFORMERS_CONTAINER_PORT,
        environment: { THYROX_TRANSFORMERS_MODEL_DIR: TRANSFORMERS_MODEL_DIRECTORY, THYROX_TRANSFORMERS_PORT: String(TRANSFORMERS_CONTAINER_PORT) },
        artifactMount: { hostDirectory: artifact => snapshotDirectory(artifactCache, artifact.artifactId), containerDirectory: TRANSFORMERS_MODEL_DIRECTORY },
      },
    },
    owner,
    limits: UNIT_LIMITS,
    allocatePort: freeLoopbackPort,
    now: () => new Date(),
  })
  const controller = new ResidencyController({
    coordination,
    ledger: createMemoryResidencyVramLedger({ capacityMib: {} }),
    issuer: new MemoryGrantIssuer({ ttlMs: GRANT_TTL_MS, now: () => new Date(), newGrantId: randomUUID }),
    primitive,
    runtime: new RuntimeAdapterRouter({
      ollama: new OllamaRuntimeAdapter({ artifactPath: sha256 => join(artifactCache, `sha256-${sha256}.gguf`), currentGeneration }),
      transformers: new TransformersRuntimeAdapter({ currentGeneration }),
    }),
    registry: new ResidencyRegistry(),
    leaseTtlMs: LEASE_TTL_MS,
    health: HEALTH,
    // La RAM se mide antes de establecer otra residencia, y las ociosas se
    // desalojan si no cabe (H-THYROX-448): la holgura es la de `admit-ram`,
    // medida donde el runtime crea las unidades (H-THYROX-471).
    ramHeadroom: dependencies.ramHeadroom ?? unitResourceAdmission(thyroxRoot, podman),
    // Y la CPU: las unidades vivas más la nueva no pasan de las del anfitrión.
    cpuCapacity: unitCpuCapacity(availableParallelism()),
  })
  const catalogPath = localModelHome(env, thyroxRoot).catalog
  const coordinator = new ModelSchedulingCoordinator({
    catalogEntries: async () => (await loadModelCatalog(catalogPath)).entries(),
    place: cpuPlacementOf,
    controller,
    owner: owner.id,
    newAdmissionId: randomUUID,
  })
  return { owner, options: { socketPath: modelCoordinatorSocketPath(env), primitive, coordinator, coordination } }
}

/** El directorio verificado de un snapshot de safetensors en la caché de artefactos, por su digest de manifiesto. */
export function snapshotDirectory(artifactCache: string, artifactId: string): string {
  return join(artifactCache, `snapshot-${artifactId}`)
}
