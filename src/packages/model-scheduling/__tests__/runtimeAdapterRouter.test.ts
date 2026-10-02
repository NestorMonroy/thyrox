/**
 * El router de adapters por runtime (TASK-THYROX-0776): cada unidad va al adapter
 * de SU runtime, y un runtime sin adapter falla en vez de caer a otro.
 */
import { describe, expect, test } from 'bun:test'

import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'

import type { ModelExecutionUnit, ResidencyBinding, RuntimeAdapter, RuntimeCapabilities } from '../modelUnitMaterializer.ts'
import { RuntimeAdapterRouter } from '../runtimeAdapterRouter.ts'

const ALL: RuntimeCapabilities = { multipleResidencies: true, explicitLoad: true, explicitUnload: true, perResidencyIdentity: true, residencyObservation: true, placementEnforceable: true }

function recording(name: string, calls: string[], capabilities: RuntimeCapabilities = ALL): RuntimeAdapter {
  return {
    capabilities,
    probeHealth: async () => { calls.push(`${name}:health`); return { status: 'healthy' } },
    prepareRuntimeArtifact: async () => { calls.push(`${name}:prepare`); return { status: 'done' } },
    verifyArtifactIdentity: async () => { calls.push(`${name}:verify`); return { status: 'failed', reason: name } },
    loadResidency: async () => { calls.push(`${name}:load`); return { status: 'done' } },
    observeResidency: async () => { calls.push(`${name}:observe`); return { status: 'absent' } },
    unloadResidency: async () => { calls.push(`${name}:unload`); return { status: 'done' } },
  }
}

const unitOf = (runtime: ModelExecutionUnit['runtime']) => ({ runtime } as ModelExecutionUnit)
const bindingOf = (runtime: ModelExecutionUnit['runtime']) => ({ unit: unitOf(runtime), residencyKey: 'r', generation: 1 } as ResidencyBinding)
const grantOf = (runtime: ExecutionGrant['runtime']) => ({ runtime } as ExecutionGrant)

describe('RuntimeAdapterRouter', () => {
  test('cada operación va al adapter del runtime de la unidad', async () => {
    const calls: string[] = []
    const router = new RuntimeAdapterRouter({ ollama: recording('ollama', calls), transformers: recording('transformers', calls) })
    await router.loadResidency(bindingOf('transformers'), grantOf('transformers'))
    await router.probeHealth(unitOf('ollama'))
    await router.observeResidency(unitOf('transformers'), { residencyKey: 'r', generation: 1, artifact: {} as never })
    expect(calls).toEqual(['transformers:load', 'ollama:health', 'transformers:observe'])
  })

  test('un runtime sin adapter falla y no cae a ningún otro', async () => {
    const calls: string[] = []
    const router = new RuntimeAdapterRouter({ ollama: recording('ollama', calls) })
    expect((await router.loadResidency(bindingOf('transformers'), grantOf('transformers'))).status).toBe('failed')
    expect((await router.probeHealth(unitOf('transformers'))).status).toBe('unhealthy')
    expect((await router.observeResidency(unitOf('transformers'), { residencyKey: 'r', generation: 1, artifact: {} as never })).status).toBe('error')
    expect(calls).toEqual([])
  })

  test('las capacidades son las que TODOS los adapters cumplen', () => {
    const calls: string[] = []
    const router = new RuntimeAdapterRouter({
      ollama: recording('ollama', calls, { ...ALL, multipleResidencies: false }),
      transformers: recording('transformers', calls, { ...ALL, placementEnforceable: false }),
    })
    expect(router.capabilities).toEqual({ ...ALL, multipleResidencies: false, placementEnforceable: false })
  })
})
