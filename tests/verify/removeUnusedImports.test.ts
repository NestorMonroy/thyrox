/**
 * Retirar imports sin uso con el propio servicio de lenguaje de TypeScript
 * (`organizeImports` en modo `RemoveUnused`), y SOLO imports.
 *
 * La mitad de juicio es la frontera: un local o un parámetro sin uso también
 * da TS6133, pero retirarlo cambia una firma o borra trabajo de un porte a
 * medias. Esa decisión no es mecánica y esta herramienta no la toma.
 */
import { describe, expect, test } from 'bun:test'
import { removeUnusedImports, semanticDiagnosticCodes } from '../../src/verify/removeUnusedImports'

const files = {
  '/p/dep.ts': "export const used = 1\nexport const unused = 2\nexport type Shape = { a: number }\n",
  '/p/side.ts': 'globalThis.touched = true\nexport {}\n',
  // La forma real: el tipo se declara en un módulo y el índice lo reexporta
  // con `export type { … }` (`local-observability/src/index.ts`).
  '/p/compat.ts': 'export type Metadata = never\n',
  '/p/typeOnly.ts': "export type { Metadata } from './compat'\nexport const unused = 1\n",
}

function run(source: string): string | undefined {
  return removeUnusedImports({ ...files, '/p/main.ts': source }, ['/p/main.ts']).get('/p/main.ts')
}

describe('removeUnusedImports', () => {
  test('control del arnés: la fixture resuelve sus módulos', () => {
    const codes = semanticDiagnosticCodes(
      { ...files, '/p/main.ts': "import { Metadata } from './typeOnly'\nexport const x = 1 as unknown as typeof Metadata\n" },
      '/p/main.ts',
    )
    expect(codes).not.toContain(2307)
    expect(codes).toContain(2693)
  })

  test('retira el binding sin uso y conserva el usado', () => {
    const out = run("import { used, unused } from './dep'\nconsole.log(used)\n")
    expect(out).toContain('used')
    expect(out).not.toContain('unused')
  })

  test('retira la declaración entera cuando ningún binding se usa', () => {
    const out = run("import { unused } from './dep'\nexport const x = 1\n")
    expect(out).not.toContain("from './dep'")
  })

  test('conserva el import de efecto', () => {
    const out = run("import './side'\nimport { unused } from './dep'\nexport const x = 1\n")
    expect(out).toContain("import './side'")
  })

  test('conserva el tipo usado sólo en posición de tipo', () => {
    const out = run("import type { Shape } from './dep'\nexport const s: Shape = { a: 1 }\n")
    expect(out).toBeUndefined()
  })

  test('no toca locales ni parámetros sin uso', () => {
    const out = run(
      "import { unused } from './dep'\nexport function f(p: number) { const l = 1; return 2 }\n",
    )
    expect(out).toContain('p: number')
    expect(out).toContain('const l = 1')
  })

  test('no reformatea lo que conserva: sólo retira el binding', () => {
    // Medido en el primer lote: con opciones de formato vacías,
    // organizeImports reescribía los bloques conservados (añadía `;`,
    // quitaba sangría y espacios) en 230 archivos.
    const source =
      "import { used, unused } from './dep'\nimport {\n  used as again,\n} from './dep'\nconsole.log(used, again)\n"
    const expected =
      "import { used } from './dep'\nimport {\n  used as again,\n} from './dep'\nconsole.log(used, again)\n"
    expect(run(source)).toBe(expected)
  })

  test('no retira un binding que el archivo nombra, aunque el checker lo dé por no leído', () => {
    // Medido en el lote real (`fastMode.ts`): el módulo exporta un TIPO y el
    // archivo lo usa como valor con `typeof`. El checker da TS2693 en el uso
    // y TS6133 en el import; retirar el import cambia tres diagnósticos por
    // dos TS2304 y esconde el defecto, que está en el uso.
    const out = run(
      "import { Metadata, unused } from './typeOnly'\nexport const x = 1 as unknown as typeof Metadata\n",
    )
    // Se mide sobre la DECLARACIÓN import: el nombre sigue en el cuerpo pase
    // lo que pase, y una aserción sobre el texto entero no discrimina.
    expect(out ?? 'import { Metadata }').toMatch(/^import \{[^}]*\bMetadata\b/m)
  })

  test('un archivo sin imports sin uso no aparece en el resultado', () => {
    expect(run("import { used } from './dep'\nconsole.log(used)\n")).toBeUndefined()
  })
})
