// Prefija con _ los PARÁMETROS no leídos (TS6133) que la fuente tampoco lee.
//
// Criterio por sitio del log, sobre el AST (la heurística por línea del
// intento 1 renombró una propiedad de clase y un parámetro desestructurado en
// varias líneas, y rompió sus usos):
// - el identificador en la posición que tsc señala es el `name` de un
//   ts.ParameterDeclaration (no de un BindingElement, no de una propiedad);
// - el archivo existe en la fuente con el alias reescrito y el nombre aparece
//   el MISMO número de veces en los dos: la fuente tampoco lo lee.
// Uso: bun prefix_unused_params.ts <log-tsc> <raiz-fuente>
import ts from 'typescript'
const [logPath, sourceRoot] = process.argv.slice(2) as [string, string]
const SITE = /^(src\/packages\/[^(]+)\((\d+),(\d+)\): error TS6133: '([A-Za-z_$][\w$]*)' is declared/
const sites = new Map<string, { line: number; col: number; name: string }[]>()
for (const line of (await Bun.file(logPath).text()).split('\n')) {
  const m = SITE.exec(line)
  if (m && !m[4]!.startsWith('_')) sites.set(m[1]!, [...(sites.get(m[1]!) ?? []), { line: +m[2]!, col: +m[3]!, name: m[4]! }])
}
const count = (text: string, name: string) => (text.match(new RegExp(`(?<![\\w$])${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g')) ?? []).length
const skipped = new Map<string, number>()
let applied = 0
const skip = (why: string) => skipped.set(why, (skipped.get(why) ?? 0) + 1)
for (const [file, locs] of sites) {
  const text = await Bun.file(file).text()
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const srcFile = Bun.file(`${sourceRoot}/${file.replace('src/packages/', '')}`)
  const srcText = (await srcFile.exists()) ? await srcFile.text() : undefined
  const inserts: number[] = []
  for (const { line, col, name } of locs) {
    const pos = sf.getPositionOfLineAndCharacter(line - 1, col - 1)
    let node: ts.Node | undefined = sf
    const find = (n: ts.Node): ts.Node | undefined => (pos >= n.getStart(sf) && pos < n.getEnd() ? (ts.forEachChild(n, find) ?? n) : undefined)
    node = find(sf)
    if (!node || !ts.isIdentifier(node) || node.text !== name) { skip('la posición no es el identificador'); continue }
    if (!ts.isParameter(node.parent) || node.parent.name !== node) { skip('no es un parámetro simple'); continue }
    if (srcText === undefined) { skip('sin archivo en la fuente'); continue }
    if (count(srcText, name) !== count(text, name)) { skip('la fuente lo usa distinto'); continue }
    inserts.push(node.getStart(sf))
  }
  if (!inserts.length) continue
  let out = text
  for (const at of inserts.sort((a, b) => b - a)) out = out.slice(0, at) + '_' + out.slice(at)
  await Bun.write(file, out)
  applied += inserts.length
}
console.log(`aplicados: ${applied}`)
for (const [why, n] of skipped) console.log(`descartados (${why}): ${n}`)
