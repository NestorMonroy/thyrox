// Extrae del chunk las declaraciones completas de nivel superior y el cierre
// de funciones del mismo chunk que alcanzan desde las raíces dadas.
import ts from 'typescript'
import { readFileSync, writeFileSync } from 'node:fs'
const [chunk, outDir, depthArg, ...roots] = process.argv.slice(2)
const src = readFileSync(chunk, 'utf8')
const sf = ts.createSourceFile('c.js', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const decls = new Map<string, ts.Node>()
for (const st of sf.statements) {
  if (ts.isFunctionDeclaration(st) && st.name) decls.set(st.name.text, st)
  else if (ts.isVariableStatement(st))
    for (const d of st.declarationList.declarations)
      if (ts.isIdentifier(d.name)) decls.set(d.name.text, d)
}
const seen = new Map<string, number>(); const queue = roots.map(r => [r, 0] as [string, number])
while (queue.length) {
  const [n, d] = queue.shift()!
  if (seen.has(n) || !decls.has(n)) continue
  seen.set(n, d)
  if (d >= Number(depthArg)) continue
  const visit = (x: ts.Node) => { if (ts.isIdentifier(x) && decls.has(x.text) && !seen.has(x.text)) queue.push([x.text, d + 1]); ts.forEachChild(x, visit) }
  visit(decls.get(n)!)
}
let total = 0
for (const [n, d] of seen) {
  const node = decls.get(n)!; const text = src.slice(node.getStart(sf), node.end)
  total += text.length
  writeFileSync(`${outDir}/${n.replace(/\$/g,'S')}.js`, text + '\n')
  console.log(`${d}\t${text.length}\t${n}`)
}
console.log(`total\t${total}\t${seen.size}`)
