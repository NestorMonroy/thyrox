import ts from 'typescript'
const sources: Record<string, string> = {
  '/p/compat.ts': 'export type Metadata = never\n',
  '/p/typeOnly.ts': "export type { Metadata } from './compat'\nexport const unused = 1\n",
  '/p/main.ts': "import { Metadata, unused } from './typeOnly'\nexport const x = 1 as unknown as typeof Metadata\n",
}
const cfg = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!
for (const [label, options] of [['minimal', { strict: true, noUnusedLocals: true }], ['project', cfg.options]] as const) {
  const host = ts.createCompilerHost(options)
  const orig = host.getSourceFile
  host.getSourceFile = (f, l) => f in sources ? ts.createSourceFile(f, sources[f], l) : orig(f, l)
  host.fileExists = f => f in sources || ts.sys.fileExists(f)
  const program = ts.createProgram(['/p/main.ts'], options, host)
  console.log(label, program.getSemanticDiagnostics(program.getSourceFile('/p/main.ts')).map(d => d.code))
}
