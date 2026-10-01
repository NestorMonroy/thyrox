/**
 * Grafo de alcance por entrypoint: qué módulos carga cada punto de entrada y
 * qué dependencia operacional (base de datos, almacén efímero, runtime de
 * ejecución, upstream de modelo) queda al alcance de cada uno.
 *
 * Gobierna ADR-010 v1.3.0 (contrato P6): los requisitos se derivan por
 * subcomando, no del grafo entero del paquete `cli`. Por eso las ramas de
 * `cli.tsx` son entrypoints propios: cada una importa dinámicamente lo suyo.
 *
 * QUÉ MIDE: el cierre transitivo de los especificadores con literal —imports
 * estáticos, `import('…')`, `export … from` y `require('…')`— resueltos por
 * archivo (relativos) y por el `exports` de cada `package.json` del workspace.
 * Un especificador que no resuelve, o un `import()` sin literal, se REPORTA.
 *
 * CIEGO A: si el código alcanzado llega a EJECUTAR el abridor (alcance
 * estático no es apertura); un import de valor usado sólo como tipo, que Bun
 * elide y aquí cuenta (sobre-aproximación); las dependencias npm, que no se
 * recorren; y las condiciones de fallthrough dentro de una rama, que se
 * modelan sólo como «la rama no termina siempre». Lo no detectado se escribe
 * «no detectada», nunca «no existe».
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, join, relative, resolve, sep } from 'node:path'
import ts from 'typescript'

export type ImportKind = 'static' | 'dynamic' | 'reexport' | 'require'

export interface ImportReference {
  specifier: string
  kind: ImportKind
}

export interface Unresolved {
  from: string
  specifier: string
  reason: string
}

export interface Closure {
  files: Set<string>
  direct: Set<string>
  /** Archivo alcanzado -> el archivo que lo importó primero. */
  parents: Map<string, string>
  unresolved: Unresolved[]
}

export type DependencyType =
  | 'base de datos'
  | 'base de datos + pgvector'
  | 'almacén efímero'
  | 'upstream de modelo'
  | 'runtime de ejecución'

export interface DependencyOpener {
  file: string
  symbol: string
  dependency: DependencyType
}

export interface Entrypoint {
  name: string
  file: string
  condition: string
  /** Especificadores propios de la rama; vacío = el archivo entero. */
  branchImports: ImportReference[] | null
}

export interface MatrixRow {
  entrypoint: string
  reachablePackages: string
  dependency: string
  relation: string
  condition: string
  role: string
  distributionRequirement: string
}

/** Abridores directos de dependencia operacional, relativos a la raíz. */
export const DEPENDENCY_OPENERS: readonly DependencyOpener[] = [
  { file: 'src/packages/store/sql.ts', symbol: 'openByUrl', dependency: 'base de datos' },
  { file: 'src/packages/shared-state/redis.ts', symbol: 'redis', dependency: 'almacén efímero' },
  { file: 'src/packages/shared-state/factory.ts', symbol: 'factory', dependency: 'almacén efímero' },
  { file: 'src/packages/semantic-search/store.ts', symbol: 'store', dependency: 'base de datos + pgvector' },
  {
    file: 'src/packages/model-scheduling/coordinatorClient.ts',
    symbol: 'coordinatorClient',
    dependency: 'coordinador de modelos',
  },
  {
    file: 'src/packages/daemon/src/podman/podmanWorkerManager.ts',
    symbol: 'podmanWorkerManager',
    dependency: 'runtime de ejecución',
  },
]

/** Rol en ejecución declarado por entrypoint; el resto es `CLI`. */
export const ROLE_BY_ENTRYPOINT: Readonly<Record<string, string>> = {
  'cli --daemon-worker': 'worker especializado',
  'cli daemon': 'servicio',
  'provider-anthropic-mock-server': 'servicio',
  'provider-credential-proxy': 'servicio',
  'provider-local-proxy': 'servicio',
  'provider-store-credential-proxy': 'servicio',
}

export const MATRIX_HEADER =
  'entrypoint\tpaquetes_alcanzables\tdependencia\trelacion\tcondicion\trol\trequisito_distribucion'

