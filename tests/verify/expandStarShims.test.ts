/**
 * `expandStarShims`: un shim `export * from '@thyrox/…'` que además es
 * entrada del build lleva sus nombres de VALOR explícitos.
 *
 * El defecto que cierra, reproducido en Bun 1.3.11 (banco
 * `broken-imports-*`, `outputs/star-reexport-probe.txt` y la sonda en
 * `repl`): si un archivo que sólo hace `export * from '<paquete externo>'`
 * es a la vez entrada, `bun build` rechaza toda importación con nombre que
 * otra entrada haga a través de él («No matching export»), aunque en
 * ejecución resuelva. Con los nombres explícitos al lado del `*`, construye;
 * los tipos siguen viajando por el `*`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkShim, expandShim, isStarShim, valueExportNames } from '../../src/verify/expandStarShims.ts'

let dir = ''
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = ''
})

function fixture(): { shim: string; target: string } {
  dir = mkdtempSync(join(tmpdir(), 'star-shims-'))
  const pkg = join(dir, 'node_modules', '@thyrox', 'x')
  mkdirSync(join(pkg, 'src'), { recursive: true })
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({
    name: '@thyrox/x', type: 'module', exports: { './mod.js': './src/mod.ts' },
  }))
  writeFileSync(join(pkg, 'src', 'mod.ts'), [
    "export function alpha() { return 1 }",
    "export const BETA = 2",
    "export type Gamma = { g: number }",
    "export interface Delta { d: string }",
    "export default function omitted() {}",
    "export * from './nested.ts'",
    "export type * from './typesOnly.ts'",
  ].join('\n'))
  writeFileSync(join(pkg, 'src', 'nested.ts'), "export class Epsilon {}\nexport const zeta = 3\n")
  writeFileSync(join(pkg, 'src', 'typesOnly.ts'), "export const shouldNotAppear = 4\nexport type Eta = 1\n")
  const shim = join(dir, 'shim.ts')
  writeFileSync(shim, "// El puente del paquete.\nexport * from '@thyrox/x/mod.js'\n")
  return { shim, target: join(pkg, 'src', 'mod.ts') }
}

describe('isStarShim', () => {
  test('una sola línea export * de un @thyrox, con comentarios alrededor', () => {
    expect(isStarShim("// c\nexport * from '@thyrox/a/b.js'\n")).toBe('@thyrox/a/b.js')
  })
  test('con más código, o desde un relativo, no es shim', () => {
    expect(isStarShim("export * from '@thyrox/a'\nexport const x = 1\n")).toBeNull()
    expect(isStarShim("export * from './local.ts'\n")).toBeNull()
  })
  test('un shim ya expandido sigue reconociéndose', () => {
    const { shim } = fixture()
    writeFileSync(shim, expandShim(shim))
    expect(isStarShim(readFileSync(shim, 'utf8'))).toBe('@thyrox/x/mod.js')
  })
})

describe('valueExportNames', () => {
  test('valores propios y de export * en cadena; sin tipos, sin default, sin export type *', () => {
    const { target } = fixture()
    expect([...valueExportNames(target)].sort()).toEqual(['BETA', 'Epsilon', 'alpha', 'zeta'])
  })
})

describe('expandShim', () => {
  test('conserva el export * y añade los valores ordenados', () => {
    const { shim } = fixture()
    const out = expandShim(shim)
    expect(out).toContain("export * from '@thyrox/x/mod.js'")
    expect(out).toContain("export { alpha, BETA, Epsilon, zeta } from '@thyrox/x/mod.js'")
    expect(out).toContain('// El puente del paquete.')
  })
  test('idempotente', () => {
    const { shim } = fixture()
    writeFileSync(shim, expandShim(shim))
    expect(expandShim(shim)).toBe(readFileSync(shim, 'utf8'))
  })
})

describe('checkShim', () => {
  test('sin expandir: desalineado', () => {
    const { shim } = fixture()
    expect(checkShim(shim)).toEqual({ spec: '@thyrox/x/mod.js', missing: ['BETA', 'Epsilon', 'alpha', 'zeta'], extra: [] })
  })
  test('expandido y el destino gana un valor: lo nombra', () => {
    const { shim, target } = fixture()
    writeFileSync(shim, expandShim(shim))
    writeFileSync(target, readFileSync(target, 'utf8') + '\nexport const theta = 5\n')
    expect(checkShim(shim)?.missing).toEqual(['theta'])
  })
})
