/**
 * ¿Las aristas entre paquetes hermanos son de TIPO o de VALOR?
 *
 * Decide secuencial contra paralelo, y por eso se mide antes de despachar:
 * `import type` se BORRA al compilar —no existe en runtime—, asi que una
 * arista de tipo NO es una dependencia de carga. Si el ciclo que #195 declaro
 * («el grafo no tiene hoja, no hay orden de porte») esta hecho de aristas de
 * tipo, el ciclo no existe en runtime y los paquetes son independientes.
 *
 * Metrica: importaciones entre paquetes de la FUENTE (ccnmt), partidas por
 * `import type` / `export type` contra el resto.
 * Ciega a: el `import { type X }` en linea mezclado con valores en la misma
 * llave —se cuenta como valor, que es la lectura conservadora—; y al tipo que
 * se consume por inferencia sin importarse.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_PACKAGES = '/home/user/claude-code-nestor-monroy-tools/packages'
const SCOPE = '@claude-code-how-works/'

/** `import type X from` y `export type { … } from` — las dos formas que se borran. */
const TYPE_ONLY_IMPORT = /^\s*(?:import|export)\s+type\s[^'"]*from\s+['"]([^'"]+)['"]/gm
/** Cualquier import/export con `from` — el universo. */
const ANY_IMPORT = /^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/gm

function moduleFiles(d: string, o: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e === '__tests__') continue
    const p = join(d, e)
    if (statSync(p).isDirectory()) moduleFiles(p, o)
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) o.push(p)
  }
  return o
}

const packageRoot = (s: string) => s.slice(SCOPE.length).split('/')[0]!

type Edge = { typeOnly: number; value: number }
const graph = new Map<string, Map<string, Edge>>()

for (const pkg of readdirSync(SOURCE_PACKAGES).filter((d) => !d.startsWith('@'))) {
  const dir = join(SOURCE_PACKAGES, pkg)
  if (!existsSync(join(dir, 'package.json'))) continue
  const outgoing = new Map<string, Edge>()
  for (const f of moduleFiles(dir)) {
    const t = readFileSync(f, 'utf8')
    const typeOnlyLines = new Set<string>()
    for (const [linea, spec] of [...t.matchAll(TYPE_ONLY_IMPORT)].map((m) => [m[0], m[1]!] as const)) {
      if (spec.startsWith(SCOPE)) typeOnlyLines.add(linea)
    }
    for (const m of t.matchAll(ANY_IMPORT)) {
      const spec = m[1]!
      if (!spec.startsWith(SCOPE)) continue
      const target = packageRoot(spec)
      if (target === pkg) continue
      if (!outgoing.has(target)) outgoing.set(target, { typeOnly: 0, value: 0 })
      const a = outgoing.get(target)!
      if (typeOnlyLines.has(m[0])) a.typeOnly++; else a.value++
    }
  }
  if (outgoing.size) graph.set(pkg, outgoing)
}

let typeTotal = 0, valueTotal = 0
const typeOnlyPairs: string[] = []
for (const [origen, outgoing] of [...graph].sort()) {
  for (const [target, a] of [...outgoing].sort()) {
    typeTotal += a.typeOnly; valueTotal += a.value
    if (a.value === 0 && a.typeOnly > 0) typeOnlyPairs.push(`${origen} -> ${target} (${a.typeOnly})`)
  }
}
console.log(`aristas de TIPO (se borran): ${typeTotal}`)
console.log(`aristas de VALOR (dependencia real): ${valueTotal}`)
console.log(`\npares cuya arista es SOLO de tipo — no bloquean en runtime: ${typeOnlyPairs.length}`)
for (const s of typeOnlyPairs) console.log('   ' + s)

// --- Lo que DECIDE: ¿sobrevive el ciclo al borrar las aristas de tipo? ------
// El conteo de arriba no responde la pregunta. Un 15 % de aristas de tipo
// puede bastar para romper el ciclo, o no bastar: depende de CUALES son. Se
// calculan las componentes fuertemente conexas del grafo de VALOR (Tarjan).
// Si el grafo de valor es aciclico, hay orden de porte y las hojas son el
// punto de entrada; si conserva una componente grande, no lo hay.
const valueGraph = new Map<string, string[]>()
for (const [o, outgoing] of graph) {
  valueGraph.set(o, [...outgoing].filter(([, a]) => a.value > 0).map(([d]) => d))
}
for (const n of [...valueGraph.keys()]) for (const d of valueGraph.get(n)!) if (!valueGraph.has(d)) valueGraph.set(d, [])

let counter = 0
const discoveryIndex = new Map<string, number>(), lowLink = new Map<string, number>()
const stack: string[] = [], onStack = new Set<string>(), components: string[][] = []
function tarjan(v: string) {
  discoveryIndex.set(v, counter); lowLink.set(v, counter); counter++; stack.push(v); onStack.add(v)
  for (const w of valueGraph.get(v) ?? []) {
    if (!discoveryIndex.has(w)) { tarjan(w); lowLink.set(v, Math.min(lowLink.get(v)!, lowLink.get(w)!)) }
    else if (onStack.has(w)) lowLink.set(v, Math.min(lowLink.get(v)!, discoveryIndex.get(w)!))
  }
  if (lowLink.get(v) === discoveryIndex.get(v)) {
    const c: string[] = []
    for (;;) { const w = stack.pop()!; onStack.delete(w); c.push(w); if (w === v) break }
    components.push(c)
  }
}
for (const v of valueGraph.keys()) if (!discoveryIndex.has(v)) tarjan(v)

const cycles = components.filter((c) => c.length > 1).sort((a, b) => b.length - a.length)
const leaves = [...valueGraph].filter(([, d]) => d.length === 0).map(([n]) => n).sort()
console.log(`\n--- grafo de VALOR (aristas de tipo borradas) ---`)
console.log(`nodos: ${valueGraph.size}`)
console.log(`componentes ciclicas: ${cycles.length}`)
for (const c of cycles) console.log(`   tamano ${c.length}: ${c.sort().join(', ')}`)
console.log(`HOJAS (no importan a ningun hermano): ${leaves.length ? leaves.join(', ') : 'ninguna'}`)
