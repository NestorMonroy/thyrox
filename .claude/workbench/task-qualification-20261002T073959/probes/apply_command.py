"""Aplica --suite a local-models-qualify (TASK-THYROX-0780) y endurece la prueba de la suite ilegible."""
from pathlib import Path

ROOT = Path("/home/user/thyrox/src/packages/local-models")


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    assert text.count(old) == 1, f"{path.name}: {text.count(old)} coincidencias de {old[:70]!r}"
    path.write_text(text.replace(old, new), encoding="utf-8")


command = ROOT / "qualifyCommand.ts"
replace_once(command, """ * `local-models-qualify <nombre-contractual> [--context N] [--isolated]`:
 * pide el modelo al coordinador del anfitrión por su socket, corre
 * `tool-calling@1` sólo contra la unidad del ticket, suelta la admisión y
 * añade la medición al archivo de cualificaciones (ADR-007 1.14.0, M8). Es una cualificación de **protocolo**: prueba
 * llamadas a herramienta bien formadas, no la competencia en una clase de
 * tarea, que mide otra suite.""", """ * `local-models-qualify <nombre-contractual> [--context N] [--isolated] [--suite SUITE.json]`:
 * pide el modelo al coordinador del anfitrión por su socket, corre la suite
 * sólo contra la unidad del ticket, suelta la admisión y añade la medición al
 * archivo de cualificaciones (ADR-007 1.14.0, M8). Sin `--suite` corre
 * `tool-calling@1`, una cualificación de **protocolo**: prueba llamadas a
 * herramienta bien formadas, no la competencia en una clase de tarea. Con
 * `--suite` corre la suite de **tarea** del consumidor y cualifica la clase que
 * esa suite declara (TASK-THYROX-0780); se lee antes de pedir admisión, para que
 * una suite rota no materialice nada. Dónde se escribe lo decide el consumidor
 * (`THYROX_MODEL_QUALIFICATIONS`): así su suite no aprueba el modelo para otros.""")
replace_once(command, """import { runQualification } from './qualifyModel.js'
""", """import { runQualification, runTaskQualification, type MeasurementSettings, type QualificationRun } from './qualifyModel.js'
import { loadTaskSuite } from './taskSuite.js'
""")
replace_once(command, """export const QUALIFY_USAGE = 'uso: local-models-qualify <nombre-contractual> [--context N] [--isolated]'
""", """export const QUALIFY_USAGE = 'uso: local-models-qualify <nombre-contractual> [--context N] [--isolated] [--suite SUITE.json]'
""")
replace_once(command, """const ISOLATED_FLAG = '--isolated'
""", """const ISOLATED_FLAG = '--isolated'
const SUITE_FLAG = '--suite'
""")
replace_once(command, """  readonly contextTokens: number | undefined
}
""", """  readonly contextTokens: number | undefined
  /** La suite de tarea del consumidor; sin ella, la de protocolo. */
  readonly suitePath: string | undefined
}

/** La medición elegida, ya con su suite leída: sólo falta el ticket. */
type QualificationPlan = (settings: MeasurementSettings) => Promise<QualificationRun>
""")
replace_once(command, """  const contextTokens = args.contextTokens ?? DEFAULT_QUALIFICATION_CONTEXT_TOKENS
  const client""", """  const contextTokens = args.contextTokens ?? DEFAULT_QUALIFICATION_CONTEXT_TOKENS
  const plan = await qualificationPlan(args.suitePath)
  const client""")
replace_once(command, """      return await qualifyAdmitted(ticket, args, contextTokens, home.qualifications, context)""",
             """      return await qualifyAdmitted(ticket, plan, args, contextTokens, home.qualifications, context)""")
replace_once(command, """async function qualifyAdmitted(ticket: AdmissionTicket, args: QualifyArguments, contextTokens: number, qualificationsPath: string, context: CommandContext): Promise<number> {
  const run = await runQualification({
    ticket,
    suite: await loadSuite(TOOL_CALLING_SUITE_PATH),
    measurementCondition: args.measurementCondition,
    contextTokens,
    now: context.now,
  })""", """async function qualificationPlan(suitePath: string | undefined): Promise<QualificationPlan> {
  if (suitePath === undefined) {
    const suite = await loadSuite(TOOL_CALLING_SUITE_PATH)
    return settings => runQualification({ ...settings, suite })
  }
  const suite = await loadTaskSuite(suitePath)
  return settings => runTaskQualification({ ...settings, suite })
}

async function qualifyAdmitted(ticket: AdmissionTicket, plan: QualificationPlan, args: QualifyArguments, contextTokens: number, qualificationsPath: string, context: CommandContext): Promise<number> {
  const run = await plan({ ticket, measurementCondition: args.measurementCondition, contextTokens, now: context.now })""")
replace_once(command, """${verdict}: ${qualification.model} protocolo ${qualification.suite}""",
             """${verdict}: ${qualification.model} ${scopeOf(qualification)} ${qualification.suite}""")
replace_once(command, """function parseArguments(argv: readonly string[]): QualifyArguments {
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
""", """/** Qué cualifica la medición, para la línea del veredicto. */
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
""")

test = ROOT / "__tests__/qualifyCommand.test.ts"
replace_once(test, """    expect(await runQualifyCommand([MODEL, '--suite', join(directory, 'no-existe.json')], contextFor())).toBe(EXIT_REFUSED)
    expect(coordinator.admitted).toHaveLength(0)""", """    expect(await runQualifyCommand([MODEL, '--suite', join(directory, 'no-existe.json')], contextFor())).toBe(EXIT_REFUSED)
    expect(stderr.join('\\n')).toContain('no-existe.json')
    expect(coordinator.admitted).toHaveLength(0)""")
