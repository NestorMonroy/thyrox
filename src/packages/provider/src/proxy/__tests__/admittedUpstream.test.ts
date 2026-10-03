/**
 * El relé admitido del proxy local (ADR-007 1.14.0, M8): cada petición pasa
 * por una admisión del coordinador y llega SÓLO al endpoint de la unidad del
 * ticket; `finish` se llama una vez por admisión, al terminar el cuerpo.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import type { AdmissionRequest, AdmissionTicket, CoordinatorAdmission } from '@thyrox/model-scheduling/hostCoordinator.ts'

import {
  ADMISSION_REFUSED_STATUS, UPSTREAM_UNREACHABLE_STATUS, startAdmittedUpstream,
  type AdmissionSource, type AdmittedUpstream,
} from '../openaiCompat/admittedUpstream.ts'
import { startFakeOpenAIUpstream, type FakeOpenAIUpstream } from './fakeOpenAIUpstream.ts'

const ARTIFACT = resolvedArtifact()
const MODEL = ARTIFACT.modelId
const CLOSED_PORT_ENDPOINT = 'http://127.0.0.1:9'

const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

function grantFor(requestId: string): ExecutionGrant {
  return {
    grantId: `grant-${requestId}`, requestId, artifact: ARTIFACT, runtime: 'ollama', placement: { kind: 'cpu' },
    residency: { mode: 'create', instance: 'residency-1', generation: 1 }, residencyVramMib: 0, requestVramMib: 0,
    contextLength: 4096, kvCacheType: 'f16', issuedAt: '2026-10-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z',
  }
}

function ticketFor(request: AdmissionRequest, endpoint: string, admissionId: string): AdmissionTicket {
  const grant = grantFor(request.requestId)
  return {
    admissionId, requestId: request.requestId, client: request.client, grant,
    unit: {
      unitId: 'unit-1', grantId: grant.grantId, artifact: ARTIFACT, residencyKey: 'residency-1', generation: 1,
      runtime: 'ollama', endpoint, containerId: 'container-1', devices: [],
    },
  }
}

class FakeSource implements AdmissionSource {
  readonly admitted: AdmissionRequest[] = []
  readonly finished: string[] = []
  private sequence = 0

  constructor(private readonly decide: (request: AdmissionRequest, admissionId: string) => CoordinatorAdmission | Error) {}

  async admit(request: AdmissionRequest): Promise<CoordinatorAdmission> {
    this.admitted.push(request)
    const outcome = this.decide(request, `admission-${++this.sequence}`)
    if (outcome instanceof Error) throw outcome
    return outcome
  }

  async finish(admissionId: string): Promise<'finished' | 'absent'> {
    this.finished.push(admissionId)
    return 'finished'
  }
}

function fakeRuntime(): FakeOpenAIUpstream {
  const runtime = startFakeOpenAIUpstream()
  cleanups.push(runtime.stop)
  return runtime
}

/** El endpoint de una unidad es la base del runtime, sin `/v1`. */
function endpointOf(runtime: FakeOpenAIUpstream): string {
  return runtime.baseUrl.replace(/\/v1$/, '')
}

function admitTo(endpoint: string) {
  return (request: AdmissionRequest, admissionId: string): CoordinatorAdmission =>
    ({ status: 'admitted', ticket: ticketFor(request, endpoint, admissionId) })
}

function relay(source: AdmissionSource): AdmittedUpstream {
  let next = 0
  const upstream = startAdmittedUpstream({ source, client: 'proxy-test', newRequestId: () => `request-${++next}` })
  cleanups.push(() => upstream.stop())
  return upstream
}

