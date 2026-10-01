/**
 * `OllamaRuntimeAdapter` contra un Ollama falso con estado. Qué haría fallar a
 * esta suite: una mutación con generación vieja que llega al runtime; una
 * espera o reintento dentro de `probeHealth`; un blob que se sube cuando la
 * unidad ya lo tiene, o un 400 de contenido tomado por éxito; una identidad
 * comprobada por el nombre y no por el blob; una residencia declarada por
 * `/api/ps` sin mirar su blob; cualquier `DELETE`, `/api/delete` o `/api/chat`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import type { ExecutionUnit, ResidencyBinding } from '@thyrox/model-scheduling/executionPrimitive.ts'

import { OllamaRuntimeAdapter } from '../ollamaRuntimeAdapter.ts'
import { startFakeOllamaRuntime, type FakeOllamaRuntime } from '../testing/fakeOllamaRuntime.ts'

const CONTENT = new TextEncoder().encode('GGUF fake model bytes for the runtime adapter')
const SHA = createHash('sha256').update(CONTENT).digest('hex')
const OTHER_SHA = 'c'.repeat(64)
const RESIDENCY = 'residency/qwen/gpu0'
const GENERATION = 3
const ARTIFACT = resolvedArtifact({ artifactId: SHA, bytes: CONTENT.byteLength })
const MODEL = ARTIFACT.modelId
/** Lo que el runtime informa cuando sirve exactamente `ARTIFACT`. */
const OBSERVED = { modelId: MODEL, artifactId: SHA, format: 'gguf', quantization: 'q4_k_m' }

let ollama: FakeOllamaRuntime
let directory: string
let generation: number | 'unavailable'
let adapter: OllamaRuntimeAdapter

function grant(sha256 = SHA): ExecutionGrant {
  return {
    grantId: 'grant-request-1', requestId: 'request-1',
    artifact: { ...ARTIFACT, artifactId: sha256 },
    runtime: 'ollama', placement: { kind: 'cpu' },
    residency: { mode: 'create', instance: RESIDENCY, generation: GENERATION },
    residencyVramMib: 0, requestVramMib: 0, contextLength: 4_096, kvCacheType: 'f16',
    issuedAt: '2026-10-01T00:00:00.000Z', expiresAt: '2026-10-01T01:00:00.000Z',
  }
}

function unit(endpoint = ollama.baseUrl): ExecutionUnit {
  return {
    unitId: 'unit-a', grantId: 'grant-request-1', artifact: ARTIFACT, residencyKey: RESIDENCY,
    generation: GENERATION, runtime: 'ollama', endpoint, containerId: 'c'.repeat(64), devices: [], hostPids: [4242],
    createdAt: '2026-10-01T00:00:00.000Z',
  }
}

function binding(): ResidencyBinding {
  return { unit: unit(), residencyKey: RESIDENCY, generation: GENERATION }
}

const expected = { residencyKey: RESIDENCY, generation: GENERATION, artifact: ARTIFACT }

async function prepared(): Promise<void> {
  expect(await adapter.prepareRuntimeArtifact(binding(), grant())).toEqual({ status: 'done' })
}

beforeEach(async () => {
  ollama = startFakeOllamaRuntime()
  directory = await mkdtemp(join(tmpdir(), 'ollama-runtime-adapter-'))
  await writeFile(join(directory, SHA), CONTENT)
  generation = GENERATION
  adapter = new OllamaRuntimeAdapter({ artifactPath: sha => join(directory, sha), currentGeneration: async () => generation })
})

afterEach(async () => {
  // Ninguna prueba de esta suite borra modelos ni infiere sobre la unidad.
  expect(ollama.requests.some(request => request.method === 'DELETE' || request.path === '/api/delete' || request.path === '/api/chat')).toBe(false)
  await ollama.stop()
  await rm(directory, { recursive: true, force: true })
})

describe('OllamaRuntimeAdapter: salud', () => {
  test('una sola consulta, sana', async () => {
    expect(await adapter.probeHealth(unit())).toEqual({ status: 'healthy' })
    expect(ollama.requests).toHaveLength(1)
  })

  test('un runtime que no responde es unhealthy, no una excepción', async () => {
    const outcome = await adapter.probeHealth(unit('http://127.0.0.1:1'))
    expect(outcome.status).toBe('unhealthy')
  })
})

describe('OllamaRuntimeAdapter: preparar el artefacto', () => {
  test('sube el blob ausente y crea el modelo desde él', async () => {
    await prepared()
    expect(ollama.blobs.get(SHA)).toBe(CONTENT.byteLength)
    expect(ollama.models.get(MODEL)).toBe(SHA)
  })

  test('no vuelve a subir un blob que la unidad ya tiene', async () => {
    await prepared()
    ollama.requests.length = 0
    await prepared()
    expect(ollama.requests.filter(request => request.method === 'POST' && request.path.startsWith('/api/blobs'))).toEqual([])
  })

  test('un blob rechazado por contenido es failed, no done', async () => {
    await writeFile(join(directory, OTHER_SHA), CONTENT)
    const outcome = await adapter.prepareRuntimeArtifact(binding(), grant(OTHER_SHA))
    expect(outcome.status).toBe('failed')
    expect(ollama.models.has(MODEL)).toBe(false)
  })

  test('con generación vieja no toca el runtime', async () => {
    generation = GENERATION + 1
    expect(await adapter.prepareRuntimeArtifact(binding(), grant())).toEqual({ status: 'stale_generation', currentGeneration: GENERATION + 1 })
    expect(ollama.requests).toEqual([])
  })

  test('con la coordinación no disponible tampoco', async () => {
    generation = 'unavailable'
    expect(await adapter.prepareRuntimeArtifact(binding(), grant())).toEqual({ status: 'stale_generation', currentGeneration: 'unavailable' })
    expect(ollama.requests).toEqual([])
  })
})

