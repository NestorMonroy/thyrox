/**
 * Cobertura de un porte, simbolo por simbolo: las declaraciones de nivel
 * superior del archivo fuente y si el archivo porte declara una del mismo
 * nombre.
 * Uso: bun port_coverage.ts <fuente> <porte>
 * Salida: nombre<TAB>export|local<TAB>presente|AUSENTE ; resumen a stderr.
 * Ciega a: un simbolo renombrado al portarlo, o movido a otro modulo.
 */
import ts from 'typescript'
import { existsSync, readFileSync } from 'node:fs'
function symbols(path: string): Map<string, boolean> {
  const out = new Map<string, boolean>()
  if (!existsSync(path)) return out
  const sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
  for (const st of sf.statements) {
    const names: string[] = []
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st) ||
         ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) names.push(st.name.text)
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.push(d.name.text)
    const exported = ts.canHaveModifiers(st) && (ts.getModifiers(st) ?? []).some(m => m.kind === ts.SyntaxKind.ExportKeyword)
    for (const n of names) out.set(n, exported)
  }
  return out
}
const [src, port] = process.argv.slice(2) as [string, string]
const a = symbols(src), b = symbols(port)
let missing = 0
for (const [n, exported] of a) {
  const present = b.has(n)
  if (!present) missing++
  console.log(`${n}\t${exported ? 'export' : 'local'}\t${present ? 'presente' : 'AUSENTE'}`)
}
console.error(`${port}: ${a.size - missing} de ${a.size} simbolos de la fuente presentes`)
