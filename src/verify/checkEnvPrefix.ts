/**
 * Gate: la configuración de thyrox se lee como THYROX_*, y cada variable
 * propia tiene una prueba que la nombra.
 *
 * Directivas del ejecutor 2026-09-27. thyrox es el único cliente: lo que lee
 * como su configuración lleva su prefijo, igual que OmniRoute lee OMNIROUTE_*.
 * Una CLAUDE_* es del cliente ajeno; se renombra con `renameEnvPrefix.ts`, o
 * se marca `thyrox-rename: keep` donde thyrox trata a propósito el entorno de
 * ese cliente (retirar su credencial del entorno de un ítem, por ejemplo).
 * ANTHROPIC_* es la convención del SDK del proveedor y se conserva, como en
 * OmniRoute. Un nombre sin prefijo de producto (HOME, PATH, NODE_ENV) no se
 * juzga: no hay forma léxica de separar uno estándar de uno propio sin
 * prefijo, así que se cuenta y no se bloquea.
 *
 * Trinquete, como `check_product_word.py`: la deuda heredada se congela por
 * archivo en `src/verify/env_prefix_baseline.tsv` y la de cobertura por
 * nombre en `src/verify/env_test_coverage_baseline.tsv`. Una entrada nueva
 * bloquea, y una entrada del baseline que ya no existe también: si no, el
 * baseline miente sobre deuda que el renombre ya pagó.
 *
 * Métrica: lecturas de entorno por nombre literal en los archivos
 * versionados (`git ls-files`) de producción — TypeScript (`process.env`,
 * `readEnv`, `Bun.env`), Python (`environ`, `getenv`) y shell (sólo nombres
 * con prefijo de producto) —; y, para cada THYROX_* leída, si algún archivo
 * de prueba versionado la nombra.
 * Ciega a: la lectura por nombre calculado (`process.env[name]` con `name`
 * variable, una lista de nombres recorrida); a que una prueba que nombra la
 * variable la ejercite de verdad; y a un archivo no versionado.
 *
 * Uso:
 *   bun src/verify/checkEnvPrefix.ts [--root R]                 reporte
 *   bun src/verify/checkEnvPrefix.ts [--root R] --strict        exit 1 si hay deuda nueva u obsoleta
 *   bun src/verify/checkEnvPrefix.ts [--root R] --write-baseline
 * Sale 2, sin cifra, si la raíz no es un repositorio de git.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { keepFlags } from './renameEnvPrefix.ts'

export type Language = 'ts' | 'py' | 'sh'
export type NameClass = 'own' | 'provider' | 'foreign' | 'other'
export type EnvRead = { line: number; name: string; keep: boolean }

const NAME = '([A-Z][A-Z0-9_]*)'
const PATTERNS: Record<Language, RegExp[]> = {
  ts: [
    new RegExp(`process\\.env(?:\\.|\\[\\s*['"\`])${NAME}`, 'g'),
    new RegExp(`\\breadEnv\\(\\s*['"\`]${NAME}`, 'g'),
    new RegExp(`\\bBun\\.env(?:\\.|\\[\\s*['"\`])${NAME}`, 'g'),
  ],
  py: [
    new RegExp(`\\benviron(?:\\.get|\\.setdefault|\\.pop)?\\s*[\\[(]\\s*['"]${NAME}`, 'g'),
    new RegExp(`\\bgetenv\\(\\s*['"]${NAME}`, 'g'),
  ],
  sh: [],
}

// En shell un `$X` suelto no se distingue de una variable local. Un nombre es
// contrato de entorno cuando se le da un valor por defecto no vacío
// (`${X:-v}`, `${X:?}`, `${X+x}`), se exporta, se retira (`unset`) o va de
// prefijo a un comando (`X=v cmd`). Una guarda `${X:-}` y una asignación
// suelta son locales. Sólo cuentan los nombres con prefijo de producto.
const SH_NAME = '((?:THYROX|CLAUDE|ANTHROPIC)_[A-Z0-9_]*[A-Z0-9])'
const SH_PATTERNS = [
  new RegExp(`\\$\\{${SH_NAME}(?::?\\?|:?[-=+](?!\\}))`, 'g'),
  new RegExp(`(?:^|[\\s;(&|\`])${SH_NAME}=(?:"[^"]*"|'[^']*'|[^\\s;)]*)[ \\t]+(?=[A-Za-z./$"'])`, 'g'),
]
const SH_EXPORT = /(?:^|[\s;(&|])(?:export|unset)\s+([^;&|#]*)/g

function shellReads(line: string): { at: number; name: string }[] {
  const found: { at: number; name: string }[] = []
  for (const pattern of SH_PATTERNS) {
    for (const m of line.matchAll(pattern)) found.push({ at: m.index ?? 0, name: m[1]! })
  }
  for (const m of line.matchAll(SH_EXPORT)) {
    const start = (m.index ?? 0) + m[0].length - m[1]!.length
    for (const n of m[1]!.matchAll(new RegExp(`(?<![A-Za-z0-9_$\\{])${SH_NAME}(?![A-Za-z0-9_])`, 'g'))) {
      found.push({ at: start + (n.index ?? 0), name: n[1]! })
    }
  }
  return found
}

export const BASELINE = 'src/verify/env_prefix_baseline.tsv'
export const COVERAGE_BASELINE = 'src/verify/env_test_coverage_baseline.tsv'

/** Las lecturas de entorno del texto, en orden, con la marca keep resuelta. */
export function extractEnvReads(text: string, language: Language): EnvRead[] {
  const lines = text.split('\n')
  const kept = keepFlags(lines)
  const reads: EnvRead[] = []
  lines.forEach((line, i) => {
    const keep = kept[i]!
    const found: { at: number; name: string }[] = []
    for (const pattern of PATTERNS[language]) {
      for (const m of line.matchAll(pattern)) found.push({ at: m.index ?? 0, name: m[1]! })
    }
    if (language === 'sh') found.push(...shellReads(line))
    found
      .filter(f => !f.name.endsWith('_')) // un prefijo de familia no es una variable
      .sort((a, b) => a.at - b.at)
      .forEach(f => reads.push({ line: i + 1, name: f.name, keep }))
  })
  return reads
}

