// Censo de proponentes baratos: para cada diagnóstico de tsc, qué code fixes
// ofrece el servicio de lenguaje de TypeScript. Sonda de medición del plan
// tsc-cero; no escribe nada fuera de su salida.
import ts from 'typescript'
const config = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!
const versions = new Map<string, string>()
const host: ts.LanguageServiceHost = {
  getScriptFileNames: () => config.fileNames, getScriptVersion: () => '0',
  getScriptSnapshot: f => { const t = ts.sys.readFile(f); return t === undefined ? undefined : ts.ScriptSnapshot.fromString(t) },
  getCurrentDirectory: () => ts.sys.getCurrentDirectory(), getCompilationSettings: () => config.options,
  getDefaultLibFileName: ts.getDefaultLibFilePath, fileExists: ts.sys.fileExists, readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory, directoryExists: ts.sys.directoryExists, getDirectories: ts.sys.getDirectories,
}
const service = ts.createLanguageService(host, ts.createDocumentRegistry())
const program = service.getProgram()!
const rows: string[] = []
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || sf.fileName.includes('/node_modules/')) continue
  for (const d of [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)]) {
    if (d.start === undefined) continue
    let fixes: string[] = []
    try {
      fixes = service.getCodeFixesAtPosition(sf.fileName, d.start, d.start + (d.length ?? 0), [d.code], {}, {})
        .map(f => `${f.fixName}${f.fixId ? ':' + String(f.fixId) : ''}`)
    } catch (e) { fixes = ['ERROR'] }
    rows.push(`TS${d.code}\t${sf.fileName.replace(process.cwd() + '/', '')}\t${d.start}\t${[...new Set(fixes)].join(',') || '-'}`)
  }
}
process.stdout.write(rows.join('\n') + '\n')
console.error(`diagnosticos: ${rows.length}`)
