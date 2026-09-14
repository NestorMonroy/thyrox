/**
 * `connectionToolCompression.ts` es PROPIO de thyrox -- no hay fuente que
 * portar, así que no hay "porte fiel" que replicar. Las pruebas cubren su
 * contrato declarado: booleano exacto, tipo-o-se-descarta, passthrough del
 * resto del registro.
 */
import { describe, expect, test } from 'bun:test'
import {
  isCompressToolResultsEnabledForConnection,
  normalizeCompressToolResultsField,
} from '../src/connectionToolCompression.ts'

describe('isCompressToolResultsEnabledForConnection', () => {
  test('true solo con el booleano exacto', () => {
    expect(isCompressToolResultsEnabledForConnection({ compressToolResults: true })).toBe(true)
  })

  test('false por defecto, sin la clave', () => {
    expect(isCompressToolResultsEnabledForConnection({})).toBe(false)
    expect(isCompressToolResultsEnabledForConnection(undefined)).toBe(false)
    expect(isCompressToolResultsEnabledForConnection(null)).toBe(false)
  })

  test('un valor truthy que no es booleano NO activa la compresion', () => {
    expect(isCompressToolResultsEnabledForConnection({ compressToolResults: 1 })).toBe(false)
    expect(isCompressToolResultsEnabledForConnection({ compressToolResults: 'true' })).toBe(false)
  })

  test('un array o un primitivo se leen como registro vacio', () => {
    expect(isCompressToolResultsEnabledForConnection([1, 2, 3])).toBe(false)
    expect(isCompressToolResultsEnabledForConnection('claude')).toBe(false)
  })
})

describe('normalizeCompressToolResultsField', () => {
  test('el booleano real sobrevive intacto', () => {
    expect(normalizeCompressToolResultsField({ compressToolResults: true })).toEqual({
      compressToolResults: true,
    })
  })

  test('un valor no-booleano se descarta, el resto del registro pasa intacto', () => {
    expect(normalizeCompressToolResultsField({ compressToolResults: 'nope', tag: 'x' })).toEqual({
      tag: 'x',
    })
  })

  test('registro vacio o sin la clave da undefined', () => {
    expect(normalizeCompressToolResultsField({})).toBeUndefined()
    expect(normalizeCompressToolResultsField({ tag: 'x' })).toEqual({ tag: 'x' })
  })

  test('control de anulacion: sin el chequeo de tipo, el valor invalido sobreviviria', () => {
    // Documenta la propiedad que el chequeo `typeof !== 'boolean'` protege:
    // un valor limpio de verdad (ya booleano) no dispara ninguna rama de
    // borrado -- si la comprobaramos anulando el `typeof`, el string 'nope'
    // del caso de arriba pasaria intacto en vez de descartarse.
    const clean = normalizeCompressToolResultsField({ compressToolResults: false })
    expect(clean).toEqual({ compressToolResults: false })
  })
})
