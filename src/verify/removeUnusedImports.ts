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

type Reader = (fileName: string) => string | undefined

function createService(
  rootNames: string[],
  options: ts.CompilerOptions,
  read: Reader,
  directoryExists: (directory: string) => boolean = ts.sys.directoryExists,
): ts.LanguageService {
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => rootNames,
    getScriptVersion: () => '0',
    getScriptSnapshot: fileName => {
      const text = read(fileName)
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text)
    },
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    getCompilationSettings: () => options,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: fileName => read(fileName) !== undefined,
    readFile: read,
    readDirectory: ts.sys.readDirectory,
    // Sin esto la resolución de módulos pregunta al disco por un directorio
    // virtual, recibe «no existe» y todo import queda sin resolver (TS2307):
    // la variante en memoria medía entonces otro fenómeno.
    directoryExists,
    getDirectories: ts.sys.getDirectories,
  }
  return ts.createLanguageService(host, ts.createDocumentRegistry())
}

function applyEdits(text: string, edits: readonly ts.TextChange[]): string {
  // De atrás hacia adelante: cada edición conserva las posiciones de las previas.
  return [...edits]
    .sort((a, b) => b.span.start - a.span.start)
    .reduce(
      (acc, edit) =>
        acc.slice(0, edit.span.start) + edit.newText + acc.slice(edit.span.start + edit.span.length),
      text,
    )
}

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
  const flagged = new Set<string>()
  for (const diagnostic of service.getSemanticDiagnostics(fileName)) {
    if (!UNUSED_IMPORT_CODES.has(diagnostic.code) || diagnostic.start === undefined) continue
    const span = source.text.slice(diagnostic.start, diagnostic.start + (diagnostic.length ?? 0))
    const declaration = source.statements.find(
      statement =>
        ts.isImportDeclaration(statement) &&
        statement.getStart(source) <= diagnostic.start! &&
        diagnostic.start! < statement.getEnd(),
    ) as ts.ImportDeclaration | undefined
    if (!declaration) continue
    // TS6192 cubre la declaración entera: todos sus bindings cuentan.
    const bindings: string[] = []
    const clause = declaration.importClause
    if (clause?.name) bindings.push(clause.name.text)
    const named = clause?.namedBindings
    if (named && ts.isNamespaceImport(named)) bindings.push(named.name.text)
    if (named && ts.isNamedImports(named)) bindings.push(...named.elements.map(element => element.name.text))
    for (const name of bindings) if (diagnostic.code === 6192 || span === name) flagged.add(name)
  }
  if (flagged.size === 0) return []
  const named = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) return
    if (ts.isIdentifier(node) && flagged.has(node.text)) named.add(node.text)
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

function collect(service: ts.LanguageService, targets: string[], read: Reader): RemovalReport {
  const changed = new Map<string, string>()
  const skipped = new Map<string, string[]>()
  for (const fileName of targets) {
    const text = read(fileName)
    if (text === undefined) continue
    const named = namedDespiteUnused(service, fileName)
    if (named.length > 0) {
      skipped.set(fileName, named)
      continue
    }
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
    const edits = changes.filter(change => change.fileName === fileName).flatMap(c => c.textChanges)
    if (edits.length === 0) continue
    const next = applyEdits(text, edits)
    if (next !== text) changed.set(fileName, next)
  }
  return { changed, skipped }
}

const DEFAULT_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  strict: true,
  // Las mismas que `tsconfig.json`: sin ellas TS6133 no existe y un
  // control que dependa de ese diagnóstico no mediría nada.
  noUnusedLocals: true,
  noUnusedParameters: true,
}

function createMemoryService(sources: Record<string, string>, options: ts.CompilerOptions) {
  const read: Reader = fileName =>
    fileName in sources ? sources[fileName] : ts.sys.readFile(fileName)
  const virtualDirectories = new Set(
    Object.keys(sources).flatMap(fileName =>
      fileName.split('/').slice(1, -1).map((_, index, parts) => '/' + parts.slice(0, index + 1).join('/')),
    ),
  )
  const service = createService(Object.keys(sources), options, read, directory =>
    virtualDirectories.has(directory.replace(/\/$/, '')) || ts.sys.directoryExists(directory),
  )
  return { service, read }
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
  const config = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: diagnostic => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    },
  })
  if (!config) throw new Error(`no se pudo leer ${tsconfigPath}`)
  const service = createService(config.fileNames, config.options, ts.sys.readFile)
  return collect(service, targets, ts.sys.readFile)
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
