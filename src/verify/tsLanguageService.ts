/**
 * Servicios de lenguaje de TypeScript para las herramientas de verificación:
 * uno sobre un universo en memoria (las suites) y uno sobre un `tsconfig` real.
 *
 * Extraído de `removeUnusedImports.ts` cuando `tscFixCensus.ts` necesitó lo
 * mismo: dos copias del host divergirían, y el host en memoria ya tuvo un
 * defecto medido que sólo se corrigió en un sitio (abajo, `directoryExists`).
 */
import ts from 'typescript'

export type Reader = (fileName: string) => string | undefined

/** Aplica ediciones de TypeScript a un texto, de atrás hacia adelante: cada
 * edición conserva las posiciones de las previas. Una sola copia para los
 * proponentes: dos habrían divergido como divergió el host. */
export function applyEdits(text: string, edits: readonly ts.TextChange[]): string {
  return [...edits]
    .sort((a, b) => b.span.start - a.span.start)
    .reduce(
      (acc, edit) =>
        acc.slice(0, edit.span.start) + edit.newText + acc.slice(edit.span.start + edit.span.length),
      text,
    )
}

export function createService(
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

export const DEFAULT_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  strict: true,
  // Las mismas que `tsconfig.json`: sin ellas TS6133 no existe y un
  // control que dependa de ese diagnóstico no mediría nada.
  noUnusedLocals: true,
  noUnusedParameters: true,
}

/** Servicio sobre un universo en memoria: `sources` es el programa entero. */
export function createMemoryService(
  sources: Record<string, string>,
  options: ts.CompilerOptions = DEFAULT_OPTIONS,
): { service: ts.LanguageService; read: Reader } {
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

/** Servicio sobre un proyecto real: lee `tsconfig` y el disco. */
export function createProjectService(tsconfigPath: string): ts.LanguageService {
  const config = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: diagnostic => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    },
  })
  if (!config) throw new Error(`no se pudo leer ${tsconfigPath}`)
  return createService(config.fileNames, config.options, ts.sys.readFile)
}
