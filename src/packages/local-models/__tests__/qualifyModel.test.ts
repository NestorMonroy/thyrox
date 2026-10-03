import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'

import { OllamaRequestError } from '../ollamaApi.js'
import { ContextBeyondGrantError, UnmeasuredSpeedError, UnprofiledUnitError, runEmbeddingQualification, runQualification, runTaskQualification, runWorkflowQualification, type WorkflowCaseResult } from '../qualifyModel.js'
import type { EmbeddingSuite } from '../embeddingSuite.js'
import { loadTaskSuite, type TaskSuite } from '../taskSuite.js'
import { TOOL_CALLING_SUITE_PATH, loadSuite } from '../toolCallingSuite.js'
import type { WorkflowCase, WorkflowSuite } from '../workflowSuite.ts'
import { CORRECT_TOOL_CALLING_REPLIES, startFakeOllama, type FakeChatReply, type FakeOllama } from '../testing/fakeOllama.js'

const ARTIFACT = resolvedArtifact()
const MODEL = ARTIFACT.modelId
const NOW = new Date('2026-10-01T05:00:00.000Z')
const CONTEXT_TOKENS = 8192
const GRANTED_CONTEXT = 16384

/** El perfil con que la unidad se materializó: la cualificación lo registra (TASK-THYROX-0931). */
const UNIT_PROFILE = {
  image: 'docker.io/ollama/ollama:0.35.0', cpus: 2, memoryMib: 8192,
  environment: { OLLAMA_HOST: '0.0.0.0:11434', LLAMA_ARG_CACHE_RAM: '0' },
}

/** Lo que la cualificación registra de ese perfil y del grant. */
const RUNTIME_PROFILE = {
  artifactSha256: ARTIFACT.artifactId, revision: ARTIFACT.revision, quantization: ARTIFACT.quantization,
  kvCacheType: 'f16', promptCache: 'disabled', runtime: 'docker.io/ollama/ollama:0.35.0',
  cpus: 2, memoryMib: 8192, threads: null, systemBudgetTokens: null,
}

/**
 * La cualificación sólo alcanza el runtime por una admisión (ADR-007 1.14.0,
 * M8): el ticket lleva el modelo concedido y la unidad cuyo endpoint se usa.
 */
function ticketTo(endpoint: string): AdmissionTicket {
  const grant: ExecutionGrant = {
    grantId: 'grant-1', requestId: 'request-1', artifact: ARTIFACT, runtime: 'ollama', placement: { kind: 'cpu' },
    residency: { mode: 'create', instance: 'residency-1', generation: 1 }, residencyVramMib: 0, requestVramMib: 0,
    contextLength: GRANTED_CONTEXT, kvCacheType: 'f16', issuedAt: '2026-10-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z',
  }
  return {
    admissionId: 'admission-1', requestId: 'request-1', client: 'qualify', grant,
    unit: {
      unitId: 'unit-1', grantId: grant.grantId, artifact: ARTIFACT, residencyKey: 'residency-1', generation: 1,
      runtime: 'ollama', endpoint, containerId: 'container-1', devices: [], profile: UNIT_PROFILE,
    },
  }
}

let server: FakeOllama | undefined
afterEach(async () => {
  await server?.stop()
  server = undefined
})

async function qualify(reply: (prompt: string) => FakeChatReply, contextTokens = CONTEXT_TOKENS) {
  server = startFakeOllama({ chat: prompt => reply(prompt) })
  const suite = await loadSuite(TOOL_CALLING_SUITE_PATH)
  return runQualification({ ticket: ticketTo(server.baseUrl), suite, measurementCondition: 'contended', contextTokens, now: () => NOW })
}

function correct(prompt: string): FakeChatReply {
  return CORRECT_TOOL_CALLING_REPLIES[prompt] ?? { content: '' }
}

