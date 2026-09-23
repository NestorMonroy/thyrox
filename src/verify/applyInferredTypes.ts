/** Apply TypeScript's runtime-neutral `inferFromUsage` annotations. */
import ts from 'typescript'
import {
  DEFAULT_OPTIONS,
  createMemoryService,
  createProjectService,
  type Reader,
} from './tsLanguageService'

function applyEdits(text: string, edits: readonly ts.TextChange[]): string {
  return [...edits]
    .sort((left, right) => right.span.start - left.span.start)
    .reduce(
      (current, edit) =>
        current.slice(0, edit.span.start) + edit.newText + current.slice(edit.span.start + edit.span.length),
      text,
    )
}

function collect(service: ts.LanguageService, targets: string[], read: Reader): Map<string, string> {
  const changed = new Map<string, string>()
  for (const fileName of targets) {
    const text = read(fileName)
    if (text === undefined) continue
    const fix = service.getCombinedCodeFix({ type: 'file', fileName }, 'inferFromUsage', {}, {})
    const edits = fix.changes
      .filter(change => change.fileName === fileName)
      .flatMap(change => change.textChanges)
    if (edits.length === 0) continue
    if (edits.some(edit => /\bany\b/.test(edit.newText))) continue
    const next = applyEdits(text, edits)
    const source = ts.createSourceFile(fileName, next, ts.ScriptTarget.Latest, true)
    if (source.parseDiagnostics.length > 0) continue
    if (next !== text) changed.set(fileName, next)
  }
  return changed
}

export function semanticDiagnosticCodes(
  sources: Record<string, string>,
  fileName: string,
  options: ts.CompilerOptions = DEFAULT_OPTIONS,
): number[] {
  return createMemoryService(sources, options).service.getSemanticDiagnostics(fileName).map(diagnostic => diagnostic.code)
}

export function applyInferredTypes(
  sources: Record<string, string>,
  targets: string[],
  options: ts.CompilerOptions = DEFAULT_OPTIONS,
): Map<string, string> {
  const { service, read } = createMemoryService(sources, options)
  return collect(service, targets, read)
}

export function applyInferredTypesInProject(tsconfigPath: string, targets?: string[]): Map<string, string> {
  const service = createProjectService(tsconfigPath)
  const program = service.getProgram()
  if (!program) throw new Error('the TypeScript language service has no program')
  const selected = targets ?? program.getSourceFiles()
    .filter(source => !source.isDeclarationFile && !source.fileName.includes('/node_modules/'))
    .filter(source => service.getSemanticDiagnostics(source.fileName).some(diagnostic =>
      diagnostic.code === 7006 || diagnostic.code === 7019,
    ))
    .map(source => source.fileName)
  return collect(service, selected, ts.sys.readFile)
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const [tsconfig, ...targets] = args.filter(argument => argument !== '--write')
  if (!tsconfig) {
    console.error('usage: applyInferredTypes <tsconfig> [--write] [file ...]')
    process.exit(2)
  }
  const resolved = targets.length > 0 ? targets.map(target => ts.sys.resolvePath(target)) : undefined
  const changed = applyInferredTypesInProject(tsconfig, resolved)
  for (const [fileName, text] of changed) {
    if (write) ts.sys.writeFile(fileName, text)
    console.log(fileName)
  }
  console.error(`applyInferredTypes: ${changed.size} file(s) changed`)
}
