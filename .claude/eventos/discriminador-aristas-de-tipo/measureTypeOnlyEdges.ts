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

const C = '/home/user/claude-code-nestor-monroy-tools/packages'
const SCOPE = '@claude-code-how-works/'

/** `import type X from` y `export type { … } from` — las dos formas que se borran. */
const TIPO = /^\s*(?:import|export)\s+type\s[^'"]*from\s+['"]([^'"]+)['"]/gm
/** Cualquier import/export con `from` — el universo. */
const TODO = /^\s*(?:import|export)\b[^'"]*?from\s+['"]([^'"]+)['"]/gm

function mods(d: string, o: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e === '__tests__') continue
    const p = join(d, e)
    if (statSync(p).isDirectory()) mods(p, o)
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) o.push(p)
  }
  return o
}

const raiz = (s: string) => s.slice(SCOPE.length).split('/')[0]!

type Arista = { tipo: number; valor: number }
const grafo = new Map<string, Map<string, Arista>>()

for (const pkg of readdirSync(C).filter((d) => !d.startsWith('@'))) {
  const dir = join(C, pkg)
  if (!existsSync(join(dir, 'package.json'))) continue
  const salidas = new Map<string, Arista>()
  for (const f of mods(dir)) {
    const t = readFileSync(f, 'utf8')
    const deTipo = new Set<string>()
    for (const [linea, spec] of [...t.matchAll(TIPO)].map((m) => [m[0], m[1]!] as const)) {
      if (spec.startsWith(SCOPE)) deTipo.add(linea)
    }
    for (const m of t.matchAll(TODO)) {
      const spec = m[1]!
      if (!spec.startsWith(SCOPE)) continue
      const destino = raiz(spec)
      if (destino === pkg) continue
      if (!salidas.has(destino)) salidas.set(destino, { tipo: 0, valor: 0 })
      const a = salidas.get(destino)!
      if (deTipo.has(m[0])) a.tipo++; else a.valor++
    }
  }
  if (salidas.size) grafo.set(pkg, salidas)
}

let tipoTot = 0, valorTot = 0
const soloTipo: string[] = []
for (const [origen, salidas] of [...grafo].sort()) {
  for (const [destino, a] of [...salidas].sort()) {
    tipoTot += a.tipo; valorTot += a.valor
    if (a.valor === 0 && a.tipo > 0) soloTipo.push(`${origen} -> ${destino} (${a.tipo})`)
  }
}
console.log(`aristas de TIPO (se borran): ${tipoTot}`)
console.log(`aristas de VALOR (dependencia real): ${valorTot}`)
console.log(`\npares cuya arista es SOLO de tipo — no bloquean en runtime: ${soloTipo.length}`)
for (const s of soloTipo) console.log('   ' + s)

// --- Lo que DECIDE: ¿sobrevive el ciclo al borrar las aristas de tipo? ------
// El conteo de arriba no responde la pregunta. Un 15 % de aristas de tipo
// puede bastar para romper el ciclo, o no bastar: depende de CUALES son. Se
// calculan las componentes fuertemente conexas del grafo de VALOR (Tarjan).
// Si el grafo de valor es aciclico, hay orden de porte y las hojas son el
// punto de entrada; si conserva una componente grande, no lo hay.
const soloValor = new Map<string, string[]>()
for (const [o, salidas] of grafo) {
  soloValor.set(o, [...salidas].filter(([, a]) => a.valor > 0).map(([d]) => d))
}
for (const n of [...soloValor.keys()]) for (const d of soloValor.get(n)!) if (!soloValor.has(d)) soloValor.set(d, [])

let idx = 0
const num = new Map<string, number>(), low = new Map<string, number>()
const pila: string[] = [], enPila = new Set<string>(), comps: string[][] = []
function fuerte(v: string) {
  num.set(v, idx); low.set(v, idx); idx++; pila.push(v); enPila.add(v)
  for (const w of soloValor.get(v) ?? []) {
    if (!num.has(w)) { fuerte(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)) }
    else if (enPila.has(w)) low.set(v, Math.min(low.get(v)!, num.get(w)!))
  }
  if (low.get(v) === num.get(v)) {
    const c: string[] = []
    for (;;) { const w = pila.pop()!; enPila.delete(w); c.push(w); if (w === v) break }
    comps.push(c)
  }
}
for (const v of soloValor.keys()) if (!num.has(v)) fuerte(v)

const ciclos = comps.filter((c) => c.length > 1).sort((a, b) => b.length - a.length)
const hojas = [...soloValor].filter(([, d]) => d.length === 0).map(([n]) => n).sort()
console.log(`\n--- grafo de VALOR (aristas de tipo borradas) ---`)
console.log(`nodos: ${soloValor.size}`)
console.log(`componentes ciclicas: ${ciclos.length}`)
for (const c of ciclos) console.log(`   tamano ${c.length}: ${c.sort().join(', ')}`)
console.log(`HOJAS (no importan a ningun hermano): ${hojas.length ? hojas.join(', ') : 'ninguna'}`)
