/**
 * Porte de `ccnmt: packages/agent/__tests__/taggedId.test.ts`.
 * El mecanismo es `toTaggedId`: un UUID de 128 bits codificado en base58
 * y prefijado por su etiqueta y su version, para que el identificador
 * diga de que es sin consultar nada.
 */
import { describe, expect, test } from 'bun:test'
import { toTaggedId } from '../taggedId.ts'

describe('toTaggedId', () => {
  test('produce el formato tag_<version><22 caracteres base58>', () => {
    const id = toTaggedId('user', '01234567-89ab-cdef-0123-456789abcdef')
    expect(id.startsWith('user_01')).toBe(true)
    expect(id.length).toBe(29)
  })

  test('acepta el UUID con guiones', () => {
    expect(toTaggedId('org', '12345678-1234-5678-1234-567812345678').startsWith('org_01')).toBe(true)
  })

  test('acepta el UUID sin guiones', () => {
    expect(toTaggedId('org', '12345678123456781234567812345678').startsWith('org_01')).toBe(true)
  })

  test('las dos formas del mismo UUID dan el mismo identificador', () => {
    const a = toTaggedId('user', '01234567-89ab-cdef-0123-456789abcdef')
    const b = toTaggedId('user', '0123456789abcdef0123456789abcdef')
    expect(a).toBe(b)
  })

  test('rehusa una longitud invalida nombrandola', () => {
    expect(() => toTaggedId('user', '0123456789abcdef')).toThrow(/length/)
    expect(() => toTaggedId('user', 'short')).toThrow(/length/)
  })

  test('UUID distintos dan identificadores distintos', () => {
    const a = toTaggedId('user', '01234567-89ab-cdef-0123-456789abcdef')
    const b = toTaggedId('user', 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    expect(a).not.toBe(b)
  })

  test('el UUID cero da unos a la izquierda: 1 es el caracter de posicion 0', () => {
    expect(toTaggedId('user', '00000000-0000-0000-0000-000000000000')).toBe('user_01' + '1'.repeat(22))
  })

  test('la etiqueta pasa verbatim aunque lleve guion bajo', () => {
    expect(toTaggedId('multi_word', '01234567-89ab-cdef-0123-456789abcdef').startsWith('multi_word_01')).toBe(true)
  })

  test('la salida usa solo el alfabeto base58 — sin 0, O, I ni l', () => {
    const id = toTaggedId('user', 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    const encoded = id.slice('user_01'.length)
    expect(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(encoded)).toBe(true)
  })
})
