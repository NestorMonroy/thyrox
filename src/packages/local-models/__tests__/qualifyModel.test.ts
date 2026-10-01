import { afterEach, describe, expect, test } from 'bun:test'

import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'
import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'

import { OllamaRequestError } from '../ollamaApi.js'
import { ContextBeyondGrantError, runQualification } from '../qualifyModel.js'
import { TOOL_CALLING_SUITE_PATH, loadSuite } from '../toolCallingSuite.js'
import { CORRECT_TOOL_CALLING_REPLIES, startFakeOllama, type FakeChatReply, type FakeOllama } from '../testing/fakeOllama.js'

const ARTIFACT = resolvedArtifact()
const MODEL = ARTIFACT.modelId
const NOW = new Date('2026-10-01T05:00:00.000Z')
const CONTEXT_TOKENS = 8192
const GRANTED_CONTEXT = 16384

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
      runtime: 'ollama', endpoint, containerId: 'container-1', devices: [],
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
