#!/usr/bin/env bun
/**
 * La puerta al recomendador: dónde se ejecuta una clase de tarea, con qué
 * modelo y con qué esfuerzo.
 *
 * El problema que cierra. `cost/policy.ts` cruza los dos ejes —los registros
 * del catálogo contra los niveles de esfuerzo— y publica sus exclusiones con
 * razón. Estaba probado y era **inalcanzable desde donde se despacha**: se
 * despachó un agente en `claude-opus-5` donde `claude-fable-5-1` dominaba en
 * los dos ejes porque el operador no tenía cómo preguntar.
 *
 * Primero se mira la instalación: un modelo local con una medición aprobada
 * vigente de la clase y contexto suficiente gana, y se sirve por Ollama. Si
 * ninguno cumple, se cae al catálogo del proveedor por `claude-cli` y la
 * salida nombra la causa. `--runtime claude-cli` declara el proveedor de
 * forma explícita y la declaración queda en la salida.
 *
 * Por qué el contexto es un parámetro y no una constante: el orden cambia con
 * él, y además decide si la medición de un modelo local alcanza.
 *
 * Salidas: 0 con recomendación · 2 si ningún modelo cumple el perfil, si un
 * argumento no se entiende o si el catálogo local o sus cualificaciones son
 * ilegibles — nunca una recomendación por defecto, que sería elegir sin medir.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { localModelHome, type LocalModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { parseQualifications, type ModelQualification } from '@thyrox/model-artifacts/modelQualification.ts'
import {
  providerExecution,
  recommendExecution,
  TASK_KINDS,
  type ExecutionRecommendation,
  type LocalExecution,
  type LocalModelInventory,
  type ProviderExecution,
  type TaskKind,
} from '@thyrox/provider/cost/policy'

/** El piso siempre-cargado de una sesión multi-repo, medido (H-DOCS-99). */
const SUBAGENT_FLOOR_TOKENS = 126_029
const EXIT_OK = 0
const EXIT_REFUSED = 2
const DECLARABLE_RUNTIME = 'claude-cli'
const OPTIONS_WITH_VALUE = new Set(['--context', '--runtime'])
const FILE_NOT_FOUND_CODE = 'ENOENT'
/** `src/packages/agent/bin` está cuatro niveles por debajo de la raíz de thyrox. */
const ROOT_FROM_BIN = '../../../..'
const TOKENS_PER_THOUSAND = 1000

type CliArguments = {
  kind?: string
  context?: string
  runtime?: string
  json: boolean
  help: boolean
}

class RefusalError extends Error {}

function usage(): string {
  return [
    'uso: bun run bin/recommend.ts <clase> [--context N] [--runtime claude-cli] [--json]',
    '',
    `  clase     ${TASK_KINDS.join(' | ')}`,
    `  --context tokens releídos por turno (por defecto ${SUBAGENT_FLOOR_TOKENS},`,
    '            el piso siempre-cargado; súbelo con lo que el agente vaya a leer)',
    `  --runtime ${DECLARABLE_RUNTIME}: declara el proveedor y no mira los modelos locales`,
    '  --json    la recomendación completa, para consumo por otro guion',
  ].join('\n')
}

function parseArguments(argv: readonly string[]): CliArguments {
  const parsed: CliArguments = { json: false, help: false }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string
    if (OPTIONS_WITH_VALUE.has(argument)) {
      const value = argv[index + 1] ?? ''
      if (argument === '--context') parsed.context = value
      else parsed.runtime = value
      index += 1
    } else if (argument === '--json') parsed.json = true
    else if (argument === '-h' || argument === '--help') parsed.help = true
    else if (!argument.startsWith('-') && parsed.kind === undefined) parsed.kind = argument
  }
  return parsed
}

function isTaskKind(value: string): value is TaskKind {
  return (TASK_KINDS as readonly string[]).includes(value)
}

function requireKind(kind: string): TaskKind {
  if (isTaskKind(kind)) return kind
  throw new RefusalError(`«${kind}» no es una clase. NO se emite una `
    + 'recomendación por defecto: elegir sin medir es el defecto que este '
    + `guion existe para cerrar.\n\n${usage()}`)
}

function requireContextTokens(raw: string | undefined): number {
  const contextTokens = raw === undefined ? SUBAGENT_FLOOR_TOKENS : Number(raw)
  if (!Number.isFinite(contextTokens) || contextTokens <= 0) {
    throw new RefusalError('--context exige un entero positivo de tokens.')
  }
  return contextTokens
}

function requireDeclarableRuntime(runtime: string): void {
  if (runtime !== DECLARABLE_RUNTIME) {
    throw new RefusalError(`--runtime sólo declara ${DECLARABLE_RUNTIME}; «${runtime}» no se declara: `
      + 'un modelo local se elige por su cualificación, no a mano.')
  }
}

