// Formas de los objetos literales con `type: '<literal>'` en los archivos dados.
import ts from 'typescript'
const files = process.argv.slice(2)
const shapes = new Map<string, Map<string, Set<string>>>()
const seen = new Map<string, number>()
for (const f of files) {
  const sf = ts.createSourceFile(f, ts.sys.readFile(f)!, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const visit = (n: ts.Node): void => {
    if (ts.isObjectLiteralExpression(n)) {
      const typeProp = n.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'type' && ts.isStringLiteral(p.initializer)) as ts.PropertyAssignment | undefined
      if (typeProp) {
        const t = (typeProp.initializer as ts.StringLiteral).text
        seen.set(t, (seen.get(t) ?? 0) + 1)
        const fields = shapes.get(t) ?? new Map<string, Set<string>>()
        for (const p of n.properties) {
          const name = p.name?.getText(sf); if (!name || name === 'type') continue
          const init = ts.isPropertyAssignment(p) ? p.initializer.getText(sf).slice(0, 40) : '(shorthand)'
          ;(fields.get(name) ?? fields.set(name, new Set()).get(name)!).add(init)
        }
        shapes.set(t, fields)
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
}
for (const [t, fields] of [...shapes].sort()) console.log(`${t} (${seen.get(t)}): ${[...fields].map(([k, v]) => `${k}=[${[...v].slice(0, 3).join(' | ')}]`).join('; ')}`)
