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
    directoryExists: ts.sys.directoryExists,
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

function collect(service: ts.LanguageService, targets: string[], read: Reader): Map<string, string> {
  const changed = new Map<string, string>()
  for (const fileName of targets) {
    const text = read(fileName)
    if (text === undefined) continue
    // `unusedIdentifier_deleteImports` edita sólo el tramo del binding sin
    // uso. `organizeImports` reescribía el bloque entero con el formato por
    // defecto (`;`, sangría, espacios): 230 archivos de churn en el primer
    // lote. Y `unusedIdentifier_delete` —el id vecino— NO toca imports:
    // retira locales y parámetros, que aquí no se tocan.
    const { changes } = service.getCombinedCodeFix(
      { type: 'file', fileName },
      'unusedIdentifier_deleteImports',
      {},
      undefined,
    )
    const edits = changes.filter(change => change.fileName === fileName).flatMap(c => c.textChanges)
    if (edits.length === 0) continue
    const next = applyEdits(text, edits)
    if (next !== text) changed.set(fileName, next)
  }
  return changed
}

/** Variante en memoria: `sources` es el universo entero del programa. */
export function removeUnusedImports(
  sources: Record<string, string>,
  targets: string[],
  options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    strict: true,
    // Las mismas que `tsconfig.json`: sin ellas TS6133 no existe y un
    // control que dependa de ese diagnóstico no mediría nada.
    noUnusedLocals: true,
    noUnusedParameters: true,
  },
): Map<string, string> {
  const read: Reader = fileName =>
    fileName in sources ? sources[fileName] : ts.sys.readFile(fileName)
  const service = createService(Object.keys(sources), options, read)
  return collect(service, targets, read)
}

/** Variante de proyecto: lee `tsconfig` y el disco. */
export function removeUnusedImportsInProject(tsconfigPath: string, targets: string[]): Map<string, string> {
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
  const changed = removeUnusedImportsInProject(tsconfig, resolved)
  for (const [fileName, text] of changed) {
    if (write) ts.sys.writeFile(fileName, text)
    console.log(fileName)
  }
  console.error(`removeUnusedImports: ${changed.size} de ${resolved.length} archivo(s) con imports sin uso`)
}
