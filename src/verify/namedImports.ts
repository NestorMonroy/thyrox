/**
 * Verificador estático de nombres importados: ¿exporta el destino lo que se
 * le pide?
 *
 * Un nombre que el módulo destino no exporta se descubre hoy al CARGAR el
 * módulo bajo `bun test` («Export named … not found in module …»), un archivo
 * cada vez. Un `bun build` por paquete no lo ve cuando el destino es un
 * hermano externalizado (sonda en
 * `.claude/workbench/frontera-publica-de-paquetes-*`). Aquí se mide sin
 * cargar nada:
 *
 * 1. cada especificador se resuelve con `Bun.resolveSync` desde el directorio
 *    del importador — el mismo resolutor que carga el módulo;
 * 2. lo que el destino exporta en VALOR sale de `Bun.Transpiler.scan`, que no
 *    lista los exports de solo tipo ni expande `export * from`: esas dos
 *    mitades se leen del texto y se siguen en cadena;
 * 3. un nombre que no está en ninguno de los dos conjuntos es `missing`.
 *
 * Tres clases, que no se mezclan: `missing` (el destino resolvió y no tiene el
 * nombre), `unresolved` (el especificador no resolvió) y lo que no se mide
 * (`import * as`, destinos dentro de `node_modules`).
 *
 * Ciego a: nombres que un módulo publica en tiempo de ejecución
 * (`module.exports[x] = …`), a un especificador compuesto en ejecución, y a un
 * destino fuera de la raíz medida.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve as absolute } from 'node:path'

export type Finding = {
  kind: 'missing' | 'unresolved'
  importer: string
  line: number
  specifier: string
  name: string
  target?: string
}

export type Report = { findings: Finding[]; files: number; checkedNames: number }

const CODE = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__'])

/** Módulos integrados del entorno: `bun:bundle` es de tiempo de construcción y
 *  `resolveSync` no lo resuelve; ninguno es código del árbol que medir. */
const BUILTIN = /^(bun|node):/

/** `import … from '…'` y `export { … } from '…'`, con su cláusula. */
const IMPORT_FROM =
  /\b(import|export)\s+(type\s+)?((?:[A-Za-z_$][\w$]*\s*,\s*)?\{[^}]*\}|[A-Za-z_$][\w$]*|\*(?:\s+as\s+[A-Za-z_$][\w$]*)?)\s*from\s*['"]([^'"]+)['"]/g
const STAR_FROM = /\bexport\s+(?:type\s+)?\*\s+from\s*['"]([^'"]+)['"]/g
const TYPE_DECL = /\bexport\s+(?:declare\s+)?(?:type|interface|enum|const\s+enum|namespace|abstract\s+class|class|function|const|let|var)\s+([A-Za-z_$][\w$]*)/g
const EXPORT_LIST = /\bexport\s+(?:type\s+)?\{([^}]*)\}/g

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
}

function transpilerFor(path: string): Bun.Transpiler {
  const ext = extname(path)
  const loader = ext === '.tsx' ? 'tsx' : ext === '.jsx' ? 'jsx' : ext.endsWith('ts') ? 'ts' : 'js'
  return new Bun.Transpiler({ loader })
}

function resolve(specifier: string, fromDir: string): string | null {
  try {
    return Bun.resolveSync(specifier, fromDir)
  } catch {
    return null
  }
}

const exportCache = new Map<string, Set<string>>()

