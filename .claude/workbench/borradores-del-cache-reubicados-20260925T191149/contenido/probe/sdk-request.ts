import ts from 'typescript'
const config = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!
const probe = ts.sys.resolvePath('src/packages/headless-sdk/src/__probe__.ts')
const text = "import type { SDKControlRequest } from './controlTypes.ts'\nimport type { SDKControlRequestInnerSchema } from './controlSchemas.ts'\nexport type R = SDKControlRequest['request']\nexport type I = ReturnType<typeof SDKControlRequestInnerSchema>\nimport { z } from 'zod/v4'\nexport const zz = z\n"
const host = ts.createCompilerHost(config.options)
const orig = host.getSourceFile
host.getSourceFile = (f, l) => (f === probe ? ts.createSourceFile(f, text, l, true) : orig(f, l))
const program = ts.createProgram([...config.fileNames, probe], config.options, host)
const c = program.getTypeChecker(), sf = program.getSourceFile(probe)!
for (const s of sf.statements) if (ts.isTypeAliasDeclaration(s) || ts.isVariableStatement(s)) {
  const node = ts.isTypeAliasDeclaration(s) ? s.name : s.declarationList.declarations[0].name
  console.log(node.getText(sf), '=>', c.typeToString(c.getTypeAtLocation(node)).slice(0, 200))
}
console.log(program.getSemanticDiagnostics(sf).map(d => d.code + ' ' + ts.flattenDiagnosticMessageText(d.messageText, ' ').slice(0, 120)))
const r = ts.resolveModuleName('zod/v4', ts.sys.resolvePath('src/packages/headless-sdk/src/controlSchemas.ts'), config.options, ts.sys)
console.log('zod/v4 ->', r.resolvedModule?.resolvedFileName)
