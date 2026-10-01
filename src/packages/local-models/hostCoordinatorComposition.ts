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
import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'
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
import { ResidencyController } from '@thyrox/model-scheduling/residencyController.ts'
import { createPodmanExecutor, type PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import type { ContainerOwner } from '@thyrox/podman-execution/workerContainerLifecycle.ts'

import { freeLoopbackPort } from './loopbackPort.ts'
import type { Environment } from './managedOllama.ts'
import { OllamaRuntimeAdapter } from './ollamaRuntimeAdapter.ts'

export const MODEL_COORDINATOR_OWNER_KIND = 'model-coordinator'
/** La imagen del runtime de cada unidad de Ollama: la versión cuya API pública usa el adapter. */
export const OLLAMA_RUNTIME_IMAGE = 'docker.io/ollama/ollama:0.35.0'
const OLLAMA_CONTAINER_PORT = 11_434
/** Límites de una unidad: RAM holgada para un modelo de hasta ~7B en Q4 sobre CPU. */
const UNIT_LIMITS = { cpus: 2, memoryMib: 8_192, pidsLimit: 256 }
const LEASE_TTL_MS = 10 * 60_000
const GRANT_TTL_MS = 10 * 60_000
/** La salud de una unidad recién creada: hasta un minuto, cada medio segundo. */
const HEALTH = { attempts: 120, intervalMs: 500 }

export type ComposedHostCoordinator = {
  options: HostCoordinatorServiceOptions
  owner: ContainerOwner
}

export type CompositionDependencies = { podman?: PodmanExecutor }

/** En CPU una residencia no reserva VRAM; el runtime es Ollama. */
export function cpuPlacementOf(resolved: ResolvedModel): PlacementDecision {
  void resolved
  return { runtime: 'ollama', placement: { kind: 'cpu' }, residencyVramMib: 0, requestVramMib: 0 }
}

export function composeHostCoordinatorService(env: Environment, thyroxRoot: string, dependencies: CompositionDependencies = {}): ComposedHostCoordinator {
  const coordination = openModelSchedulingCoordination(env)
  // El separador es «.»: `requireValidOwner` rehúsa «@» y el nombre de host sólo usa [A-Za-z0-9.-].
  const owner: ContainerOwner = { kind: MODEL_COORDINATOR_OWNER_KIND, id: `${MODEL_COORDINATOR_OWNER_KIND}.${hostname()}`, pid: process.pid }
  const currentGeneration = (residencyKey: string) => coordination.currentGeneration(residencyKey)
  const artifactCache = localArtifactHome(env, thyroxRoot).artifactCache
  const primitive = new PodmanModelUnitMaterializer({
    podman: dependencies.podman ?? createPodmanExecutor(),
    currentGeneration,
    profiles: { ollama: { image: OLLAMA_RUNTIME_IMAGE, containerPort: OLLAMA_CONTAINER_PORT, environment: { OLLAMA_HOST: `0.0.0.0:${OLLAMA_CONTAINER_PORT}` } } },
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
    runtime: new OllamaRuntimeAdapter({ artifactPath: sha256 => join(artifactCache, `sha256-${sha256}.gguf`), currentGeneration }),
    registry: new ResidencyRegistry(),
    leaseTtlMs: LEASE_TTL_MS,
    health: HEALTH,
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
