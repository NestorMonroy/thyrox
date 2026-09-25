/**
 * El README de un paquete nombra AL PAQUETE, no a su fuente.
 *
 * El defecto que cierra: `src/packages/local-observability/README.md` abría con
 * `# @claude-code-how-works/local-observability` mientras su `package.json`
 * declara `@thyrox/local-observability`. Lo mismo en 29 paquetes. El título es
 * una AFIRMACION DE IDENTIDAD —dice «este paquete se llama X»— y decía el
 * nombre del paquete de la referencia.
 *
 * LA DISTINCION QUE ESTE CONTROL HACE, Y UN `sed` GLOBAL NO:
 *
 * El literal `@claude-code-how-works/X` tiene DOS significados en este árbol, y
 * sólo uno es defecto:
 *
 *   1. NOMBRA NUESTRO PAQUETE  -> defecto. Es lo que mide el caso 1.
 *   2. CITA LA PROCEDENCIA     -> correcto. `"Porte de @claude-code-how-works/
 *      server (ccnmt)"` en un `description`, o `* setEventLogger de
 *      @claude-code-how-works/app-host/bootstrap/state.js` en un docstring.
 *      Reescribirlo a `@thyrox` fabricaría una falsedad: ccnmt no tiene
 *      `@thyrox`, y «porte de sí mismo» no dice nada.
 *
 * Medido al escribirlo: 771 ocurrencias del literal en `src/`, de las que 30
 * son de la clase 1. Un `sed` global habría reescrito ~740 citas de procedencia
 * correctas — el sub-patrón C de `metrica-decide-la-conclusion.md`, medir el
 * significante y concluir sobre el significado.
 *
 * QUE HARIA FALLAR CADA CASO, declarado antes de escribirlos:
 *
 *   caso 1 — que un README abra con un título que no sea `# ` + el `name` de su
 *            propio `package.json`. Hoy, antes del arreglo: 30 rojos.
 *   caso 2 — que una LINEA DE IMPORT (no un comentario) de un paquete miembro
 *            del workspace traiga el alcance de la fuente. Un import así no
 *            resuelve: es 100 % error, no procedencia.
 *
 * El caso 2 SÍ mide `@ant/`, y antes no. La versión previa se eximía de ese
 * árbol con dos premisas, las dos falsas al medirlas:
 *
 *   — «no es miembro del workspace». El `package.json` de la RAÍZ —que es el
 *     manifiesto que bun lee— declara `src/packages/*` y `src/packages/@ant/*`.
 *     Lo son, y por el manifiesto autoritativo.
 *   — el conjunto se componía del `package.json` INTERIOR (`src/packages/`),
 *     cuya lista son nombres PLANOS (`agent`, `computer-use-mcp`). Contra un
 *     `rel` de `@ant/computer-use-mcp` da `false` siempre. No era un control
 *     vacío —para un paquete plano acertaba— era un control CIEGO a la mitad
 *     del árbol donde vivían los 40 infractores, que se publicaban como cifra
 *     y no se afirmaban.
 *
 * El conjunto se deriva ahora de `dirs`, que es lo que los dos globos de la
 * raíz recorren: así no hay una segunda fuente de verdad que desincronizar, y
 * el cubo «fuera del workspace» queda estructuralmente muerto y se retira.
 *
 * Sujeto real del árbol `@ant/`: TASK-THYROX-0178 (board #487). La cita que
 * vivía aquí, `TASK-THYROX-0210`, resuelve a otro sujeto —«NOTIFICATION_CHANNELS
 * está declarado dos veces»— y se escribió de memoria.
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PACKAGES = resolve(import.meta.dir, '..', '..', 'src', 'packages')
const SOURCE_SCOPE = '@claude-code-how-works'

/** Devuelve los directorios de paquete: los que tienen `package.json`. */
function packageDirs(root: string, depth = 0): string[] {
  const found: string[] = []
  for (const entry of readdirSync(root)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const dir = join(root, entry)
    if (!statSync(dir).isDirectory()) continue
    try {
      statSync(join(dir, 'package.json'))
      found.push(dir)
    } catch {
      // Un nivel de agrupación por alcance (`@ant/`) no lleva manifiesto.
      if (depth === 0 && entry.startsWith('@')) found.push(...packageDirs(dir, 1))
    }
  }
  return found
}

/** Los `.ts`/`.tsx` de un paquete, sin `node_modules`. */
function sourceFiles(dir: string): string[] {
  const found: string[] = []
  const walk = (at: string) => {
    for (const entry of readdirSync(at)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const path = join(at, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.tsx?$/.test(entry)) found.push(path)
    }
  }
  try { walk(join(dir, 'src')) } catch { /* el paquete puede no tener src/ */ }
  return found
}

