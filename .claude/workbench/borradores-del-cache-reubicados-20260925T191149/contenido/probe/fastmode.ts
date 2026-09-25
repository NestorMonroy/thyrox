import ts from 'typescript'
const config = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!
const program = ts.createProgram(config.fileNames, config.options)
const file = program.getSourceFile(ts.sys.resolvePath('src/packages/provider/src/fastMode.ts'))!
const checker = program.getTypeChecker()
for (const d of [...program.getSemanticDiagnostics(file)]) {
  const { line } = file.getLineAndCharacterOfPosition(d.start ?? 0)
  if (line < 70) console.log(line + 1, d.code, ts.flattenDiagnosticMessageText(d.messageText, ' ').slice(0, 140))
}
const mod = checker.getSymbolAtLocation((file.statements.find(s => ts.isImportDeclaration(s) && (s.moduleSpecifier as ts.StringLiteral).text === '@thyrox/local-observability') as ts.ImportDeclaration).moduleSpecifier)
console.log('module resolves:', !!mod, mod ? checker.getExportsOfModule(mod).map(s => s.name).filter(n => /Analytics|logEvent/.test(n)) : [])
