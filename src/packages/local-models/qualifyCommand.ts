/**
 * `local-models-qualify <nombre-contractual> [--context N] [--isolated] [--suite SUITE.json | --workflow-suite SUITE.json --out DIR]`:
 * pide el modelo al coordinador del anfitrión por su socket, corre la suite
 * sólo contra la unidad del ticket, suelta la admisión y añade la medición al
 * archivo de cualificaciones (ADR-007 1.14.0, M8). Sin `--suite` corre
 * `tool-calling@1`, una cualificación de **protocolo**: prueba llamadas a
 * herramienta bien formadas, no la competencia en una clase de tarea. Con
 * `--suite` corre la suite de **tarea** del consumidor y cualifica la clase que
 * esa suite declara (TASK-THYROX-0780); se lee antes de pedir admisión, para que
 * una suite rota no materialice nada. Con `--workflow-suite SUITE.json --out DIR`
 * mide el flujo entero del worker (`repo-code-change@1`, TASK-THYROX-0931):
 * mantiene la admisión mientras cada caso corre por `headless-pool` en una
 * unidad y un worktree aislado, y deja la salida del pool en DIR. Dónde se escribe lo decide el consumidor
 * (`THYROX_MODEL_QUALIFICATIONS`): así su suite no aprueba el modelo para otros. La medición es `contended` salvo que se declare
 * `--isolated`: sin admisión de recursos no se sabe si corrió sola, y una
 * velocidad contendida no ordena candidatos. Quién resuelve el modelo contra
 * el catálogo y el contexto concedido es el coordinador: un modelo no
 * declarado vuelve como admisión rehusada.
 *
 * Salidas: 0 aprobada · 1 medida y suspendida (también se escribe: retira una
 * aprobación anterior) · 2 rehusado sin medición.
 */