/** Todo nombre que `path` exporta, en valor o en tipo, siguiendo `export *`. */
export function exportedNames(path: string, seen: Set<string> = new Set()): Set<string> {
  const cached = exportCache.get(path)
  if (cached) return cached
  const names = new Set<string>()
  if (seen.has(path)) return names
  seen.add(path)
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return names
  }
  try {
    for (const name of transpilerFor(path).scan(text).exports) names.add(name)
  } catch {
    // Un archivo que no transpila no aporta exports de valor; los de tipo se leen igual.
  }
  const clean = stripComments(text)
  for (const m of clean.matchAll(TYPE_DECL)) names.add(m[1])
  for (const m of clean.matchAll(EXPORT_LIST)) {
    for (const part of m[1].split(',')) {
      const exported = part.replace(/^\s*type\s+/, '').split(/\s+as\s+/).pop()?.trim()
      if (exported) names.add(exported)
    }
  }
  for (const m of clean.matchAll(STAR_FROM)) {
    const target = resolve(m[1], dirname(path))
    if (target && measurable(target)) for (const n of exportedNames(target, seen)) if (n !== 'default') names.add(n)
  }
  exportCache.set(path, names)
  return names
}

function measurable(target: string): boolean {
  return CODE.has(extname(target)) && !target.split('/').includes('node_modules')
}

/** Los nombres que pide una cláusula: `{ a, b as c, type d }`, `def`, `def, { a }`. */
function requestedNames(keyword: string, clause: string): string[] {
  const out: string[] = []
  const brace = clause.match(/\{([^}]*)\}/)
  if (brace) {
    for (const part of brace[1].split(',')) {
      const source = part.replace(/^\s*type\s+/, '').split(/\s+as\s+/)[0]?.trim()
      if (source) out.push(source)
    }
  }
  if (keyword === 'import') {
    const head = clause.replace(/\{[^}]*\}/, '').replace(/,/g, ' ').trim()
    if (head && !head.startsWith('*')) out.push('default')
  }
  return out
}

function codeFiles(roots: string[]): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP.has(entry)) continue
      const path = join(dir, entry)
      const st = statSync(path)
      if (st.isDirectory()) walk(path)
      else if (CODE.has(extname(path)) && !path.endsWith('.d.ts')) files.push(path)
    }
  }
  for (const root of roots.map(r => absolute(r))) if (existsSync(root)) (statSync(root).isDirectory() ? walk(root) : files.push(root))
  return files
}

export function missingNamedImports(roots: string[], opts: { root?: string } = {}): Report {
  const findings: Finding[] = []
  let checkedNames = 0
  const files = codeFiles(roots)
  for (const file of files) {
    const text = stripComments(readFileSync(file, 'utf8'))
    for (const m of text.matchAll(IMPORT_FROM)) {
      const [, keyword, , clause, specifier] = m
      if (BUILTIN.test(specifier)) continue
      if (/^\s*\*/.test(clause)) continue
      const requested = requestedNames(keyword, clause)
      if (requested.length === 0) continue
      const line = text.slice(0, m.index).split('\n').length
      const importer = opts.root ? relative(opts.root, file) : file
      const target = resolve(specifier, dirname(file))
      if (!target) {
        for (const name of requested) findings.push({ kind: 'unresolved', importer, line, specifier, name })
        continue
      }
      if (!measurable(target)) continue
      const exported = exportedNames(target)
      for (const name of requested) {
        checkedNames++
        if (!exported.has(name)) findings.push({ kind: 'missing', importer, line, specifier, name, target })
      }
    }
  }
  return { findings, files: files.length, checkedNames }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  const roots = args.filter(a => !a.startsWith('--'))
  if (roots.length === 0 || roots.some(r => !existsSync(r))) {
    console.error('namedImports: raíz ausente o inexistente — sin veredicto')
    process.exit(2)
  }
  const r = missingNamedImports(roots, { root: process.cwd() })
  for (const f of r.findings) {
    console.log([f.kind, `${f.importer}:${f.line}`, f.specifier, f.name, f.target ? relative(process.cwd(), f.target) : ''].join('\t'))
  }
  const missing = r.findings.filter(f => f.kind === 'missing').length
  const unresolved = r.findings.filter(f => f.kind === 'unresolved').length
  console.error(
    `namedImports: ${missing} nombre(s) ausente(s), ${unresolved} sin resolver ` +
      `(alcance medido: ${r.checkedNames} nombre(s) en ${r.files} archivo(s))`,
  )
  process.exit(strict && missing > 0 ? 1 : 0)
}
