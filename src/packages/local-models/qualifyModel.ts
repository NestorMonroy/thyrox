/**
 * Cualifica un modelo local para una clase de tarea: corre cada caso de la
 * suite contra `/api/chat` de la unidad admitida, con `options.num_ctx`,
 * puntúa con la recompensa de la suite y mide tokens/s como lo declara el propio Ollama (suma de
 * `eval_count` entre suma de `eval_duration`). Aprueba sólo si acierta todos.
 *
 * Métrica: aciertos exactos por caso, n = 1, temperatura 0 y semilla fija.
 * Ciega a: la variación entre corridas y la calidad fuera de estos casos.
 */

import type { MeasurementCondition, ModelQualification } from '@thyrox/model-artifacts/modelQualification.ts'

import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'

import { admittedChat } from './admittedChat.js'
import type { ChatReply } from './ollamaApi.js'
import { scoreReply, type Suite, type SuiteCase } from './toolCallingSuite.js'

/** La semilla del benchmark de origen: la misma medición se repite igual. */
export const QUALIFICATION_SEED = 7
const QUALIFICATION_TEMPERATURE = 0
const NANOSECONDS_PER_SECOND = 1e9
const OBSERVED_PREVIEW_LENGTH = 120

export interface QualificationRequest {
  /** La admisión del coordinador: el modelo es el concedido y sólo se habla con su unidad (M8). */
  readonly ticket: AdmissionTicket
  readonly suite: Suite
  /** Si la medición corre sola: sólo así su velocidad puede ordenar candidatos. */
  readonly measurementCondition: MeasurementCondition
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

/** Se pidió medir con más contexto del que el grant concede: la medición no correspondería a lo concedido. */
export class ContextBeyondGrantError extends Error {
  constructor(readonly requested: number, readonly granted: number) {
    super(`la cualificación pide ${requested} tokens de contexto y el grant concede ${granted}`)
    this.name = 'ContextBeyondGrantError'
  }
}

/** Corre la suite entera; un error HTTP aborta sin cualificación, no cuenta como caso fallado. */
export async function runQualification(request: QualificationRequest): Promise<QualificationRun> {
  const granted = request.ticket.grant.contextLength
  if (request.contextTokens > granted) throw new ContextBeyondGrantError(request.contextTokens, granted)
  const model = request.ticket.grant.artifact.modelId
  const replies: ChatReply[] = []
  for (const suiteCase of request.suite.cases) replies.push(await admittedChat(request.ticket, chatBody(request, suiteCase)))
  const outcomes = request.suite.cases.map((suiteCase, index) => outcomeOf(suiteCase, replies[index] as ChatReply))
  const casesPassed = outcomes.filter(outcome => outcome.passed).length
  return {
    outcomes,
    qualification: {
      model,
      kind: 'protocol',
      suite: request.suite.id,
      casesPassed,
      casesTotal: outcomes.length,
      passed: casesPassed === outcomes.length,
      contextTokens: request.contextTokens,
      tokensPerSecond: tokensPerSecond(model, replies),
      measurementCondition: request.measurementCondition,
      measuredAt: request.now().toISOString(),
    },
  }
}

function chatBody(request: QualificationRequest, suiteCase: SuiteCase): Record<string, unknown> {
  return {
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
