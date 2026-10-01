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

import { composeHostCoordinatorService, cpuPlacementOf, MODEL_COORDINATOR_OWNER_KIND } from '../hostCoordinatorComposition.ts'

const ROOT = '/nonexistent-thyrox-root'

describe('composeHostCoordinatorService', () => {
  test('con la topología por defecto compone una coordinación local y el socket del hogar de runtime', () => {
    const composed = composeHostCoordinatorService({ THYROX_RUNTIME_DIR: '/run/thyrox' }, ROOT)
    expect(composed.options.coordination.topology).toBe('local')
    expect(composed.options.socketPath).toBe(modelCoordinatorSocketPath({ THYROX_RUNTIME_DIR: '/run/thyrox' }))
    expect(composed.owner.kind).toBe(MODEL_COORDINATOR_OWNER_KIND)
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
