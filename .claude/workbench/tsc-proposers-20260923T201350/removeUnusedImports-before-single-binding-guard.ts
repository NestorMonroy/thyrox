/**
 * Retira los imports sin uso de los archivos pedidos, con el servicio de
 * lenguaje de TypeScript: el arreglo combinado `unusedIdentifier_deleteImports`,
 * que decide con el checker —no con un patrón— si un binding se usa y edita
 * sólo el tramo de ese binding, sin reformatear lo que conserva.
 *
 * POR QUÉ SÓLO IMPORTS. TS6133 cae igual sobre un import, un local y un
 * parámetro, pero sólo el primero es mecánico: sin `verbatimModuleSyntax`
 * tanto tsc como el transpilador de Bun eliden un import sin uso, así que
 * retirarlo no cambia el runtime. Un parámetro sin uso es parte de una firma
 * y un local sin uso suele ser un porte a medias; esa decisión es de juicio y
 * esta herramienta no la toma.
 *
 * QUÉ MIDE: los bindings de import que el checker declara sin referencias.
 * CIEGO A: un import cuyo módulo tenga efectos de carga que alguien espere
 * aunque no use ningún binding — tsc ya lo elide hoy, así que retirarlo no
 * cambia la conducta, pero sí hace visible la dependencia implícita.
 */
import ts from 'typescript'
import {
  DEFAULT_OPTIONS,
  applyEdits,
  createMemoryService,
  createProjectService,
  type Reader,
} from './tsLanguageService'


const UNUSED_IMPORT_CODES = new Set([6133, 6192, 6196])

/**
 * Los nombres de import que el checker marca sin uso y que el archivo, aun
 * así, NOMBRA fuera de sus declaraciones `import`.
 *
 * Medido en `fastMode.ts`: el módulo exporta un TIPO y el archivo lo usa como
 * valor (`typeof X`). El checker da TS2693 en el uso y TS6133 en el import;
 * retirar el import cambia tres diagnósticos por dos TS2304 y esconde el
 * defecto, que está en el uso. Un nombre así no es «sin uso»: es un uso roto,
 * y decidir cuál de los dos lados se corrige es juicio, no mecánica.
 */
