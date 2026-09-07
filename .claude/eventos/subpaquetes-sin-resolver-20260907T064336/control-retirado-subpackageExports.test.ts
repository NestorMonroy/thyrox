/**
 * Todo specifier `@thyrox/<pkg>/<subpath>` que el árbol usa resuelve por el
 * `exports` de su paquete.
 *
 * Por qué existe: el control hermano (`exports.test.ts`) mide el paquete raíz,
 * y los sub-paquetes de `src/packages/` tienen su propio mapa. Ahí el `exports`
 * curaba un subconjunto —lo que el porte declaró a mano— mientras el código
 * portado importa muchos más módulos. Medido al escribir este control: 85 de
 * 165 specifiers distintos no resolvían, y la suite sólo veía los que un test
 * llegaba a ejecutar (`tokenEstimation.js`, `feature-flags`).
 *
 * Métrica: specifiers `@thyrox/…` literales en los `.ts`/`.tsx` de `src/`,
 * resueltos con la semántica de `exports` de Node (coincidencia exacta, luego
 * patrón `*` de prefijo más largo).
 * Ciega a: un specifier construido en tiempo de ejecución, y a un paquete que
 * la referencia nombra y este árbol aún no porta — ésos se declaran abajo.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..', '..')

const PACKAGES = join(ROOT, 'src/packages')

/** Paquetes que la fuente nombra y este árbol aún NO porta. Su import es un
 *  bloque declarado, no un specifier reparable: ver `#234`, `#235`, `#238`. */
const NOT_PORTED = new Set(['@thyrox/repl', '@thyrox/bridge', '@thyrox/tasks'])

type Pkg = { dir: string; exports: Record<string, string> }

function manifests(): Map<string, Pkg> {
  const out = new Map<string, Pkg>()
  for (const d of readdirSync(PACKAGES)) {
    const pj = join(PACKAGES, d, 'package.json')
    if (!existsSync(pj)) continue
    const m = JSON.parse(readFileSync(pj, 'utf8'))
    if (typeof m.name === 'string' && m.name.startsWith('@thyrox/')) {
      out.set(m.name, { dir: join(PACKAGES, d), exports: m.exports ?? {} })
    }
  }
  return out
}

/** Semántica de Node: exacto primero, luego el patrón `*` de prefijo más largo
 *  (a igual prefijo, gana la clave más larga — así `./*.js` gana sobre `./*`). */
export function resolveSubpath(
  exports: Record<string, string> | string,
  subpath: string,
): string | undefined {
  if (typeof exports === 'string') return subpath === '.' ? exports : undefined
  if (subpath in exports) return exports[subpath]
  let best: { prefix: string; key: string; target: string } | undefined
  for (const [key, target] of Object.entries(exports)) {
    const star = key.indexOf('*')
    if (star < 0) continue
    const prefix = key.slice(0, star)
    const suffix = key.slice(star + 1)
    if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue
    if (subpath.length < prefix.length + suffix.length) continue
    const mejor =
      !best ||
      prefix.length > best.prefix.length ||
      (prefix.length === best.prefix.length && key.length > best.key.length)
    if (mejor) best = { prefix, key, target }
  }
  if (!best) return undefined
  const suffix = best.key.slice(best.key.indexOf('*') + 1)
  const star = subpath.slice(best.prefix.length, subpath.length - suffix.length)
  return best.target.replace('*', star)
}

/**
 * Sólo el specifier en POSICIÓN de import: `from '…'`, `import('…')`,
 * `require('…')`. Un grep del literal a secas mide otra cosa — medido al
 * escribir este control, seis de sus «specifiers sin resolver» eran citas en
 * prosa dentro de un docstring (`@thyrox/agent/types.ts`, que como import ni
 * siquiera sería válido: un import no lleva extensión `.ts`). Concluir del
 * literal sobre el mecanismo es el sub-patrón C de
 * `metrica-decide-la-conclusion.md`.
 */
function specifiers(): Set<string> {
  const salida = Bun.spawnSync([
    'grep', '-rhnoE', '--include=*.ts', '--include=*.tsx',
    "(from|import|require)[[:space:]]*\\(?[[:space:]]*['\"]@thyrox/[^'\"]*['\"]",
    'src/',
  ], { cwd: ROOT }).stdout.toString()
  const out = new Set<string>()
  for (const linea of salida.split('\n')) {
    const m = linea.match(/['"](@thyrox\/[^'"]*)['"]/)
    if (!m) continue
    const s = m[1]
    // `@thyrox/` a secas es un glob (`@thyrox/*`), no un specifier.
    if (s.split('/').length < 2 || !s.split('/')[1] || s.includes('*')) continue
    out.add(s)
  }
  return out
}

describe('exports de los sub-paquetes', () => {
  const pkgs = manifests()

  test('todo specifier @thyrox usado en src/ resuelve a un archivo que existe', () => {
    const sinResolver: string[] = []
    let medidos = 0
    for (const s of specifiers()) {
      const partes = s.split('/')
      const nombre = partes.slice(0, 2).join('/')
      if (NOT_PORTED.has(nombre)) continue
      const pkg = pkgs.get(nombre)
      if (!pkg) {
        sinResolver.push(`${s} — el paquete no existe en src/packages`)
        continue
      }
      medidos++
      const subpath = partes.length === 2 ? '.' : './' + partes.slice(2).join('/')
      const target = resolveSubpath(pkg.exports, subpath)
      if (!target) sinResolver.push(`${s} — subpath no declarado`)
      else if (!existsSync(join(pkg.dir, target)))
        sinResolver.push(`${s} — declarado a ${target}, que no existe`)
    }
    expect(medidos).toBeGreaterThan(100) // el denominador, no sólo el conteo
    expect(sinResolver).toEqual([])
  })
})
