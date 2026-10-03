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

import { LOCAL_REASONING_EFFORT, type MeasurementCondition, type ModelQualification, type QualificationRuntimeProfile } from '@thyrox/model-artifacts/modelQualification.ts'

import type { AdmissionTicket } from '@thyrox/model-scheduling/hostCoordinator.ts'
import type { ModelUnitProfile } from '@thyrox/model-scheduling/modelUnitMaterializer.ts'

import { admittedChat } from './admittedChat.js'
import { admittedEmbed, type EmbedReply } from './admittedEmbed.js'
import { scoreEmbeddingCase, type EmbeddingCase, type EmbeddingSuite } from './embeddingSuite.js'
import type { ChatReply } from './ollamaApi.js'
import { scoreTaskReply, type TaskCase, type TaskSuite } from './taskSuite.js'
import { scoreReply, type Suite, type SuiteCase } from './toolCallingSuite.js'
import type { WorkflowCase, WorkflowSuite } from './workflowSuite.ts'

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

/** Lo que el pool dejó de un caso de flujo: su verdict y lo que el worker generó. */
export interface WorkflowCaseResult {
  /** `verificado`, `rechazado`, `sin-cambios`, `no-local`, `fallido`… (`item_worktree.sh finalize`). */
  readonly verdict: string
  readonly outputTokens: number
  readonly durationMs: number
}

export interface WorkflowQualificationRequest extends MeasurementSettings {
  readonly suite: WorkflowSuite
  /** Corre un caso por el pool, contra la residencia que este ticket mantiene. */
  readonly runCase: (workflowCase: WorkflowCase) => Promise<WorkflowCaseResult>
}

/** El único verdict que aprueba un caso: el pool aplicó el cambio en el worktree y su verify pasó. */
const VERIFIED_VERDICT = 'verificado'
const MILLISECONDS_PER_SECOND = 1000

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

/**
 * La unidad admitida no declara el perfil con que se materializó: la medida
 * no podría decir con qué CPU, memoria, imagen ni caché se tomó (TASK-THYROX-0931).
 */
export class UnprofiledUnitError extends Error {
  constructor(readonly unitId: string) {
    super(`la unidad ${unitId} no declara su perfil de runtime: sin él la cualificación no es del worker`)
    this.name = 'UnprofiledUnitError'
  }
}

/** La variable con que la unidad de Ollama apaga la caché de prompt en RAM (`hostCoordinatorComposition.ts`). */
const PROMPT_CACHE_OFF = { variable: 'LLAMA_ARG_CACHE_RAM', value: '0' } as const

/** Un caso listo para medir: lo que se envía y cómo se puntúa la respuesta. */
interface MeasuredCase {
  readonly prompt: Readonly<Record<string, unknown>>
  /** Nombres de las herramientas que el caso ofrece al modelo. */
  readonly tools: readonly string[]
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
  requireUnitProfile(request)
  const model = request.ticket.grant.artifact.modelId
  const replies: EmbedReply[] = []
  for (const embeddingCase of request.suite.cases) replies.push(await admittedEmbed(request.ticket, textsOf(embeddingCase)))
  const outcomes = request.suite.cases.map((embeddingCase, index) => embeddingOutcome(embeddingCase, replies[index] as EmbedReply))
  const speed = ratePerSecond(model, replies.map(reply => ({ tokens: reply.promptEvalCount, nanoseconds: reply.totalDurationNs })))
  return qualificationRun(request, { kind: 'embedding', suite: request.suite.id }, outcomes, speed, { tools: [], systemBudgetTokens: null })
}

/**
 * La suite de flujo (`repo-code-change@1`): cada caso es un ítem del pool en un
 * worktree aislado, y aprueba sólo si su verdict es `verificado`. La velocidad
 * es de PARED —tokens generados entre la duración del ítem—, no de decodificación:
 * incluye herramientas, verify y prefill, que es lo que cuesta el flujo.
 */
export async function runWorkflowQualification(request: WorkflowQualificationRequest): Promise<QualificationRun> {
  requireContextWithinGrant(request)
  requireUnitProfile(request)
  const results: WorkflowCaseResult[] = []
  for (const workflowCase of request.suite.cases) results.push(await request.runCase(workflowCase))
  const outcomes = request.suite.cases.map((workflowCase, index) => workflowOutcome(workflowCase, results[index] as WorkflowCaseResult))
  const identity = { kind: 'workflow', taskClass: request.suite.taskClass, suite: request.suite.id } as const
  return qualificationRun(request, identity, outcomes, workflowSpeed(request, results, outcomes),
    { tools: request.suite.tools, systemBudgetTokens: request.suite.systemBudgetTokens ?? null })
}

