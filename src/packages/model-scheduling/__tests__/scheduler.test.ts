/**
 * `ModelScheduler` (ADR-007 1.10.0–1.12.0): la cadena lease → reserva → grant →
 * materialización → carga, con la generación de la residencia como fencing y
 * la compensación de cada paso.
 *
 * Qué haría fallar a esta suite: un grant cuya generación no es la del lease
 * (M17); un paso que falla y deja una reserva, un lease, un grant o una unidad
 * vivos sin marcarlos (M18); una materialización con la generación de un lease
 * perdido (M19); un primer grant sin reconciliar antes (M20); o una admisión
 * con la coordinación caída.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

import { ModelScheduler, type ExecutionPlan } from '../scheduler.ts'
import { FakeCoordination, FakeIssuer, FakeLedger, FakePrimitive, FakeRuntime, type Journal } from '../testing/schedulerFakes.ts'

const RESIDENCY = 'residency/qwen/gpu0'
const PLAN: ExecutionPlan = {
  requestId: 'request-1',
  owner: 'coordinator-a',
  residencyKey: RESIDENCY,
  model: 'thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf',
  revision: '7ae557604adf67be50417f59c2c2f167def9a775',
  artifact: { format: 'gguf', sha256: 'b'.repeat(64), bytes: 397_807_712 },
  runtime: 'ollama',
  placement: { kind: 'gpu', devices: ['GPU-0'] },
  residencyVramMib: 900,
  requestVramMib: 200,
  contextLength: 4_096,
  kvCacheType: 'f16',
}

let journal: Journal
let coordination: FakeCoordination
let ledger: FakeLedger
let issuer: FakeIssuer
let primitive: FakePrimitive
let runtime: FakeRuntime
let scheduler: ModelScheduler

beforeEach(() => {
  journal = []
  coordination = new FakeCoordination(journal)
  ledger = new FakeLedger(journal)
  issuer = new FakeIssuer(journal)
  primitive = new FakePrimitive(journal, coordination)
  runtime = new FakeRuntime(journal)
  scheduler = new ModelScheduler({ coordination, ledger, issuer, primitive, runtime, leaseTtlMs: 60_000 })
})

function nothingLeft(): void {
  expect(ledger.held).toEqual([])
  expect(issuer.active.size).toBe(0)
  expect(primitive.live).toEqual([])
}

describe('ModelScheduler: la cadena', () => {
  test('reconcilia antes del primer grant y encadena con una sola generación (M17, M20)', async () => {
    const outcome = await scheduler.execute(PLAN)
    if (outcome.status !== 'executing') throw new Error(`se esperaba executing, salió ${JSON.stringify(outcome)}`)
    expect(outcome.lease.generation).toBe(1)
    expect(outcome.reservation.generation).toBe(1)
    expect(outcome.grant.residency.generation).toBe(1)
    expect(outcome.unit.generation).toBe(1)
    expect(journal.indexOf('primitive.units')).toBeLessThan(journal.indexOf(`coordination.acquire ${RESIDENCY}`))
    expect(journal.filter(entry => !entry.startsWith('runtime.loadedModel') && entry !== 'primitive.units' && entry !== 'ledger.reservations')).toEqual([
      `coordination.acquire ${RESIDENCY}`,
      'ledger.reserve g1',
      'issuer.issue g1',
      'primitive.materialize g1',
      `runtime.load unit-grant-request-1`,
    ])
  })

  test('reconcilia una sola vez mientras la coordinación no cae', async () => {
    await scheduler.execute(PLAN)
    await scheduler.execute({ ...PLAN, requestId: 'request-2', residencyKey: 'residency/qwen/gpu1' })
    expect(journal.filter(entry => entry === 'primitive.units').length).toBe(1)
  })
})

describe('ModelScheduler: rehúsa sin crear nada', () => {
  test('la residencia la tiene otro coordinador', async () => {
    coordination.steal(RESIDENCY, 'coordinator-b')
    const outcome = await scheduler.execute(PLAN)
    expect(outcome).toMatchObject({ status: 'refused', stage: 'lease' })
    expect(journal).not.toContain('ledger.reserve g1')
    nothingLeft()
  })

  test('la coordinación no está disponible: no hay admisión', async () => {
    coordination.unavailable = true
    expect(await scheduler.execute(PLAN)).toMatchObject({ status: 'refused', stage: 'lease' })
    expect(journal.some(entry => entry.startsWith('ledger.reserve'))).toBe(false)
    nothingLeft()
  })

  test('tras una caída de la coordinación vuelve a reconciliar antes de admitir', async () => {
    await scheduler.execute(PLAN)
    coordination.unavailable = true
    await scheduler.execute({ ...PLAN, requestId: 'request-2', residencyKey: 'residency/qwen/gpu1' })
    coordination.unavailable = false
    journal.length = 0
    await scheduler.execute({ ...PLAN, requestId: 'request-3', residencyKey: 'residency/qwen/gpu2' })
    expect(journal.indexOf('primitive.units')).toBeGreaterThanOrEqual(0)
    expect(journal.indexOf('primitive.units')).toBeLessThan(journal.indexOf('coordination.acquire residency/qwen/gpu2'))
  })

  test('una caída de la coordinación no retira ejecuciones ya materializadas', async () => {
    await scheduler.execute(PLAN)
    coordination.unavailable = true
    await scheduler.execute({ ...PLAN, requestId: 'request-2', residencyKey: 'residency/qwen/gpu1' })
    expect(primitive.live.length).toBe(1)
    expect(journal.some(entry => entry.startsWith('primitive.retire'))).toBe(false)
  })
})

describe('ModelScheduler: compensaciones (M18)', () => {
  test('falla la reserva: suelta el lease y no hay grant', async () => {
    ledger.failWith = 'insufficient'
    const outcome = await scheduler.execute(PLAN)
    expect(outcome).toMatchObject({ status: 'failed', stage: 'reserve', marks: [] })
    expect(journal).toContain(`coordination.release ${RESIDENCY}`)
    expect(journal.some(entry => entry.startsWith('issuer.issue'))).toBe(false)
    expect(await coordination.currentGeneration(RESIDENCY)).toBe(1)
    nothingLeft()
  })

  test('falla el grant: suelta la reserva y el lease', async () => {
    issuer.fail = true
    expect(await scheduler.execute(PLAN)).toMatchObject({ status: 'failed', stage: 'grant', marks: [] })
    expect(journal.slice(-2)).toEqual(['ledger.release reservation-1', `coordination.release ${RESIDENCY}`])
    nothingLeft()
  })

  test('falla la materialización con resto parcial: retira la unidad, revoca, suelta reserva y lease', async () => {
    primitive.outcome = 'failed-partial'
    expect(await scheduler.execute(PLAN)).toMatchObject({ status: 'failed', stage: 'materialize', marks: [] })
    expect(journal.slice(-4)).toEqual([
      'primitive.retire unit-grant-request-1',
      'issuer.revoke grant-request-1',
      'ledger.release reservation-1',
      `coordination.release ${RESIDENCY}`,
    ])
    nothingLeft()
  })

  test('falla la carga en el runtime: retira la unidad, revoca, suelta reserva y lease', async () => {
    runtime.fail = true
    expect(await scheduler.execute(PLAN)).toMatchObject({ status: 'failed', stage: 'load', marks: [] })
    expect(journal.slice(-4)).toEqual([
      'primitive.retire unit-grant-request-1',
      'issuer.revoke grant-request-1',
      'ledger.release reservation-1',
      `coordination.release ${RESIDENCY}`,
    ])
    nothingLeft()
  })

  test('una compensación que no se completa queda marcada, nunca callada', async () => {
    runtime.fail = true
    primitive.failRetire = true
    const outcome = await scheduler.execute(PLAN)
    expect(outcome).toMatchObject({ status: 'failed', stage: 'load' })
    if (outcome.status !== 'failed') return
    expect(outcome.marks).toEqual([{ resource: 'unit', id: 'unit-grant-request-1', reason: expect.any(String) }])
  })

  test('una reserva que no se puede soltar queda marcada', async () => {
    issuer.fail = true
    ledger.failRelease = true
    const outcome = await scheduler.execute(PLAN)
    if (outcome.status !== 'failed') throw new Error(outcome.status)
    expect(outcome.marks).toEqual([{ resource: 'reservation', id: 'reservation-1', reason: expect.any(String) }])
    expect(journal).toContain(`coordination.release ${RESIDENCY}`)
  })
})

describe('ModelScheduler: fencing (M19)', () => {
  test('perder el lease entre el grant y la materialización: la primitiva rechaza y nada queda', async () => {
    const issue = issuer.issue.bind(issuer)
    issuer.issue = async (plan, generation) => {
      const issued = await issue(plan, generation)
      coordination.steal(RESIDENCY, 'coordinator-b')
      return issued
    }
    const outcome = await scheduler.execute(PLAN)
    expect(outcome).toMatchObject({ status: 'failed', stage: 'materialize' })
    expect(primitive.live).toEqual([])
    expect(issuer.active.size).toBe(0)
    expect(ledger.held).toEqual([])
  })

  test('una reserva rechazada por generación vieja suelta el lease', async () => {
    ledger.failWith = 'stale_generation'
    expect(await scheduler.execute(PLAN)).toMatchObject({ status: 'failed', stage: 'reserve' })
    expect(journal).toContain(`coordination.release ${RESIDENCY}`)
  })
})

describe('ModelScheduler.reconcile (M20)', () => {
  test('marca una unidad cuyo runtime no sirve el modelo de su grant', async () => {
    primitive.live.push({ unitId: 'unit-old', grantId: 'grant-old', model: PLAN.model, residencyKey: RESIDENCY, generation: 1, runtime: 'ollama', endpoint: 'http://127.0.0.1:61001', containerId: 'container-old', devices: ['GPU-0'], hostPids: [4243], createdAt: '2026-10-01T00:00:00.000Z' })
    const report = await scheduler.reconcile()
    expect(report.units.map(unit => unit.unitId)).toEqual(['unit-old'])
    expect(report.marks).toEqual([{ resource: 'unit', id: 'unit-old', reason: expect.any(String) }])
  })

  test('una unidad que sobrevivió y sirve su modelo no se marca ni se retira', async () => {
    const survivor = { unitId: 'unit-old', grantId: 'grant-old', model: PLAN.model, residencyKey: RESIDENCY, generation: 1, runtime: 'ollama' as const, endpoint: 'http://127.0.0.1:61001', containerId: 'container-old', devices: ['GPU-0'], hostPids: [4243], createdAt: '2026-10-01T00:00:00.000Z' }
    primitive.live.push(survivor)
    runtime.loaded.set('unit-old', PLAN.model)
    const report = await scheduler.reconcile()
    expect(report.marks).toEqual([])
    expect(primitive.live).toEqual([survivor])
  })
})