describe('runQualification — tool-calling@1 contra /api/chat', () => {
  test('seis aciertos aprueban, con la suite, el contexto servido y el instante', async () => {
    const { qualification, outcomes } = await qualify(correct)
    expect(outcomes.map(o => o.passed)).toEqual([true, true, true, true, true, true])
    expect(qualification).toEqual({
      model: MODEL,
      kind: 'protocol',
      suite: 'tool-calling@1',
      casesPassed: 6,
      casesTotal: 6,
      passed: true,
      contextTokens: CONTEXT_TOKENS,
      tokensPerSecond: 20,
      measurementCondition: 'contended',
      measuredAt: '2026-10-01T05:00:00.000Z',
      reasoningEffort: 'none',
      runtimeProfile: { ...RUNTIME_PROFILE, tools: ['add', 'get_weather', 'list_dir', 'read_file', 'set_mode'] },
    })
  })

  test('cinco de seis no aprueban, y el caso fallado dice lo que se observó', async () => {
    const { qualification, outcomes } = await qualify(prompt =>
      prompt === 'Switch the operating mode to safe.' ? { toolCalls: [{ name: 'set_mode', arguments: { mode: 'fast' } }] } : correct(prompt))
    expect(qualification.casesPassed).toBe(5)
    expect(qualification.passed).toBe(false)
    const failed = outcomes.find(o => !o.passed)
    expect(failed?.caseId).toBe('enum_argument')
    expect(failed?.observed).toContain('fast')
  })

  test('tokens/s es la suma de eval_count entre la suma de eval_duration', async () => {
    const { qualification } = await qualify(prompt =>
      ({ ...correct(prompt), evalCount: prompt.startsWith('What') ? 70 : 10, evalDurationNs: 500_000_000 }))
    // (70 + 5×10) tokens en 6 × 0.5 s
    expect(qualification.tokensPerSecond).toBe(40)
  })

  test('cada petición lleva el modelo, sus herramientas, stream falso y num_ctx', async () => {
    await qualify(correct)
    const chats = server?.requests.filter(r => r.path === '/api/chat') ?? []
    expect(chats).toHaveLength(6)
    const first = chats[0]?.body as Record<string, any>
    expect(first.model).toBe(MODEL)
    expect(first.stream).toBe(false)
    // El perfil del worker local: sin razonamiento. En /api/chat es think false.
    expect(first.think).toBe(false)
    expect(first.options).toEqual({ temperature: 0, seed: 7, num_ctx: CONTEXT_TOKENS })
    expect(first.tools.map((t: any) => t.function.name)).toEqual(['get_weather'])
    const continuation = chats[5]?.body as Record<string, any>
    expect(continuation.messages.map((m: any) => m.role)).toEqual(['user', 'assistant', 'tool'])
  })

  test('un error HTTP no es un caso fallado: se rehúsa sin cualificación', async () => {
    await expect(qualify(() => ({ status: 500 }))).rejects.toThrow(OllamaRequestError)
  })

  test('pedir más contexto que el concedido se rehúsa sin tocar el runtime', async () => {
    await expect(qualify(correct, GRANTED_CONTEXT + 1)).rejects.toThrow(ContextBeyondGrantError)
    expect(server?.requests.filter(r => r.path === '/api/chat') ?? []).toHaveLength(0)
  })

  test('una respuesta sin eval_duration no mide velocidad y se rehúsa', async () => {
    await expect(qualify(prompt => ({ ...correct(prompt), evalDurationNs: 0 }))).rejects.toThrow(/tokens\/s/)
  })
})

describe('runTaskQualification — la suite de tarea de un consumidor (TASK-THYROX-0780)', () => {
  let directory: string
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'task-qualification-')) })
  afterEach(() => { rmSync(directory, { recursive: true, force: true }) })

  async function taskSuite(): Promise<TaskSuite> {
    const path = join(directory, 'suite.json')
    writeFileSync(path, JSON.stringify({
      id: 'es-mx-translation@1',
      taskClass: 'analisis',
      cases: [
        { id: 'uno', messages: [{ role: 'user', content: '一' }], checks: [{ kind: 'includes', text: 'uno' }] },
        { id: 'dos', messages: [{ role: 'user', content: '二' }], checks: [{ kind: 'excludes-pattern', pattern: '\\p{Script=Han}' }] },
      ],
    }))
    return loadTaskSuite(path)
  }

  async function qualifyTask(reply: (prompt: string) => FakeChatReply, contextTokens = CONTEXT_TOKENS) {
    server = startFakeOllama({ chat: prompt => reply(prompt) })
    return runTaskQualification({ ticket: ticketTo(server.baseUrl), suite: await taskSuite(), measurementCondition: 'isolated', contextTokens, now: () => NOW })
  }

  const translated = (prompt: string): FakeChatReply => ({ content: prompt === '一' ? 'uno' : 'dos' })

  test('todos los casos cumplen: una cualificación de tarea de la clase de la suite', async () => {
    const { qualification } = await qualifyTask(translated)
    expect(qualification).toEqual({
      model: MODEL,
      kind: 'task',
      taskClass: 'analisis',
      suite: 'es-mx-translation@1',
      casesPassed: 2,
      casesTotal: 2,
      passed: true,
      contextTokens: CONTEXT_TOKENS,
      tokensPerSecond: 20,
      measurementCondition: 'isolated',
      measuredAt: '2026-10-01T05:00:00.000Z',
      reasoningEffort: 'none',
      runtimeProfile: { ...RUNTIME_PROFILE, tools: [] },
    })
  })

  test('un caso que falla suspende, y su resultado nombra la comprobación', async () => {
    const { qualification, outcomes } = await qualifyTask(prompt => ({ content: prompt === '一' ? 'uno' : '二' }))
    expect(qualification.passed).toBe(false)
    expect(qualification.casesPassed).toBe(1)
    expect(outcomes.find(o => !o.passed)?.observed).toContain('excludes-pattern')
  })

  test('cada petición lleva los mensajes del caso, sin herramientas, stream falso y num_ctx', async () => {
    await qualifyTask(translated)
    const chats = (server?.requests ?? []).filter(r => r.path === '/api/chat').map(r => r.body as Record<string, unknown>)
    expect(chats).toHaveLength(2)
    expect(chats.every(body => body.model === MODEL && body.stream === false && body.think === false && !('tools' in body))).toBe(true)
    expect(chats.map(body => (body.options as { num_ctx: number }).num_ctx)).toEqual([CONTEXT_TOKENS, CONTEXT_TOKENS])
  })

  test('pedir más contexto que el concedido se rehúsa sin tocar el runtime', async () => {
    await expect(qualifyTask(translated, GRANTED_CONTEXT + 1)).rejects.toThrow(ContextBeyondGrantError)
    expect(server?.requests ?? []).toHaveLength(0)
  })
})

