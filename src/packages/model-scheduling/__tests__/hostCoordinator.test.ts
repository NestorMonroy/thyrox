/**
 * `ModelSchedulingCoordinator` (ADR-007 1.14.0): una autoridad por anfitrión,
 * N clientes. Qué haría fallar a esta suite: dos clientes del mismo modelo que
 * reciben dos unidades; dos modelos con la misma cuantización —o dos
 * cuantizaciones de un modelo— que comparten residencia; un modelo que el
 * catálogo no declara y aun así toma un lease; o un ticket que no lleva el
 * grant y la unidad con los que el cliente alcanzará el runtime.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

import {
  catalogEntry,
  DEEPSEEK_REPOSITORY,
  DEEPSEEK_REVISION,
  resolvedArtifact,
} from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'

import { type AdmissionTicket, ModelSchedulingCoordinator, residencyKeyOf } from '../hostCoordinator.ts'
import { ResidencyRegistry } from '../residency.ts'
import { ResidencyController } from '../residencyController.ts'
import { FakeCoordination, FakeIssuer, FakeLedger, FakePrimitive, FakeRuntime, type Journal } from '../testing/schedulerFakes.ts'

const QWEN_Q4 = catalogEntry()
const QWEN_Q8 = catalogEntry({ quantization: 'q8_0', artifactId: 'c'.repeat(64) })
const DEEPSEEK_Q4 = catalogEntry({ repository: DEEPSEEK_REPOSITORY, revision: DEEPSEEK_REVISION, artifactId: 'd'.repeat(64) })
const CPU_PLACEMENT = { runtime: 'ollama' as const, placement: { kind: 'cpu' as const }, residencyVramMib: 0, requestVramMib: 0 }

let journal: Journal
let primitive: FakePrimitive
let placeable: boolean
let coordinator: ModelSchedulingCoordinator

beforeEach(() => {
  journal = []
  const coordination = new FakeCoordination(journal)
  primitive = new FakePrimitive(journal, coordination)
  placeable = true
  let admissions = 0
  const controller = new ResidencyController({
    coordination, ledger: new FakeLedger(journal), issuer: new FakeIssuer(journal), primitive,
    runtime: new FakeRuntime(journal, coordination), registry: new ResidencyRegistry(), leaseTtlMs: 60_000,
    health: { attempts: 1, intervalMs: 0 }, sleep: async () => {},
  })
  coordinator = new ModelSchedulingCoordinator({
    catalogEntries: async () => [QWEN_Q4, QWEN_Q8, DEEPSEEK_Q4],
    place: () => (placeable ? CPU_PLACEMENT : undefined),
    controller,
    owner: 'host-coordinator',
    newAdmissionId: () => `admission-${++admissions}`,
  })
})

async function admitted(model: string, requestId: string, client = 'proxy-a'): Promise<AdmissionTicket> {
  const outcome = await coordinator.admit({ requestId, client, model })
  if (outcome.status !== 'admitted') throw new Error(JSON.stringify(outcome))
  return outcome.ticket
}

function materializations(): number {
  return journal.filter(entry => entry.startsWith('primitive.materialize')).length
}

describe('ModelSchedulingCoordinator: admitir', () => {
  test('el ticket lleva el grant y la unidad de la identidad exacta resuelta', async () => {
    const ticket = await admitted(QWEN_Q4.name, 'request-1')
    expect(ticket).toMatchObject({ admissionId: 'admission-1', requestId: 'request-1', client: 'proxy-a' })
    expect(ticket.grant.artifact).toEqual(resolvedArtifact())
    expect(ticket.grant.residency.instance).toBe(residencyKeyOf(resolvedArtifact(), { kind: 'cpu' }))
    expect(ticket.unit.artifact).toEqual(resolvedArtifact())
    expect(ticket.unit.grantId).toBe(ticket.grant.grantId)
  })

  test('varios clientes del mismo modelo comparten una residencia y una unidad', async () => {
    const fromProxyA = await admitted(QWEN_Q4.name, 'request-1', 'proxy-a')
    const fromProxyB = await admitted(QWEN_Q4.name, 'request-2', 'proxy-b')
    const fromCli = await admitted(QWEN_Q4.name, 'request-3', 'thyrox-p')
    expect(new Set([fromProxyA, fromProxyB, fromCli].map(ticket => ticket.unit.unitId)).size).toBe(1)
    expect(fromProxyB.grant).toEqual(fromProxyA.grant)
    expect(materializations()).toBe(1)
  })

  test('dos modelos con la misma cuantización no comparten residencia', async () => {
    const qwen = await admitted(QWEN_Q4.name, 'request-1')
    const deepseek = await admitted(DEEPSEEK_Q4.name, 'request-2')
    expect(deepseek.grant.residency.instance).not.toBe(qwen.grant.residency.instance)
    expect(deepseek.unit.unitId).not.toBe(qwen.unit.unitId)
    expect(materializations()).toBe(2)
  })

  test('dos cuantizaciones del mismo modelo no comparten residencia', async () => {
    const q4 = await admitted(QWEN_Q4.name, 'request-1')
    const q8 = await admitted(QWEN_Q8.name, 'request-2')
    expect(q8.grant.residency.instance).not.toBe(q4.grant.residency.instance)
    expect(q8.unit.artifact.quantization).toBe('q8_0')
  })

  test('un modelo que el catálogo no declara se rehúsa sin tomar ningún lease', async () => {
    expect(await coordinator.admit({ requestId: 'request-1', client: 'proxy-a', model: 'qwen2.5:0.5b' })).toMatchObject({ status: 'refused', stage: 'resolve' })
    expect(journal).toEqual([])
  })

  test('una identidad que no cabe en ninguna colocación se rehúsa sin tomar ningún lease', async () => {
    placeable = false
    expect(await coordinator.admit({ requestId: 'request-1', client: 'proxy-a', model: QWEN_Q4.name })).toMatchObject({ status: 'refused', stage: 'placement' })
    expect(journal.some(entry => entry.startsWith('coordination.acquire'))).toBe(false)
  })
})

describe('ModelSchedulingCoordinator: terminar', () => {
  test('finish suelta el ticket una vez; los tickets vigentes se listan', async () => {
    const first = await admitted(QWEN_Q4.name, 'request-1')
    const second = await admitted(QWEN_Q4.name, 'request-2', 'proxy-b')
    expect(coordinator.admissions().map(ticket => ticket.admissionId)).toEqual([first.admissionId, second.admissionId])
    expect(await coordinator.finish(first.admissionId)).toBe('finished')
    expect(await coordinator.finish(first.admissionId)).toBe('absent')
    expect(coordinator.admissions().map(ticket => ticket.admissionId)).toEqual([second.admissionId])
  })

  test('desalojar con un ticket vigente drena; sin tickets, destruye la unidad', async () => {
    const ticket = await admitted(QWEN_Q4.name, 'request-1')
    const key = ticket.grant.residency.instance
    expect(await coordinator.evict(key)).toEqual({ status: 'draining', activeRequests: 1 })
    await coordinator.finish(ticket.admissionId)
    expect(await coordinator.evict(key)).toEqual({ status: 'evicted' })
    expect(primitive.live).toEqual([])
  })
})

describe('residencyKeyOf', () => {
  test('deriva de la identidad entera y de la colocación, nunca de la cuantización sola', () => {
    const qwen = resolvedArtifact()
    const key = residencyKeyOf(qwen, { kind: 'cpu' })
    expect(residencyKeyOf(qwen, { kind: 'cpu' })).toBe(key)
    expect(residencyKeyOf({ ...qwen, artifactId: 'e'.repeat(64) }, { kind: 'cpu' })).not.toBe(key)
    expect(residencyKeyOf(qwen, { kind: 'gpu', devices: ['GPU-0'] })).not.toBe(key)
    expect(residencyKeyOf(resolvedArtifact({ repository: DEEPSEEK_REPOSITORY, revision: DEEPSEEK_REVISION }), { kind: 'cpu' })).not.toBe(key)
  })
})