describe('OllamaRuntimeAdapter: identidad', () => {
  test('el blob del FROM coincide con el del grant', async () => {
    await prepared()
    expect(await adapter.verifyArtifactIdentity(unit(), grant())).toEqual({
      status: 'matches', observed: OBSERVED,
    })
  })

  test('el mismo nombre con otro blob es mismatch', async () => {
    await prepared()
    ollama.models.set(MODEL, OTHER_SHA)
    expect(await adapter.verifyArtifactIdentity(unit(), grant())).toMatchObject({ status: 'mismatch', observed: { artifactId: OTHER_SHA } })
  })

  test('el mismo blob servido con otra cuantización es mismatch: la cuantización se compara', async () => {
    await prepared()
    ollama.servedQuantization = 'Q8_0'
    expect(await adapter.verifyArtifactIdentity(unit(), grant())).toMatchObject({ status: 'mismatch', observed: { quantization: 'q8_0' } })
  })

  test('un formato distinto del concedido es mismatch', async () => {
    await prepared()
    ollama.servedFormat = 'safetensors'
    expect(await adapter.verifyArtifactIdentity(unit(), grant())).toMatchObject({ status: 'mismatch', observed: { format: 'safetensors' } })
  })

  test('otro modelo con la misma cuantización no satisface el grant', async () => {
    await prepared()
    const deepseek = resolvedArtifact({ repository: 'TheBloke/deepseek-coder-6.7B-instruct-GGUF', revision: '0123456789abcdef0123456789abcdef01234567', artifactId: SHA })
    expect(await adapter.verifyArtifactIdentity(unit(), { ...grant(), artifact: deepseek })).toMatchObject({ status: 'mismatch', observed: undefined })
  })

  test('un modelo que la unidad no tiene es mismatch sin observado', async () => {
    expect(await adapter.verifyArtifactIdentity(unit(), grant())).toMatchObject({ status: 'mismatch', observed: undefined })
  })
})

describe('OllamaRuntimeAdapter: residencia', () => {
  test('cargar deja el modelo residente con keep_alive -1, y observar lo confirma', async () => {
    await prepared()
    expect(await adapter.loadResidency(binding(), grant())).toEqual({ status: 'done' })
    const load = ollama.requests.find(request => request.path === '/api/generate')
    expect(load?.body).toMatchObject({ model: MODEL, keep_alive: -1 })
    expect(await adapter.observeResidency(unit(), expected)).toEqual({ status: 'resident', observed: OBSERVED })
  })

  test('cargar con generación vieja no toca el runtime', async () => {
    await prepared()
    ollama.requests.length = 0
    generation = GENERATION + 1
    expect((await adapter.loadResidency(binding(), grant())).status).toBe('stale_generation')
    expect(ollama.requests).toEqual([])
  })

  test('una carga que responde bien sin dejar residencia se observa absent', async () => {
    await prepared()
    ollama.loadWithoutResidency = true
    await adapter.loadResidency(binding(), grant())
    expect(await adapter.observeResidency(unit(), expected)).toEqual({ status: 'absent' })
  })

  test('residente con otro blob bajo el nombre esperado es mismatch', async () => {
    await prepared()
    await adapter.loadResidency(binding(), grant())
    ollama.models.set(MODEL, OTHER_SHA)
    expect(await adapter.observeResidency(unit(), expected)).toMatchObject({ status: 'mismatch', observed: { artifactId: OTHER_SHA } })
  })

  test('un runtime que falla al observar es error, no una excepción', async () => {
    ollama.psFails = true
    expect((await adapter.observeResidency(unit(), expected)).status).toBe('error')
  })

  test('descargar usa keep_alive 0 y deja la residencia absent', async () => {
    await prepared()
    await adapter.loadResidency(binding(), grant())
    expect(await adapter.unloadResidency(binding())).toEqual({ status: 'done' })
    expect(ollama.requests.at(-1)?.body).toMatchObject({ model: MODEL, keep_alive: 0 })
    expect(await adapter.observeResidency(unit(), expected)).toEqual({ status: 'absent' })
    expect(ollama.models.has(MODEL)).toBe(true)
  })

  test('descargar con generación vieja no toca el runtime', async () => {
    generation = GENERATION + 1
    expect((await adapter.unloadResidency(binding())).status).toBe('stale_generation')
    expect(ollama.requests).toEqual([])
  })
})
