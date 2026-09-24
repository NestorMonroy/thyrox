/**
 * El analizador corre UNA vez por texto, no una por pregunta.
 *
 * Medido (`.claude/workbench/frontera-publica-de-paquetes-*`): sobre el chunk
 * real de 2.1.274 (5,4 MB) `extractByLiteral` tardaba 3,4 s porque analizaba
 * el texto dos veces —la suya y la de `findLiteralSites`— y cada caso de
 * `declaration.test.ts` lo volvía a analizar. Bajo carga el caso pasaba de
 * los 5 s por defecto de `bun test`. Se mide el número de análisis, no el
 * reloj: el reloj depende de la carga de la máquina y no discrimina.
 */
import { describe, expect, test } from 'bun:test'
import { extractByLiteral, findLiteralSites, parseCountForTesting } from '../src/declaration.ts'

const SOURCE = [
  'var A = { kind: "five_hour" };',
  'var B = function () { return ["seven_day", "five_hour"] };',
].join('\n')

describe('declaration — un análisis por texto', () => {
  test('extractByLiteral analiza el texto una sola vez', () => {
    const before = parseCountForTesting()
    extractByLiteral(SOURCE + '\n// a', 'five_hour')
    expect(parseCountForTesting() - before).toBe(1)
  })

  test('preguntas sucesivas sobre el MISMO texto no lo reanalizan', () => {
    const text = SOURCE + '\n// b'
    const before = parseCountForTesting()
    extractByLiteral(text, 'five_hour')
    extractByLiteral(text, 'seven_day')
    findLiteralSites(text, 'five_hour')
    expect(parseCountForTesting() - before).toBe(1)
  })

  test('un texto distinto sí se analiza, y el resultado es el suyo', () => {
    const before = parseCountForTesting()
    const one = findLiteralSites(SOURCE + '\n// c', 'five_hour')
    const other = findLiteralSites('var Z = "five_hour";', 'five_hour')
    expect(parseCountForTesting() - before).toBe(2)
    expect(one).toHaveLength(2)
    expect(other).toHaveLength(1)
  })
})
