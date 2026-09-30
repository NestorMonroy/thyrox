import path from 'node:path'
import ts from 'typescript'
import { createProjectService } from '/home/user/thyrox/src/verify/tsLanguageService'
const service = createProjectService('/home/user/thyrox/tsconfig.json')
const program = service.getProgram()!
const checker = program.getTypeChecker()
const sources = program.getSourceFiles().filter(sf => !sf.isDeclarationFile && !sf.fileName.includes('/node_modules/'))
const pkgOf = (f: string) => { let d = path.dirname(f); for (;;) { if (ts.sys.fileExists(path.join(d, 'package.json'))) return d; const p = path.dirname(d); if (p === d) return ''; d = p } }
const index = new Map<string, Map<ts.Symbol, string>>()
for (const sf of sources) {
  const m = checker.getSymbolAtLocation(sf); if (!m) continue
  for (const s of checker.getExportsOfModule(m)) {
    const r = s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s
    const d = r.declarations?.[0]; if (!d) continue
    const bucket = index.get(s.name) ?? new Map(); bucket.set(r, d.getSourceFile().fileName); index.set(s.name, bucket)
  }
}
const tally = new Map<string, number>()
const members = new Map<string, string>()
for (const sf of sources) for (const d of program.getSemanticDiagnostics(sf)) {
  if (d.code !== 2305) continue
  const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n')
  const m = msg.match(/Module '"?(.+?)"?' has no exported member '(.+?)'/); if (!m) continue
  const [, spec, member] = m
  const imp = sf.statements.find(s => (ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) && s.getStart(sf) <= d.start! && d.start! < s.getEnd()) as ts.ImportDeclaration | undefined
  const provider = imp?.moduleSpecifier && checker.getSymbolAtLocation(imp.moduleSpecifier)?.valueDeclaration
  const ppkg = provider && ts.isSourceFile(provider) ? pkgOf(provider.fileName) : ''
  const decls = [...(index.get(member!)?.values() ?? [])]
  const same = decls.filter(f => pkgOf(f) === ppkg)
  const kind = !provider ? 'proveedor sin resolver' : decls.length === 0 ? 'no existe' : same.length === 1 ? 'candidato (mismo paquete)' : same.length > 1 ? 'varias en el paquete' : 'sólo en otro paquete'
  tally.set(kind, (tally.get(kind) ?? 0) + 1)
  members.set(`${kind}\t${spec}\t${member}`, kind)
}
for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1])) console.log(v, k)
for (const k of [...members.keys()].filter(k => k.startsWith('sólo en otro')).slice(0, 12)) console.log(k)
