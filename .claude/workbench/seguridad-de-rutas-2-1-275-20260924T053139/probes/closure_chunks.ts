// Cierre de declaraciones de nivel superior a través de chunks: sigue los
// `import{a,b as c}from"/$bunfs/root/chunk-x.js"` hasta el chunk que
// declara cada binding. Uso: <raiz-bunfs> <salida> <profundidad> <chunk> <raices...>
import ts from 'typescript'
import { readFileSync, writeFileSync } from 'node:fs'
const [rootDir, outDir, depthArg, startChunk, ...roots] = process.argv.slice(2)
type Chunk = { src: string; sf: ts.SourceFile; decls: Map<string, ts.Node>; imports: Map<string, { from: string; name: string }> }
const cache = new Map<string, Chunk>()
function load(name: string): Chunk {
  const hit = cache.get(name); if (hit) return hit
  const src = readFileSync(`${rootDir}/${name}`, 'utf8')
  const sf = ts.createSourceFile(name, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const decls = new Map<string, ts.Node>(); const imports = new Map<string, { from: string; name: string }>()
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) decls.set(st.name.text, st)
    else if (ts.isClassDeclaration(st) && st.name) decls.set(st.name.text, st)
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) { if (ts.isIdentifier(d.name)) decls.set(d.name.text, d) }
    else if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings)) {
      const from = st.moduleSpecifier.text.replace('/$bunfs/root/', '')
      if (!from.startsWith('chunk-')) continue
      for (const el of st.importClause.namedBindings.elements) imports.set(el.name.text, { from, name: (el.propertyName ?? el.name).text })
    }
  }
  const c = { src, sf, decls, imports }; cache.set(name, c); return c
}
function resolve(chunk: string, name: string, hops = 0): { chunk: string; name: string } | null {
  const c = load(chunk)
  if (c.decls.has(name)) return { chunk, name }
  const imp = c.imports.get(name)
  if (!imp || hops > 8) return null
  return resolve(imp.from, imp.name, hops + 1)
}
const seen = new Map<string, number>()
const queue: Array<[string, string, number]> = roots.map(r => [startChunk, r, 0])
while (queue.length) {
  const [chunk, name, d] = queue.shift()!
  const where = resolve(chunk, name); if (!where) continue
  const key = `${where.chunk}:${where.name}`
  if (seen.has(key)) continue
  seen.set(key, d)
  if (d >= Number(depthArg)) continue
  const c = load(where.chunk)
  const visit = (x: ts.Node) => { if (ts.isIdentifier(x) && x.text !== where.name) queue.push([where.chunk, x.text, d + 1]); ts.forEachChild(x, visit) }
  visit(c.decls.get(where.name)!)
}
let total = 0
for (const [key, d] of seen) {
  const [chunk, name] = key.split(':') as [string, string]
  const c = load(chunk); const node = c.decls.get(name)!
  const text = c.src.slice(node.getStart(c.sf), node.end); total += text.length
  writeFileSync(`${outDir}/${chunk.replace(/\.js$/, '')}__${name.replace(/\$/g, 'S')}.js`, text + '\n')
  console.log(`${d}\t${text.length}\t${chunk}\t${name}`)
}
console.log(`total\t${total}\t${seen.size}`)