function thyroxRoot(): string {
  return process.env.THYROX_ROOT?.trim() || resolve(import.meta.dir, ROOT_FROM_BIN)
}

function isFileNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === FILE_NOT_FOUND_CODE
}

/** Un archivo ausente es una lista vacía; uno ilegible o inválido rehúsa con su ruta. */
async function loadQualifications(path: string): Promise<ModelQualification[]> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (isFileNotFound(error)) return []
    throw new RefusalError(`cualificaciones ilegibles (${path}): ${(error as Error).message}`)
  }
  try {
    return parseQualifications(text)
  } catch (error) {
    throw new RefusalError(`cualificaciones inválidas (${path}): ${(error as Error).message}`)
  }
}

async function loadCatalogEntries(path: string): Promise<LocalModelInventory['entries']> {
  try {
    return (await loadModelCatalog(path)).entries()
  } catch (error) {
    throw new RefusalError(`catálogo local inválido (${path}): ${(error as Error).message}`)
  }
}

async function loadLocalInventory(home: LocalModelHome): Promise<LocalModelInventory> {
  return {
    entries: await loadCatalogEntries(home.catalog),
    qualifications: await loadQualifications(home.qualifications),
  }
}

async function chooseExecution(kind: TaskKind, contextTokens: number, runtime: string | undefined): Promise<ExecutionRecommendation & { runtimeDeclared?: true }> {
  if (runtime !== undefined) {
    requireDeclarableRuntime(runtime)
    return { ...providerExecution(kind, { contextTokens }), runtimeDeclared: true }
  }
  const inventory = await loadLocalInventory(localModelHome(process.env, thyroxRoot()))
  return recommendExecution(kind, { contextTokens }, inventory)
}

function printLocal(execution: LocalExecution): void {
  const { qualification } = execution
  console.log(`  clase ${execution.taskClass} · runtime ollama`
    + ` · contexto ${execution.contextTokens.toLocaleString('es')} tokens\n`)
  console.log(`  → ${execution.model}`)
  console.log(`\n  cualificación ${qualification.suite}: ${qualification.casesPassed}/${qualification.casesTotal}`
    + ` · contexto medido ${qualification.contextTokens.toLocaleString('es')}`
    + ` · ${qualification.tokensPerSecond} tokens/s · ${qualification.measuredAt}`)
}

function providerOrigin(execution: ProviderExecution, declared: boolean): string {
  if (declared) return `declarado con --runtime ${DECLARABLE_RUNTIME}`
  return `respaldo: ${execution.fallbackReason ?? 'sin motivo'}`
}

function printProvider(execution: ProviderExecution, contextTokens: number, declared: boolean): void {
  const equivalent = (tokens: number) => `${Math.round(tokens / TOKENS_PER_THOUSAND)}k`
  console.log(`  runtime claude-cli (${providerOrigin(execution, declared)})`)
  console.log(`  clase ${execution.kind} · esfuerzo ${execution.effort}`
    + `${execution.effortIndex === null ? '' : ` (índice ${execution.effortIndex})`}`
    + ` · contexto ${contextTokens.toLocaleString('es')} tokens`)
  console.log(`  vara: equivalentes de ${execution.unitModel}\n`)
  for (const [index, candidate] of execution.ranked.entries()) {
    console.log(`  ${index === 0 ? '→' : ' '} ${candidate.model.padEnd(22)}`
      + ` ${equivalent(candidate.equivPerTurn).padStart(7)}/turno`)
  }
  console.log(`\n  ${execution.ranked.length} candidato(s) · ${execution.excluded.length}`
    + ' excluido(s) con razón (alcance medido: el catálogo completo)')
  for (const exclusion of execution.excluded) {
    console.log(`      ${String(exclusion.model).padEnd(22)} ${exclusion.why}`)
  }
}

async function run(argv: readonly string[]): Promise<number> {
  const options = parseArguments(argv)
  if (options.kind === undefined || options.help) {
    console.log(usage())
    return options.kind === undefined ? EXIT_REFUSED : EXIT_OK
  }
  const kind = requireKind(options.kind)
  const contextTokens = requireContextTokens(options.context)
  const execution = await chooseExecution(kind, contextTokens, options.runtime)
  if (options.json) console.log(JSON.stringify(execution, null, 2))
  else if (execution.runtime === 'ollama') printLocal(execution)
  else printProvider(execution, contextTokens, execution.runtimeDeclared === true)
  return EXIT_OK
}

async function main(argv: readonly string[]): Promise<number> {
  try {
    return await run(argv)
  } catch (error) {
    console.error(`recommend: ${(error as Error).message}`)
    return EXIT_REFUSED
  }
}

process.exit(await main(process.argv.slice(2)))