export const NOT_DETECTED = 'no detectada'
export const ALWAYS = 'siempre'
export const DEFAULT_BRANCH_CONDITION = 'ninguna rama anterior termina'
const DEFAULT_ROLE = 'CLI'
const NO_RELATION = '—'
const CLI_ENTRY_FILE = 'src/packages/cli/src/entry/cli.tsx'
const CLI_ENTRYPOINT = 'cli'
const PACKAGES_DIR = 'src/packages'
const EXPORT_CONDITIONS: readonly string[] = ['@thyrox/source', 'bun', 'import', 'default']
const PARSED_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']
const RESOLUTION_SUFFIXES: readonly string[] = [
  '', '.ts', '.tsx', '.js', '.mjs', '.json', '/index.ts', '/index.tsx', '/index.js',
]
const JAVASCRIPT_TO_TYPESCRIPT: Readonly<Record<string, readonly string[]>> = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
}
const NODE_BUILTINS = new Set(builtinModules)

// ---------------------------------------------------------------- extracción

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause
  if (clause === undefined) return false
  if (clause.isTypeOnly) return true
  const bindings = clause.namedBindings
  const hasOnlyTypeSpecifiers =
    bindings !== undefined &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every(element => element.isTypeOnly)
  return clause.name === undefined && hasOnlyTypeSpecifiers
}

function isTypeOnlyReexport(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return true
  const clause = node.exportClause
  return (
    clause !== undefined &&
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every(element => element.isTypeOnly)
  )
}

function literalText(node: ts.Node | undefined): string | undefined {
  if (node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
    return node.text
  }
  return undefined
}

function isDynamicImport(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
}

function isRequireCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require'
}

/** Un `import()` o `require()` sin literal: no se puede seguir y se reporta. */
export const OPAQUE_SPECIFIER = '<sin literal>'

function callReference(node: ts.CallExpression, kind: ImportKind): ImportReference {
  return { specifier: literalText(node.arguments[0]) ?? OPAQUE_SPECIFIER, kind }
}

function declarationReference(node: ts.Node): ImportReference | undefined {
  if (ts.isImportDeclaration(node) && !isTypeOnlyImport(node)) {
    const specifier = literalText(node.moduleSpecifier)
    return specifier === undefined ? undefined : { specifier, kind: 'static' }
  }
  if (ts.isExportDeclaration(node) && !isTypeOnlyReexport(node)) {
    const specifier = literalText(node.moduleSpecifier)
    return specifier === undefined ? undefined : { specifier, kind: 'reexport' }
  }
  return undefined
}

function callExpressionReference(node: ts.Node): ImportReference | undefined {
  if (isDynamicImport(node)) return callReference(node, 'dynamic')
  if (isRequireCall(node)) return callReference(node, 'require')
  return undefined
}

/** Los especificadores de un subárbol de sintaxis, en orden de aparición. */
export function collectReferences(root: ts.Node): ImportReference[] {
  const found: ImportReference[] = []
  const visit = (node: ts.Node): void => {
    const reference = declarationReference(node) ?? callExpressionReference(node)
    if (reference !== undefined) found.push(reference)
    ts.forEachChild(node, visit)
  }
  visit(root)
  return found
}

export function parseSource(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file))
}

function scriptKind(file: string): ts.ScriptKind {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (/\.[mc]?js$/.test(file)) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

export function extractImports(file: string, text: string): ImportReference[] {
  return collectReferences(parseSource(file, text))
}

// ---------------------------------------------------------------- resolución

interface WorkspacePackage {
  directory: string
  exports: unknown
}

export type Resolution =
  | { kind: 'file'; path: string }
  | { kind: 'external' }
  | { kind: 'unresolved'; reason: string }

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile()
}

function packageName(specifier: string): string {
  const segments = specifier.split('/')
  const segmentCount = specifier.startsWith('@') ? 2 : 1
  return segments.slice(0, segmentCount).join('/')
}

function isBuiltin(specifier: string): boolean {
  return (
    specifier === 'bun' ||
    specifier.startsWith('bun:') ||
    specifier.startsWith('node:') ||
    NODE_BUILTINS.has(packageName(specifier))
  )
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')
}

function conditionalTarget(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  for (const [condition, nested] of Object.entries(value)) {
    if (!EXPORT_CONDITIONS.includes(condition)) continue
    const target = conditionalTarget(nested)
    if (target !== undefined) return target
  }
  return undefined
}

function patternMatch(key: string, subpath: string): string | undefined {
  const star = key.indexOf('*')
  const prefix = key.slice(0, star)
  const suffix = key.slice(star + 1)
  const fits = subpath.startsWith(prefix) && subpath.endsWith(suffix) && subpath.length >= key.length - 1
  return fits ? subpath.slice(prefix.length, subpath.length - suffix.length) : undefined
}

