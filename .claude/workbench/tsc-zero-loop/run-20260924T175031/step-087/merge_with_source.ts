// Fusiona un archivo de la fuente con los exports que el árbol añadió y sus
// consumidores usan: el texto de la fuente (alias reescrito) más, al final,
// cada declaración de nivel superior del árbol cuyo nombre exportado la
// fuente no exporta. Si la fuente ya importa ese nombre, se reexporta desde
// su módulo en vez de duplicarlo.
// Uso: bun merge_with_source.ts <fuente> <arbol> > salida
import ts from 'typescript'
const [sourcePath, treePath] = process.argv.slice(2) as [string, string]
const sourceText = (await Bun.file(sourcePath).text()).replaceAll('@claude-code-how-works/', '@thyrox/')
const treeText = await Bun.file(treePath).text()
const parse = (text: string) => ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true)
const exported = (node: ts.Node) => ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some(m => m.kind === ts.SyntaxKind.ExportKeyword)
function declaredNames(node: ts.Statement): string[] {
  if (ts.isVariableStatement(node)) return node.declarationList.declarations.map(d => d.name.getText())
  if (ts.isFunctionDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) return node.name ? [node.name.text] : []
  return []
}
const source = parse(sourceText)
const sourceExports = new Set<string>()
const sourceImports = new Map<string, string>()
for (const st of source.statements) {
  if (exported(st)) declaredNames(st).forEach(n => sourceExports.add(n))
  // `export { A, B } from '...'` también exporta: sin contarlo, el nombre se
  // reexportaba dos veces y Bun rehúsa el módulo («duplicate name»), aunque
  // tsc lo acepte por ser el mismo símbolo (intento-1 del paso 087).
  if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause))
    for (const el of st.exportClause.elements) sourceExports.add(el.name.text)
  if (ts.isImportDeclaration(st) && st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings)) {
    const from = (st.moduleSpecifier as ts.StringLiteral).text
    for (const el of st.importClause.namedBindings.elements) sourceImports.set(el.name.text, from)
  }
}
const tail: string[] = []
const reexports = new Map<string, string[]>()
for (const st of parse(treeText).statements) {
  if (!exported(st)) continue
  const names = declaredNames(st).filter(n => !sourceExports.has(n))
  if (!names.length) continue
  const imported = names.filter(n => sourceImports.has(n))
  for (const n of imported) reexports.set(sourceImports.get(n)!, [...(reexports.get(sourceImports.get(n)!) ?? []), n])
  if (imported.length === names.length) continue
  tail.push(st.getFullText().replace(/^\n+/, ''))
}
let out = sourceText.trimEnd() + '\n\n// --- Exports que el árbol añadió y sus consumidores importan desde aquí ---\n'
for (const [from, names] of reexports) out += `export { ${names.join(', ')} } from '${from}'\n`
out += '\n' + tail.join('\n\n') + '\n'
process.stdout.write(out)
