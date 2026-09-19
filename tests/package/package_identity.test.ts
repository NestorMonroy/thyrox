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
 * El caso 2 NO mide `@ant/`: ese árbol lo trae TASK-THYROX-0210 (board #487)
 * «conservando su alcance» y no es miembro del workspace, así que sus imports
 * no resuelven POR CONSTRUCCION y congelarlos aquí mediría otro fenómeno. Su
 * conteo se publica, no se afirma verde.
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
      const title = readme.split('\n', 1)[0].replace(/`/g, '')
      if (title !== `# ${name}`) {
        wrong.push(`${dir.slice(PACKAGES.length + 1)}: titulo=[${title}] name=[${name}]`)
      }
    }
    expect(wrong).toEqual([])
  })

  test('caso 2: ninguna línea de import de un miembro del workspace trae el alcance de la fuente', () => {
    const members = new Set<string>(
      JSON.parse(readFileSync(join(PACKAGES, 'package.json'), 'utf-8')).workspaces,
    )
    const offending: string[] = []
    let outsideWorkspace = 0
    for (const dir of dirs) {
      const rel = dir.slice(PACKAGES.length + 1)
      for (const file of sourceFiles(dir)) {
        const lines = readFileSync(file, 'utf-8').split('\n')
        lines.forEach((line, i) => {
          // Sólo una línea de import/export real; un comentario que CITA la
          // procedencia empieza por `*` o `//` y no entra aquí.
          if (!/^\s*(import|export)\b/.test(line)) return
          if (!line.includes(`'${SOURCE_SCOPE}/`) && !line.includes(`"${SOURCE_SCOPE}/`)) return
          if (members.has(rel)) offending.push(`${file.slice(PACKAGES.length + 1)}:${i + 1}`)
          else outsideWorkspace++
        })
      }
    }
    // Se publica, no se afirma: es TASK-THYROX-0210 (board #487), otro sujeto.
    console.log(`  imports con el alcance de la fuente fuera del workspace: ${outsideWorkspace}`)
    expect(offending).toEqual([])
  })
})
