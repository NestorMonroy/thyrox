/**
 * Proponentes baratos del lazo tsc cero, reunidos: para cada archivo, una
 * propuesta por proponente con sus ediciones, sus objetivos y sus archivos.
 *
 * El contrato de salida es el JSONL que ya leen `batch_verification
 * --proposals` y `tsc_schedule --candidates`:
 *
 *   proposal_id  `<proponente>:<archivo relativo>` — estable entre corridas
 *   proposer     el nombre del proponente, la unidad de la posterior Beta
 *   targets      claves `archivo: TSnnnn: mensaje` de los diagnósticos que la
 *                edición toca, con la forma exacta de `tsc --pretty false`
 *   files        archivos que la propuesta edita, relativos a `cwd`
 *   edits        las ediciones, para aplicarlas y revertirlas en el paso
 *   bases        sha256 del texto de cada archivo sobre el que se propuso: las
 *                posiciones de `edits` sólo valen sobre ese texto, así que dos
 *                propuestas del mismo archivo no se componen, y el aplicador
 *                rehúsa en vez de escribir en el sitio equivocado
 *
 * Cada proponente conserva SUS guardas: este módulo no decide qué es seguro,
 * sólo reúne y etiqueta. Un diagnóstico cuenta como objetivo cuando su código
 * es de los que el proponente reclama y su tramo toca una edición: reclamar un
 * error ajeno haría rechazar la propuesta por algo que no era suyo.
 *
 * Métrica: diagnósticos del servicio de lenguaje con sus claves de `tsc`.
 * Ciega a: si la clave aparece en el log real de `tsc`, que es otro universo;
 * lo mide `batch_verification`, que da `no-targets` cuando no aparece.
 */
import { createHash } from 'node:crypto'
import path from 'node:path'
import ts from 'typescript'
import { inferredTypeEdits } from './applyInferredTypes'
import { nonNullInTestEdits, POSSIBLY_UNDEFINED_CODES } from './nonNullInTests'
import { unusedImportEdits } from './removeUnusedImports'
import {
  DEFAULT_OPTIONS,
  applyEdits,
  createMemoryService,
  createProjectService,
  type Reader,
} from './tsLanguageService'

export type ProposalEdit = { file: string; start: number; length: number; newText: string }

export type ProposalRow = {
  proposal_id: string
  proposer: string
  targets: string[]
  files: string[]
  edits: ProposalEdit[]
  bases: Record<string, string>
}

export function textHash(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

type Proposer = {
  name: string
  codes: ReadonlySet<number>
  edits: (service: ts.LanguageService, fileName: string, text: string) => ts.TextChange[]
}

export const PROPOSERS: readonly Proposer[] = [
  {
    name: 'unused-imports',
    codes: new Set([6133, 6192, 6196, 6198]),
    edits: (service, fileName) => unusedImportEdits(service, fileName).edits,
  },
  {
    name: 'infer-from-usage',
    codes: new Set([7005, 7006, 7008, 7019, 7031, 7034, 7043, 7044, 7045, 7046, 7047, 7050]),
    edits: (service, fileName, text) => inferredTypeEdits(service, fileName, text),
  },
  {
    name: 'non-null-in-tests',
    codes: POSSIBLY_UNDEFINED_CODES,
    edits: (service, fileName) => nonNullInTestEdits(service, fileName),
  },
]

/** La clave sin coordenadas que `analyze_typescript_diagnostics` extrae de
 * una línea de `tsc`: el archivo relativo a `cwd`, el código y la primera
 * línea del mensaje (las encadenadas van en líneas propias, sangradas). */
export function diagnosticKey(diagnostic: ts.Diagnostic, cwd: string): string {
  const file = path.relative(cwd, diagnostic.file!.fileName)
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n').split('\n')[0]
  return `${file}: TS${diagnostic.code}: ${message}`
}

function touches(diagnostic: ts.Diagnostic, edits: readonly ts.TextChange[]): boolean {
  const start = diagnostic.start!
  const end = start + (diagnostic.length ?? 0)
  // Tramos cerrados: una anotación se INSERTA justo al final del nombre que
  // el diagnóstico señala, con longitud cero.
  return edits.some(edit => edit.span.start <= end && start <= edit.span.start + edit.span.length)
}

/** Directorio del `package.json` más cercano: la unidad que una fachada no
 * cruza. El primer lote verificado reexportó sólo símbolos del mismo paquete
 * (`thyrox@f49db1a4`); cruzar crea una dependencia que nadie decidió. */
function packageRoot(fileName: string, read: Reader, cache: Map<string, string | undefined>): string | undefined {
  let dir = path.dirname(fileName)
  const visited: string[] = []
  for (;;) {
    if (cache.has(dir)) {
      const found = cache.get(dir)
      for (const seen of visited) cache.set(seen, found)
      return found
    }
    visited.push(dir)
    if (read(path.join(dir, 'package.json')) !== undefined) {
      for (const seen of visited) cache.set(seen, dir)
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      for (const seen of visited) cache.set(seen, undefined)
      return undefined
    }
    dir = parent
  }
}

function moduleFile(checker: ts.TypeChecker, specifier: ts.Expression): ts.SourceFile | undefined {
  const declaration = checker.getSymbolAtLocation(specifier)?.valueDeclaration
  return declaration && ts.isSourceFile(declaration) ? declaration : undefined
}

/** La especificación de import/export que un TS2305 señala: su módulo y el
 * nombre del miembro que falta. */
function missingMember(source: ts.SourceFile, start: number): { specifier: ts.Expression; member: string } | undefined {
  for (const statement of source.statements) {
    if (statement.getStart(source) > start || start >= statement.getEnd()) continue
    let elements: readonly (ts.ImportSpecifier | ts.ExportSpecifier)[] = []
    let specifier: ts.Expression | undefined
    if (ts.isImportDeclaration(statement)) {
      specifier = statement.moduleSpecifier
      const bindings = statement.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings)) elements = bindings.elements
    } else if (ts.isExportDeclaration(statement)) {
      specifier = statement.moduleSpecifier
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) elements = statement.exportClause.elements
    }
    if (!specifier) return undefined
    for (const element of elements) {
      const name = element.propertyName ?? element.name
      if (name.getStart(source) <= start && start < name.getEnd()) return { specifier, member: name.text }
    }
    return undefined
  }
  return undefined
}