describe('runEmbeddingQualification', () => {
  const SUITE: EmbeddingSuite = {
    id: 'embedding-findings@1',
    cases: [{ id: 'cancel', query: 'cancel a job', relevant: 'cancel the running job', distractors: ['bake bread', 'paint a wall'] }],
  }
  /** Un embedder de juguete: el texto que menciona «cancel» apunta a un eje, el resto al otro. */
  const topical = (text: string): number[] => text.includes('cancel') ? [1, 0.1] : [0.1, 1]
  const inverted = (text: string): number[] => text === 'cancel a job' ? [1, 0] : text.includes('cancel') ? [0, 1] : [1, 0.05]

  async function qualifyEmbedding(embed: (text: string) => readonly number[], measurement?: { promptEvalCount: number, totalDurationNs: number }) {
    server = startFakeOllama({ embed, ...(measurement ? { embedMeasurement: measurement } : {}) })
    return runEmbeddingQualification({ ticket: ticketTo(server.baseUrl), suite: SUITE, measurementCondition: 'isolated', contextTokens: CONTEXT_TOKENS, now: () => NOW })
  }

  test('passes when every query retrieves its relevant document, as an embedding qualification', async () => {
    const run = await qualifyEmbedding(topical)
    expect(run.qualification).toMatchObject({ model: MODEL, kind: 'embedding', suite: 'embedding-findings@1', casesPassed: 1, casesTotal: 1, passed: true })
    expect(run.qualification.taskClass).toBeUndefined()
    expect(server!.requests[0]).toMatchObject({ path: '/api/embed', body: { model: MODEL, input: ['cancel a job', 'cancel the running job', 'bake bread', 'paint a wall'] } })
  })

  test('fails the case when a distractor is nearer than the relevant document', async () => {
    const run = await qualifyEmbedding(inverted)
    expect(run.qualification.passed).toBe(false)
    expect(run.outcomes[0]).toMatchObject({ caseId: 'cancel', passed: false })
  })

  test('speed is input tokens over total duration, as Ollama declares them', async () => {
    const run = await qualifyEmbedding(topical, { promptEvalCount: 40, totalDurationNs: 2_000_000_000 })
    expect(run.qualification.tokensPerSecond).toBe(20)
  })

  test('without a declared duration there is no qualification', async () => {
    await expect(qualifyEmbedding(topical, { promptEvalCount: 40, totalDurationNs: 0 })).rejects.toThrow(UnmeasuredSpeedError)
  })
})

describe('runQualification — el perfil de runtime con que se midió (TASK-THYROX-0931)', () => {
  test('una unidad sin perfil declarado no cualifica: la medida no diría con qué se tomó', async () => {
    server = startFakeOllama({ chat: prompt => correct(prompt) })
    const ticket = ticketTo(server.baseUrl)
    const { profile: _profile, ...unprofiled } = ticket.unit
    const suite = await loadSuite(TOOL_CALLING_SUITE_PATH)
    await expect(runQualification({ ticket: { ...ticket, unit: unprofiled }, suite, measurementCondition: 'isolated', contextTokens: CONTEXT_TOKENS, now: () => NOW }))
      .rejects.toBeInstanceOf(UnprofiledUnitError)
  })

  test('sin LLAMA_ARG_CACHE_RAM=0 la caché de prompt es la del runtime, no «desactivada»', async () => {
    server = startFakeOllama({ chat: prompt => correct(prompt) })
    const ticket = ticketTo(server.baseUrl)
    const unit = { ...ticket.unit, profile: { ...UNIT_PROFILE, environment: { OLLAMA_HOST: '0.0.0.0:11434' } } }
    const suite = await loadSuite(TOOL_CALLING_SUITE_PATH)
    const { qualification } = await runQualification({ ticket: { ...ticket, unit }, suite, measurementCondition: 'isolated', contextTokens: CONTEXT_TOKENS, now: () => NOW })
    expect(qualification.runtimeProfile?.promptCache).toBe('runtime-default')
  })
})

