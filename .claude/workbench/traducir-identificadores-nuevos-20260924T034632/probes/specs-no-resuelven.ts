// Imprime, por paquete, los especificadores externos COMPLETOS que no resuelven,
// con el mismo recorrido que tests/package/dependencies.test.ts.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
const DESDE = /^\s*(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/gm
const LLAMADA = /\b(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g
const T = new Bun.Transpiler({ loader: 'ts', deadCodeElimination: false })
const mods = (d: string, o: string[] = []) => { for (const e of readdirSync(d)) { if (e === 'node_modules') continue; const p = join(d, e); statSync(p).isDirectory() ? mods(p, o) : p.endsWith('.ts') && o.push(p) } return o }
for (const pkg of process.argv.slice(2)) {
  const dir = join('src/packages', pkg)
  for (const f of mods(dir)) {
    const tx = readFileSync(f, 'utf8'); let code = tx; try { code = T.transformSync(tx) } catch {}
    const specs = [...tx.matchAll(DESDE)].map(m => m[1]).concat([...code.matchAll(LLAMADA)].map(m => m[1]))
    for (const s of specs) { if (!s || /^[./]|^(node|bun):|^-/.test(s)) continue; try { Bun.resolveSync(s, dir) } catch { console.log(`${pkg}\t${f}\t${s}`) } }
  }
}
