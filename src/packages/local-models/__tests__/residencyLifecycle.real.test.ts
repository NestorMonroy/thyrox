/**
 * E2E real de una residencia (ADR-007 1.13.0 y 1.14.0): Podman y Ollama de
 * verdad, con el artefacto exacto del catálogo.
 *
 *   ResolvedModelArtifact → ExecutionGrant → PodmanModelUnitMaterializer
 *     → ExecutionUnit → OllamaRuntimeAdapter (prepare → verify → load → observe)
 *     → RESIDENT → dos peticiones reales que la reutilizan → drain → destroy
 *     → unidad ausente → VRAM, grant y lease soltados
 *
 * Se corre a propósito, no en la suite normal: tarda y crea un contenedor.
 *
 *   THYROX_E2E_MODEL_RESIDENCY=1 bun test __tests__/residencyLifecycle.real.test.ts
 *
 * Sin la variable, sin Podman, sin la imagen local o sin el artefacto en la
 * caché, la suite no mide y lo dice: nunca da verde sin haber corrido.
 *
 * *Métrica:* lo que Podman y Ollama informan de la unidad (etiquetas,
 * `/api/show`, `/api/ps`, memoria del contenedor) y el estado del ledger,
 * el emisor y la coordinación del proceso.
 * *Ciega a:* la GPU —este anfitrión no tiene— y por tanto a la VRAM real; la
 * reserva de la residencia se comprueba por su número y su forma, no por
 * memoria de dispositivo.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'

import { localArtifactHome, localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { resolveModel } from '@thyrox/model-artifacts/modelResolver.ts'
import { assertConsistentIdentity } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'
import { createMemoryCoordination } from '@thyrox/model-scheduling/memoryCoordination.ts'
import { MemoryGrantIssuer } from '@thyrox/model-scheduling/memoryGrantIssuer.ts'
import { createMemoryResidencyVramLedger } from '@thyrox/model-scheduling/memoryVramLedger.ts'
import { MODEL_UNIT_CONTAINER_PREFIX, MODEL_UNIT_LABELS, PodmanModelUnitMaterializer } from '@thyrox/model-scheduling/podmanModelUnitMaterializer.ts'
import { ResidencyRegistry } from '@thyrox/model-scheduling/residency.ts'
import { ResidencyController, type Admission } from '@thyrox/model-scheduling/residencyController.ts'
import type { ExecutionPlan } from '@thyrox/model-scheduling/scheduler.ts'
import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { removeWorkerContainerArgv, workerContainerName } from '@thyrox/podman-execution/workerContainerLifecycle.ts'

import { OllamaRuntimeAdapter } from '../ollamaRuntimeAdapter.ts'

const OPT_IN_ENV = 'THYROX_E2E_MODEL_RESIDENCY'
const RUNTIME_IMAGE = 'docker.io/ollama/ollama:0.35.0'
/** Qwen2.5-0.5B-Instruct, revisión completa 7ae557…, cuantización Q4_K_M: la identidad exacta del catálogo. */
const MODEL_ID = 'thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf'
const FULL_REVISION = '7ae557604adf67be50417f59c2c2f167def9a775'
const OWNER = `e2e-coordinator-${process.pid}`
const LEASE_TTL_MS = 10 * 60_000
const GRANT_TTL_MS = 10 * 60_000
const HEALTH = { attempts: 120, intervalMs: 500 }
const OLLAMA_CONTAINER_PORT = 11_434
/** Límites de la unidad: el modelo de 0.5B cabe holgado en 2 GiB de RAM del contenedor. */
const UNIT_LIMITS = { cpus: 2, memoryMib: 2_048, pidsLimit: 256 }
const E2E_TIMEOUT_MS = 10 * 60_000
const PROMPT = 'Reply with one word: hello.'
const MAX_PREDICTED_TOKENS = 8
const BYTES_PER_MIB = 1024 * 1024

const root = join(import.meta.dir, '..', '..', '..', '..')
const podman = createPodmanExecutor()

async function unmeasuredReason(): Promise<string | undefined> {
  if (process.env[OPT_IN_ENV] !== '1') return `${OPT_IN_ENV} no es 1`
  const image = await podman.run(['image', 'exists', RUNTIME_IMAGE]).catch(() => undefined)
  if (image?.exitCode !== 0) return `la imagen ${RUNTIME_IMAGE} no está local`
  return undefined
}

const skipReason = await unmeasuredReason()
if (skipReason) console.error(`residencyLifecycle.real: sin medir — ${skipReason}`)

/** Un puerto de loopback libre: lo pide al sistema y lo suelta. */
async function freeLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('sin puerto'))))
    })
  })
}

async function containerLabels(unitId: string): Promise<Record<string, string>> {
  const inspected = await podman.run(['inspect', `${MODEL_UNIT_CONTAINER_PREFIX}${unitId}`, '--format', '{{json .Config.Labels}}'])
  return JSON.parse(inspected.stdout) as Record<string, string>
}