export function classifyName(name: string): NameClass {
  if (name.startsWith('THYROX_')) return 'own'
  if (name.startsWith('ANTHROPIC_')) return 'provider'
  if (name.startsWith('CLAUDE_')) return 'foreign'
  return 'other'
}

export function isTestPath(path: string): boolean {
  return path.startsWith('tests/') || path.includes('/__tests__/') || /\.test\.[a-z]+$/.test(path)
}

export function isProductionPath(path: string): boolean {
  if (!path.startsWith('src/') || isTestPath(path)) return false
  return !/(^|\/)(dist|node_modules)\//.test(path)
}

export function languageOf(path: string): Language | undefined {
  if (/\.tsx?$/.test(path)) return 'ts'
  if (path.endsWith('.py')) return 'py'
  if (path.endsWith('.sh')) return 'sh'
  return undefined
}

/** Los nombres que ningún texto de prueba menciona como palabra completa. */
export function uncoveredNames(names: Set<string>, testTexts: string[]): string[] {
  // Una sola pasada por texto: una expresión por nombre sobre cada prueba
  // costó 20 s en este árbol.
  const words = new Set<string>()
  for (const text of testTexts) {
    for (const m of text.matchAll(/(?<![A-Za-z0-9_])[A-Z][A-Z0-9_]*(?![A-Za-z0-9_])/g)) words.add(m[0])
  }
  return [...names].filter(name => !words.has(name)).sort()
}

export function compareBaseline(current: Set<string>, baseline: Set<string>) {
  const sorted = (xs: Iterable<string>) => [...xs].sort()
  return {
    fresh: sorted([...current].filter(x => !baseline.has(x))),
    frozen: sorted([...current].filter(x => baseline.has(x))),
    stale: sorted([...baseline].filter(x => !current.has(x))),
  }
}