function exportsEntry(exportsField: unknown, subpath: string): { value: unknown; wildcard: string } | undefined {
  if (typeof exportsField === 'string' || exportsField === null || typeof exportsField !== 'object') {
    return subpath === '.' ? { value: exportsField, wildcard: '' } : undefined
  }
  const table = exportsField as Record<string, unknown>
  if (subpath in table) return { value: table[subpath], wildcard: '' }
  const patterns = Object.keys(table)
    .filter(key => key.includes('*'))
    .sort((left, right) => right.indexOf('*') - left.indexOf('*'))
  for (const key of patterns) {
    const wildcard = patternMatch(key, subpath)
    if (wildcard !== undefined) return { value: table[key], wildcard }
  }
  return undefined
}

/** Resuelve especificadores contra un árbol: relativos por archivo, workspace por `exports`. */
export class WorkspaceResolver {
  private readonly packages = new Map<string, WorkspacePackage>()

  constructor(readonly root: string) {
    const packagesDir = join(root, PACKAGES_DIR)
    if (!existsSync(packagesDir)) return
    for (const entry of readdirSync(packagesDir).sort()) {
      const manifestPath = join(packagesDir, entry, 'package.json')
      if (!isFile(manifestPath)) continue
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string; exports?: unknown }
      if (manifest.name !== undefined) {
        this.packages.set(manifest.name, { directory: join(packagesDir, entry), exports: manifest.exports })
      }
    }
  }

  /** El nombre del paquete del workspace que contiene `file`, o su carpeta de `src/`. */
  ownerOf(file: string): string {
    for (const [name, workspace] of this.packages) {
      if (file.startsWith(workspace.directory + sep)) return name
    }
    const parts = relative(this.root, file).split(sep)
    return parts.slice(0, 2).join('/')
  }

  resolve(specifier: string, fromFile: string): Resolution {
    if (specifier === OPAQUE_SPECIFIER) return { kind: 'unresolved', reason: 'especificador sin literal' }
    if (isBuiltin(specifier)) return { kind: 'external' }
    if (isRelative(specifier)) return this.resolveRelative(resolve(dirname(fromFile), specifier))
    const workspace = this.packages.get(packageName(specifier))
    if (workspace === undefined) return { kind: 'external' }
    return this.resolveWorkspace(specifier, workspace)
  }

  private resolveRelative(base: string): Resolution {
    for (const candidate of relativeCandidates(base)) {
      if (isFile(candidate)) return { kind: 'file', path: candidate }
    }
    return { kind: 'unresolved', reason: 'ningún archivo en la ruta relativa' }
  }

  private resolveWorkspace(specifier: string, workspace: WorkspacePackage): Resolution {
    const subpath = '.' + specifier.slice(packageName(specifier).length)
    const entry = exportsEntry(workspace.exports, subpath)
    if (entry === undefined) return { kind: 'unresolved', reason: `\`exports\` no declara ${subpath}` }
    const target = conditionalTarget(entry.value)
    if (target === undefined) return { kind: 'unresolved', reason: `\`exports\` sin condición ejecutable para ${subpath}` }
    const path = join(workspace.directory, target.replaceAll('*', entry.wildcard))
    return isFile(path) ? { kind: 'file', path } : { kind: 'unresolved', reason: `\`exports\` apunta a un archivo ausente` }
  }
}

function relativeCandidates(base: string): string[] {
  const candidates = RESOLUTION_SUFFIXES.map(suffix => base + suffix)
  for (const [javascript, typescripts] of Object.entries(JAVASCRIPT_TO_TYPESCRIPT)) {
    if (!base.endsWith(javascript)) continue
    const stem = base.slice(0, -javascript.length)
    candidates.push(...typescripts.map(extension => stem + extension))
  }
  return candidates
}

// ---------------------------------------------------------------- cierre

function isParsed(file: string): boolean {
  return PARSED_EXTENSIONS.some(extension => file.endsWith(extension))
}

/** Lee y extrae cada archivo una sola vez para todos los entrypoints. */
export class ReachabilityGraph {
  private readonly referencesByFile = new Map<string, ImportReference[]>()

  constructor(readonly resolver: WorkspaceResolver) {}

  referencesOf(file: string): ImportReference[] {
    const cached = this.referencesByFile.get(file)
    if (cached !== undefined) return cached
    const references = isParsed(file) ? extractImports(file, readFileSync(file, 'utf8')) : []
    this.referencesByFile.set(file, references)
    return references
  }

