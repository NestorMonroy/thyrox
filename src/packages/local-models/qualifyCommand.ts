/**
 * `local-models-qualify <nombre-contractual> [--context N] [--isolated] [--suite SUITE.json]`:
 * pide el modelo al coordinador del anfitrión por su socket, corre la suite
 * sólo contra la unidad del ticket, suelta la admisión y añade la medición al
 * archivo de cualificaciones (ADR-007 1.14.0, M8). Sin `--suite` corre
 * `tool-calling@1`, una cualificación de **protocolo**: prueba llamadas a
 * herramienta bien formadas, no la competencia en una clase de tarea. Con
 * `--suite` corre la suite de **tarea** del consumidor y cualifica la clase que
 * esa suite declara (TASK-THYROX-0780); se lee antes de pedir admisión, para que
 * una suite rota no materialice nada. Dónde se escribe lo decide el consumidor
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
import { runQualification, runTaskQualification, type MeasurementSettings, type QualificationRun } from './qualifyModel.js'
import { loadTaskSuite } from './taskSuite.js'
import { TOOL_CALLING_SUITE_PATH, loadSuite } from './toolCallingSuite.js'

/** Quién pide la admisión, para trazar en el coordinador. */
const QUALIFY_CLIENT = 'local-models-qualify'
/** Contexto de servicio de la medición si no se declara; el coordinador lo acota al máximo del modelo. */
export const DEFAULT_QUALIFICATION_CONTEXT_TOKENS = 8192

export const QUALIFY_USAGE = 'uso: local-models-qualify <nombre-contractual> [--context N] [--isolated] [--suite SUITE.json]'

const CONTEXT_FLAG = '--context'
const ISOLATED_FLAG = '--isolated'
const SUITE_FLAG = '--suite'

class QualifyRefusal extends Error {}

interface QualifyArguments {
  readonly model: string
  readonly measurementCondition: MeasurementCondition
  readonly contextTokens: number | undefined
  /** La suite de tarea del consumidor; sin ella, la de protocolo. */
  readonly suitePath: string | undefined
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
  const plan = await qualificationPlan(args.suitePath)
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

async function qualificationPlan(suitePath: string | undefined): Promise<QualificationPlan> {
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
  return qualification.kind === 'task' ? `tarea ${qualification.taskClass}` : 'protocolo'
}

function parseArguments(argv: readonly string[]): QualifyArguments {
  const positional: string[] = []
  let contextTokens: number | undefined
  let suitePath: string | undefined
  let isolated = false
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === ISOLATED_FLAG) isolated = true
    else if (argument === CONTEXT_FLAG) contextTokens = positiveInteger(argv[++index])
    else if (argument === SUITE_FLAG) suitePath = requiredValue(SUITE_FLAG, argv[++index])
    else positional.push(argument ?? '')
  }
  if (positional.length !== 1) throw new QualifyRefusal('se espera exactamente el nombre contractual')
  return { model: positional[0] ?? '', measurementCondition: isolated ? 'isolated' : 'contended', contextTokens, suitePath }
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
