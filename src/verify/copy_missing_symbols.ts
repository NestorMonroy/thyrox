/**
 * Copia desde la fuente vendorizada los exports que el árbol no tiene.
 *
 * Por cada `TS2305` («Module X has no exported member Y») del log de tsc:
 * resuelve el módulo con las reglas del propio `tsconfig`, busca su par en la
 * fuente (misma ruta relativa bajo la raíz de la fuente) y copia LITERAL la
 * declaración exportada de `Y`, con su comentario, más su cierre dentro del
 * archivo: los auxiliares no exportados que usa y las ligaduras de import que
 * le faltan al destino. Lo que el destino ya declara o importa no se toca, y
 * lo que nadie pidió no se copia.
 *
 * Emite candidatos con el contrato de `tsc_zero_step.py` (una propuesta por
 * archivo destino, con sus TS2305 como objetivos), así que el lazo decide cada
 * copia como cualquier otra propuesta: se queda si sus objetivos desaparecen
 * y no aparece nada nuevo.
 *
 * Uso:
 *   bun src/verify/copy_missing_symbols.ts --root R --dest D --source S \
 *     --tsconfig T --log L [--rewrite VIEJO=NUEVO]... [--write]
 *
 * Ciega a: un símbolo que la fuente declara en otro archivo del que el
 * destino lo reexporta (sólo mira el par de misma ruta); un identificador que
 * sólo aparece dentro de un tipo por acceso a propiedad; y a los globales,
 * que se dejan como están.
 */
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const TS2305 = /^(?<file>.+?)\(\d+,\d+\): error TS2305: (?<message>Module '"(?<spec>.+)"' has no exported member '(?<symbol>[^']+)'\.)$/

export type FileCopy = {
  destFile: string
  sourceFile: string
  symbols: string[]
  targets: string[]
  oldText: string
  newText: string
}
export type Plan = { root: string; files: FileCopy[]; skipped: { symbol: string; spec: string; reason: string }[] }
export type PlanInput = {
  root: string
  destRoot: string
  sourceRoot: string
  tsconfig: string
  logLines: string[]
  rewrites: [string, string][]
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
}

function rewrite(text: string, rewrites: [string, string][]): string {
  return rewrites.reduce((acc, [from, to]) => acc.split(from).join(to), text)
}

/** Los nombres que una sentencia de nivel superior declara. */
function declaredNames(statement: ts.Statement): string[] {
  if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) ||
       ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) ||
       ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement)) && statement.name &&
      ts.isIdentifier(statement.name)) {
    return [statement.name.text]
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap(d => (ts.isIdentifier(d.name) ? [d.name.text] : []))
  }
  return []
}

/** Las ligaduras locales que una sentencia de import crea. */
function importBindings(statement: ts.ImportDeclaration): string[] {
  const clause = statement.importClause
  if (!clause) return []
  const names = clause.name ? [clause.name.text] : []
  const bindings = clause.namedBindings
  if (bindings && ts.isNamespaceImport(bindings)) names.push(bindings.name.text)
  if (bindings && ts.isNamedImports(bindings)) names.push(...bindings.elements.map(e => e.name.text))
  return names
}

function isExported(statement: ts.Statement): boolean {
  return (ts.getCombinedModifierFlags(statement as ts.Declaration) & ts.ModifierFlags.Export) !== 0
}

/** Los identificadores que una sentencia usa, sin nombres de propiedad. */
function usedIdentifiers(node: ts.Node): Set<string> {
  const used = new Set<string>()
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n)) {
      const p = n.parent
      const isPropertyName =
        (ts.isPropertyAccessExpression(p) && p.name === n) ||
        (ts.isQualifiedName(p) && p.right === n) ||
        ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p) ||
          ts.isMethodDeclaration(p) || ts.isMethodSignature(p)) && p.name === n)
      if (!isPropertyName) used.add(n.text)
    }
    ts.forEachChild(n, visit)
  }
  visit(node)
  return used
}