function namedDespiteUnused(service: ts.LanguageService, fileName: string): string[] {
  const program = service.getProgram()
  const source = program?.getSourceFile(fileName)
  if (!source) return []
  const checker = program!.getTypeChecker()
  // Nombre → símbolo del binding importado. Se compara por SÍMBOLO, no por
  // texto: una reexportación `export { X } from …` y una ligadura que sombrea
  // el nombre comparten el texto y no son usos del import (medido en
  // `bridge/src/index.ts` y `pluginLoader.ts`).
  const flagged = new Map<string, ts.Symbol>()
  for (const diagnostic of service.getSemanticDiagnostics(fileName)) {
    if (!UNUSED_IMPORT_CODES.has(diagnostic.code) || diagnostic.start === undefined) continue
    const spanEnd = diagnostic.start + (diagnostic.length ?? 0)
    const declaration = source.statements.find(
      statement =>
        ts.isImportDeclaration(statement) &&
        statement.getStart(source) <= diagnostic.start! &&
        diagnostic.start! < statement.getEnd(),
    ) as ts.ImportDeclaration | undefined
    if (!declaration) continue
    // Cuenta el binding que el tramo del diagnóstico CONTIENE. TS6192 cubre la
    // declaración entera, y TS6133 también cuando el binding es el único: una
    // comparación del tramo con el texto del nombre sólo veía el caso de varios.
    const bindings: ts.Identifier[] = []
    const clause = declaration.importClause
    if (clause?.name) bindings.push(clause.name)
    const namedBindings = clause?.namedBindings
    if (namedBindings && ts.isNamespaceImport(namedBindings)) bindings.push(namedBindings.name)
    if (namedBindings && ts.isNamedImports(namedBindings)) bindings.push(...namedBindings.elements.map(element => element.name))
    for (const binding of bindings) {
      if (binding.getStart(source) < diagnostic.start || spanEnd < binding.getEnd()) continue
      const symbol = checker.getSymbolAtLocation(binding)
      if (symbol) flagged.set(binding.text, symbol)
    }
  }
  if (flagged.size === 0) return []
  const named = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) return
    if (ts.isIdentifier(node)) {
      const symbol = flagged.get(node.text)
      // Un uso ROTO —un tipo leído como valor con `typeof`— no tiene símbolo
      // en su sitio (medido: `undefined` en el TypeQuery). Se resuelve por
      // alcance desde ahí: da el alias importado salvo que otra ligadura lo
      // sombree, que es justo la distinción que el texto no hace.
      const resolved =
        checker.getSymbolAtLocation(node) ??
        checker.resolveName(node.text, node, ts.SymbolFlags.All, false)
      if (symbol && resolved === symbol) named.add(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return [...named].sort()
}

export type RemovalReport = {
  changed: Map<string, string>
  /** Archivo → nombres marcados sin uso que el archivo nombra: juicio pendiente. */
  skipped: Map<string, string[]>
}

/**
 * Las ediciones que retiran los imports sin uso de UN archivo, o los nombres
 * que obligan a saltarlo. Es la unidad que `tscProposers.ts` convierte en una
 * propuesta del lazo; `collect` la aplica en bloque.
 */
export function unusedImportEdits(
  service: ts.LanguageService,
  fileName: string,
): { edits: ts.TextChange[]; skipped: string[] } {
  const named = namedDespiteUnused(service, fileName)
  if (named.length > 0) return { edits: [], skipped: named }
  // `unusedIdentifier_deleteImports` edita sólo el tramo del binding sin
  // uso. `organizeImports` reescribía el bloque entero con el formato por
  // defecto (`;`, sangría, espacios): 230 archivos de churn en el primer
  // lote. Y `unusedIdentifier_delete` —el id vecino— NO toca imports:
  // retira locales y parámetros, que aquí no se tocan.
  const { changes } = service.getCombinedCodeFix(
    { type: 'file', fileName },
    'unusedIdentifier_deleteImports',
    {},
    {},
  )
  return {
    edits: changes.filter(change => change.fileName === fileName).flatMap(c => c.textChanges),
    skipped: [],
  }
}

function collect(service: ts.LanguageService, targets: string[], read: Reader): RemovalReport {
  const changed = new Map<string, string>()
  const skipped = new Map<string, string[]>()
  for (const fileName of targets) {
    const text = read(fileName)
    if (text === undefined) continue
    const found = unusedImportEdits(service, fileName)
    if (found.skipped.length > 0) {
      skipped.set(fileName, found.skipped)
      continue
    }
    if (found.edits.length === 0) continue
    const next = applyEdits(text, found.edits)
    if (next !== text) changed.set(fileName, next)
  }
  return { changed, skipped }
}

/**
 * Códigos semánticos de un archivo del universo en memoria. Existe para el
 * control del arnés: una fixture cuyos imports no resuelven (TS2307) mide
 * otro fenómeno, y ese defecto ya ocurrió.
 */
export function semanticDiagnosticCodes(
  sources: Record<string, string>,
  fileName: string,
  options: ts.CompilerOptions = DEFAULT_OPTIONS,
): number[] {
  return createMemoryService(sources, options).service.getSemanticDiagnostics(fileName).map(d => d.code)
}

/** Variante en memoria: `sources` es el universo entero del programa. */
export function removeUnusedImports(
  sources: Record<string, string>,
  targets: string[],
  options: ts.CompilerOptions = DEFAULT_OPTIONS,
): Map<string, string> {
  const { service, read } = createMemoryService(sources, options)
  return collect(service, targets, read).changed
}

/** Variante de proyecto: lee `tsconfig` y el disco. */
export function removeUnusedImportsInProject(tsconfigPath: string, targets: string[]): RemovalReport {
  return collect(createProjectService(tsconfigPath), targets, ts.sys.readFile)
}

if (import.meta.main) {
  // Uso: bun src/verify/removeUnusedImports.ts <tsconfig> [--write] <archivo>...
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const [tsconfig, ...targets] = args.filter(arg => arg !== '--write')
  if (!tsconfig || targets.length === 0) {
    console.error('uso: removeUnusedImports <tsconfig> [--write] <archivo>...')
    process.exit(2)
  }
  const resolved = targets.map(target => ts.sys.resolvePath(target))
  const { changed, skipped } = removeUnusedImportsInProject(tsconfig, resolved)
  for (const [fileName, text] of changed) {
    if (write) ts.sys.writeFile(fileName, text)
    console.log(fileName)
  }
  for (const [fileName, names] of skipped) {
    console.error(`salteado (nombra lo que el checker da sin uso): ${fileName}: ${names.join(', ')}`)
  }
  console.error(
    `removeUnusedImports: ${changed.size} de ${resolved.length} archivo(s) con imports sin uso; ` +
      `${skipped.size} salteado(s) con juicio pendiente`,
  )
}
