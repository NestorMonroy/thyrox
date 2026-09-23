import ts from 'typescript'
const sources: Record<string, string> = {
  '/p/dep.ts': 'export const used = 1\nexport const unused = 2\n',
  '/p/main.ts': "import { used, unused } from './dep'\nexport function f(p: number) { const l = 1; return used }\n",
}
const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, strict: true, noUnusedLocals: true, noUnusedParameters: true }
const read = (f: string) => (f in sources ? sources[f] : ts.sys.readFile(f))
const service = ts.createLanguageService({
  getScriptFileNames: () => Object.keys(sources), getScriptVersion: () => '0',
  getScriptSnapshot: f => { const t = read(f); return t === undefined ? undefined : ts.ScriptSnapshot.fromString(t) },
  getCurrentDirectory: () => '/p', getCompilationSettings: () => options,
  getDefaultLibFileName: ts.getDefaultLibFilePath, fileExists: f => read(f) !== undefined, readFile: read,
}, ts.createDocumentRegistry())
console.log(service.getSemanticDiagnostics('/p/main.ts').map(d => d.code))
for (const id of ['unusedIdentifier_delete', 'unusedIdentifier_deleteImports']) {
  try { console.log(id, JSON.stringify(service.getCombinedCodeFix({ type: 'file', fileName: '/p/main.ts' }, id, {}, undefined).changes.flatMap(c => c.textChanges))) }
  catch (e) { console.log(id, 'ERROR', String(e).slice(0, 120)) }
}
