/**
 * Porte de `ccnmt: packages/agent/__tests__/idTypesAndUuid.test.ts`.
 * Dos mecanismos hermanos: los tipos de identificador —que en ejecucion
 * son la identidad— y el reconocedor de su forma.
 */
import { describe, expect, test } from 'bun:test'
import { asAgentId, asSessionId, toAgentId } from '../idTypes.ts'
import { createAgentId, validateUuid } from '../uuid.ts'

describe('asSessionId y asAgentId son la identidad en ejecucion', () => {
  test('asSessionId devuelve su argumento', () => {
    expect(asSessionId('abc')).toBe('abc' as never)
  })
  test('asAgentId devuelve su argumento', () => {
    expect(asAgentId('xyz')).toBe('xyz' as never)
  })
})

describe('toAgentId — reconoce la forma', () => {
  test('acepta a mas 16 hexadecimales, sin etiqueta', () => {
    expect(toAgentId('a0123456789abcdef')).toBe('a0123456789abcdef' as never)
  })
  test('acepta a<etiqueta>-<16 hexadecimales>', () => {
    expect(toAgentId('areviewer-0123456789abcdef')).toBe('areviewer-0123456789abcdef' as never)
  })
  test('rehusa un hexadecimal corto', () => {
    expect(toAgentId('a012345')).toBeNull()
  })
  test('rehusa caracteres no hexadecimales', () => {
    expect(toAgentId('a0123456789ZZZZZZ')).toBeNull()
  })
  test('rehusa sin la a inicial', () => {
    expect(toAgentId('0123456789abcdef')).toBeNull()
  })
  test('rehusa el vacio y lo arbitrario', () => {
    expect(toAgentId('')).toBeNull()
    expect(toAgentId('teammate@team')).toBeNull()
    expect(toAgentId('plain-name')).toBeNull()
  })
  test('cierra el ciclo con la salida de createAgentId', () => {
    const id = createAgentId()
    expect(toAgentId(id)).toBe(id)
  })
  test('cierra el ciclo con la salida de createAgentId con etiqueta', () => {
    const id = createAgentId('reviewer')
    expect(toAgentId(id)).toBe(id)
  })
})

describe('createAgentId', () => {
  test('sin etiqueta produce a mas 16 hexadecimales', () => {
    expect(/^a[0-9a-f]{16}$/.test(createAgentId())).toBe(true)
  })
  test('con etiqueta produce a<etiqueta>-<16 hexadecimales>', () => {
    expect(/^areviewer-[0-9a-f]{16}$/.test(createAgentId('reviewer'))).toBe(true)
  })
  test('produce identificadores distintos entre llamadas', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) ids.add(createAgentId())
    expect(ids.size).toBe(100)
  })
})

describe('validateUuid', () => {
  test('acepta la forma canonica', () => {
    const id = '01234567-89ab-cdef-0123-456789abcdef'
    expect(validateUuid(id)).toBe(id as never)
  })
  test('no distingue mayusculas', () => {
    const upper = '01234567-89AB-CDEF-0123-456789ABCDEF'
    expect(validateUuid(upper)).toBe(upper as never)
  })
  test('rehusa lo que no es cadena', () => {
    expect(validateUuid(123)).toBeNull()
    expect(validateUuid(null)).toBeNull()
    expect(validateUuid(undefined)).toBeNull()
    expect(validateUuid({})).toBeNull()
    expect(validateUuid([])).toBeNull()
  })
  test('rehusa los 32 hexadecimales sin guiones', () => {
    expect(validateUuid('0123456789abcdef0123456789abcdef')).toBeNull()
  })
  test('rehusa la longitud equivocada', () => {
    expect(validateUuid('01234567-89ab-cdef-0123-456789abcde')).toBeNull()
    expect(validateUuid('01234567-89ab-cdef-0123-456789abcdef0')).toBeNull()
  })
  test('rehusa caracteres no hexadecimales', () => {
    expect(validateUuid('01234567-89ab-cdef-0123-456789abcdeg')).toBeNull()
  })
  test('rehusa el vacio y lo arbitrario', () => {
    expect(validateUuid('')).toBeNull()
    expect(validateUuid('not-a-uuid')).toBeNull()
  })
})