import { randomUUID } from 'node:crypto'
import { localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import type { MeasurementCondition } from '@thyrox/model-artifacts/modelQualification.ts'
import { ModelCoordinatorClient } from '@thyrox/model-scheduling/coordinatorClient.ts'
import { modelCoordinatorSocketPath } from '@thyrox/model-scheduling/coordinatorProtocol.ts'
import type { AdmissionTicket, CoordinatorAdmission } from '@thyrox/model-scheduling/hostCoordinator.ts'

import type { CommandContext } from './catalogCommand.js'
import { EXIT_NOT_APPROVED, EXIT_OK, EXIT_REFUSED } from './commandOutput.js'
import { appendQualification } from './qualificationStore.js'
import { loadEmbeddingSuite } from './embeddingSuite.js'
import { runEmbeddingQualification, runQualification, runTaskQualification, runWorkflowQualification, type MeasurementSettings, type QualificationRun } from './qualifyModel.js'
import { loadTaskSuite } from './taskSuite.js'
import { TOOL_CALLING_SUITE_PATH, loadSuite } from './toolCallingSuite.js'
import { poolCaseRunner } from './workflowPool.ts'
import { loadWorkflowSuite } from './workflowSuite.ts'

/** Quién pide la admisión, para trazar en el coordinador. */
const QUALIFY_CLIENT = 'local-models-qualify'
/** Contexto de servicio de la medición si no se declara; el coordinador lo acota al máximo del modelo. */
export const DEFAULT_QUALIFICATION_CONTEXT_TOKENS = 8192

export const QUALIFY_USAGE = 'uso: local-models-qualify <nombre-contractual> [--context N] [--isolated] [--suite SUITE.json | --embedding-suite SUITE.json | --workflow-suite SUITE.json --out DIR]'

const CONTEXT_FLAG = '--context'
const ISOLATED_FLAG = '--isolated'
const SUITE_FLAG = '--suite'
const EMBEDDING_SUITE_FLAG = '--embedding-suite'
const WORKFLOW_SUITE_FLAG = '--workflow-suite'
const OUT_FLAG = '--out'

class QualifyRefusal extends Error {}

interface QualifyArguments {
  readonly model: string
  readonly measurementCondition: MeasurementCondition
  readonly contextTokens: number | undefined
  /** La suite de tarea del consumidor; sin ella ni la de embeddings, la de protocolo. */
  readonly suitePath: string | undefined
  /** La suite de recuperación de un modelo de embeddings. */
  readonly embeddingSuitePath: string | undefined
  /** La suite de flujo (`repo-code-change@1`): cada caso corre por `headless-pool`. */
  readonly workflowSuitePath: string | undefined
  /** Dónde deja el pool su salida; obligatorio con la suite de flujo. */
  readonly outDir: string | undefined
}

/** La medición elegida, ya con su suite leída: sólo falta el ticket. */
type QualificationPlan = (settings: MeasurementSettings) => Promise<QualificationRun>

export async function runQualifyCommand(argv: readonly string[], context: CommandContext): Promise<number> {
  try {
    return await qualify(parseArguments(argv), context)
  } catch (error) {
    const message = error instanceof QualifyRefusal ? `${error.message}\n${QUALIFY_USAGE}` : error instanceof Error ? error.message : String(error)
    context.output.stderr(`local-models-qualify: ${message}`)
    return EXIT_REFUSED
  }
}

async function qualify(args: QualifyArguments, context: CommandContext): Promise<number> {
  const home = localModelHome(context.env, context.thyroxRoot)
  const contextTokens = args.contextTokens ?? DEFAULT_QUALIFICATION_CONTEXT_TOKENS
  const plan = await qualificationPlan(args, context.thyroxRoot)
  const client = await ModelCoordinatorClient.connect(modelCoordinatorSocketPath(context.env))
  try {
    const ticket = admittedTicketOf(await client.admit({ requestId: randomUUID(), client: QUALIFY_CLIENT, model: args.model, contextLength: contextTokens }))
    try {
      return await qualifyAdmitted(ticket, plan, args, contextTokens, home.qualifications, context)
    } finally {
      await client.finish(ticket.admissionId)
    }
  } finally {
    await client.close()
  }
}

/** El ticket de una admisión concedida; una rehusada o fallida rehúsa con su etapa y causa. */
function admittedTicketOf(admission: CoordinatorAdmission): AdmissionTicket {
  if (admission.status === 'admitted') return admission.ticket
  throw new Error(`el coordinador ${admission.status === 'refused' ? 'rehusó' : 'falló'} la admisión en ${admission.stage}: ${admission.reason}`)
}

async function qualificationPlan(args: QualifyArguments, thyroxRoot: string): Promise<QualificationPlan> {
  const { suitePath, embeddingSuitePath, workflowSuitePath, outDir } = args
  if (workflowSuitePath !== undefined && outDir !== undefined) {
    // El pool pide su propia admisión con el mismo contexto: reutiliza la
    // residencia que este ticket mantiene, así que mide la unidad del perfil.
    const suite = await loadWorkflowSuite(workflowSuitePath)
    return settings => runWorkflowQualification({
      ...settings,
      suite,
      runCase: poolCaseRunner({ suite, artifact: settings.ticket.grant.artifact, contextTokens: settings.contextTokens, thyroxRoot, outDir }),
    })
  }
  if (embeddingSuitePath !== undefined) {
    const suite = await loadEmbeddingSuite(embeddingSuitePath)
    return settings => runEmbeddingQualification({ ...settings, suite })
  }
  if (suitePath === undefined) {
    const suite = await loadSuite(TOOL_CALLING_SUITE_PATH)
    return settings => runQualification({ ...settings, suite })
  }
  const suite = await loadTaskSuite(suitePath)
  return settings => runTaskQualification({ ...settings, suite })
}

async function qualifyAdmitted(ticket: AdmissionTicket, plan: QualificationPlan, args: QualifyArguments, contextTokens: number, qualificationsPath: string, context: CommandContext): Promise<number> {
  const run = await plan({ ticket, measurementCondition: args.measurementCondition, contextTokens, now: context.now })
  await appendQualification(qualificationsPath, run.qualification)
  run.outcomes.forEach(outcome => context.output.stdout(`${outcome.passed ? 'ok  ' : 'FALLA'} ${outcome.caseId}\t${outcome.observed}`))
  const { qualification } = run
  const verdict = qualification.passed ? 'aprobada' : 'suspendida'
  context.output.stdout(`${verdict}: ${qualification.model} ${scopeOf(qualification)} ${qualification.suite} ${qualification.casesPassed}/${qualification.casesTotal}, ${qualification.tokensPerSecond.toFixed(1)} tokens/s (${qualification.measurementCondition}), ctx ${contextTokens} → ${qualificationsPath}`)
  return qualification.passed ? EXIT_OK : EXIT_NOT_APPROVED
}

/** Qué cualifica la medición, para la línea del veredicto. */
function scopeOf(qualification: QualificationRun['qualification']): string {
  if (qualification.kind === 'task') return `tarea ${qualification.taskClass}`
  if (qualification.kind === 'workflow') return `flujo ${qualification.taskClass}`
  return qualification.kind === 'embedding' ? 'embeddings' : 'protocolo'
}

function parseArguments(argv: readonly string[]): QualifyArguments {
  const positional: string[] = []
  let contextTokens: number | undefined
  let suitePath: string | undefined
  let embeddingSuitePath: string | undefined
  let workflowSuitePath: string | undefined
  let outDir: string | undefined
  let isolated = false
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === ISOLATED_FLAG) isolated = true
    else if (argument === CONTEXT_FLAG) contextTokens = positiveInteger(argv[++index])
    else if (argument === SUITE_FLAG) suitePath = requiredValue(SUITE_FLAG, argv[++index])
    else if (argument === EMBEDDING_SUITE_FLAG) embeddingSuitePath = requiredValue(EMBEDDING_SUITE_FLAG, argv[++index])
    else if (argument === WORKFLOW_SUITE_FLAG) workflowSuitePath = requiredValue(WORKFLOW_SUITE_FLAG, argv[++index])
    else if (argument === OUT_FLAG) outDir = requiredValue(OUT_FLAG, argv[++index])
    else positional.push(argument ?? '')
  }
  if (positional.length !== 1) throw new QualifyRefusal('se espera exactamente el nombre contractual')
  const suites = [suitePath, embeddingSuitePath, workflowSuitePath].filter(path => path !== undefined)
  if (suites.length > 1) {
    throw new QualifyRefusal(`${SUITE_FLAG}, ${EMBEDDING_SUITE_FLAG} y ${WORKFLOW_SUITE_FLAG} miden capacidades distintas: una por invocación`)
  }
  if ((workflowSuitePath === undefined) !== (outDir === undefined)) {
    throw new QualifyRefusal(`${WORKFLOW_SUITE_FLAG} y ${OUT_FLAG} van juntas: la salida del pool es la evidencia de la medición`)
  }
  return { model: positional[0] ?? '', measurementCondition: isolated ? 'isolated' : 'contended', contextTokens, suitePath, embeddingSuitePath, workflowSuitePath, outDir }
}

function requiredValue(flag: string, value: string | undefined): string {
  if (value === undefined || value === '' || value.startsWith('--')) throw new QualifyRefusal(`${flag} exige un valor`)
  return value
}

function positiveInteger(text: string | undefined): number {
  const value = Number(text)
  if (!Number.isSafeInteger(value) || value <= 0) throw new QualifyRefusal(`${CONTEXT_FLAG} «${String(text)}» no es un entero positivo`)
  return value
}
