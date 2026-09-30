/**
 * `isEnvTruthy` e `isBareMode` tienen un solo hogar:
 * `@thyrox/config: env/utils.ts`, un módulo hoja (sólo depende de
 * `configHome`), así que cualquier paquete lo importa sin ciclo de carga.
 * Una copia privada puede divergir del canónico sin que nada lo diga
 * —el defecto que `staleSubstitutes.ts` mide sobre los sustitutos
 * EXPORTADOS—; esta prueba cubre también las copias no exportadas.
 *
 * Métrica: declaraciones `function isEnvTruthy|isBareMode` (exportadas o no)
 * en los `.ts` de producción de `src/packages`.
 * Ciega a: una copia bajo otro nombre, o escrita como flecha asignada a una
 * constante con otro nombre.
 */
import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dir, '../..')
const PACKAGES = join(ROOT, 'src/packages')
const CANONICAL = 'src/packages/config/env/utils.ts'
const DECLARATION =
  /^(?:export\s+)?(?:function\s+(isEnvTruthy|isBareMode)\b|const\s+(isEnvTruthy|isBareMode)\s*=)/gm

function productionFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) productionFiles(path, out)
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(path)
  }
  return out
}

function declarations(): string[] {
  const found: string[] = []
  for (const file of productionFiles(PACKAGES)) {
    const rel = relative(ROOT, file)
    for (const m of readFileSync(file, 'utf8').matchAll(DECLARATION)) {
      found.push(`${rel}::${m[1] ?? m[2]}`)
    }
  }
  return found.sort()
}

describe('isEnvTruthy e isBareMode viven sólo en @thyrox/config/env/utils', () => {
  test('el canónico declara los dos', () => {
    expect(declarations().filter(d => d.startsWith(CANONICAL))).toEqual([
      `${CANONICAL}::isBareMode`,
      `${CANONICAL}::isEnvTruthy`,
    ])
  })

  test('ningún otro paquete los redeclara', () => {
    expect(declarations().filter(d => !d.startsWith(CANONICAL))).toEqual([])
  })
})