function chat(upstream: AdmittedUpstream, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${upstream.baseUrl}/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

const HELLO = { model: MODEL, messages: [{ role: 'user', content: 'hola' }] }

async function errorOf(response: Response): Promise<{ type: string; message: string }> {
  return ((await response.json()) as { error: { type: string; message: string } }).error
}

describe('startAdmittedUpstream', () => {
  test('admite el modelo pedido y reenvía sólo al endpoint de la unidad del ticket', async () => {
    const runtime = fakeRuntime()
    const source = new FakeSource(admitTo(endpointOf(runtime)))
    const response = await chat(relay(source), HELLO)
    expect(response.status).toBe(200)
    expect(((await response.json()) as { choices: { message: { content: string } }[] }).choices[0]?.message.content).toBe('eco: hola')
    expect(source.admitted).toEqual([{ requestId: 'request-1', client: 'proxy-test', model: MODEL }])
    expect(runtime.paths).toEqual(['/v1/chat/completions'])
    expect(runtime.received[0]?.model).toBe(MODEL)
    expect(source.finished).toEqual(['admission-1'])
  })

  test('en streaming, finish espera a que el cliente termine de leer el cuerpo', async () => {
    const runtime = fakeRuntime()
    const source = new FakeSource(admitTo(endpointOf(runtime)))
    const response = await chat(relay(source), { ...HELLO, stream: true })
    expect(response.status).toBe(200)
    expect(source.finished).toEqual([])
    expect(await response.text()).toContain('eco: hola')
    await Bun.sleep(0)
    expect(source.finished).toEqual(['admission-1'])
  })

  test('un cliente que abandona el stream también suelta la admisión', async () => {
    const runtime = fakeRuntime()
    const source = new FakeSource(admitTo(endpointOf(runtime)))
    const response = await chat(relay(source), { ...HELLO, stream: true })
    await response.body?.cancel()
    for (let attempt = 0; attempt < 50 && source.finished.length === 0; attempt += 1) await Bun.sleep(10)
    expect(source.finished).toEqual(['admission-1'])
  })

  test('una admisión rehusada responde 503 con su etapa y causa y no reenvía', async () => {
    const runtime = fakeRuntime()
    const source = new FakeSource(() => ({ status: 'refused', stage: 'resolve', reason: 'modelo fuera del catálogo' }))
    const response = await chat(relay(source), HELLO)
    expect(response.status).toBe(ADMISSION_REFUSED_STATUS)
    const error = await errorOf(response)
    expect(error.type).toBe('admission_refused')
    expect(error.message).toContain('resolve')
    expect(error.message).toContain('modelo fuera del catálogo')
    expect(runtime.received).toHaveLength(0)
    expect(source.finished).toEqual([])
  })

  test('una admisión fallida responde 503 con tipo propio, etapa y causa', async () => {
    const source = new FakeSource(() => ({ status: 'failed', stage: 'materialize', reason: 'podman create salió 125' }))
    const response = await chat(relay(source), HELLO)
    expect(response.status).toBe(ADMISSION_REFUSED_STATUS)
    const error = await errorOf(response)
    expect(error.type).toBe('admission_failed')
    expect(error.message).toContain('materialize')
    expect(error.message).toContain('podman create salió 125')
  })

  test('sin coordinador responde 503 coordinator_unavailable con la causa', async () => {
    const source = new FakeSource(() => new Error('no hay coordinador de model scheduling en /run/x.sock: ENOENT'))
    const response = await chat(relay(source), HELLO)
    expect(response.status).toBe(ADMISSION_REFUSED_STATUS)
    const error = await errorOf(response)
    expect(error.type).toBe('coordinator_unavailable')
    expect(error.message).toContain('/run/x.sock')
  })

  test('un runtime que no responde da 502 y la admisión se suelta igual', async () => {
    const source = new FakeSource(admitTo(CLOSED_PORT_ENDPOINT))
    const response = await chat(relay(source), HELLO)
    expect(response.status).toBe(UPSTREAM_UNREACHABLE_STATUS)
    expect((await errorOf(response)).type).toBe('upstream_unreachable')
    expect(source.finished).toEqual(['admission-1'])
  })

  test('una petición sin modelo se rechaza sin pedir admisión', async () => {
    const source = new FakeSource(admitTo(CLOSED_PORT_ENDPOINT))
    const response = await chat(relay(source), { messages: [] })
    expect(response.status).toBe(400)
    expect(source.admitted).toHaveLength(0)
  })

  test('dos peticiones concurrentes son dos admisiones, cada una soltada una vez', async () => {
    const runtime = fakeRuntime()
    const source = new FakeSource(admitTo(endpointOf(runtime)))
    const upstream = relay(source)
    const responses = await Promise.all([chat(upstream, HELLO), chat(upstream, HELLO)])
    await Promise.all(responses.map(response => response.text()))
    await Bun.sleep(0)
    expect(source.admitted.map(request => request.requestId).sort()).toEqual(['request-1', 'request-2'])
    expect([...source.finished].sort()).toEqual(['admission-1', 'admission-2'])
  })
})