  /** El cierre desde `file`; `seed` sustituye las referencias propias del archivo. */
  closure(file: string, seed: ImportReference[] = this.referencesOf(file)): Closure {
    const result: Closure = { files: new Set([file]), direct: new Set(), parents: new Map(), unresolved: [] }
    const pending: string[] = []
    const follow = (from: string, references: ImportReference[], isDirect: boolean): void => {
      for (const reference of references) {
        const resolution = this.resolver.resolve(reference.specifier, from)
        if (resolution.kind === 'unresolved') {
          result.unresolved.push({ from, specifier: reference.specifier, reason: resolution.reason })
          continue
        }
        if (resolution.kind === 'external') continue
        if (isDirect) result.direct.add(resolution.path)
        if (result.files.has(resolution.path)) continue
        result.files.add(resolution.path)
        result.parents.set(resolution.path, from)
        pending.push(resolution.path)
      }
    }
    follow(file, seed, true)
    for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
      follow(next, this.referencesOf(next), false)
    }
    return result
  }
}

/** La cadena de imports desde el entrypoint hasta `target`, o vacía si no se alcanza. */
export function importChain(closure: Closure, target: string): string[] {
  if (!closure.files.has(target)) return []
  const chain = [target]
  for (let parent = closure.parents.get(target); parent !== undefined; parent = closure.parents.get(parent)) {
    chain.unshift(parent)
  }
  return chain
}

// ---------------------------------------------------------------- ramas de cli.tsx

function isProcessExit(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.getText() === 'process.exit'
  )
}

function isTerminalStatement(node: ts.Node): boolean {
  return ts.isReturnStatement(node) || (ts.isExpressionStatement(node) && isProcessExit(node.expression))
}

function containsTerminal(node: ts.Node): boolean {
  if (isTerminalStatement(node)) return true
  let found = false
  ts.forEachChild(node, child => {
    found ||= !ts.isFunctionLike(child) && containsTerminal(child)
  })
  return found
}

function alwaysTerminates(node: ts.Statement): boolean {
  if (!ts.isBlock(node)) return isTerminalStatement(node)
  const last = node.statements.at(-1)
  return last !== undefined && isTerminalStatement(last)
}

function normalizedText(node: ts.Node): string {
  return node.getText().replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')')
}

function firstComparedLiteral(condition: ts.Expression): string | undefined {
  let found: string | undefined
  const visit = (node: ts.Node): void => {
    if (found !== undefined) return
    const isComparison =
      ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    if (isComparison) found = literalText(node.right)
    ts.forEachChild(node, visit)
  }
  visit(condition)
  return found
}

interface RawBranch {
  condition: ts.Expression
  body: ts.Statement
}

function ifChain(statement: ts.IfStatement): RawBranch[] {
  const branches: RawBranch[] = [{ condition: statement.expression, body: statement.thenStatement }]
  const alternative = statement.elseStatement
  if (alternative !== undefined && ts.isIfStatement(alternative)) branches.push(...ifChain(alternative))
  return branches
}

function mainBody(source: ts.SourceFile): ts.NodeArray<ts.Statement> | undefined {
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === 'main') return statement.body?.statements
  }
  return undefined
}

function firstIdentifier(condition: ts.Expression): string {
  let found: string | undefined
  const visit = (node: ts.Node): void => {
    if (found === undefined && ts.isIdentifier(node)) found = node.text
    if (found === undefined) ts.forEachChild(node, visit)
  }
  visit(condition)
  return found ?? 'condition'
}

/**
 * El nombre de la rama: el primer literal comparado (`cli daemon`) o, sin él,
 * el primer identificador de la condición (`cli hasTmuxFlag`). Nunca la línea:
 * la matriz versionada no puede cambiar porque `cli.tsx` gane un comentario.
 */
function branchName(condition: ts.Expression, taken: Set<string>): string {
  const preferred = `${CLI_ENTRYPOINT} ${firstComparedLiteral(condition) ?? firstIdentifier(condition)}`
  let name = preferred
  for (let ordinal = 2; taken.has(name); ordinal += 1) name = `${preferred}#${ordinal}`
  taken.add(name)
  return name
}

/**
 * Cada rama terminal del `main()` de `cli.tsx` como entrypoint propio.
 *
 * Una rama carga los imports estáticos del archivo, los imports de las
 * sentencias incondicionales que la preceden, los de las ramas anteriores que
 * pueden no terminar, y los suyos. La última entrada es el camino por defecto.
 */