describe('identidad del paquete', () => {
  const dirs = packageDirs(PACKAGES)

  test('el universo no está vacío — si lo estuviera, todo lo demás sería un verde falso', () => {
    expect(dirs.length).toBeGreaterThan(20)
  })

  test('caso 1: el título del README es el `name` de su propio package.json', () => {
    const wrong: string[] = []
    for (const dir of dirs) {
      let readme: string
      try { readme = readFileSync(join(dir, 'README.md'), 'utf-8') } catch { continue }
      const name = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')).name
      // Se normalizan los backticks: `# \`@thyrox/binary\`` nombra BIEN a su
      // paquete, sólo lo formatea como código. El eje declarado es la
      // IDENTIDAD, no el formato; comparar en crudo lo desviaría al segundo.
      const title = readme.split('\n', 1)[0]!.replace(/`/g, '')
      if (title !== `# ${name}`) {
        wrong.push(`${dir.slice(PACKAGES.length + 1)}: titulo=[${title}] name=[${name}]`)
      }
    }
    expect(wrong).toEqual([])
  })

  test('caso 2: ninguna línea de import de un miembro del workspace trae el alcance de la fuente', () => {
    const offending: string[] = []
    for (const dir of dirs) {
      for (const file of sourceFiles(dir)) {
        const lines = readFileSync(file, 'utf-8').split('\n')
        lines.forEach((line, i) => {
          // Sólo una línea de import/export real; un comentario que CITA la
          // procedencia empieza por `*` o `//` y no entra aquí.
          if (!/^\s*(import|export)\b/.test(line)) return
          if (!line.includes(`'${SOURCE_SCOPE}/`) && !line.includes(`"${SOURCE_SCOPE}/`)) return
          offending.push(`${file.slice(PACKAGES.length + 1)}:${i + 1}`)
        })
      }
    }
    expect(offending).toEqual([])
  })

  /**
   * Caso 3 — un paquete existe UNA vez.
   *
   * El defecto que cierra: los cinco paquetes de `@ant/` llegaron DOS veces el
   * mismo dia. `bfdf943e` los trajo aplanados en `src/packages/<n>` con el
   * alcance reescrito a `@thyrox/*`; `6021edfa` los volvio a traer en
   * `src/packages/@ant/<n>` conservando el alcance de la fuente. Los dos globos
   * de la raiz —`src/packages/*` y `src/packages/@ant/*`— recorren ambos, asi
   * que `bun.lock` indexaba los diez como workspaces distintos y era fiel: el
   * defecto estaba en el arbol, no en el manifiesto.
   *
   * Cual de las dos copias es la fiel lo decide la FUENTE, no el board: ccnmt
   * pone los cinco en `packages/@ant/<n>` y ninguno en la ruta plana, y su
   * `@ant/ink` declara `"name": "@anthropic/ink"` con 772 importadores.
   *
   * Metrica: basename del directorio de cada workspace.
   * Ciega a: dos copias con basename distinto (`ink` contra `ink-legacy`), que
   * este control leeria como dos paquetes legitimos.
   */
  test('caso 3: ningun basename de workspace se repite', () => {
    const porBasename = new Map<string, string[]>()
    for (const dir of dirs) {
      const base = dir.slice(dir.lastIndexOf('/') + 1)
      const rel = dir.slice(PACKAGES.length + 1)
      porBasename.set(base, [...(porBasename.get(base) ?? []), rel])
    }
    const colisiones = [...porBasename.entries()]
      .filter(([, rutas]) => rutas.length > 1)
      .map(([base, rutas]) => `${base}: ${rutas.join(' | ')}`)
    expect(colisiones).toEqual([])
  })

  /**
   * Caso 4 — un specifier de alcance de workspace nombra un paquete que existe.
   *
   * Es la otra mitad del caso 3, y sin el la retirada de una copia duplicada
   * pasaria en verde dejando a sus importadores apuntando al vacio. Al retirar
   * `src/packages/ink`, los imports de `@thyrox/ink` dejan de resolver: este
   * caso los ve, el caso 3 no.
   *
   * Metrica: specifiers `@thyrox/X`, `@ant/X` y `@anthropic/X` en lineas de
   * import/export/require, contra el conjunto de `name` declarados.
   * Ciega a: un specifier de OTRO alcance que tampoco resuelva —el alcance
   * ajeno que `@ant/ink` importa queda fuera por construccion— y a un
   * subpath que no exista dentro de un paquete que si existe.
   */
  test('caso 4: todo specifier de alcance de workspace resuelve a un paquete declarado', () => {
    const declarados = new Set(
      dirs.map((dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')).name),
    )
    const patron = /(?:from|import|require\()\s*['"](@(?:thyrox|ant|anthropic)\/[a-z0-9-]+)/g
    const huerfanos = new Map<string, number>()
    for (const dir of dirs) {
      for (const file of sourceFiles(dir)) {
        for (const m of readFileSync(file, 'utf-8').matchAll(patron)) {
          if (declarados.has(m[1])) continue
          huerfanos.set(m[1], (huerfanos.get(m[1]) ?? 0) + 1)
        }
      }
    }
    const sinResolver = [...huerfanos.entries()].map(([nombre, n]) => `${nombre} (${n})`).sort()
    expect(sinResolver).toEqual([])
  })

})
