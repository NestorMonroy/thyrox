import ts from 'typescript'
const sources: Record<string, string> = {
  '/p/compat.ts': 'export type Metadata = never\n',
  '/p/typeOnly.ts': "export type { Metadata } from './compat'\nexport const unused = 1\n",
  '/p/main.ts': "import { Metadata, unused } from './typeOnly'\nexport const x = 1 as unknown as typeof Metadata\n",
}
const options = { strict: true, noUnusedLocals: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
const host = ts.createCompilerHost(options)
const orig = host.getSourceFile
host.getSourceFile = (f, l) => (f in sources ? ts.createSourceFile(f, sources[f], l, true) : orig(f, l))
host.fileExists = f => f in sources || ts.sys.fileExists(f)
host.directoryExists = d => d === '/p' || ts.sys.directoryExists(d)
const program = ts.createProgram(['/p/main.ts'], options, host)
const c = program.getTypeChecker(), sf = program.getSourceFile('/p/main.ts')!
const walk = (n: ts.Node): void => { if (ts.isIdentifier(n) && n.text === 'Metadata') { const s = c.getSymbolAtLocation(n); console.log(n.parent.kind, ts.SyntaxKind[n.parent.kind], s?.name, s && ts.SymbolFlags[s.flags], s && (s.flags & ts.SymbolFlags.Alias ? c.getAliasedSymbol(s).name + '@' + c.getAliasedSymbol(s).declarations?.[0]?.getSourceFile().fileName : '-')) } ts.forEachChild(n, walk) }
walk(sf)
