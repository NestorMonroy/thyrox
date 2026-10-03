/**
 * Cualifica un modelo local: corre cada caso de una suite contra `/api/chat` de
 * la unidad admitida, con `options.num_ctx`, puntúa cada respuesta y mide
 * tokens/s como lo declara el propio Ollama (suma de `eval_count` entre suma de
 * `eval_duration`). Aprueba sólo si acierta todos.
 *
 * Dos suites comparten esa medición y difieren en lo que puntúan:
 * - de **protocolo** (`runQualification`, `tool-calling@1`): llamadas a herramienta bien formadas;
 * - de **tarea** (`runTaskQualification`, TASK-THYROX-0780): el trabajo de una
 *   clase, con los casos y las comprobaciones que escribe el consumidor.
 *
 * Métrica: aciertos exactos por caso, n = 1, temperatura 0 y semilla fija.
 * Ciega a: la variación entre corridas y la calidad fuera de estos casos.
 */

import { LOCAL_REASONING_EFFORT, type MeasurementCondition, type ModelQualification } from '@thyrox/model-artifacts/modelQualification.ts'

import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'

import { admittedChat } from './admittedChat.js'
import { admittedEmbed, type EmbedReply } from './admittedEmbed.js'
import { scoreEmbeddingCase, type EmbeddingCase, type EmbeddingSuite } from './embeddingSuite.js'
import type { ChatReply } from './ollamaApi.js'
import { scoreTaskReply, type TaskCase, type TaskSuite } from './taskSuite.js'
import { scoreReply, type Suite, type SuiteCase } from './toolCallingSuite.js'

/** La semilla del benchmark de origen: la misma medición se repite igual. */
export const QUALIFICATION_SEED = 7
const QUALIFICATION_TEMPERATURE = 0
const NANOSECONDS_PER_SECOND = 1e9
const OBSERVED_PREVIEW_LENGTH = 120

export interface MeasurementSettings {
  /** La admisión del coordinador: el modelo es el concedido y sólo se habla con su unidad (M8). */
  readonly ticket: AdmissionTicket
  /** Si la medición corre sola: sólo así su velocidad puede ordenar candidatos. */
  readonly measurementCondition: MeasurementCondition
  readonly contextTokens: number
  readonly now: () => Date
}

export interface QualificationRequest extends MeasurementSettings {
  readonly suite: Suite
}

export interface TaskQualificationRequest extends MeasurementSettings {
  readonly suite: TaskSuite
}

