/**
 * Porte de `ccnmt: packages/agent/__tests__/internalUtils.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia es
 * el idioma de la descripción.
 *
 * La fuente (`ccnmt: packages/agent/internalUtils.ts`) declara además
 * `isBareMode` (depende de `readEnv` de `@claude-code-how-works/config/env`,
 * inexistente aquí) y `pathExists` (usa `fs/promises`, portable, pero ningún
 * caso de este test la ejercita). Ninguna de las dos entra en este porte: el
 * test que sigue sólo importa los once símbolos de abajo, y son los únicos
 * once cuya presencia se mide.
 */
import { describe, expect, test } from 'bun:test'
import {
  asSystemPrompt,
  count,
  errorMessage,
  getErrnoCode,
  isENOENT,
  isEnvDefinedFalsy,
  isEnvTruthy,
  isFsInaccessible,
  jsonStringify,
  lazySchema,
  safeParseJSON,
} from '../internalUtils.ts'

describe('errorMessage', () => {
  test('devuelve Error.message', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom')
  })
  test('devuelve String(value) para no-Error', () => {
    expect(errorMessage('plain')).toBe('plain')
    expect(errorMessage(42)).toBe('42')
    expect(errorMessage(null)).toBe('null')
    expect(errorMessage(undefined)).toBe('undefined')
  })
  test('maneja un objeto sin message', () => {
    expect(errorMessage({ foo: 'bar' })).toBe('[object Object]')
  })
})

describe('getErrnoCode', () => {
  test('extrae el code de un error con forma errno', () => {
    const e = Object.assign(new Error('not found'), { code: 'ENOENT' })
    expect(getErrnoCode(e)).toBe('ENOENT')
  })
  test('devuelve undefined cuando falta code', () => {
    expect(getErrnoCode(new Error('plain'))).toBeUndefined()
    expect(getErrnoCode({})).toBeUndefined()
    expect(getErrnoCode(null)).toBeUndefined()
    expect(getErrnoCode('string')).toBeUndefined()
  })
  test('devuelve undefined cuando code no es una cadena', () => {
    expect(getErrnoCode({ code: 123 })).toBeUndefined()
    expect(getErrnoCode({ code: null })).toBeUndefined()
  })
})

describe('isENOENT / isFsInaccessible', () => {
  test('isENOENT matchea sólo ENOENT', () => {
    expect(isENOENT({ code: 'ENOENT' })).toBe(true)
    expect(isENOENT({ code: 'EACCES' })).toBe(false)
    expect(isENOENT(new Error('plain'))).toBe(false)
  })
  test('isFsInaccessible matchea errores de inaccesibilidad', () => {
    expect(isFsInaccessible({ code: 'ENOENT' })).toBe(true)
    expect(isFsInaccessible({ code: 'EACCES' })).toBe(true)
    expect(isFsInaccessible({ code: 'EPERM' })).toBe(true)
    expect(isFsInaccessible({ code: 'ENOTDIR' })).toBe(true)
    expect(isFsInaccessible({ code: 'ELOOP' })).toBe(true)
  })
  test('isFsInaccessible NO matchea un errno no relacionado', () => {
    expect(isFsInaccessible({ code: 'EISDIR' })).toBe(false)
    expect(isFsInaccessible({ code: 'EBUSY' })).toBe(false)
    expect(isFsInaccessible(new Error('plain'))).toBe(false)
  })
})

describe('isEnvTruthy', () => {
  test('valores canónicos verdaderos', () => {
    expect(isEnvTruthy('1')).toBe(true)
    expect(isEnvTruthy('true')).toBe(true)
    expect(isEnvTruthy('yes')).toBe(true)
    expect(isEnvTruthy('on')).toBe(true)
  })
  test('insensible a mayúsculas + tolera espacios', () => {
    expect(isEnvTruthy('  TRUE  ')).toBe(true)
    expect(isEnvTruthy('YES')).toBe(true)
    expect(isEnvTruthy('On')).toBe(true)
  })
  test('booleano true → true', () => {
    expect(isEnvTruthy(true)).toBe(true)
  })
  test('falso / undefined / no reconocido → false', () => {
    expect(isEnvTruthy('0')).toBe(false)
    expect(isEnvTruthy('false')).toBe(false)
    expect(isEnvTruthy('')).toBe(false)
    expect(isEnvTruthy(undefined)).toBe(false)
    expect(isEnvTruthy('garbage')).toBe(false)
    expect(isEnvTruthy(false)).toBe(false)
  })
})