export function cliBranches(file: string, text: string): Entrypoint[] {
  const source = parseSource(file, text)
  const body = mainBody(source)
  if (body === undefined) throw new Error(`${file}: no declara function main()`)
  const moduleImports = source.statements.filter(statement => !ts.isFunctionDeclaration(statement)).flatMap(collectReferences)
  const preceding: ImportReference[] = [...moduleImports]
  const taken = new Set<string>()
  const branches: Entrypoint[] = []
  for (const statement of body) {
    if (!ts.isIfStatement(statement)) {
      preceding.push(...collectReferences(statement))
      continue
    }
    for (const raw of ifChain(statement)) {
      const own = collectReferences(raw.body)
      if (containsTerminal(raw.body)) {
        branches.push({
          name: branchName(raw.condition, taken),
          file,
          condition: normalizedText(raw.condition),
          branchImports: [...preceding, ...own],
        })
      }
      if (!alwaysTerminates(raw.body)) preceding.push(...own)
    }
  }
  branches.push({ name: CLI_ENTRYPOINT, file, condition: DEFAULT_BRANCH_CONDITION, branchImports: [...preceding] })
  return branches
}

/** Los entrypoints: las ramas de `cli.tsx` y cada wrapper TypeScript restante. */
export function entrypointsOf(root: string, wrappers: ReadonlyMap<string, string>): Entrypoint[] {
  const cliFile = join(root, CLI_ENTRY_FILE)
  const entrypoints: Entrypoint[] = []
  for (const [name, relativeFile] of [...wrappers].sort(([left], [right]) => left.localeCompare(right))) {
    const file = join(root, relativeFile)
    if (file === cliFile) {
      entrypoints.push(...cliBranches(file, readFileSync(file, 'utf8')))
    } else {
      entrypoints.push({ name, file, condition: ALWAYS, branchImports: null })
    }
  }
  return entrypoints
}

// ---------------------------------------------------------------- matriz

function requirementFor(relation: string): string {
  if (relation === 'directa') return 'requerido en la condición'
  return 'alcanzable en la condición (no prueba apertura)'
}

function closureOf(graph: ReachabilityGraph, entrypoint: Entrypoint): Closure {
  return entrypoint.branchImports === null
    ? graph.closure(entrypoint.file)
    : graph.closure(entrypoint.file, entrypoint.branchImports)
}

function reachedDependencies(root: string, closure: Closure): Map<DependencyType, string> {
  const relations = new Map<DependencyType, string>()
  for (const opener of DEPENDENCY_OPENERS) {
    const path = join(root, opener.file)
    if (!closure.files.has(path)) continue
    const relation = closure.direct.has(path) ? 'directa' : 'transitiva'
    if (relations.get(opener.dependency) !== 'directa') relations.set(opener.dependency, relation)
  }
  return relations
}

export interface Measurement {
  rows: MatrixRow[]
  unresolved: Unresolved[]
}

/** Mide cada entrypoint y devuelve las filas de la matriz y lo que no resolvió. */
export function measure(root: string, entrypoints: readonly Entrypoint[]): Measurement {
  const resolver = new WorkspaceResolver(root)
  const graph = new ReachabilityGraph(resolver)
  const rows: MatrixRow[] = []
  const unresolved = new Map<string, Unresolved>()
  for (const entrypoint of entrypoints) {
    const closure = closureOf(graph, entrypoint)
    for (const item of closure.unresolved) unresolved.set(`${item.from}\0${item.specifier}`, item)
    const packages = [...new Set([...closure.files].map(file => resolver.ownerOf(file)))].sort().join(',')
    const base = {
      entrypoint: entrypoint.name,
      reachablePackages: packages,
      condition: entrypoint.condition,
      role: ROLE_BY_ENTRYPOINT[entrypoint.name] ?? DEFAULT_ROLE,
    }
    const dependencies = reachedDependencies(root, closure)
    if (dependencies.size === 0) {
      rows.push({ ...base, dependency: NOT_DETECTED, relation: NO_RELATION, distributionRequirement: 'ninguno detectado' })
    }
    for (const [dependency, relation] of [...dependencies].sort(([left], [right]) => left.localeCompare(right))) {
      rows.push({ ...base, dependency, relation, distributionRequirement: requirementFor(relation) })
    }
  }
  const relativeUnresolved = [...unresolved.values()].map(item => ({ ...item, from: relative(root, item.from) }))
  relativeUnresolved.sort((left, right) => `${left.from}${left.specifier}`.localeCompare(`${right.from}${right.specifier}`))
  return { rows, unresolved: relativeUnresolved }
}

export function renderMatrix(rows: readonly MatrixRow[]): string {
  const lines = rows.map(row =>
    [
      row.entrypoint,
      row.reachablePackages,
      row.dependency,
      row.relation,
      row.condition,
      row.role,
      row.distributionRequirement,
    ].join('\t'),
  )
  return [MATRIX_HEADER, ...lines].join('\n') + '\n'
}