/**
 * Fachadas TS2305: un miembro que falta en un módulo y está exportado UNA vez
 * en el mismo paquete se reexporta desde el archivo que lo declara. Una
 * propuesta por módulo proveedor; sus objetivos son los TS2305 de los
 * consumidores. Rehúsa —y el diagnóstico queda para la cola residual— si hay
 * más de una declaración, si cruza de paquete, si el archivo que declara
 * importa al proveedor (ciclo directo) o si delega en los bindings del host,
 * que es el ciclo en runtime que `tsc` no ve (H-THYROX-156).
 */
function proposeFacades(service: ts.LanguageService, files: string[], read: Reader, cwd: string): ProposalRow[] {
  const program = service.getProgram()!
  const checker = program.getTypeChecker()
  const packages = new Map<string, string | undefined>()
  const sources = program.getSourceFiles().filter(sf => !sf.isDeclarationFile && !sf.fileName.includes('/node_modules/'))
  // Miembro → símbolos resueltos que lo exportan, por paquete.
  const exported = new Map<string, Map<ts.Symbol, ts.SourceFile>>()
  const exportsOf = (pkg: string, member: string): Map<ts.Symbol, ts.SourceFile> => {
    const key = `${pkg}\0${member}`
    let found = exported.get(key)
    if (found) return found
    found = new Map()
    for (const sf of sources) {
      if (packageRoot(sf.fileName, read, packages) !== pkg) continue
      const moduleSymbol = checker.getSymbolAtLocation(sf)
      if (!moduleSymbol) continue
      for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
        if (symbol.name !== member) continue
        const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
        const declaration = resolved.declarations?.[0]
        if (declaration) found.set(resolved, declaration.getSourceFile())
      }
    }
    exported.set(key, found)
    return found
  }

  type Pending = { provider: ts.SourceFile; lines: Map<string, string>; targets: string[] }
  const byProvider = new Map<string, Pending>()
  for (const fileName of files) {
    const source = program.getSourceFile(fileName)
    if (!source) continue
    for (const diagnostic of program.getSemanticDiagnostics(source)) {
      if (diagnostic.code !== 2305 || diagnostic.start === undefined) continue
      const found = missingMember(source, diagnostic.start)
      if (!found) continue
      const provider = moduleFile(checker, found.specifier)
      if (!provider || provider.isDeclarationFile || provider.fileName.includes('/node_modules/')) continue
      const pkg = packageRoot(provider.fileName, read, packages)
      if (!pkg) continue
      const candidates = exportsOf(pkg, found.member)
      if (candidates.size !== 1) continue
      const [entry] = [...candidates]
      if (!entry) continue
      const [symbol, declaring] = entry
      if (declaring === provider) continue
      if (declaring.text.includes('getAgentHostBindings')) continue
      const cycle = declaring.statements.some((statement: ts.Statement) =>
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier !== undefined &&
        moduleFile(checker, statement.moduleSpecifier) === provider)
      if (cycle) continue
      let relative = path.relative(path.dirname(provider.fileName), declaring.fileName).replace(/\.tsx?$/, '.js')
      if (!relative.startsWith('.')) relative = `./${relative}`
      // Un tipo reexportado con `export {}` es un error bajo `isolatedModules`.
      const typeOnly = (symbol.flags & ts.SymbolFlags.Value) === 0
      const pending = byProvider.get(provider.fileName) ??
        { provider, lines: new Map<string, string>(), targets: [] }
      pending.lines.set(found.member, `export ${typeOnly ? 'type ' : ''}{ ${found.member} } from '${relative}'`)
      pending.targets.push(diagnosticKey(diagnostic, cwd))
      byProvider.set(provider.fileName, pending)
    }
  }

  const rows: ProposalRow[] = []
  for (const { provider, lines, targets } of byProvider.values()) {
    const text = read(provider.fileName)
    if (text === undefined) continue
    const relative = path.relative(cwd, provider.fileName)
    const prefix = text.length === 0 || text.endsWith('\n') ? '' : '\n'
    rows.push({
      proposal_id: `ts2305-facade:${relative}`,
      proposer: 'ts2305-facade',
      targets: targets.sort(),
      files: [relative],
      edits: [{ file: relative, start: text.length, length: 0,
                newText: prefix + [...lines.values()].sort().join('\n') + '\n' }],
      bases: { [relative]: textHash(text) },
    })
  }
  return rows
}

