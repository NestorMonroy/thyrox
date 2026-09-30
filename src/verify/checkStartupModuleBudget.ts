/**
 * Gate: cada camino de arranque carga a lo sumo los módulos que su baseline
 * declara.
 *
 * El coste del arranque de thyrox es el número de módulos que se transpilan y
 * enlazan, no el código que ejecutan: el 89 % del tiempo medido es nativo
 * (`.claude/workbench/startup-flow-130-20260928T162343`). Las fases de #130
 * cortaron el bootstrap de 4627 a 2903 módulos; este gate impide que el
 * número vuelva a crecer sin que nadie lo decida.
 *
 * Cada camino se mide en un proceso propio: el `require.cache` de un proceso
 * que ya importó otro camino contaría los dos.
 *
 * Métrica: claves de `require.cache` tras importar la entrada de cada camino,
 * contra el tope por camino de `.claude/baselines/startup_module_budget.json`.
 * Ciega a: el tiempo de pared y la memoria (dos caminos con el mismo número de
 * módulos pueden costar distinto), a un módulo que se carga más tarde que la
 * importación, y a un binario compilado, donde la transpilación ya ocurrió.
 *
 * Uso:
 *   bun src/verify/checkStartupModuleBudget.ts [--root R] [--baseline B]              reporte
 *   bun src/verify/checkStartupModuleBudget.ts [--root R] [--baseline B] --strict     exit 1 si un camino supera su tope
 *   bun src/verify/checkStartupModuleBudget.ts [--root R] [--baseline B] --write-baseline
 * Sale 2, sin cifra, si un camino no se puede medir o el baseline no se lee.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

export type PathBudget = { entry: string; budget: number }
export type Baseline = Record<string, PathBudget>
export type Violation = { path: string; measured: number; budget: number }

const BASELINE_FILE = join('.claude', 'baselines', 'startup_module_budget.json')
const PROBE_FLAG = '--probe'

/** Los caminos cuyo número de módulos supera su tope. */
export function compareBudget(measured: Record<string, number>, baseline: Baseline): Violation[] {
  return Object.entries(baseline)
    .filter(([path, { budget }]) => (measured[path] ?? 0) > budget)
    .map(([path, { budget }]) => ({ path, measured: measured[path]!, budget }))
}

/** Módulos cargados tras importar `entry` en un proceso aparte; `null` si no se pudo importar. */
export function measureModuleCount(entry: string): number | null {
  const result = Bun.spawnSync([process.execPath, import.meta.path, PROBE_FLAG, entry], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const count = Number.parseInt(result.stdout.toString().trim(), 10)
  return result.exitCode === 0 && Number.isInteger(count) ? count : null
}

function readBaseline(file: string): Baseline | null {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as { paths?: Baseline }
    return parsed.paths ?? null
  } catch {
    return null
  }
}

function argumentValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

function refuse(message: string): never {
  console.error(`checkStartupModuleBudget: REHÚSA — ${message}`)
  process.exit(2)
}

async function probe(entry: string): Promise<void> {
  await import(entry)
  console.log(Object.keys(require.cache).length)
  process.exit(0)
}

function main(args: string[]): void {
  const root = argumentValue(args, '--root') ?? process.cwd()
  const baselineFile = argumentValue(args, '--baseline') ?? join(root, BASELINE_FILE)
  const baseline = existsSync(baselineFile) ? readBaseline(baselineFile) : null
  if (!baseline) refuse(`no se pudo leer el baseline ${baselineFile}`)

  const measured: Record<string, number> = {}
  for (const [path, { entry }] of Object.entries(baseline)) {
    const count = measureModuleCount(isAbsolute(entry) ? entry : join(root, entry))
    if (count === null) refuse(`el camino ${path} no se pudo medir: ${entry} no se importa`)
    measured[path] = count
  }

  if (args.includes('--write-baseline')) {
    const paths = Object.fromEntries(
      Object.entries(baseline).map(([path, { entry }]) => [path, { entry, budget: measured[path]! }]),
    )
    writeFileSync(baselineFile, `${JSON.stringify({ paths }, null, 2)}\n`)
    console.log(`baseline escrito: ${Object.keys(paths).length} camino(s) en ${baselineFile}`)
    return
  }

  for (const [path, { budget }] of Object.entries(baseline)) {
    console.log(`${path}\t${measured[path]} de ${budget} módulos`)
  }
  const violations = compareBudget(measured, baseline)
  for (const { path, measured: count, budget } of violations) {
    console.log(`SUPERA ${path}: ${count} módulos, tope ${budget}`)
  }
  console.log(`${violations.length} camino(s) por encima de su tope (alcance medido: ${Object.keys(baseline).length} camino(s))`)
  process.exit(args.includes('--strict') && violations.length > 0 ? 1 : 0)
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const probeIndex = args.indexOf(PROBE_FLAG)
  if (probeIndex >= 0) await probe(args[probeIndex + 1]!)
  else main(args)
}
