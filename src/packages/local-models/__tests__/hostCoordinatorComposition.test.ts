/**
 * La composición del coordinador de un anfitrión con las piezas reales
 * (TASK-THYROX-0734). Qué haría fallar a esta suite: una topología que no
 * salga de `THYROX_MODEL_SCHEDULING_COORDINATION`, una coordinación shared que
 * abra sin Redis, o una colocación en CPU que reserve VRAM.
 */
import { describe, expect, test } from 'bun:test'

import type { ResolvedModel } from '@thyrox/model-artifacts/modelResolver.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import { SharedCoordinationUnavailableError } from '@thyrox/model-scheduling/coordinationFactory.ts'
import { modelCoordinatorSocketPath } from '@thyrox/model-scheduling/coordinatorProtocol.ts'

import { requireValidOwner } from '@thyrox/podman-execution/workerContainerLifecycle.ts'

import { composeHostCoordinatorService, cpuPlacementOf, MODEL_COORDINATOR_OWNER_KIND, OLLAMA_UNIT_ENVIRONMENT, ollamaUnitProfile, UNIT_LIMITS, unitCpuCapacity } from '../hostCoordinatorComposition.ts'

const ROOT = '/nonexistent-thyrox-root'

describe('composeHostCoordinatorService', () => {
  test('con la topología por defecto compone una coordinación local y el socket del hogar de runtime', () => {
    const composed = composeHostCoordinatorService({ THYROX_RUNTIME_DIR: '/run/thyrox' }, ROOT)
    expect(composed.options.coordination.topology).toBe('local')
    expect(composed.options.socketPath).toBe(modelCoordinatorSocketPath({ THYROX_RUNTIME_DIR: '/run/thyrox' }))
    expect(composed.owner.kind).toBe(MODEL_COORDINATOR_OWNER_KIND)
  })

  test('el dueño compuesto pasa la validación de dueño de Podman (sin «@»)', () => {
    const composed = composeHostCoordinatorService({ THYROX_RUNTIME_DIR: '/run/thyrox' }, ROOT)
    expect(() => requireValidOwner(composed.owner)).not.toThrow()
  })

  test('shared sin Redis rehúsa al componer', () => {
    expect(() => composeHostCoordinatorService({ THYROX_MODEL_SCHEDULING_COORDINATION: 'shared' }, ROOT)).toThrow(SharedCoordinationUnavailableError)
  })
})

describe('cpuPlacementOf', () => {
  test('en CPU no reserva VRAM y usa el runtime de Ollama', () => {
    const resolved = { artifact: resolvedArtifact() } as ResolvedModel
    expect(cpuPlacementOf(resolved)).toEqual({ runtime: 'ollama', placement: { kind: 'cpu' }, residencyVramMib: 0, requestVramMib: 0 })
  })
})

describe('cpuPlacementOf por formato del artefacto (TASK-THYROX-0776)', () => {
  test('un GGUF va a Ollama', () => {
    expect(cpuPlacementOf({ artifact: resolvedArtifact() } as ResolvedModel).runtime).toBe('ollama')
  })

  test('un snapshot de safetensors va a Transformers', () => {
    const artifact = { ...resolvedArtifact({ quantization: 'f32' }), format: 'safetensors' as const }
    expect(cpuPlacementOf({ artifact } as ResolvedModel).runtime).toBe('transformers')
  })
})

// TASK-THYROX-0919: llama-server guarda por defecto su caché de prompts en RAM
// con un tope de 8192 MiB, dentro de una unidad de 8192 MiB; al guardar un slot
// de 13 830 tokens (1945 MiB) la unidad murió por OOM. `LLAMA_ARG_CACHE_RAM=0`
// la desactiva (llama-server lee sus argumentos de `LLAMA_ARG_*`).
describe('el entorno de una unidad de Ollama', () => {
  test('desactiva la caché de prompts en RAM de llama-server', () => {
    expect(OLLAMA_UNIT_ENVIRONMENT.LLAMA_ARG_CACHE_RAM).toBe('0')
  })
})

// H-THYROX-471: subir el GGUF por `/api/blobs` dejaba una segunda copia de
// 4.68 GB en la capa escribible de cada unidad, sin dueño declarado. La unidad
// ve el GGUF canónico de la caché, de sólo lectura, como su propio blob.
describe('el artefacto de una unidad de Ollama', () => {
  const profile = ollamaUnitProfile('/cache')
  const artifact = resolvedArtifact({ artifactId: 'a'.repeat(64) })

  test('es el GGUF canónico de la caché montado como blob del almacén de Ollama', () => {
    expect(profile.artifactMount?.hostPath(artifact)).toBe(`/cache/sha256-${'a'.repeat(64)}.gguf`)
    expect(profile.artifactMount?.containerPath(artifact)).toBe(`${OLLAMA_UNIT_ENVIRONMENT.OLLAMA_MODELS}/blobs/sha256-${'a'.repeat(64)}`)
  })

  test('de escritura: Ollama 0.35.0 hace chtimes sobre el blob y de sólo lectura /api/create responde 500', () => {
    expect(profile.artifactMount?.mode).toBe('rw')
  })

  test('el almacén se declara y Ollama no poda al arrancar el blob montado', () => {
    expect(OLLAMA_UNIT_ENVIRONMENT.OLLAMA_MODELS).toMatch(/^\//)
    expect(OLLAMA_UNIT_ENVIRONMENT.OLLAMA_NOPRUNE).toBe('1')
  })
})

describe('la capacidad de CPU del coordinador (TASK-THYROX-0932)', () => {
  test('cada unidad cuenta las CPUs con que se materializa y el anfitrión las suyas', () => {
    expect(unitCpuCapacity(4)).toEqual({ hostCpus: 4, reserveCpus: 0, unitCpus: UNIT_LIMITS.cpus })
  })
})