function propose(service: ts.LanguageService, files: string[], read: Reader, cwd: string): ProposalRow[] {
  const program = service.getProgram()
  if (!program) throw new Error('el servicio de lenguaje no tiene programa')
  const rows: ProposalRow[] = []
  for (const fileName of files) {
    const source = program.getSourceFile(fileName)
    const text = read(fileName)
    if (!source || text === undefined) continue
    const diagnostics = [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)]
      .filter(diagnostic => diagnostic.start !== undefined)
    const relative = path.relative(cwd, fileName)
    for (const proposer of PROPOSERS) {
      const edits = proposer.edits(service, fileName, text)
      if (edits.length === 0) continue
      const targets = diagnostics
        .filter(diagnostic => proposer.codes.has(diagnostic.code) && touches(diagnostic, edits))
        .map(diagnostic => diagnosticKey(diagnostic, cwd))
      // Una edición que no toca ningún diagnóstico reclamado no tiene objeto:
      // el verificador la daría `no-targets` y no enseñaría nada.
      if (targets.length === 0) continue
      rows.push({
        proposal_id: `${proposer.name}:${relative}`,
        proposer: proposer.name,
        targets: targets.sort(),
        files: [relative],
        edits: edits.map(edit => ({
          file: relative,
          start: edit.span.start,
          length: edit.span.length,
          newText: edit.newText,
        })),
        bases: { [relative]: textHash(text) },
      })
    }
  }
  return [...rows, ...proposeFacades(service, files, read, cwd)]
}

/** Variante en memoria: `sources` es el universo entero del programa. */
export function proposeInMemory(
  sources: Record<string, string>,
  files: string[],
  cwd: string,
  options: ts.CompilerOptions = DEFAULT_OPTIONS,
): ProposalRow[] {
  const { service, read } = createMemoryService(sources, options)
  return propose(service, files, read, cwd)
}

/** Aplica las ediciones de una propuesta a un universo en memoria. */
export function applyProposalEdits(
  sources: Record<string, string>,
  row: ProposalRow,
  cwd: string,
): Record<string, string> {
  const next = { ...sources }
  for (const file of row.files) {
    const absolute = path.resolve(cwd, file)
    if (textHash(next[absolute] ?? '') !== row.bases[file]) {
      throw new Error(`${file} cambió desde que se propuso ${row.proposal_id}: las posiciones ya no valen`)
    }
    const edits = row.edits
      .filter(edit => edit.file === file)
      .map(edit => ({ span: { start: edit.start, length: edit.length }, newText: edit.newText }))
    next[absolute] = applyEdits(next[absolute] ?? '', edits)
  }
  return next
}

/** Variante de proyecto: los archivos del `tsconfig` con algún diagnóstico. */
export function proposeInProject(tsconfigPath: string, cwd: string): ProposalRow[] {
  const service = createProjectService(tsconfigPath)
  const program = service.getProgram()
  if (!program) throw new Error('el servicio de lenguaje no tiene programa')
  const files = program
    .getSourceFiles()
    .filter(source => !source.isDeclarationFile && !source.fileName.includes('/node_modules/'))
    .map(source => source.fileName)
  return propose(service, files, ts.sys.readFile, cwd)
}

if (import.meta.main) {
  // Uso: bun src/verify/tscProposers.ts <tsconfig>   (JSONL por stdout)
  const [tsconfig] = process.argv.slice(2)
  if (!tsconfig) {
    console.error('uso: tsc_proposers <tsconfig>')
    process.exit(2)
  }
  // Las claves llevan la ruta relativa al directorio del `tsconfig`, que es
  // desde donde corre `tsc -p` en la raíz y en `cli`
  // (`check-cli-typecheck.sh`): con otra base ninguna clave casaría con el log.
  const rows = proposeInProject(tsconfig, path.dirname(path.resolve(tsconfig)))
  for (const row of rows) process.stdout.write(JSON.stringify(row) + '\n')
  const byProposer = new Map<string, number>()
  for (const row of rows) byProposer.set(row.proposer, (byProposer.get(row.proposer) ?? 0) + 1)
  console.error(
    `tsc_proposers: ${rows.length} propuesta(s) · ` +
      [...byProposer].map(([name, count]) => `${name} ${count}`).join(' · ') +
      ` · objetivos ${rows.reduce((sum, row) => sum + row.targets.length, 0)}`,
  )
}
