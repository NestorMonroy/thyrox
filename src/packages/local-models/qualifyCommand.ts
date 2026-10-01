/**
 * `local-models-qualify <nombre-contractual> [--context N] [--isolated]`:
 * pide el modelo al coordinador del anfitrión por su socket, corre
 * `tool-calling@1` sólo contra la unidad del ticket, suelta la admisión y
 * añade la medición al archivo de cualificaciones (ADR-007 1.14.0, M8). Es una cualificación de **protocolo**: prueba
 * llamadas a herramienta bien formadas, no la competencia en una clase de
 * tarea, que mide otra suite. La medición es `contended` salvo que se declare
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
import { runQualification } from './qualifyModel.js'
import { TOOL_CALLING_SUITE_PATH, loadSuite } from './toolCallingSuite.js'

/** Quién pide la admisión, para trazar en el coordinador. */
const QUALIFY_CLIENT = 'local-models-qualify'
/** Contexto de servicio de la medición si no se declara; el coordinador lo acota al máximo del modelo. */
export const DEFAULT_QUALIFICATION_CONTEXT_TOKENS = 8192

export const QUALIFY_USAGE = 'uso: local-models-qualify <nombre-contractual> [--context N] [--isolated]'

const CONTEXT_FLAG = '--context'
const ISOLATED_FLAG = '--isolated'

class QualifyRefusal extends Error {}

interface QualifyArguments {
  readonly model: string
  readonly measurementCondition: MeasurementCondition
  readonly contextTokens: number | undefined
}

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
  const client = await ModelCoordinatorClient.connect(modelCoordinatorSocketPath(context.env))
  try {
    const ticket = admittedTicketOf(await client.admit({ requestId: randomUUID(), client: QUALIFY_CLIENT, model: args.model, contextLength: contextTokens }))
    try {
      return await qualifyAdmitted(ticket, args, contextTokens, home.qualifications, context)
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

async function qualifyAdmitted(ticket: AdmissionTicket, args: QualifyArguments, contextTokens: number, qualificationsPath: string, context: CommandContext): Promise<number> {
  const run = await runQualification({
    ticket,
    suite: await loadSuite(TOOL_CALLING_SUITE_PATH),
    measurementCondition: args.measurementCondition,
    contextTokens,
    now: context.now,
  })
  await appendQualification(qualificationsPath, run.qualification)
  run.outcomes.forEach(outcome => context.output.stdout(`${outcome.passed ? 'ok  ' : 'FALLA'} ${outcome.caseId}\t${outcome.observed}`))
  const { qualification } = run
  const verdict = qualification.passed ? 'aprobada' : 'suspendida'
  context.output.stdout(`${verdict}: ${qualification.model} protocolo ${qualification.suite} ${qualification.casesPassed}/${qualification.casesTotal}, ${qualification.tokensPerSecond.toFixed(1)} tokens/s (${qualification.measurementCondition}), ctx ${contextTokens} → ${qualificationsPath}`)
  return qualification.passed ? EXIT_OK : EXIT_NOT_APPROVED
}

function parseArguments(argv: readonly string[]): QualifyArguments {
  const isolated = argv.includes(ISOLATED_FLAG)
  const withoutIsolated = argv.filter(argument => argument !== ISOLATED_FLAG)
  const flagAt = withoutIsolated.indexOf(CONTEXT_FLAG)
  const positional = flagAt < 0 ? withoutIsolated : [...withoutIsolated.slice(0, flagAt), ...withoutIsolated.slice(flagAt + 2)]
  if (positional.length !== 1) throw new QualifyRefusal('se espera exactamente el nombre contractual')
  return {
    model: positional[0] ?? '',
    measurementCondition: isolated ? 'isolated' : 'contended',
    contextTokens: flagAt < 0 ? undefined : positiveInteger(withoutIsolated[flagAt + 1]),
  }
}

function positiveInteger(text: string | undefined): number {
  const value = Number(text)
  if (!Number.isSafeInteger(value) || value <= 0) throw new QualifyRefusal(`${CONTEXT_FLAG} «${String(text)}» no es un entero positivo`)
  return value
}
