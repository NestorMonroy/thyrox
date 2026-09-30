/**
 * Imprime el tramo de lineas y el texto de una declaracion de nivel superior.
 * Uso: bun symbol_span.ts <archivo> <nombre> [--text]
 */
import ts from 'typescript'
import { readFileSync } from 'node:fs'
const [file, name, flag] = process.argv.slice(2) as [string, string, string?]
const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
for (const st of sf.statements) {
  const names: string[] = []
  if ((ts.isFunctionDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isClassDeclaration(st)) && st.name) names.push(st.name.text)
  if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.push(d.name.text)
  if (!names.includes(name)) continue
  const a = sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1
  const b = sf.getLineAndCharacterOfPosition(st.getEnd()).line + 1
  console.log(`${name}\t${a}-${b}\t${b - a + 1}`)
  if (flag === '--text') console.log(st.getFullText(sf))
}
