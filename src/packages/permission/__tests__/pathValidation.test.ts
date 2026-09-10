/**
 * Tests del puerto declarado-parcial de `pathValidation.ts` (6 de 11
 * exports — ver docstring del archivo). Cubre el objetivo confirmado del
 * pase (`expandTilde`) y sus dos vecinos puros.
 */
import { describe, expect, test } from 'bun:test'
import { homedir } from 'node:os'
import { expandTilde, formatDirectoryList, getGlobBaseDirectory } from '../src/pathValidation.ts'

describe('expandTilde — el objetivo del pase', () => {
  test('"~" solo se expande al home', () => {
    expect(expandTilde('~')).toBe(homedir())
  })

  test('"~/algo" expande el prefijo y preserva el resto', () => {
    expect(expandTilde('~/proyecto/a.ts')).toBe(homedir() + '/proyecto/a.ts')
  })

  test('"~usuario/algo" NO se expande (riesgo de seguridad documentado en la fuente)', () => {
    expect(expandTilde('~usuario/algo')).toBe('~usuario/algo')
  })

  test('una ruta absoluta sin tilde pasa intacta', () => {
    expect(expandTilde('/abs/path')).toBe('/abs/path')
  })

  test('una ruta relativa sin tilde pasa intacta', () => {
    expect(expandTilde('src/a.ts')).toBe('src/a.ts')
  })
})

describe('getGlobBaseDirectory', () => {
  test('extrae el directorio antes del primer carácter glob', () => {
    expect(getGlobBaseDirectory('/path/to/*.txt')).toBe('/path/to')
  })

  test('sin carácter glob, devuelve la ruta completa', () => {
    expect(getGlobBaseDirectory('/path/to/file.txt')).toBe('/path/to/file.txt')
  })

  test('glob en el primer segmento devuelve "/"', () => {
    expect(getGlobBaseDirectory('/*.txt')).toBe('/')
  })

  test('sin separador antes del glob, devuelve "."', () => {
    expect(getGlobBaseDirectory('*.txt')).toBe('.')
  })
})

describe('formatDirectoryList', () => {
  test('con 5 o menos, lista todo entre comillas', () => {
    expect(formatDirectoryList(['a', 'b'])).toBe("'a', 'b'")
  })

  test('con más de 5, trunca y cuenta el resto', () => {
    const result = formatDirectoryList(['1', '2', '3', '4', '5', '6', '7', '8'])
    expect(result).toBe("'1', '2', '3', '4', '5', and 3 more")
  })

  test('lista vacía produce cadena vacía', () => {
    expect(formatDirectoryList([])).toBe('')
  })
})
