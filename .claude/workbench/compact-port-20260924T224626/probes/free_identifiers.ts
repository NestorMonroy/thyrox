/**
 * Identificadores libres de una declaracion de nivel superior: los nombres que
 * usa y que no declara ella misma. Sirve para medir que necesita un simbolo
 * antes de portarlo.
 * Uso: bun free_identifiers.ts <archivo> <nombre>
 * Ciega a: propiedades (`a.b` solo cuenta `a`) y nombres globales del entorno,
 * que tambien aparecen y se filtran despues contra lo definido.
 */
import ts from 'typescript'
import { readFileSync } from 'node:fs'
const [file, name] = process.argv.slice(2) as [string, string]
const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
const target = sf.statements.find(st =>
  ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name?.text === name) ||
  (ts.isVariableStatement(st) && st.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === name)))
if (!target) { console.error(`no existe ${name}`); process.exit(2) }
const declared = new Set<string>(), used = new Set<string>()
const visit = (n: ts.Node) => {
  if ((ts.isVariableDeclaration(n) || ts.isParameter(n) || ts.isFunctionDeclaration(n) || ts.isBindingElement(n)) && n.name && ts.isIdentifier(n.name)) declared.add(n.name.text)
  if (ts.isIdentifier(n)) {
    const p = n.parent
    const isProp = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) ||
      (ts.isPropertySignature(p) && p.name === n) || ts.isQualifiedName(p) && p.right === n
    if (!isProp) used.add(n.text)
  }
  ts.forEachChild(n, visit)
}
visit(target)
for (const u of [...used].filter(u => !declared.has(u)).sort()) console.log(u)
