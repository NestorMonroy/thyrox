/**
 * Cualifica un modelo local para una clase de tarea: corre cada caso de la
 * suite contra `/api/chat` con `options.num_ctx`, puntúa con la recompensa de
 * la suite y mide tokens/s como lo declara el propio Ollama (suma de
 * `eval_count` entre suma de `eval_duration`). Aprueba sólo si acierta todos.
 *
 * Métrica: aciertos exactos por caso, n = 1, temperatura 0 y semilla fija.
 * Ciega a: la variación entre corridas y la calidad fuera de estos casos.
 */

import type { LocalTaskClass, ModelQualification } from '@thyrox/model-artifacts/modelQualification.ts'

import type { ChatReply, OllamaApi } from './ollamaApi.js'
import { scoreReply, type Suite, type SuiteCase } from './toolCallingSuite.js'

/** La semilla del benchmark de origen: la misma medición se repite igual. */
export const QUALIFICATION_SEED = 7
const QUALIFICATION_TEMPERATURE = 0
const NANOSECONDS_PER_SECOND = 1e9
const OBSERVED_PREVIEW_LENGTH = 120

export interface QualificationRequest {
  readonly api: OllamaApi
  readonly suite: Suite
  readonly model: string
  readonly taskClass: LocalTaskClass
  readonly contextTokens: number
  readonly now: () => Date
}

export interface CaseOutcome {
  readonly caseId: string
  readonly passed: boolean
  readonly observed: string
}

export interface QualificationRun {
  readonly qualification: ModelQualification
  readonly outcomes: readonly CaseOutcome[]
}

export class UnmeasuredSpeedError extends Error {
  constructor(model: string) {
    super(`Ollama no declaró eval_duration para ${model}: sin tokens/s no hay cualificación`)
    this.name = 'UnmeasuredSpeedError'
  }
}

/** Corre la suite entera; un error HTTP aborta sin cualificación, no cuenta como caso fallado. */
export async function runQualification(request: QualificationRequest): Promise<QualificationRun> {
  const replies: ChatReply[] = []
  for (const suiteCase of request.suite.cases) replies.push(await request.api.chat(chatBody(request, suiteCase)))
  const outcomes = request.suite.cases.map((suiteCase, index) => outcomeOf(suiteCase, replies[index] as ChatReply))
  const casesPassed = outcomes.filter(outcome => outcome.passed).length
  return {
    outcomes,
    qualification: {
      model: request.model,
      taskClass: request.taskClass,
      suite: request.suite.id,
      casesPassed,
      casesTotal: outcomes.length,
      passed: casesPassed === outcomes.length,
      contextTokens: request.contextTokens,
      tokensPerSecond: tokensPerSecond(request.model, replies),
      measuredAt: request.now().toISOString(),
    },
  }
}

function chatBody(request: QualificationRequest, suiteCase: SuiteCase): Record<string, unknown> {
  return {
    model: request.model,
    messages: suiteCase.messages,
    tools: suiteCase.tools,
    stream: false,
    options: { temperature: QUALIFICATION_TEMPERATURE, seed: QUALIFICATION_SEED, num_ctx: request.contextTokens },
  }
}

function outcomeOf(suiteCase: SuiteCase, reply: ChatReply): CaseOutcome {
  const observed = JSON.stringify({ content: reply.content, toolCalls: reply.toolCalls }).slice(0, OBSERVED_PREVIEW_LENGTH)
  return { caseId: suiteCase.id, passed: scoreReply(suiteCase.expectation, reply), observed }
}

function tokensPerSecond(model: string, replies: readonly ChatReply[]): number {
  const tokens = replies.reduce((sum, reply) => sum + reply.evalCount, 0)
  const nanoseconds = replies.reduce((sum, reply) => sum + reply.evalDurationNs, 0)
  if (!(nanoseconds > 0) || !(tokens > 0)) throw new UnmeasuredSpeedError(model)
  return tokens / (nanoseconds / NANOSECONDS_PER_SECOND)
}
