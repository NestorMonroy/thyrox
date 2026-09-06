/**
 * Toda dependencia de terceros que un paquete IMPORTA está DECLARADA.
 *
 * El defecto que cierra (#202): `jsonc-parser@3.3.1` se instaló bajo
 * `node_modules/` sin tocar ningún `package.json` —su propio módulo lo declara
 * en el docstring, y la razón fue buena: otro agente de aquella tanda estaba
 * escribiendo el manifiesto—. `node_modules/` es gitignored, así que la
 * dependencia existe en este contenedor y **no existe en un clon fresco**: el
 * import falla allí y aquí no, que es la forma de defecto más cara de ver.
 *
 * Qué haría fallar este control, declarado antes de escribirlo:
 *
 * 1. Que un import externo resuelva a `node_modules` sin figurar en el
 *    manifiesto de su paquete ni en el de la raíz. Es el caso de #202.
 * 2. Que el manifiesto pierda una entrada que un import sigue usando —el
 *    mismo defecto por el otro extremo.
 *
 * Por qué se resuelve con `Bun.resolveSync` y no con una expresión regular
 * sobre el texto: un censo por regex mezcla builtins de Node (`fs`, `path`),
 * especificadores citados dentro de un docstring de porte
 * (`@claude-code-how-works/*`) y hasta trozos de expresión regular. Medido al
 * escribir esto: el censo por texto daba 40 «dependencias» de las que **una**
 * era el defecto real. El resolvedor separa las tres clases por conducta —
 * builtin, tercero instalado, no resoluble— en vez de por su forma.
 *
 * *Métrica:* especificadores externos importados que `Bun.resolveSync` sitúa
 * dentro de `node_modules`, contra `dependencies` + `devDependencies` del
 * paquete y de la raíz.
 * *Ciega a:* el especificador que NO resuelve —importado, no declarado y no
 * instalado—, que es un defecto distinto y mayor: su módulo no carga en ningún
 * sitio. Medidos hoy en `@thyrox/storage`: `picomatch`, `ignore` y
 * `proper-lockfile`. Instalarlos es una acción sobre el entorno que este
 * control no toma; queda registrada aparte.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = new URL('../..', import.meta.url).pathname
const PAQUETES = join(RAIZ, 'src', 'packages')

function manifiesto(dir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
}

function declaradas(m: Record<string, unknown>): Set<string> {
  const deps = (m.dependencies ?? {}) as Record<string, string>
  const dev = (m.devDependencies ?? {}) as Record<string, string>
  return new Set([...Object.keys(deps), ...Object.keys(dev)])
}

/** Los .ts del paquete, sin `node_modules`. */
function modulos(dir: string, salida: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) modulos(p, salida)
    else if (p.endsWith('.ts')) salida.push(p)
  }
  return salida
}

const IMPORTA = /^\s*(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/gm

function raizDelPaquete(spec: string): string {
  if (!spec.startsWith('@')) return spec.split('/')[0] ?? spec
  const partes = spec.split('/')
  return partes.slice(0, 2).join('/')
}

const deLaRaiz = declaradas(manifiesto(RAIZ))

const paquetes = readdirSync(PAQUETES).filter((d) => {
  try { return statSync(join(PAQUETES, d, 'package.json')).isFile() } catch { return false }
})

describe('un tercero instalado y usado está declarado', () => {
  // Sin paquetes no habría nada que comprobar y el verde no diría nada.
  test('hay paquetes que medir', () => {
    expect(paquetes.length).toBeGreaterThan(0)
  })

  for (const nombre of paquetes) {
    const dir = join(PAQUETES, nombre)
    const m = manifiesto(dir)
    const conocidas = new Set([...declaradas(m), ...deLaRaiz])

    test(`${m.name}: sus terceros instalados están en el manifiesto`, () => {
      const sinDeclarar = new Set<string>()
      for (const archivo of modulos(dir)) {
        const texto = readFileSync(archivo, 'utf8')
        for (const [, spec] of texto.matchAll(IMPORTA)) {
          if (!spec || spec.startsWith('.') || spec.startsWith('/')) continue
          if (spec.startsWith('node:') || spec.startsWith('bun:')) continue
          const raiz = raizDelPaquete(spec)
          if (conocidas.has(raiz)) continue
          let resuelto: string
          try {
            resuelto = Bun.resolveSync(spec, dir)
          } catch {
            continue // no resoluble: otro defecto, declarado en la cabecera
          }
          // Un builtin resuelve fuera de `node_modules`; un tercero, dentro.
          if (resuelto.includes('node_modules')) sinDeclarar.add(raiz)
        }
      }
      expect([...sinDeclarar].sort()).toEqual([])
    })
  }
})
