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
  type AdmissionSource, type AdmittedUpstream, type ModelFallbackEvent,
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

function relay(source: AdmissionSource, contextLength?: number): AdmittedUpstream {
  let next = 0
  const upstream = startAdmittedUpstream({ source, client: 'proxy-test', newRequestId: () => `request-${++next}`, contextLength })
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

  test('el contexto declarado por el consumidor viaja en la admisión: sin él, el resolver cae al máximo del modelo (A6 r4)', async () => {
    const runtime = fakeRuntime()
    const source = new FakeSource(admitTo(endpointOf(runtime)))
    const response = await chat(relay(source, 24_663), HELLO)
    expect(response.status).toBe(200)
    expect(source.admitted).toEqual([{ requestId: 'request-1', client: 'proxy-test', model: MODEL, contextLength: 24_663 }])
  })

  // A6 r7: un prefill de 25 468 tokens en CPU tarda minutos en dar el primer
  // byte. El corte de 300 s del fetch de Bun no puede decidirlo; el plazo es
  // del pool y del proxy.
  test('el reenvío a la unidad no hereda el plazo de 300 s del fetch de Bun', async () => {
    const runtime = fakeRuntime()
    const original = globalThis.fetch
    const toUnit: (RequestInit & { timeout?: boolean })[] = []
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).startsWith(endpointOf(runtime))) toUnit.push(init ?? {})
      return original(input, init)
    }) as typeof fetch
    try {
      expect((await chat(relay(new FakeSource(admitTo(endpointOf(runtime)))), HELLO)).status).toBe(200)
    } finally {
      globalThis.fetch = original
    }
    expect(toUnit.map(init => init.timeout)).toEqual([false])
  })

  // TASK-THYROX-0919 r2: Qwen3 en Ollama razona por defecto; «42» costó 319
  // tokens, y con `reasoning_effort: "none"` 3 (`probes/think_control.*.out`).
  // A <1 tok/s en CPU, cada turno de 900-1600 tokens eran 25-31 min.
  test('una petición que no pide razonamiento llega a la unidad con reasoning_effort none', async () => {
    const runtime = fakeRuntime()
    await chat(relay(new FakeSource(admitTo(endpointOf(runtime)))), HELLO)
    expect(runtime.received[0]?.reasoning_effort).toBe('none')
  })

  test('el razonamiento que la petición pide se respeta', async () => {
    const runtime = fakeRuntime()
    await chat(relay(new FakeSource(admitTo(endpointOf(runtime)))), { ...HELLO, reasoning_effort: 'medium' })
    expect(runtime.received[0]?.reasoning_effort).toBe('medium')
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

// TASK-THYROX-0921: el relé avanza por los respaldos locales cuando el modelo
// pedido no se puede servir, con los motivos cerrados de la referencia `claude-code-bin/2.1.286`
// (`$a`, `IMo`; banco model-fallback-chain-reference-20261003T192801). Un
// error de la petición o un coordinador ausente no avanzan: no son del modelo.
describe('startAdmittedUpstream con fallbackModels (TASK-THYROX-0921)', () => {
  const FALLBACK = 'thyrox-fallback-b'
  const SECOND = 'thyrox-fallback-c'
  const CONTEXT = 32_768

  function chainRelay(source: AdmissionSource, fallbackModels: readonly string[], events: ModelFallbackEvent[]): AdmittedUpstream {
    let next = 0
    const upstream = startAdmittedUpstream({
      source, client: 'proxy-test', newRequestId: () => `request-${++next}`, contextLength: CONTEXT,
      fallbackModels, onFallback: event => events.push(event),
    })
    cleanups.push(() => upstream.stop())
    return upstream
  }

  /** Decide por modelo: el primario recibe `primary`, el resto se admite al runtime. */
  function byModel(primary: (request: AdmissionRequest, admissionId: string) => CoordinatorAdmission | Error, endpoint: string) {
    return (request: AdmissionRequest, admissionId: string) =>
      (request.model === MODEL ? primary(request, admissionId) : admitTo(endpoint)(request, admissionId))
  }

  const refusedAt = (stage: 'reserve' | 'resolve') => (): CoordinatorAdmission => ({ status: 'refused', stage, reason: `sin sitio en ${stage}` })
  const admittedModels = (source: FakeSource) => source.admitted.map(request => request.model)

  test('una admisión rehusada por recursos avanza al respaldo como overloaded y lo registra', async () => {
    const runtime = fakeRuntime()
    const source = new FakeSource(byModel(refusedAt('reserve'), endpointOf(runtime)))
    const events: ModelFallbackEvent[] = []
    const response = await chat(chainRelay(source, [FALLBACK], events), HELLO)
    expect([response.status, admittedModels(source)]).toEqual([200, [MODEL, FALLBACK]])
    expect(events).toEqual([{ type: 'model_fallback', originalModel: MODEL, fallbackModel: FALLBACK,
      trigger: 'overloaded', chainIndex: 1, contextLength: CONTEXT, reason: 'la admisión rehusó en la etapa reserve: sin sitio en reserve' }])
  })

  test('un modelo que el coordinador no resuelve avanza como model_not_found', async () => {
    const runtime = fakeRuntime()
    const events: ModelFallbackEvent[] = []
    await chat(chainRelay(new FakeSource(byModel(refusedAt('resolve'), endpointOf(runtime))), [FALLBACK], events), HELLO)
    expect(events.map(event => event.trigger)).toEqual(['model_not_found'])
  })

  test('una unidad que falla al establecerse avanza como server_error', async () => {
    const runtime = fakeRuntime()
    const failed = (): CoordinatorAdmission => ({ status: 'failed', stage: 'load', reason: 'el runtime no cargó' })
    const events: ModelFallbackEvent[] = []
    await chat(chainRelay(new FakeSource(byModel(failed, endpointOf(runtime))), [FALLBACK], events), HELLO)
    expect(events.map(event => event.trigger)).toEqual(['server_error'])
  })

  test('un 5xx del runtime suelta la admisión y avanza como server_error', async () => {
    const broken = startFakeOpenAIUpstream({ failure: { kind: 'status', status: 503, body: 'caído' } })
    cleanups.push(broken.stop)
    const healthy = fakeRuntime()
    const source = new FakeSource(byModel(admitTo(endpointOf(broken)), endpointOf(healthy)))
    const events: ModelFallbackEvent[] = []
    const response = await chat(chainRelay(source, [FALLBACK], events), HELLO)
    expect([response.status, source.finished.includes('admission-1'), events.map(event => event.trigger)])
      .toEqual([200, true, ['server_error']])
  })

  test('un 4xx del runtime es de la petición: no avanza', async () => {
    const strict = startFakeOpenAIUpstream({ failure: { kind: 'status', status: 400, body: 'mal formada' } })
    cleanups.push(strict.stop)
    const source = new FakeSource(admitTo(endpointOf(strict)))
    const events: ModelFallbackEvent[] = []
    const response = await chat(chainRelay(source, [FALLBACK], events), HELLO)
    expect([response.status, admittedModels(source), events]).toEqual([400, [MODEL], []])
  })

  test('un coordinador ausente no es del modelo: no avanza', async () => {
    const source = new FakeSource(() => new Error('socket cerrado'))
    const events: ModelFallbackEvent[] = []
    const response = await chat(chainRelay(source, [FALLBACK], events), HELLO)
    expect([response.status, admittedModels(source), events]).toEqual([ADMISSION_REFUSED_STATUS, [MODEL], []])
  })

  test('agotada la cadena responde el último rechazo, tras recorrerla en orden', async () => {
    const source = new FakeSource(refusedAt('reserve'))
    const events: ModelFallbackEvent[] = []
    const response = await chat(chainRelay(source, [FALLBACK, SECOND], events), HELLO)
    expect([response.status, (await errorOf(response)).type, admittedModels(source), events.map(event => event.chainIndex)])
      .toEqual([ADMISSION_REFUSED_STATUS, 'admission_refused', [MODEL, FALLBACK, SECOND], [1, 2]])
  })

  test('el salto es de una petición: la siguiente vuelve a pedir el modelo original', async () => {
    const runtime = fakeRuntime()
    const source = new FakeSource(byModel(refusedAt('reserve'), endpointOf(runtime)))
    const upstream = chainRelay(source, [FALLBACK], [])
    await (await chat(upstream, HELLO)).text()
    await (await chat(upstream, HELLO)).text()
    expect(admittedModels(source)).toEqual([MODEL, FALLBACK, MODEL, FALLBACK])
  })

  test('el propio modelo pedido en la cadena no se reintenta como respaldo', async () => {
    const source = new FakeSource(refusedAt('reserve'))
    await chat(chainRelay(source, [MODEL, FALLBACK], []), HELLO)
    expect(admittedModels(source)).toEqual([MODEL, FALLBACK])
  })
})
