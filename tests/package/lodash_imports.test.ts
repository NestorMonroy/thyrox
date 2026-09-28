/**
 * `lodash-es` se importa por función, nunca por el barril.
 *
 * Medido en el análisis de arranque (#130, `.claude/workbench/startup-flow-130-*`):
 * `import { memoize } from 'lodash-es'` arrastra el índice entero del paquete
 * —cientos de módulos— al camino de arranque, mientras la convención del árbol
 * (`import memoize from 'lodash-es/memoize.js'`) carga uno. Sólo dos archivos
 * rompían la convención; este control existe para que sigan siendo cero.
 *
 * Qué lo haría fallar: un `from 'lodash-es'` (o `"lodash-es"`) en código de
 * `src/`. El caso NEGATIVO de abajo lo demuestra con la línea real que el
 * árbol tenía antes del arreglo.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dir, '..', '..')
const BARREL_IMPORT = /\bfrom\s+['"]lodash-es['"]/

function barrelImporters(source: string): boolean {
  return BARREL_IMPORT.test(source)
}

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* sourceFiles(path)
    else if (/\.(ts|tsx|mts)$/.test(name) && !name.endsWith('.d.ts')) yield path
  }
}

describe('lodash-es por función', () => {
  test('ningún archivo de src importa el barril', () => {
    const offenders = [...sourceFiles(join(ROOT, 'src'))]
      .filter(path => barrelImporters(readFileSync(path, 'utf8')))
      .map(path => relative(ROOT, path))
    expect(offenders).toEqual([])
  })

  test('la línea real anterior al arreglo se detecta', () => {
    expect(barrelImporters("import { memoize } from 'lodash-es'")).toBe(true)
  })

  test('la forma por función no se detecta', () => {
    expect(barrelImporters("import memoize from 'lodash-es/memoize.js'")).toBe(false)
  })
})
