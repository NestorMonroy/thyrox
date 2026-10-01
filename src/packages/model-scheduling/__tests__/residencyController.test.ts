/**
 * `ResidencyController` (ADR-007 1.13.0, topología A): una residencia por
 * contenedor, establecida por la cadena grant → unidad → adapter y desalojada
 * con la destrucción de la unidad como frontera definitiva.
 *
 * Qué haría fallar a esta suite: una residencia publicada `resident` sin que
 * `observeResidency` la viera; una segunda petición que materializa otra
 * unidad o reserva otra vez la VRAM de la residencia; una unidad cuyo lease
 * cambió de generación durante `materializing` que llega a `resident`; una
 * espera de salud delegada al adapter; un desalojo que destruye con peticiones
 * activas, que se detiene porque `unloadResidency` falló, o que suelta la VRAM
 * sin confirmar que la unidad ya no existe.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'

import { ResidencyRegistry } from '../residency.ts'
import { ResidencyController, type Admission } from '../residencyController.ts'
import type { ExecutionPlan } from '../scheduler.ts'
import { FakeCoordination, FakeIssuer, FakeLedger, FakePrimitive, FakeRuntime, type Journal } from '../testing/schedulerFakes.ts'

const RESIDENCY = 'residency/qwen/gpu0'
const UNIT = 'unit-grant-request-1'
const PLAN: ExecutionPlan = {
  requestId: 'request-1',
  owner: 'coordinator-a',
  residencyKey: RESIDENCY,
  artifact: resolvedArtifact(),
  runtime: 'ollama',
  placement: { kind: 'gpu', devices: ['GPU-0'] },
  residencyVramMib: 6_000,
  requestVramMib: 1_000,
  contextLength: 4_096,
  kvCacheType: 'f16',
}
const HEALTH_ATTEMPTS = 3

let journal: Journal
let coordination: FakeCoordination
let ledger: FakeLedger
let issuer: FakeIssuer
let primitive: FakePrimitive
let runtime: FakeRuntime
let registry: ResidencyRegistry
let sleeps: number[]
let controller: ResidencyController

beforeEach(() => {
  journal = []
  coordination = new FakeCoordination(journal)
  ledger = new FakeLedger(journal)
  issuer = new FakeIssuer(journal)
  primitive = new FakePrimitive(journal, coordination)
  runtime = new FakeRuntime(journal, coordination)
  registry = new ResidencyRegistry()
  sleeps = []
  controller = new ResidencyController({
    coordination, ledger, issuer, primitive, runtime, registry, leaseTtlMs: 60_000,
    health: { attempts: HEALTH_ATTEMPTS, intervalMs: 50 },
    sleep: async ms => { sleeps.push(ms) },
  })
})

function plan(requestId: string): ExecutionPlan {
  return { ...PLAN, requestId }
}

async function admitted(requestId = 'request-1'): Promise<Admission> {
  const outcome = await controller.admit(plan(requestId))
  if (outcome.status !== 'admitted') throw new Error(`se esperaba admitted, salió ${JSON.stringify(outcome)}`)
  return outcome
}

function runtimeCalls(): string[] {
  return journal.filter(entry => entry.startsWith('runtime.') || entry.startsWith('primitive.materialize') || entry.startsWith('primitive.destroy'))
}

function nothingLeft(): void {
  expect(ledger.held).toEqual([])
  expect(ledger.requests).toEqual([])
  expect(issuer.active.size).toBe(0)
  expect(primitive.live).toEqual([])
}

describe('ResidencyController: establecer', () => {
  test('recorre la cadena del adapter en orden y publica resident sólo tras observar la residencia', async () => {
    const admission = await admitted()
    expect(runtimeCalls()).toEqual([
      'primitive.materialize g1',
      `runtime.probeHealth ${UNIT}`,
      `runtime.prepareRuntimeArtifact ${UNIT}`,
      `runtime.verifyArtifactIdentity ${UNIT}`,
      `runtime.loadResidency ${UNIT}`,
      `runtime.observeResidency ${UNIT}`,
    ])
    expect(admission.reused).toBe(false)
    expect(admission.residency).toMatchObject({ state: 'resident', generation: 1, unitId: UNIT, activeRequests: 1 })
    expect(registry.get(RESIDENCY)).toMatchObject({ state: 'resident', generation: 1 })
  })

  test('reserva la VRAM de la residencia una vez y la de la petición aparte', async () => {
    await admitted()
    expect(ledger.held.map(held => held.vramMib)).toEqual([PLAN.residencyVramMib])
    expect(ledger.requests.map(held => held.vramMib)).toEqual([PLAN.requestVramMib])
  })

  test('una residencia resident se reutiliza: tres peticiones son 6 + 3×1, no 3×6', async () => {
    await admitted('request-1')
    const second = await admitted('request-2')
    await admitted('request-3')
    expect(second.reused).toBe(true)
    expect(journal.filter(entry => entry.startsWith('primitive.materialize'))).toHaveLength(1)
    expect(ledger.held).toHaveLength(1)
    expect(ledger.requests.map(held => held.vramMib)).toEqual([1_000, 1_000, 1_000])
    expect(registry.get(RESIDENCY)?.activeRequests).toBe(3)
  })

  test('la espera de salud es del controlador: reintenta con su intervalo', async () => {
    runtime.unhealthyProbes = HEALTH_ATTEMPTS - 1
    await admitted()
    expect(journal.filter(entry => entry.startsWith('runtime.probeHealth'))).toHaveLength(HEALTH_ATTEMPTS)
    expect(sleeps).toEqual(Array(HEALTH_ATTEMPTS - 1).fill(50))
  })

  test('sin salud tras los reintentos: deshace todo y no toca el artefacto', async () => {
    runtime.unhealthy = true
    const outcome = await controller.admit(PLAN)
    expect(outcome).toMatchObject({ status: 'failed', stage: 'health', marks: [] })
    expect(journal.some(entry => entry.startsWith('runtime.prepareRuntimeArtifact'))).toBe(false)
    expect(journal).toContain(`primitive.destroy ${UNIT}`)
    nothingLeft()
    expect(registry.get(RESIDENCY)?.state).toBe('absent')
  })

  test('un artefacto que no es el del grant no se carga', async () => {
    runtime.servesSha256 = 'c'.repeat(64)
    const outcome = await controller.admit(PLAN)
    expect(outcome).toMatchObject({ status: 'failed', stage: 'verify' })
    expect(journal.some(entry => entry.startsWith('runtime.loadResidency'))).toBe(false)
    nothingLeft()
  })

  test('una carga que el runtime no muestra residente no se publica', async () => {
    runtime.observeAs = 'loading'
    const outcome = await controller.admit(PLAN)
    expect(outcome).toMatchObject({ status: 'failed', stage: 'observe' })
    expect(registry.get(RESIDENCY)?.state).not.toBe('resident')
    nothingLeft()
  })

  test('el lease cambia de generación durante materializing: la unidad no llega a resident', async () => {
    primitive.afterMaterialize = () => coordination.steal(RESIDENCY, 'coordinator-b')
    const outcome = await controller.admit(PLAN)
    expect(outcome).toMatchObject({ status: 'failed', stage: 'generation' })
    expect(journal.some(entry => entry.startsWith('runtime.'))).toBe(false)
    expect(journal).toContain(`primitive.destroy ${UNIT}`)
    expect(registry.get(RESIDENCY)?.state).not.toBe('resident')
    expect(primitive.live).toEqual([])
  })

  test('el adapter rechaza la carga por generación vieja: no se publica resident', async () => {
    runtime.staleOnLoad = true
    const outcome = await controller.admit(PLAN)
    expect(outcome).toMatchObject({ status: 'failed', stage: 'load' })
    expect(registry.get(RESIDENCY)?.state).not.toBe('resident')
    expect(primitive.live).toEqual([])
  })
})

describe('ResidencyController: desalojar', () => {
  test('con peticiones activas drena y no destruye; no admite peticiones nuevas', async () => {
    const admission = await admitted()
    expect(await controller.evict(RESIDENCY)).toEqual({ status: 'draining', activeRequests: 1 })
    expect(journal.some(entry => entry.startsWith('primitive.destroy'))).toBe(false)
    expect(await controller.admit(plan('request-2'))).toMatchObject({ status: 'refused' })
    await controller.finish(admission)
    expect(await controller.evict(RESIDENCY)).toEqual({ status: 'evicted' })
  })

  test('sin peticiones: descarga, destruye, confirma, suelta VRAM, grant y lease, y queda absent', async () => {
    const admission = await admitted()
    await controller.finish(admission)
    journal.length = 0
    expect(await controller.evict(RESIDENCY)).toEqual({ status: 'evicted' })
    expect(journal).toEqual([
      `runtime.unloadResidency ${UNIT}`,
      `primitive.destroy ${UNIT}`,
      'primitive.units',
      'ledger.release reservation-1',
      `issuer.revoke grant-request-1`,
      `coordination.release ${RESIDENCY}`,
    ])
    nothingLeft()
    expect(registry.get(RESIDENCY)?.state).toBe('absent')
  })

  test('un unloadResidency fallido no impide destruir la unidad', async () => {
    const admission = await admitted()
    await controller.finish(admission)
    runtime.failUnload = true
    expect(await controller.evict(RESIDENCY)).toEqual({ status: 'evicted' })
    expect(journal).toContain(`primitive.destroy ${UNIT}`)
    nothingLeft()
  })

  test('si la unidad no se destruye, la VRAM sigue reservada y queda marcada', async () => {
    const admission = await admitted()
    await controller.finish(admission)
    primitive.failDestroy = true
    const outcome = await controller.evict(RESIDENCY)
    expect(outcome).toMatchObject({ status: 'failed', marks: [{ resource: 'unit', id: UNIT }] })
    expect(ledger.held).toHaveLength(1)
    expect(registry.get(RESIDENCY)?.state).toBe('error')
  })

  test('destroy que dice destroyed con la unidad aún listada no se da por ausente', async () => {
    const admission = await admitted()
    await controller.finish(admission)
    primitive.destroyLies = true
    const outcome = await controller.evict(RESIDENCY)
    expect(outcome).toMatchObject({ status: 'failed' })
    expect(ledger.held).toHaveLength(1)
  })

  test('una residencia que no existe no se desaloja', async () => {
    expect(await controller.evict(RESIDENCY)).toMatchObject({ status: 'refused' })
  })
})
