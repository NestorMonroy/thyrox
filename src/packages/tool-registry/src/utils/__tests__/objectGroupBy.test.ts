/**
 * La mitad ROJA de `objectGroupBy`.
 *
 * Procedencia del SUJETO: `ccnmt: packages/tool-registry/src/utils/objectGroupBy.ts`.
 * Los casos son propios —no se copian los de su `__tests__`, que ese árbol
 * declara `"license": "UNLICENSED"`— y cubren el mismo contrato.
 *
 * Las dos costuras con conducta propia, cada una con su anulación:
 *
 * 1. **El prototipo nulo** — una clave llamada `toString` es una clave, no el
 *    método heredado. Anulación: cambiar `Object.create(null)` por `{}` y cae
 *    el caso que la busca.
 * 2. **El índice del selector** — base 0, y avanza aunque dos elementos caigan
 *    en el mismo grupo. Anulación: pasar una constante en vez de `index++` y
 *    cae el caso que lo recoge.
 *
 * Métrica: la conducta de la función sobre arreglos, generadores y claves de
 * los tres tipos que `PropertyKey` admite.
 * Ciega a: el rendimiento y al orden de las CLAVES del objeto, que en un
 * objeto de prototipo nulo sigue las reglas de JavaScript y no las de esta
 * función.
 */
import { describe, expect, test } from 'bun:test'
import { objectGroupBy } from '../objectGroupBy.js'

describe('objectGroupBy', () => {
  test('agrupa por lo que el selector devuelve', () => {
    const r = objectGroupBy([1, 2, 3, 4, 5], n => (n % 2 === 0 ? 'par' : 'impar'))
    expect(r).toEqual({ impar: [1, 3, 5], par: [2, 4] })
  })

  test('dentro de cada grupo conserva el orden de entrada', () => {
    const r = objectGroupBy(['bo', 'ba', 'ca', 'be'], s => s[0] as string)
    expect(r.b).toEqual(['bo', 'ba', 'be'])
    expect(r.c).toEqual(['ca'])
  })

  test('el selector recibe el índice, base 0 y sin saltos', () => {
    const vistos: number[] = []
    // Todos al mismo grupo: si el índice se derivara del tamaño del grupo en
    // vez de la posición, esto seguiría dando 0,1,2 y el caso no discriminaría.
    objectGroupBy(['a', 'b', 'c'], (_s, i) => {
      vistos.push(i)
      return 'uno'
    })
    expect(vistos).toEqual([0, 1, 2])
  })

  test('sin elementos devuelve un objeto sin claves', () => {
    expect(Object.keys(objectGroupBy([], () => 'x'))).toEqual([])
  })

  test('el resultado tiene prototipo nulo — `toString` es una clave, no un método', () => {
    const r = objectGroupBy(['x'], () => 'toString')
    expect(Object.getPrototypeOf(r)).toBeNull()
    expect(r.toString).toEqual(['x'])
  })

  test('admite claves numéricas', () => {
    const r = objectGroupBy([1.2, 1.8, 2.4], n => Math.floor(n))
    expect(r[1]).toEqual([1.2, 1.8])
    expect(r[2]).toEqual([2.4])
  })

  test('admite claves de tipo símbolo', () => {
    const a = Symbol('a')
    const b = Symbol('b')
    const r = objectGroupBy([1, 2, 3], n => (n === 2 ? b : a))
    expect(r[a]).toEqual([1, 3])
    expect(r[b]).toEqual([2])
  })

  test('consume cualquier iterable, no sólo arreglos', () => {
    function* gen(): Generator<number> {
      yield 1
      yield 2
      yield 3
    }
    const r = objectGroupBy(gen(), n => (n > 1 ? 'alto' : 'bajo'))
    expect(r).toEqual({ bajo: [1], alto: [2, 3] })
  })

  test('no muta la entrada', () => {
    const entrada = [3, 1, 2]
    objectGroupBy(entrada, n => String(n))
    expect(entrada).toEqual([3, 1, 2])
  })
})