export interface EmbeddingQualificationRequest extends MeasurementSettings {
  readonly suite: EmbeddingSuite
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

/** Un caso listo para medir: lo que se envía y cómo se puntúa la respuesta. */
interface MeasuredCase {
  readonly prompt: Readonly<Record<string, unknown>>
  outcome(reply: ChatReply): CaseOutcome
}

/** Lo que distingue una cualificación de otra: su clase de evidencia y la suite que la midió. */
type QualificationIdentity = Pick<ModelQualification, 'kind' | 'taskClass' | 'suite'>

/** La suite de protocolo entera; un error HTTP aborta sin cualificación, no cuenta como caso fallado. */
export async function runQualification(request: QualificationRequest): Promise<QualificationRun> {
  const cases = request.suite.cases.map(suiteCase => protocolCase(suiteCase))
  return measure(request, cases, { kind: 'protocol', suite: request.suite.id })
}

/** La suite de tarea de un consumidor: la cualificación es de la clase que la suite declara. */
export async function runTaskQualification(request: TaskQualificationRequest): Promise<QualificationRun> {
  const cases = request.suite.cases.map(taskCase => measuredTaskCase(taskCase))
  return measure(request, cases, { kind: 'task', taskClass: request.suite.taskClass, suite: request.suite.id })
}

/**
 * La suite de embeddings: cada caso se embebe en una sola petición
 * (consulta, relevante, distractores) y se puntúa por coseno. La velocidad es
 * la de entrada —`prompt_eval_count` entre `total_duration`—, porque un
 * embedding no genera tokens.
 */
export async function runEmbeddingQualification(request: EmbeddingQualificationRequest): Promise<QualificationRun> {
  requireContextWithinGrant(request)
  const model = request.ticket.grant.artifact.modelId
  const replies: EmbedReply[] = []
  for (const embeddingCase of request.suite.cases) replies.push(await admittedEmbed(request.ticket, textsOf(embeddingCase)))
  const outcomes = request.suite.cases.map((embeddingCase, index) => embeddingOutcome(embeddingCase, replies[index] as EmbedReply))
  const speed = ratePerSecond(model, replies.map(reply => ({ tokens: reply.promptEvalCount, nanoseconds: reply.totalDurationNs })))
  return qualificationRun(request, { kind: 'embedding', suite: request.suite.id }, outcomes, speed)
}

/**
 * Plazo de cada caso. Una generación en CPU midió más de 300 s para un caso de
 * tarea de qwen3-4b; el plazo acota un runtime que no responde, no la velocidad.
 */
const CASE_DEADLINE_MS = 30 * 60_000

async function measure(settings: MeasurementSettings, cases: readonly MeasuredCase[], identity: QualificationIdentity): Promise<QualificationRun> {
  requireContextWithinGrant(settings)
  const model = settings.ticket.grant.artifact.modelId
  const replies: ChatReply[] = []
  for (const measuredCase of cases) {
    replies.push(await admittedChat(settings.ticket, chatBody(settings, measuredCase), { deadlineMs: CASE_DEADLINE_MS }))
  }
  const outcomes = cases.map((measuredCase, index) => measuredCase.outcome(replies[index] as ChatReply))
  return qualificationRun(settings, identity, outcomes, tokensPerSecond(model, replies))
}

function requireContextWithinGrant(settings: MeasurementSettings): void {
  const granted = settings.ticket.grant.contextLength
  if (settings.contextTokens > granted) throw new ContextBeyondGrantError(settings.contextTokens, granted)
}

function qualificationRun(settings: MeasurementSettings, identity: QualificationIdentity, outcomes: readonly CaseOutcome[], speed: number): QualificationRun {
  const casesPassed = outcomes.filter(outcome => outcome.passed).length
  return {
    outcomes,
    qualification: {
      model: settings.ticket.grant.artifact.modelId,
      ...identity,
      casesPassed,
      casesTotal: outcomes.length,
      passed: casesPassed === outcomes.length,
      contextTokens: settings.contextTokens,
      tokensPerSecond: speed,
      measurementCondition: settings.measurementCondition,
      measuredAt: settings.now().toISOString(),
      reasoningEffort: LOCAL_REASONING_EFFORT,
    },
  }
}

function textsOf(embeddingCase: EmbeddingCase): string[] {
  return [embeddingCase.query, embeddingCase.relevant, ...embeddingCase.distractors]
}

function embeddingOutcome(embeddingCase: EmbeddingCase, reply: EmbedReply): CaseOutcome {
  const [query, relevant, ...distractors] = reply.embeddings
  const score = scoreEmbeddingCase({ query: query ?? [], relevant: relevant ?? [], distractors })
  return { caseId: embeddingCase.id, passed: score.passed, observed: `margen ${score.margin.toFixed(4)}` }
}

function protocolCase(suiteCase: SuiteCase): MeasuredCase {
  return {
    prompt: { messages: suiteCase.messages, tools: suiteCase.tools },
    outcome: reply => ({
      caseId: suiteCase.id,
      passed: scoreReply(suiteCase.expectation, reply),
      observed: JSON.stringify({ content: reply.content, toolCalls: reply.toolCalls }).slice(0, OBSERVED_PREVIEW_LENGTH),
    }),
  }
}

function measuredTaskCase(taskCase: TaskCase): MeasuredCase {
  return {
    prompt: { messages: taskCase.messages },
    outcome: reply => {
      const score = scoreTaskReply(taskCase.checks, reply.content)
      const preview = reply.content.slice(0, OBSERVED_PREVIEW_LENGTH)
      return { caseId: taskCase.id, passed: score.passed, observed: score.passed ? preview : `${score.failed.join('; ')} · ${preview}` }
    },
  }
}

function chatBody(settings: MeasurementSettings, measuredCase: MeasuredCase): Record<string, unknown> {
  return {
    ...measuredCase.prompt,
    stream: false,
    // El perfil del worker local (`LOCAL_REASONING_EFFORT`): en /api/chat de
    // Ollama, `think: false`. Medir razonando no dice cómo trabaja sin razonar.
    think: false,
    options: { temperature: QUALIFICATION_TEMPERATURE, seed: QUALIFICATION_SEED, num_ctx: settings.contextTokens },
  }
}

function tokensPerSecond(model: string, replies: readonly ChatReply[]): number {
  return ratePerSecond(model, replies.map(reply => ({ tokens: reply.evalCount, nanoseconds: reply.evalDurationNs })))
}

function ratePerSecond(model: string, samples: readonly { readonly tokens: number, readonly nanoseconds: number }[]): number {
  const tokens = samples.reduce((sum, sample) => sum + sample.tokens, 0)
  const nanoseconds = samples.reduce((sum, sample) => sum + sample.nanoseconds, 0)
  if (!(nanoseconds > 0) || !(tokens > 0)) throw new UnmeasuredSpeedError(model)
  return tokens / (nanoseconds / NANOSECONDS_PER_SECOND)
}