/**
 * Tokens generados entre segundos de pared. Un flujo suspendido puede no haber
 * generado nada —el primer turno excedió el contexto—: se escribe con 0 para
 * retirar la aprobación anterior. Uno aprobado sin tokens no es una medida.
 */
function workflowSpeed(request: WorkflowQualificationRequest, results: readonly WorkflowCaseResult[], outcomes: readonly CaseOutcome[]): number {
  const generated = results.some(result => result.outputTokens > 0 && result.durationMs > 0)
  if (!generated && outcomes.some(outcome => !outcome.passed)) return 0
  return ratePerSecond(request.ticket.grant.artifact.modelId,
    results.map(result => ({ tokens: result.outputTokens, nanoseconds: result.durationMs / MILLISECONDS_PER_SECOND * NANOSECONDS_PER_SECOND })))
}

function workflowOutcome(workflowCase: WorkflowCase, result: WorkflowCaseResult): CaseOutcome {
  return { caseId: workflowCase.id, passed: result.verdict === VERIFIED_VERDICT, observed: result.verdict }
}

/**
 * Plazo de cada caso. Una generación en CPU midió más de 300 s para un caso de
 * tarea de qwen3-4b; el plazo acota un runtime que no responde, no la velocidad.
 */
const CASE_DEADLINE_MS = 30 * 60_000

async function measure(settings: MeasurementSettings, cases: readonly MeasuredCase[], identity: QualificationIdentity): Promise<QualificationRun> {
  requireContextWithinGrant(settings)
  requireUnitProfile(settings)
  const model = settings.ticket.grant.artifact.modelId
  const replies: ChatReply[] = []
  for (const measuredCase of cases) {
    replies.push(await admittedChat(settings.ticket, chatBody(settings, measuredCase), { deadlineMs: CASE_DEADLINE_MS }))
  }
  const outcomes = cases.map((measuredCase, index) => measuredCase.outcome(replies[index] as ChatReply))
  return qualificationRun(settings, identity, outcomes, tokensPerSecond(model, replies), { tools: offeredTools(cases), systemBudgetTokens: null })
}

function requireContextWithinGrant(settings: MeasurementSettings): void {
  const granted = settings.ticket.grant.contextLength
  if (settings.contextTokens > granted) throw new ContextBeyondGrantError(settings.contextTokens, granted)
}

/**
 * El perfil de runtime de la medida: la identidad del artefacto y el KV del
 * grant, y la imagen, CPU, memoria y caché de prompt de la unidad. Los hilos y
 * el presupuesto de sistema, si la medición no lo acotó, quedan en `null`.
 */
/** Lo que la medición ofreció al modelo: sus herramientas y, si lo acotó, el presupuesto del prompt de sistema. */
interface OfferedSurface {
  readonly tools: readonly string[]
  readonly systemBudgetTokens: number | null
}

function runtimeProfileOf(settings: MeasurementSettings, surface: OfferedSurface): QualificationRuntimeProfile {
  const { grant } = settings.ticket
  const profile = requireUnitProfile(settings)
  const promptCacheOff = profile.environment[PROMPT_CACHE_OFF.variable] === PROMPT_CACHE_OFF.value
  return {
    artifactSha256: grant.artifact.artifactId,
    revision: grant.artifact.revision,
    quantization: grant.artifact.quantization,
    kvCacheType: grant.kvCacheType,
    promptCache: promptCacheOff ? 'disabled' : 'runtime-default',
    runtime: profile.image,
    cpus: profile.cpus,
    memoryMib: profile.memoryMib,
    threads: null,
    tools: [...surface.tools],
    systemBudgetTokens: surface.systemBudgetTokens,
  }
}

/** Se rehúsa antes de hablar con la unidad: una medida sin perfil no se registraría. */
function requireUnitProfile(settings: MeasurementSettings): ModelUnitProfile {
  const { unit } = settings.ticket
  if (unit.profile === undefined) throw new UnprofiledUnitError(unit.unitId)
  return unit.profile
}

/** La unión ordenada de las herramientas que ofrecen los casos. */
function offeredTools(cases: readonly MeasuredCase[]): string[] {
  return [...new Set(cases.flatMap(measuredCase => measuredCase.tools))].sort()
}

function qualificationRun(settings: MeasurementSettings, identity: QualificationIdentity, outcomes: readonly CaseOutcome[], speed: number, surface: OfferedSurface): QualificationRun {
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
      runtimeProfile: runtimeProfileOf(settings, surface),
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
    tools: suiteCase.tools.map(tool => toolName(tool)),
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
    tools: [],
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

/** El nombre de una herramienta en la forma de función de `/api/chat`. */
function toolName(tool: unknown): string {
  const name = (tool as { readonly function?: { readonly name?: unknown } }).function?.name
  if (typeof name !== 'string') throw new TypeError(`herramienta sin function.name: ${JSON.stringify(tool)}`)
  return name
}
