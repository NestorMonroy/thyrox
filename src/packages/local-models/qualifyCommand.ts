/**
 * `local-models-qualify <nombre-contractual> [--context N] [--isolated]`:
 * corre `tool-calling@1` contra el Ollama gestionado y añade la medición al
 * archivo de cualificaciones. Es una cualificación de **protocolo**: prueba
 * llamadas a herramienta bien formadas, no la competencia en una clase de
 * tarea, que mide otra suite. La medición es `contended` salvo que se declare
 * `--isolated`: sin admisión de recursos no se sabe si corrió sola, y una
 * velocidad contendida no ordena candidatos. El modelo tiene que estar en el
 * catálogo: una cualificación de un modelo no declarado no cuenta.
 *
 * Salidas: 0 aprobada · 1 medida y suspendida (también se escribe: retira una
 * aprobación anterior) · 2 rehusado sin medición.
 */

import { localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import type { MeasurementCondition } from '@thyrox/model-artifacts/modelQualification.ts'

import type { CommandContext } from './catalogCommand.js'
import { EXIT_NOT_APPROVED, EXIT_OK, EXIT_REFUSED } from './commandOutput.js'
import { managedOllama } from './managedOllama.js'
import { OllamaApi } from './ollamaApi.js'
import { appendQualification } from './qualificationStore.js'
import { runQualification } from './qualifyModel.js'
import { TOOL_CALLING_SUITE_PATH, loadSuite } from './toolCallingSuite.js'

/** Contexto de servicio de la medición si no se declara, acotado al máximo del modelo. */
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
  const entry = (await loadModelCatalog(home.catalog)).byName(args.model)
  if (entry === undefined) throw new Error(`«${args.model}» no está en el catálogo ${home.catalog}: decláralo antes con local-models-catalog declare`)
  const contextTokens = args.contextTokens ?? Math.min(DEFAULT_QUALIFICATION_CONTEXT_TOKENS, entry.maxContextLength)
  if (contextTokens > entry.maxContextLength) throw new Error(`--context ${contextTokens} supera el máximo del modelo (${entry.maxContextLength})`)
  const run = await runQualification({
    api: new OllamaApi(managedOllama(context.env).baseUrl),
    suite: await loadSuite(TOOL_CALLING_SUITE_PATH),
    model: args.model,
    measurementCondition: args.measurementCondition,
    contextTokens,
    now: context.now,
  })
  await appendQualification(home.qualifications, run.qualification)
  run.outcomes.forEach(outcome => context.output.stdout(`${outcome.passed ? 'ok  ' : 'FALLA'} ${outcome.caseId}\t${outcome.observed}`))
  const { qualification } = run
  const verdict = qualification.passed ? 'aprobada' : 'suspendida'
  context.output.stdout(`${verdict}: ${qualification.model} protocolo ${qualification.suite} ${qualification.casesPassed}/${qualification.casesTotal}, ${qualification.tokensPerSecond.toFixed(1)} tokens/s (${qualification.measurementCondition}), ctx ${contextTokens} → ${home.qualifications}`)
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
