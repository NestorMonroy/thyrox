/**
 * Contrato del verificador estático de nombres importados.
 *
 * El defecto que cierra: un nombre importado que el módulo destino no exporta
 * se descubre hoy al CARGAR el módulo bajo `bun test` («Export named … not
 * found in module …»), un archivo cada vez y enmascarado por los `mock.module`
 * que filtran entre archivos. Un `bun build` por paquete no lo ve cuando el
 * destino es un hermano externalizado — medido en
 * `.claude/workbench/frontera-publica-de-paquetes-*` (la sonda compila el
 * importador de `getPatchForDisplay` sin un solo error).
 *
 * El verificador resuelve cada especificador con el resolutor de Bun y compara
 * los nombres importados contra lo que el destino exporta — en valor
 * (`Bun.Transpiler.scan`) o en tipo —, siguiendo `export * from`.
 *
 * Ciego a: nombres que un módulo publica en tiempo de ejecución
 * (`module.exports[x] = …`), y a un destino fuera del árbol medido.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { missingNamedImports } from '../../src/verify/namedImports.ts'

let base: string
const put = (rel: string, text: string) => {
  const path = join(base, rel)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'named-imports-'))
  put('lib/values.ts', 'export const present = 1\nexport function fn() {}\nexport default 7\n')
  put('lib/types.ts', 'export type Shape = { a: number }\nexport interface Face { b: string }\n')
  put('lib/deep.ts', 'export const deepValue = 1\n')
  put('lib/mid.ts', "export * from './deep'\nexport const midValue = 2\n")
  put('lib/barrel.ts', "export * from './mid'\nexport { present as renamed } from './values'\n")
  put('lib/nodefault.ts', 'export const onlyNamed = 1\n')
  put('lib/reexporter.ts', "export { ghostReexport } from './values'\n")
  put('node_modules/thirdparty/index.js', 'module.exports = {}\n')
  put('node_modules/thirdparty/package.json', '{"name":"thirdparty","main":"index.js"}\n')
  put(
    'app/main.ts',
    [
      "import { present, fn, ghost } from '../lib/values'",
      "import def from '../lib/values'",
      "import nodef from '../lib/nodefault'",
      "import type { Shape } from '../lib/types'",
      "import { type Face } from '../lib/types'",
      "import { deepValue, midValue, renamed, present as notViaBarrel } from '../lib/barrel'",
      "import * as everything from '../lib/values'",
      "import { whatever } from 'thirdparty'",
      "import { x } from '../lib/does-not-exist'",
      "// import { commentedGhost } from '../lib/values'",
      '',
    ].join('\n'),
  )
})

afterAll(() => rmSync(base, { recursive: true, force: true }))

const report = () => missingNamedImports([join(base, 'app'), join(base, 'lib')], { root: base })
const names = (kind: string) =>
  report()
    .findings.filter(f => f.kind === kind)
    .map(f => f.name)
    .sort()

describe('missingNamedImports', () => {
  test('un nombre de valor ausente se reporta', () => {
    expect(names('missing')).toContain('ghost')
  })
  test('los nombres presentes no se reportan', () => {
    const fromValues = report().findings.filter(f => f.kind === 'missing' && f.specifier === '../lib/values').map(f => f.name)
    expect(fromValues).not.toContain('present')
    expect(fromValues).not.toContain('fn')
  })
  test('default: presente pasa, ausente se reporta', () => {
    const missing = report().findings.filter(f => f.kind === 'missing')
    expect(missing.filter(f => f.name === 'default').map(f => f.specifier)).toEqual(['../lib/nodefault'])
  })
  test('un export de solo tipo cuenta como exportado', () => {
    expect(names('missing')).not.toContain('Shape')
    expect(names('missing')).not.toContain('Face')
  })
  test('se sigue export * from en cadena', () => {
    expect(names('missing')).not.toContain('deepValue')
    expect(names('missing')).not.toContain('midValue')
  })
  test('export { a as b } from publica b y no a', () => {
    expect(names('missing')).not.toContain('renamed')
    expect(names('missing')).toContain('present')
  })
  test('un re-export de un nombre ausente se reporta en el archivo que re-exporta', () => {
    const f = report().findings.find(x => x.name === 'ghostReexport')
    expect(f?.kind).toBe('missing')
    expect(f?.importer.endsWith('lib/reexporter.ts')).toBe(true)
  })
  test('import * as ns y los destinos de terceros no se miden', () => {
    expect(names('missing')).not.toContain('whatever')
    expect(names('missing')).not.toContain('everything')
  })
  test('un especificador que no resuelve es otra clase, no un nombre ausente', () => {
    expect(names('unresolved')).toEqual(['x'])
    expect(names('missing')).not.toContain('x')
  })
  test('un import comentado no cuenta', () => {
    expect(names('missing')).not.toContain('commentedGhost')
  })
  test('publica su denominador', () => {
    const r = report()
    expect(r.files).toBe(8)
    expect(r.checkedNames).toBeGreaterThan(10)
  })
})
