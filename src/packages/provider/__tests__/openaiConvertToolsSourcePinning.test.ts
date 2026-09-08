/**
 * Los invariantes de `openai/convertTools.ts` pinchados sobre su FUENTE.
 *
 * POR QUE ESTE INSTRUMENTO ADEMAS DEL DE CONDUCTA. Los 20 casos portados de la
 * suite de la fuente miden el significado, y son el control fuerte. Pero el
 * saneado del esquema recorre QUINCE claves en tres grupos, y la conducta solo
 * ejercita TRES —`properties`, `items`, `oneOf`—. Las otras doce
 * —`definitions`, `$defs`, `patternProperties`, `additionalProperties`, `not`,
 * `if`, `then`, `else`, `contains`, `propertyNames`, `anyOf`, `allOf`— no
 * tienen ni un caso que las interrogue.
 *
 * MEDIDO, no supuesto: borrando esas doce claves del modulo —dejando cada
 * grupo con la unica que la conducta toca— la suite de conducta da **20 pass,
 * 0 fail**. Un `const` dentro de un `allOf` o de un `propertyNames` dejaria de
 * convertirse y ninguna asercion cambiaria de veredicto. Ese es el hueco que
 * este instrumento cubre.
 *
 * CONTROL DE ANULACION, medido: con esas doce claves borradas caen **3 de 6**
 * aqui —los casos 1, 2 y 3, uno por grupo— y **0 de 20** en conducta.
 *
 * Los patrones se adaptan a NUESTRA redaccion —el puerto es reimplementacion
 * bajo UNLICENSED, no copia— pero pinchan invariantes de la fuente.
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fuente = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'openai',
    'convertTools.ts',
  ),
  'utf-8',
)

/** Extrae los miembros del literal `const <nombre> = [...] as const`. */
function miembros(nombre: string): string[] {
  const inicio = fuente.indexOf(`const ${nombre} = [`)
  if (inicio < 0) return []
  const literal = fuente.slice(inicio, fuente.indexOf(']', inicio))
  return (literal.match(/'[^']+'/g) ?? []).map(s => s.slice(1, -1))
}

describe('invariantes escritos en openai/convertTools.ts', () => {
  test('1. objectKeys declara las cuatro claves de mapa nombre-a-esquema', () => {
    expect(miembros('objectKeys').sort()).toEqual(
      ['$defs', 'definitions', 'patternProperties', 'properties'].sort(),
    )
  })

  test('2. singleKeys declara las ocho claves de esquema unico', () => {
    expect(miembros('singleKeys').sort()).toEqual(
      [
        'additionalProperties',
        'contains',
        'else',
        'if',
        'items',
        'not',
        'propertyNames',
        'then',
      ].sort(),
    )
  })

  test('3. arrayKeys declara las tres claves de arreglo de esquemas', () => {
    expect(miembros('arrayKeys').sort()).toEqual(['allOf', 'anyOf', 'oneOf'].sort())
  })

  test('4. el recorrido de singleKeys excluye el arreglo (forma de tupla de items)', () => {
    // `items` admite tambien un arreglo de esquemas; sin este guard entraria
    // por el camino de esquema unico. Ningun caso de conducta lo interroga.
    const cuerpo = fuente.slice(fuente.indexOf('const singleKeys'))
    expect(cuerpo).toMatch(/!Array\.isArray\(nested\)/)
  })

  test('5. el filtro descarta por type !== server, no por type === function', () => {
    // La diferencia importa: una herramienta SIN `type` —la forma normal— tiene
    // que pasar. Un filtro por igualdad la descartaria.
    expect(fuente).toMatch(/return type !== 'server'/)
    expect(fuente).not.toMatch(/type === 'function'/)
  })

  test('6. el saneado copia el esquema en vez de mutar la entrada', () => {
    expect(fuente).toMatch(/const result = \{ \.\.\.schema \}/)
  })
})
