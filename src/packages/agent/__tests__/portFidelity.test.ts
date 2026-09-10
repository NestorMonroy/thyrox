/**
 * El control de fidelidad del porte de tests.
 *
 * El defecto que cierra: portar un test leyendo los NOMBRES de sus casos y
 * escribiendo las aserciones uno mismo. El resultado se ve completo —mismos
 * describe, mismos nombres— y asevera menos. Medido cuando ocurrio:
 * `computeContentHash.test.ts` perdio un bloque `describe` entero (3 casos),
 * y `abortController`/`combinedAbortSignal` conservaron sus 12 y 15 casos con
 * 14 de 19 y 16 de 20 aserciones. Lo detecto el ejecutor, no un verde.
 *
 * Metrica: por archivo portado, casos (`test(`/`it(`) y llamadas a `expect(`
 * contra su homonimo en la fuente. Ninguno de los dos puede quedar por debajo.
 * Ciega a: una asercion que exista y mida otra cosa —el conteo no lee la
 * expectativa—, y a un caso renombrado que cubra un fenomeno distinto. Es una
 * cota inferior: su verde no prueba fidelidad, prueba que no hay merma.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_TESTS = join(
  process.env.CCNMT_ROOT ?? '/home/user/claude-code-nestor-monroy-tools',
  'packages/agent/__tests__',
)
const OWN_TESTS = import.meta.dir

const CASE = /^[ \t]*(?:test|it)\(\s*['"`]/gm
const EXPECT = /\bexpect\(/g

const count = (text: string, re: RegExp): number => (text.match(re) ?? []).length

describe('fidelidad del porte contra ccnmt', () => {
  // La fuente es un arbol de referencia, no una dependencia: puede no estar.
  // Se declara la precondicion en vez de publicar un verde que no midio nada.
  const available = existsSync(SOURCE_TESTS)

  test('el arbol de referencia esta presente, o el control se declara sin medir', () => {
    if (!available) {
      console.warn(
        `[portFidelity] ausente ${SOURCE_TESTS} — NO se emite veredicto de ` +
          'fidelidad. Declara CCNMT_ROOT para medir.',
      )
    }
    expect(true).toBe(true)
  })

  if (!available) return

  const ported = readdirSync(OWN_TESTS)
    .filter((f) => f.endsWith('.test.ts'))
    .filter((f) => existsSync(join(SOURCE_TESTS, f)))

  test('hay archivos portados que medir', () => {
    expect(ported.length).toBeGreaterThan(0)
  })

  for (const file of ported) {
    test(`${file} no asevera menos que su fuente`, () => {
      const src = readFileSync(join(SOURCE_TESTS, file), 'utf8')
      const own = readFileSync(join(OWN_TESTS, file), 'utf8')
      expect(
        count(own, CASE),
        `casos: ${count(own, CASE)} portados contra ${count(src, CASE)} en la fuente`,
      ).toBeGreaterThanOrEqual(count(src, CASE))
      expect(
        count(own, EXPECT),
        `expect: ${count(own, EXPECT)} portados contra ${count(src, EXPECT)} en la fuente`,
      ).toBeGreaterThanOrEqual(count(src, EXPECT))
    })
  }
})