describe('runWorkflowQualification — repo-code-change@1 por el pool (TASK-THYROX-0931)', () => {
  const SUITE: WorkflowSuite = {
    id: 'repo-code-change@1', taskClass: 'mecanica', promptPath: '/suite/prompt.md', tools: ['Read', 'Write', 'Edit', 'Bash'],
    cases: [{ id: 'title-slug', item: 'Implement title_slug.', verify: 'bash verify.sh' }, { id: 'second', item: 'Other.', verify: 'true' }],
  }
  const ticket = () => ticketTo('http://127.0.0.1:1')

  function results(byCase: Record<string, WorkflowCaseResult>): (workflowCase: WorkflowCase) => Promise<WorkflowCaseResult> {
    return async workflowCase => byCase[workflowCase.id] as WorkflowCaseResult
  }

  test('aprueba sólo con todos los casos verificados; registra flujo, clase, herramientas y velocidad de pared', async () => {
    const runCase = results({
      'title-slug': { verdict: 'verificado', outputTokens: 600, durationMs: 60_000 },
      second: { verdict: 'verificado', outputTokens: 400, durationMs: 40_000 },
    })
    const { qualification, outcomes } = await runWorkflowQualification({ ticket: ticket(), suite: SUITE, runCase, measurementCondition: 'isolated', contextTokens: CONTEXT_TOKENS, now: () => NOW })
    expect(outcomes.map(o => [o.caseId, o.passed, o.observed])).toEqual([['title-slug', true, 'verificado'], ['second', true, 'verificado']])
    expect(qualification).toMatchObject({ kind: 'workflow', taskClass: 'mecanica', suite: 'repo-code-change@1', casesPassed: 2, casesTotal: 2, passed: true, tokensPerSecond: 10 })
    expect(qualification.runtimeProfile?.tools).toEqual(['Read', 'Write', 'Edit', 'Bash'])
  })

  test('un caso rechazado, sin cambios o no servido localmente suspende', async () => {
    for (const verdict of ['rechazado', 'sin-cambios', 'no-local', 'fallido']) {
      const runCase = results({ 'title-slug': { verdict, outputTokens: 10, durationMs: 1000 }, second: { verdict: 'verificado', outputTokens: 10, durationMs: 1000 } })
      const { qualification } = await runWorkflowQualification({ ticket: ticket(), suite: SUITE, runCase, measurementCondition: 'isolated', contextTokens: CONTEXT_TOKENS, now: () => NOW })
      expect([verdict, qualification.passed, qualification.casesPassed]).toEqual([verdict, false, 1])
    }
  })

  test('sin tokens generados no hay velocidad: no se registra', async () => {
    const runCase = results({ 'title-slug': { verdict: 'fallido', outputTokens: 0, durationMs: 0 }, second: { verdict: 'fallido', outputTokens: 0, durationMs: 0 } })
    await expect(runWorkflowQualification({ ticket: ticket(), suite: SUITE, runCase, measurementCondition: 'isolated', contextTokens: CONTEXT_TOKENS, now: () => NOW }))
      .rejects.toBeInstanceOf(UnmeasuredSpeedError)
  })

  test('el contexto pedido no excede el concedido, y la unidad sin perfil se rehúsa antes de correr ningún caso', async () => {
    let ran = 0
    const runCase = async () => { ran += 1; return { verdict: 'verificado', outputTokens: 1, durationMs: 1 } }
    await expect(runWorkflowQualification({ ticket: ticket(), suite: SUITE, runCase, measurementCondition: 'isolated', contextTokens: GRANTED_CONTEXT + 1, now: () => NOW }))
      .rejects.toBeInstanceOf(ContextBeyondGrantError)
    const { profile: _profile, ...unprofiled } = ticket().unit
    await expect(runWorkflowQualification({ ticket: { ...ticket(), unit: unprofiled }, suite: SUITE, runCase, measurementCondition: 'isolated', contextTokens: CONTEXT_TOKENS, now: () => NOW }))
      .rejects.toBeInstanceOf(UnprofiledUnitError)
    expect(ran).toBe(0)
  })
})
