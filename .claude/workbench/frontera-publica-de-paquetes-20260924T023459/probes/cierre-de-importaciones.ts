// Clausura de importaciones de un conjunto de archivos: cada módulo del árbol
// que su carga alcanzaría, con el resolutor de Bun. Imprime una ruta relativa
// por línea. Uso: bun cierre-de-importaciones.ts <archivo>...
import { readFileSync } from 'node:fs'
import { dirname, extname, relative } from 'node:path'
const CODE = new Set(['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'])
const seen = new Set<string>()
const queue = process.argv.slice(2).map(p => Bun.resolveSync('./' + p, process.cwd()))
while (queue.length) {
  const file = queue.pop()!
  if (seen.has(file) || file.includes('/node_modules/') || !CODE.has(extname(file))) continue
  seen.add(file)
  let text: string
  try { text = readFileSync(file, 'utf8') } catch { continue }
  const loader = file.endsWith('x') ? 'tsx' : file.endsWith('ts') ? 'ts' : 'js'
  let imports: { path: string }[] = []
  try { imports = new Bun.Transpiler({ loader }).scan(text).imports } catch { continue }
  for (const { path } of imports) {
    if (/^(bun|node):/.test(path)) continue
    try { queue.push(Bun.resolveSync(path, dirname(file))) } catch {}
  }
}
for (const f of seen) console.log(relative(process.cwd(), f))