describe('isEnvDefinedFalsy', () => {
  test('valores canónicos falsos cuando está definido', () => {
    expect(isEnvDefinedFalsy('0')).toBe(true)
    expect(isEnvDefinedFalsy('false')).toBe(true)
    expect(isEnvDefinedFalsy('no')).toBe(true)
    expect(isEnvDefinedFalsy('off')).toBe(true)
  })
  test('insensible a mayúsculas + tolera espacios', () => {
    expect(isEnvDefinedFalsy('  FALSE  ')).toBe(true)
    expect(isEnvDefinedFalsy('NO')).toBe(true)
  })
  test('booleano false → true', () => {
    expect(isEnvDefinedFalsy(false)).toBe(true)
  })
  test('undefined → false (NO está definido)', () => {
    expect(isEnvDefinedFalsy(undefined)).toBe(false)
  })
  test('valores verdaderos → false', () => {
    expect(isEnvDefinedFalsy('1')).toBe(false)
    expect(isEnvDefinedFalsy('true')).toBe(false)
    expect(isEnvDefinedFalsy(true)).toBe(false)
  })
  test('cadena vacía → false (no es "definido falso")', () => {
    expect(isEnvDefinedFalsy('')).toBe(false)
  })
})

describe('safeParseJSON', () => {
  test('parsea JSON válido', () => {
    expect(safeParseJSON('{"a":1}')).toEqual({ a: 1 })
    expect(safeParseJSON('[1,2,3]')).toEqual([1, 2, 3])
    expect(safeParseJSON('42')).toBe(42)
  })
  test('devuelve null para null/undefined/vacío', () => {
    expect(safeParseJSON(null)).toBeNull()
    expect(safeParseJSON(undefined)).toBeNull()
    expect(safeParseJSON('')).toBeNull()
  })
  test('devuelve null para JSON malformado (nunca lanza)', () => {
    expect(safeParseJSON('{not json}')).toBeNull()
    expect(safeParseJSON('}{')).toBeNull()
  })
})

describe('jsonStringify', () => {
  test('coincide con el comportamiento de JSON.stringify', () => {
    expect(jsonStringify({ a: 1 })).toBe('{"a":1}')
  })
  test('pasa el replacer', () => {
    const replacer = (_: string, v: unknown) =>
      typeof v === 'number' ? v * 2 : v
    expect(jsonStringify({ a: 1 }, replacer)).toBe('{"a":2}')
  })
  test('pasa el space', () => {
    expect(jsonStringify({ a: 1 }, null, 2)).toBe('{\n  "a": 1\n}')
  })
})

describe('lazySchema', () => {
  test('la factory se llama una sola vez', () => {
    let calls = 0
    const lazy = lazySchema(() => {
      calls++
      return { value: 42 }
    })
    expect(calls).toBe(0)
    lazy()
    lazy()
    lazy()
    expect(calls).toBe(1)
  })
  test('devuelve la misma instancia', () => {
    const lazy = lazySchema(() => ({}))
    expect(lazy()).toBe(lazy())
  })
})

describe('count', () => {
  test('devuelve el conteo de coincidencias', () => {
    expect(count([1, 2, 3, 4], n => n > 2)).toBe(2)
  })
  test('devuelve 0 cuando nada matchea', () => {
    expect(count([1, 2, 3], n => n > 10)).toBe(0)
  })
  test('devuelve la longitud completa cuando todo matchea', () => {
    expect(count([1, 2, 3], n => n > 0)).toBe(3)
  })
  test('maneja un arreglo vacío', () => {
    expect(count([], () => true)).toBe(0)
  })
})

describe('asSystemPrompt', () => {
  test('devuelve el arreglo de entrada (cast marcado)', () => {
    const input: readonly string[] = ['a', 'b', 'c']
    expect(asSystemPrompt(input)).toBe(input as never)
  })
  test('preserva el contenido del arreglo', () => {
    expect([...asSystemPrompt(['x', 'y'])]).toEqual(['x', 'y'])
  })
})