async function containerExists(unitId: string): Promise<boolean> {
  return (await podman.run(['container', 'exists', `${MODEL_UNIT_CONTAINER_PREFIX}${unitId}`])).exitCode === 0
}

async function containerMemoryBytes(unitId: string): Promise<number> {
  const stats = await podman.run(['stats', '--no-stream', '--format', 'json', `${MODEL_UNIT_CONTAINER_PREFIX}${unitId}`])
  const [entry] = JSON.parse(stats.stdout) as { mem_usage?: string }[]
  return parseBytes(entry?.mem_usage?.split('/')[0]?.trim() ?? '')
}

function parseBytes(text: string): number {
  const match = /^([\d.]+)\s*([kKMGT]?i?B)$/.exec(text)
  if (!match) throw new Error(`memoria ilegible: «${text}»`)
  const units: Record<string, number> = { B: 1, kB: 1e3, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 }
  return Number(match[1]) * (units[match[2] as string] ?? Number.NaN)
}

/** Una petición real de inferencia contra el endpoint de la unidad admitida, y sólo contra él. */
async function generate(admission: Admission): Promise<{ response: string; done: boolean }> {
  const reply = await fetch(`${admission.unit.endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: admission.unit.artifact.modelId, prompt: PROMPT, stream: false, options: { num_predict: MAX_PREDICTED_TOKENS } }),
  })
  expect(reply.status).toBe(200)
  return await reply.json() as { response: string; done: boolean }
}

async function residentNames(admission: Admission): Promise<string[]> {
  const listed = await (await fetch(`${admission.unit.endpoint}/api/ps`)).json() as { models: { name: string }[] }
  return listed.models.map(model => model.name)
}

const unitsToClean: string[] = []

afterAll(async () => {
  // Una unidad que la prueba no llegó a destruir no se deja viva.
  for (const unitId of unitsToClean) await podman.run(removeWorkerContainerArgv(workerContainerName(unitId)))
})

describe.skipIf(skipReason !== undefined)('residencia real: Podman + Ollama', () => {
  test('la cadena entera, de la identidad exacta al desalojo', async () => {
    const catalog = await loadModelCatalog(localModelHome(process.env, root).catalog)
    const resolved = resolveModel({ model: MODEL_ID }, catalog.entries())
    const artifact = resolved.artifact
    assertConsistentIdentity(artifact)
    expect(artifact).toMatchObject({ modelId: MODEL_ID, revision: FULL_REVISION, quantization: 'q4_k_m', format: 'gguf' })
    const cache = localArtifactHome(process.env, root).artifactCache
    const artifactPath = (sha256: string): string => join(cache, `sha256-${sha256}.gguf`)
    expect(existsSync(artifactPath(artifact.artifactId))).toBe(true)

    const coordination = createMemoryCoordination()
    const ledger = createMemoryResidencyVramLedger({ capacityMib: {} })
    const issuer = new MemoryGrantIssuer({ ttlMs: GRANT_TTL_MS, now: () => new Date(), newGrantId: () => `grant-e2e-${crypto.randomUUID()}` })
    const currentGeneration = (key: string) => coordination.currentGeneration(key)
    const primitive = new PodmanModelUnitMaterializer({
      podman,
      currentGeneration,
      profiles: { ollama: { image: RUNTIME_IMAGE, containerPort: OLLAMA_CONTAINER_PORT, environment: { OLLAMA_HOST: `0.0.0.0:${OLLAMA_CONTAINER_PORT}` } } },
      owner: { kind: 'model-coordinator', id: OWNER, pid: process.pid },
      limits: UNIT_LIMITS,
      allocatePort: freeLoopbackPort,
      now: () => new Date(),
    })
    const runtime = new OllamaRuntimeAdapter({ artifactPath, currentGeneration })
    const registry = new ResidencyRegistry()
    const controller = new ResidencyController({ coordination, ledger, issuer, primitive, runtime, registry, leaseTtlMs: LEASE_TTL_MS, health: HEALTH })

    const residencyKey = `residency/${artifact.modelId}/cpu`
    const plan = (requestId: string): ExecutionPlan => ({
      requestId, owner: OWNER, residencyKey, artifact, runtime: 'ollama', placement: { kind: 'cpu' },
      residencyVramMib: 0, requestVramMib: 0, contextLength: resolved.contextLength, kvCacheType: resolved.kvCacheType,
    })

    // 1. Establecer: la unidad sólo es resident cuando el runtime la muestra con la identidad exacta.
    const first = await controller.admit(plan('e2e-request-1'))
    if (first.status !== 'admitted') throw new Error(`admisión: ${JSON.stringify(first)}`)
    unitsToClean.push(first.unit.unitId)
    expect(first.reused).toBe(false)
    expect(first.residency).toMatchObject({ state: 'resident', generation: first.unit.generation, unitId: first.unit.unitId, artifact })
    expect(first.unit.artifact).toEqual(artifact)

    // 2. El contenedor pertenece a esa unidad, esa residencia y esa generación, con la identidad completa.
    const labels = await containerLabels(first.unit.unitId)
    expect(labels).toMatchObject({
      [MODEL_UNIT_LABELS.unit]: first.unit.unitId,
      [MODEL_UNIT_LABELS.residency]: residencyKey,
      [MODEL_UNIT_LABELS.generation]: String(first.unit.generation),
      [MODEL_UNIT_LABELS.model]: MODEL_ID,
      [MODEL_UNIT_LABELS.revision]: FULL_REVISION,
      [MODEL_UNIT_LABELS.quantization]: 'q4_k_m',
      [MODEL_UNIT_LABELS.sha256]: artifact.artifactId,
    })
    expect(first.unit.endpoint).toBe(`http://127.0.0.1:${labels[MODEL_UNIT_LABELS.port]}`)
    // Lo compuso la primitiva neutral: dueño model-coordinator, red bridge, puerto sólo en loopback.
    expect(labels).toMatchObject({ 'thyrox.owner-kind': 'model-coordinator', 'thyrox.owner-id': OWNER, 'thyrox.worker-id': first.unit.unitId })
    const hostConfig = JSON.parse((await podman.run(['inspect', `${MODEL_UNIT_CONTAINER_PREFIX}${first.unit.unitId}`, '--format', '{{json .HostConfig}}'])).stdout) as {
      NetworkMode: string; PortBindings: Record<string, { HostIp: string; HostPort: string }[]>; Memory: number
    }
    expect(hostConfig.NetworkMode).toBe('bridge')
    expect(hostConfig.PortBindings[`${OLLAMA_CONTAINER_PORT}/tcp`]).toEqual([{ HostIp: '127.0.0.1', HostPort: labels[MODEL_UNIT_LABELS.port] as string }])
    expect(hostConfig.Memory).toBe(UNIT_LIMITS.memoryMib * BYTES_PER_MIB)
    expect(await coordination.currentGeneration(residencyKey)).toBe(first.unit.generation)

    // 3. Una petición real contra la unidad.
    expect((await generate(first)).done).toBe(true)
    const memoryAfterFirst = await containerMemoryBytes(first.unit.unitId)

    // 4. Una segunda admisión reutiliza la residencia: ni otra unidad, ni otra reserva de residencia.
    const second = await controller.admit(plan('e2e-request-2'))
    if (second.status !== 'admitted') throw new Error(`segunda admisión: ${JSON.stringify(second)}`)
    expect(second.reused).toBe(true)
    expect(second.unit.unitId).toBe(first.unit.unitId)
    expect(await ledger.reservations()).toHaveLength(1)
    expect((await ledger.allocations()).map(allocation => allocation.requestId).sort()).toEqual(['e2e-request-1', 'e2e-request-2'])
    expect(registry.get(residencyKey)?.activeRequests).toBe(2)
    expect((await generate(second)).done).toBe(true)
    expect(await residentNames(second)).toEqual([MODEL_ID])
    // Los pesos se cargaron una vez: la segunda petición no suma otra copia del artefacto.
    const memoryAfterSecond = await containerMemoryBytes(first.unit.unitId)
    expect(memoryAfterSecond - memoryAfterFirst).toBeLessThan(artifact.bytes / 2)
    console.error(`residencyLifecycle.real: memoria del contenedor ${(memoryAfterFirst / BYTES_PER_MIB).toFixed(0)} MiB → ${(memoryAfterSecond / BYTES_PER_MIB).toFixed(0)} MiB; artefacto ${(artifact.bytes / BYTES_PER_MIB).toFixed(0)} MiB`)

    // 5. Drenar: con peticiones activas no se destruye nada.
    expect(await controller.evict(residencyKey)).toEqual({ status: 'draining', activeRequests: 2 })
    expect(await containerExists(first.unit.unitId)).toBe(true)
    await controller.finish(first)
    await controller.finish(second)
    expect(await ledger.allocations()).toEqual([])

    // 6. Desalojar: destruir la unidad, confirmar que no existe, soltar VRAM, grant y lease.
    expect(await controller.evict(residencyKey)).toEqual({ status: 'evicted' })
    expect(await containerExists(first.unit.unitId)).toBe(false)
    expect(await primitive.units()).toEqual([])
    expect(await ledger.reservations()).toEqual([])
    expect(await issuer.revoke(first.residency.grantId as string)).toBe('absent')
    expect(registry.get(residencyKey)?.state).toBe('absent')
    expect((await coordination.acquireResidency(residencyKey, 'another-coordinator', LEASE_TTL_MS)).status).toBe('acquired')
  }, E2E_TIMEOUT_MS)
})