function readBaseline(path: string): Set<string> {
  if (!existsSync(path)) return new Set()
  return new Set(readFileSync(path, 'utf8').split('\n').filter(l => l && !l.startsWith('#')))
}

function versionedFiles(root: string): string[] | undefined {
  const p = Bun.spawnSync(['git', '-C', root, 'ls-files', '-z'])
  if (p.exitCode !== 0) return undefined
  return new TextDecoder().decode(p.stdout).split('\0').filter(Boolean)
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const root = argv.includes('--root') ? argv[argv.indexOf('--root') + 1]! : process.cwd()
  const strict = argv.includes('--strict')
  const files = existsSync(root) ? versionedFiles(root) : undefined
  if (!files) {
    console.error(`checkEnvPrefix: ${root} no es un repositorio de git; no se mide nada.`)
    process.exit(2)
  }

  const violations = new Set<string>()
  const ownNames = new Set<string>()
  const byClass: Record<NameClass, number> = { own: 0, provider: 0, foreign: 0, other: 0 }
  let readsTotal = 0
  let measured = 0
  const testTexts: string[] = []
  for (const file of files) {
    const path = join(root, file)
    if (!existsSync(path)) continue
    if (isTestPath(file)) {
      testTexts.push(readFileSync(path, 'utf8'))
      continue
    }
    const language = languageOf(file)
    if (!language || !isProductionPath(file)) continue
    measured++
    for (const read of extractEnvReads(readFileSync(path, 'utf8'), language)) {
      readsTotal++
      const cls = classifyName(read.name)
      byClass[cls]++
      if (cls === 'own') ownNames.add(read.name)
      if (cls === 'foreign' && !read.keep) violations.add(`${file}\t${read.name}`)
    }
  }
  const uncovered = new Set(uncoveredNames(ownNames, testTexts))

  if (argv.includes('--write-baseline')) {
    writeFileSync(join(root, BASELINE), [...violations].sort().join('\n') + (violations.size ? '\n' : ''))
    writeFileSync(join(root, COVERAGE_BASELINE), [...uncovered].sort().join('\n') + (uncovered.size ? '\n' : ''))
    console.log(`checkEnvPrefix: baseline escrito — ${violations.size} lectura(s) con prefijo ajeno, ${uncovered.size} variable(s) propia(s) sin prueba`)
    process.exit(0)
  }

  const prefix = compareBaseline(violations, readBaseline(join(root, BASELINE)))
  const coverage = compareBaseline(uncovered, readBaseline(join(root, COVERAGE_BASELINE)))
  for (const v of prefix.fresh) console.log(`  lectura CLAUDE_* nueva: ${v}`)
  for (const v of prefix.stale) console.log(`  entrada obsoleta del baseline de prefijo: ${v}`)
  for (const v of coverage.fresh) console.log(`  variable propia sin prueba: ${v}`)
  for (const v of coverage.stale) console.log(`  entrada obsoleta del baseline de cobertura: ${v}`)
  console.log(
    `checkEnvPrefix: ${prefix.fresh.length} lectura(s) CLAUDE_* nueva(s), ${prefix.frozen.length} congelada(s), ${prefix.stale.length} obsoleta(s) ` +
      `(alcance medido: ${readsTotal} lectura(s) en ${measured} archivo(s) de producción — propias ${byClass.own}, ` +
      `proveedor ${byClass.provider}, cliente ajeno ${byClass.foreign}, sin prefijo ${byClass.other})`,
  )
  console.log(
    `checkEnvPrefix: ${coverage.fresh.length} variable(s) THYROX_* sin prueba nueva(s), ${coverage.frozen.length} congelada(s), ` +
      `${coverage.stale.length} obsoleta(s) (alcance medido: ${ownNames.size} variable(s) propia(s), ${testTexts.length} archivo(s) de prueba)`,
  )
  const debt = prefix.fresh.length + prefix.stale.length + coverage.fresh.length + coverage.stale.length
  process.exit(strict && debt ? 1 : 0)
}
