/**
 * Deriva la lista CERRADA de subpaths `@thyrox/*` que un consumidor importa y
 * no resuelven, agrupada por paquete destino.
 *
 * Existe porque «portar el paquete entero» no es una condicion de cierre
 * medible y «los que hagan falta» tampoco. Esto si lo es: recorre cada .ts de
 * cada paquete, extrae sus especificadores en posicion de import, los resuelve
 * con `Bun.resolveSync` desde el directorio del paquete, y agrupa los que
 * fallan.
 *
 * La particion en ARISTA / PORTAR es lo que decide el arreglo, y NO es
 * cosmetica: un modulo que existe y no resuelve se paga cableando
 * `workspaces` (#239); uno ausente se paga portandolo. Confundirlos manda a un
 * agente a portar algo que ya esta en el arbol.
 *
 * OJO — la primera version de este guion solo miraba `<sub>.ts` y `src/<sub>.ts`,
 * asi que leia un modulo-directorio (`<sub>/index.ts`) como AUSENTE. Publico
 * `local-observability :: logging` y `telemetry` como «portar» estando los dos
 * en el arbol. El conteo era correcto y la conclusion falsa: se midio la forma
 * equivocada. Las cuatro formas van ahora en `SHAPES`.
 *
 * Metrica: especificadores `@thyrox/*` en posicion de import que
 * `Bun.resolveSync` rechaza desde el directorio de su paquete.
 * Ciega a: el especificador computado (`require(variable)`), que ninguna forma
 * literal atrapa; y al que se cita dentro de un comentario, que el patron de
 * llamada no sabe separar del codigo.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const PACKAGES = '/home/user/thyrox/src/packages'
/**
 * Las CUATRO formas en que un subpath puede estar en el arbol. Un paquete
 * plano (`config`, `agent`) no tiene `src/`; uno con `src/` si. Y un modulo
 * puede ser un archivo o un directorio con `index.ts`. Mirar solo dos de las
 * cuatro fue el defecto original.
 */
const SHAPES: Array<(subpath: string) => string> = [
  (s) => `${s}.ts`,
  (s) => `${s}/index.ts`,
  (s) => `src/${s}.ts`,
  (s) => `src/${s}/index.ts`,
]

const FROM_IMPORT = /^\s*(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/gm
const CALL_IMPORT = /\b(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g
function moduleFiles(d: string, o: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules') continue
    const p = join(d, e)
    if (statSync(p).isDirectory()) moduleFiles(p, o); else if (p.endsWith('.ts')) o.push(p)
  }
  return o
}
const missing = new Map<string, Set<string>>()
for (const pkg of readdirSync(PACKAGES)) {
  const dir = join(PACKAGES, pkg)
  if (!existsSync(join(dir, 'package.json'))) continue
  for (const f of moduleFiles(dir)) {
    const t = readFileSync(f, 'utf8')
    for (const pattern of [FROM_IMPORT, CALL_IMPORT]) {
      for (const [, s] of t.matchAll(pattern)) {
        if (!s?.startsWith('@thyrox/')) continue
        try { Bun.resolveSync(s, dir); continue } catch {}
        const [, target, ...resto] = s.split('/')
        if (!resto.length) continue
        const subpath = resto.join('/').replace(/\.js$/, '')
        if (!missing.has(target)) missing.set(target, new Set())
        missing.get(target)!.add(subpath)
      }
    }
  }
}
/**
 * Si el especificador PELADO tampoco resuelve, no falta la entrada del
 * subpath: falta la arista del paquete entera, y ninguna entrada de `exports`
 * la arregla. Sin esta linea, un `ARISTA` se lee como «anade el subpath al
 * mapa» — y `cli/package.json` ya declara `./print`, con el archivo en su
 * sitio. Iba a corregir un mapa que estaba bien.
 */
function bareResolves(pkg: string): boolean {
  try { Bun.resolveSync(`@thyrox/${pkg}`, PACKAGES); return true } catch { return false }
}

for (const [pkg, subs] of [...missing].sort((a,b)=>b[1].size-a[1].size)) {
  const subpaths = [...subs].sort()
  const present = subpaths.filter((s) => SHAPES.some((f) => existsSync(join(PACKAGES, pkg, f(s)))))
  const bare = bareResolves(pkg)
  const note = bare ? '' : '  <- el paquete PELADO tampoco resuelve: falta la arista entera (#239)'
  console.log(`\n${pkg}  (${subpaths.length} subpaths; ${present.length} ya en el arbol)${note}`)
  for (const s of subpaths) console.log(`   ${present.includes(s) ? 'ARISTA' : 'PORTAR'}  ${s}`)
}