/** El texto de una ligadura de import, listo para su propia sentencia. */
function importLine(statement: ts.ImportDeclaration, name: string, sf: ts.SourceFile): string {
  const spec = statement.moduleSpecifier.getText(sf)
  const clause = statement.importClause!
  const typeOnly = clause.isTypeOnly ? 'type ' : ''
  if (clause.name?.text === name) return `import ${typeOnly}${name} from ${spec}`
  const bindings = clause.namedBindings!
  if (ts.isNamespaceImport(bindings)) return `import ${typeOnly}* as ${name} from ${spec}`
  const element = bindings.elements.find(e => e.name.text === name)!
  return `import ${typeOnly}{ ${element.getText(sf)} } from ${spec}`
}

function planFile(destFile: string, sourceFile: string, requested: string[], rewrites: [string, string][]) {
  const src = parse(sourceFile)
  const dst = parse(destFile)
  const destBound = new Set<string>()
  for (const st of dst.statements) {
    if (ts.isImportDeclaration(st)) importBindings(st).forEach(n => destBound.add(n))
    else declaredNames(st).forEach(n => destBound.add(n))
  }
  const topLevel = new Map<string, ts.Statement[]>()
  const imports = new Map<string, ts.ImportDeclaration>()
  for (const st of src.statements) {
    if (ts.isImportDeclaration(st)) importBindings(st).forEach(n => imports.set(n, st))
    else declaredNames(st).forEach(n => topLevel.set(n, [...(topLevel.get(n) ?? []), st]))
  }
  const statements = new Set<ts.Statement>()
  const reexports: string[] = []
  const importLines: string[] = []
  const found: string[] = []
  const queue: ts.Statement[] = []

  for (const symbol of requested) {
    const declared = (topLevel.get(symbol) ?? []).filter(isExported)
    if (declared.length) {
      declared.forEach(st => queue.push(st))
      found.push(symbol)
      continue
    }
    for (const st of src.statements) {
      if (!ts.isExportDeclaration(st) || !st.exportClause || !ts.isNamedExports(st.exportClause)) continue
      const element = st.exportClause.elements.find(e => e.name.text === symbol)
      if (!element) continue
      const typeOnly = st.isTypeOnly ? 'type ' : ''
      const from = st.moduleSpecifier ? ` from ${st.moduleSpecifier.getText(src)}` : ''
      if (!st.moduleSpecifier) {
        const local = (element.propertyName ?? element.name).text
        ;(topLevel.get(local) ?? []).forEach(dep => queue.push(dep))
      }
      reexports.push(`export ${typeOnly}{ ${element.getText(src)} }${from}`)
      found.push(symbol)
      break
    }
  }
  const seenImport = new Set<string>()
  while (queue.length) {
    const st = queue.shift()!
    if (statements.has(st)) continue
    statements.add(st)
    const own = new Set(declaredNames(st))
    for (const name of usedIdentifiers(st)) {
      if (own.has(name) || destBound.has(name)) continue
      const local = topLevel.get(name)
      if (local) { local.forEach(dep => queue.push(dep)); continue }
      const imp = imports.get(name)
      if (imp && !seenImport.has(name)) {
        seenImport.add(name)
        importLines.push(importLine(imp, name, src))
      }
    }
  }
  const ordered = src.statements.filter(st => statements.has(st))
  const body = ordered.map(st => st.getFullText(src).replace(/^\s*\n/, '')).join('\n')
  const oldText = readFileSync(destFile, 'utf8')
  let newText = oldText
  if (importLines.length) {
    const lastImport = [...dst.statements].reverse().find(ts.isImportDeclaration)
    const at = lastImport ? lastImport.getEnd() : 0
    const block = rewrite(importLines.join('\n'), rewrites)
    newText = lastImport ? `${newText.slice(0, at)}\n${block}${newText.slice(at)}` : `${block}\n${newText}`
  }
  const appended = rewrite([body.trim(), ...reexports].filter(Boolean).join('\n\n'), rewrites)
  if (appended) newText = `${newText.replace(/\s*$/, '')}\n\n${appended}\n`
  // El alias se reescribe sólo en lo copiado: lo que el destino ya tenía no se toca.
  return { found, newText }
}

