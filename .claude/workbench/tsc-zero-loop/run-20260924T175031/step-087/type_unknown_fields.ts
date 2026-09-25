// Sustituye, en el SettingsSchema del árbol, cada campo declarado con
// z.unknown() por su definición en la fuente, conservando todo lo demás
// (las extensiones propias: model por identificador completo, effort,
// testImpact). Un campo sólo se sustituye si cada identificador libre que
// usa su definición en la fuente ya existe en el archivo del árbol.
// Uso: bun type_unknown_fields.ts <fuente> <arbol>   (escribe <arbol>)
import ts from 'typescript'
const [sourcePath, treePath] = process.argv.slice(2) as [string, string]
const parse = (t: string) => ts.createSourceFile('x.ts', t, ts.ScriptTarget.Latest, true)
const sourceText = (await Bun.file(sourcePath).text()).replaceAll('@claude-code-how-works/', '@thyrox/')
const treeText = await Bun.file(treePath).text()
function schemaProps(sf: ts.SourceFile): Map<string, ts.PropertyAssignment> {
  const out = new Map<string, ts.PropertyAssignment>()
  const visit = (n: ts.Node): void => {
    if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name)) {
      // sólo las propiedades del objeto que recibe z.object dentro de SettingsSchema
      let p: ts.Node | undefined = n.parent
      while (p && !(ts.isVariableDeclaration(p) && p.name.getText() === 'SettingsSchema')) p = p.parent
      if (p && ts.isObjectLiteralExpression(n.parent) && ts.isCallExpression(n.parent.parent) &&
          n.parent.parent.expression.getText().endsWith('object')) {
        // el primer z.object que abre el esquema: sus hijos directos
        if (!out.has(n.name.text)) out.set(n.name.text, n)
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}
const tree = parse(treeText), source = parse(sourceText)
const treeProps = schemaProps(tree), sourceProps = schemaProps(source)
// Conocido = declarado o importado COMO VALOR en el archivo del árbol, más los
// globales. Contar cualquier identificador (intento 2) dio por conocido
// DynamicWorkflowSizeSchema sin que el archivo lo importara: tsc lo dio
// TS2304 y Bun ReferenceError al cargar el módulo.
const known = new Set<string>(['z', 'undefined', 'Object', 'Array', 'String', 'Number', 'Boolean', 'process'])
for (const st of tree.statements) {
  if (ts.isImportDeclaration(st) && !st.importClause?.isTypeOnly) {
    const c = st.importClause
    if (c?.name) known.add(c.name.text)
    if (c?.namedBindings && ts.isNamedImports(c.namedBindings))
      for (const el of c.namedBindings.elements) if (!el.isTypeOnly) known.add(el.name.text)
    if (c?.namedBindings && ts.isNamespaceImport(c.namedBindings)) known.add(c.namedBindings.name.text)
  }
  if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) known.add(d.name.getText())
  if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) known.add(st.name.text)
}
const UNKNOWN = /^z\.(unknown\(\)|record\(z\.string\(\), z\.unknown\(\)\)|array\(z\.unknown\(\)\))(\.optional\(\))?$/
const edits: { start: number; end: number; text: string }[] = []
for (const [name, prop] of treeProps) {
  if (!UNKNOWN.test(prop.initializer.getText())) continue
  const from = sourceProps.get(name)
  if (!from) { console.error(`sin fuente: ${name}`); continue }
  const free = new Set<string>()
  // Se empieza EN el inicializador: con forEachChild sobre él, un inicializador
  // que es un identificador pelado (dynamicWorkflowSize: DynamicWorkflowSizeSchema)
  // no se visitaba y pasaba sin nombres libres.
  ;(function walk(n: ts.Node) {
    if (ts.isIdentifier(n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n)) free.add(n.text)
    ts.forEachChild(n, walk)
  })(from.initializer)
  const missing = [...free].filter(id => !known.has(id))
  if (missing.length) { console.error(`se queda: ${name} — la fuente usa ${missing.join(', ')}`); continue }
  edits.push({ start: prop.initializer.getStart(tree), end: prop.initializer.getEnd(), text: from.initializer.getText(source) })
  console.error(`tipado: ${name}`)
}
let out = treeText
for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end)
await Bun.write(treePath, out)
