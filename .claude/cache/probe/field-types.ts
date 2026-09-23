// Tipo, segun el checker, de cada campo de los objetos literales con `type: '<lit>'`.
import ts from 'typescript'
const files = process.argv.slice(2).map(f => ts.sys.resolvePath(f))
const config = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!
const program = ts.createProgram(config.fileNames, config.options)
const checker = program.getTypeChecker()
const out = new Map<string, Map<string, Set<string>>>()
for (const f of files) {
  const sf = program.getSourceFile(f)!
  const visit = (n: ts.Node): void => {
    if (ts.isObjectLiteralExpression(n)) {
      const tp = n.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'type' && ts.isStringLiteral(p.initializer)) as ts.PropertyAssignment | undefined
      if (tp) {
        const t = (tp.initializer as ts.StringLiteral).text
        const fields = out.get(t) ?? new Map<string, Set<string>>()
        for (const p of n.properties) {
          if (!p.name || p.name.getText(sf) === 'type') continue
          const node = ts.isPropertyAssignment(p) ? p.initializer : ts.isShorthandPropertyAssignment(p) ? p.name : undefined
          if (!node) continue
          const text = checker.typeToString(checker.getTypeAtLocation(node), undefined, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseFullyQualifiedType)
          ;(fields.get(p.name.getText(sf)) ?? fields.set(p.name.getText(sf), new Set()).get(p.name.getText(sf))!).add(text)
        }
        out.set(t, fields)
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
}
for (const [t, fields] of [...out].sort()) {
  console.log(`== ${t}`)
  for (const [k, v] of fields) console.log(`  ${k}: ${[...v].join(' | ')}`)
}
