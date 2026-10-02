/**
 * El adapter del runtime de Transformers (TASK-THYROX-0776) contra el servidor REAL
 * del runtime, con sólo el modelo sustituido por un eco
 * (`testing/fake_transformers_runtime.py`). Qué haría fallar a esta suite: que el
 * adapter mutara el runtime con una generación vieja; que diera por buena otra
 * identidad que la concedida; o que se pudiera generar sin residencia.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { type Subprocess } from 'bun'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'
import type { ModelExecutionUnit, ResidencyBinding } from '@thyrox/model-scheduling/modelUnitMaterializer.ts'

import { admittedSeq2seq } from '../admittedSeq2seq.ts'
import { TransformersRuntimeAdapter } from '../transformersRuntimeAdapter.ts'

const FIXTURE_DIGEST = 'cc1e6e274ac2815eab8e6782a50160c38de6bb0657938423fd337900020979d9'
const RESIDENCY = 'residency/madlad/cpu'
const GENERATION = 2
const ARTIFACT: ResolvedModelArtifact = { ...resolvedArtifact({ artifactId: FIXTURE_DIGEST, quantization: 'f32' }), format: 'safetensors' }
const FAKE_RUNTIME = join(import.meta.dir, '..', 'testing', 'fake_transformers_runtime.py')

let snapshot: string
let runtime: Subprocess<'ignore', 'pipe', 'inherit'>
let endpoint: string
let generation: number | 'unavailable'
let adapter: TransformersRuntimeAdapter

function grant(artifact: ResolvedModelArtifact = ARTIFACT): ExecutionGrant {
  return {
    grantId: 'grant-t5', requestId: 'request-t5', artifact, runtime: 'transformers', placement: { kind: 'cpu' },
    residency: { mode: 'create', instance: RESIDENCY, generation: GENERATION },
    residencyVramMib: 0, requestVramMib: 0, contextLength: 512, kvCacheType: 'f16',
    issuedAt: '2026-10-02T00:00:00.000Z', expiresAt: '2026-10-02T01:00:00.000Z',
  }
}

function unit(at = endpoint): ModelExecutionUnit {
  return {
    unitId: 'unit-grant-t5', kind: 'model-runtime', reference: { kind: 'grant', grantId: 'grant-t5' },
    owner: { kind: 'model-coordinator', id: 'coordinator', pid: 7 }, containerName: 'thyrox-worker-unit-grant-t5',
    grantId: 'grant-t5', artifact: ARTIFACT, residencyKey: RESIDENCY, generation: GENERATION, runtime: 'transformers',
    endpoint: at, containerId: 'c'.repeat(64), devices: [], hostPids: [4242], createdAt: '2026-10-02T00:00:00.000Z',
  }
}

const binding = (): ResidencyBinding => ({ unit: unit(), residencyKey: RESIDENCY, generation: GENERATION })
const expected = { residencyKey: RESIDENCY, generation: GENERATION, artifact: ARTIFACT }
const ticket = (): AdmissionTicket => ({ admissionId: 'admission-1', grant: grant(), unit: unit() }) as unknown as AdmissionTicket

async function announcedUrl(process: Subprocess<'ignore', 'pipe', 'inherit'>): Promise<string> {
  const reader = process.stdout.getReader()
  let text = ''
  while (!text.includes('\n')) {
    const { value, done } = await reader.read()
    if (done) break
    text += new TextDecoder().decode(value)
  }
  reader.releaseLock()
  return text.trim().replace(/^url=/, '')
}

beforeEach(async () => {
  snapshot = mkdtempSync(join(tmpdir(), 'transformers-snapshot-'))
  mkdirSync(join(snapshot, 'nested'))
  writeFileSync(join(snapshot, 'config.json'), '{"torch_dtype": "float32"}')
  writeFileSync(join(snapshot, 'model.safetensors'), 'weights')
  writeFileSync(join(snapshot, 'nested', 'spiece.model'), 'vocab')
  runtime = Bun.spawn(['python3', FAKE_RUNTIME, snapshot], { stdout: 'pipe', stderr: 'inherit' })
  endpoint = await announcedUrl(runtime)
  generation = GENERATION
  adapter = new TransformersRuntimeAdapter({ currentGeneration: async () => generation })
})

afterEach(async () => {
  runtime.kill()
  await runtime.exited
  rmSync(snapshot, { recursive: true, force: true })
})

describe('TransformersRuntimeAdapter', () => {
  test('la salud se pregunta al runtime de la unidad', async () => {
    expect(await adapter.probeHealth(unit())).toEqual({ status: 'healthy' })
    expect((await adapter.probeHealth(unit('http://127.0.0.1:9'))).status).toBe('unhealthy')
  })

  test('preparar verifica que el snapshot montado es el concedido', async () => {
    expect(await adapter.prepareRuntimeArtifact(binding(), grant())).toEqual({ status: 'done' })
    const other = await adapter.prepareRuntimeArtifact(binding(), grant({ ...ARTIFACT, artifactId: 'f'.repeat(64) }))
    expect(other.status).toBe('failed')
  })

  test('una generación vieja no toca el runtime', async () => {
    generation = GENERATION + 1
    expect(await adapter.loadResidency(binding(), grant())).toEqual({ status: 'stale_generation', currentGeneration: GENERATION + 1 })
    expect(await adapter.observeResidency(unit(), expected)).toEqual({ status: 'absent' })
  })

  test('cargar deja residente la identidad concedida, leída del runtime', async () => {
    expect(await adapter.loadResidency(binding(), grant())).toEqual({ status: 'done' })
    const observed = { modelId: ARTIFACT.modelId, artifactId: FIXTURE_DIGEST, format: 'safetensors', quantization: 'f32' }
    expect(await adapter.observeResidency(unit(), expected)).toEqual({ status: 'resident', observed })
    expect(await adapter.verifyArtifactIdentity(unit(), grant())).toEqual({ status: 'matches', observed })
  })

  test('una carga de otra identidad falla y no deja residencia', async () => {
    expect((await adapter.loadResidency(binding(), grant({ ...ARTIFACT, artifactId: 'f'.repeat(64) }))).status).toBe('failed')
    expect(await adapter.observeResidency(unit(), expected)).toEqual({ status: 'absent' })
  })

  test('descargar deja la unidad sin residencia', async () => {
    await adapter.loadResidency(binding(), grant())
    expect(await adapter.unloadResidency(binding())).toEqual({ status: 'done' })
    expect(await adapter.observeResidency(unit(), expected)).toEqual({ status: 'absent' })
  })
})

describe('admittedSeq2seq', () => {
  test('genera sólo contra la unidad del ticket y con residencia', async () => {
    await expect(admittedSeq2seq(ticket(), ['<2es> hello'], 32)).rejects.toThrow()
    await adapter.loadResidency(binding(), grant())
    expect(await admittedSeq2seq(ticket(), ['<2es> hello'], 32)).toEqual({ modelId: ARTIFACT.modelId, outputs: ['es:<2es> hello'] })
  })
})