export function planCopies(input: PlanInput): Plan {
  const config = ts.getParsedCommandLineOfConfigFile(input.tsconfig, {}, {
    ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {},
  })
  const options = config?.options ?? {}
  const byFile = new Map<string, { sourceFile: string; symbols: Set<string>; targets: string[] }>()
  const skipped: Plan['skipped'] = []
  for (const raw of input.logLines) {
    const m = TS2305.exec(raw.trim())
    if (!m?.groups) continue
    const { file, message, spec, symbol } = m.groups as Record<string, string>
    const importer = resolve(input.root, file)
    const resolved = ts.resolveModuleName(spec, importer, options, ts.sys).resolvedModule?.resolvedFileName
    const destFile = resolved ? resolve(resolved) : undefined
    const rel = destFile ? relative(resolve(input.destRoot), destFile) : undefined
    if (!destFile || !rel || rel.startsWith('..') || destFile.endsWith('.d.ts')) {
      skipped.push({ symbol, spec, reason: 'no resuelve a un archivo del destino' })
      continue
    }
    const sourceFile = join(input.sourceRoot, rel)
    if (!existsSync(sourceFile)) {
      skipped.push({ symbol, spec, reason: 'sin par en la fuente' })
      continue
    }
    const entry = byFile.get(destFile) ?? { sourceFile, symbols: new Set<string>(), targets: [] }
    entry.symbols.add(symbol)
    entry.targets.push(`${file}: TS2305: ${message}`)
    byFile.set(destFile, entry)
  }
  const files: FileCopy[] = []
  for (const [destFile, entry] of byFile) {
    const { found, newText } = planFile(destFile, entry.sourceFile, [...entry.symbols], input.rewrites)
    const missing = [...entry.symbols].filter(s => !found.includes(s))
    for (const symbol of missing) skipped.push({ symbol, spec: relative(input.root, destFile), reason: 'la fuente no lo exporta' })
    if (!found.length) continue
    const targets = entry.targets.filter(t => found.some(s => t.endsWith(`'${s}'.`)))
    files.push({ destFile, sourceFile: entry.sourceFile, symbols: found, targets,
                 oldText: readFileSync(destFile, 'utf8'), newText })
  }
  return { root: input.root, files, skipped }
}

const sha = (text: string) => createHash('sha256').update(text).digest('hex')

/** Los candidatos del lazo; con `write`, además escribe el destino. */
export function applyPlan(plan: Plan, opts: { write: boolean }) {
  return plan.files.map(f => {
    const rel = relative(plan.root, f.destFile)
    if (opts.write) writeFileSync(f.destFile, f.newText)
    return {
      proposal_id: `copy-symbols:${rel}`,
      proposer: 'copy-missing-symbols',
      targets: f.targets,
      files: [rel],
      edits: [{ file: rel, start: 0, length: f.oldText.length, newText: f.newText }],
      bases: { [rel]: sha(f.oldText) },
    }
  })
}

function option(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const root = resolve(option(argv, '--root') ?? '.')
  const required = ['--dest', '--source', '--tsconfig', '--log'].filter(n => !option(argv, n))
  if (required.length) {
    console.error(`copy_missing_symbols: REHUSA — faltan ${required.join(' ')}`)
    process.exit(2)
  }
  const rewrites = argv.flatMap((a, i) => (a === '--rewrite' ? [argv[i + 1]!.split('=', 2) as [string, string]] : []))
  const plan = planCopies({
    root, destRoot: resolve(root, option(argv, '--dest')!), sourceRoot: resolve(option(argv, '--source')!),
    tsconfig: resolve(root, option(argv, '--tsconfig')!), rewrites,
    logLines: readFileSync(option(argv, '--log')!, 'utf8').split('\n'),
  })
  for (const candidate of applyPlan(plan, { write: argv.includes('--write') })) console.log(JSON.stringify(candidate))
  for (const s of plan.skipped) console.error(`omitido ${s.symbol} (${s.spec}): ${s.reason}`)
  console.error(`copy_missing_symbols: ${plan.files.length} archivo(s), ${plan.files.reduce((n, f) => n + f.symbols.length, 0)} símbolo(s) copiables, ${plan.skipped.length} omitido(s)`)
}
