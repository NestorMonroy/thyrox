/**
 * Puerto de `ccnmt: packages/local-observability/src/__tests__/errorHelpers.behavior.test.ts`
 * (145 líneas fuente, 100 % portado).
 */
import { describe, expect, test } from 'bun:test'

import {
  errorMessage,
  getErrnoCode,
  getErrnoPath,
  isAbortError,
  isENOENT,
  isFsInaccessible,
  shortErrorStack,
  toError,
} from '../errorHelpers.ts'

/**
 * Fija los invariantes de los helpers de error. Se llaman desde bloques
 * catch por todo el código base; una regresión aquí cambia cómo los
 * errores se muestran, se loguean, y se comparan contra las condiciones
 * esperadas.
 */
describe('errorHelpers', () => {
  describe('toError / errorMessage', () => {
    test('Error instance preserved as-is', () => {
      const e = new Error('boom')
      expect(toError(e)).toBe(e)
      expect(errorMessage(e)).toBe('boom')
    })

    test('string converted to Error via String()', () => {
      expect(toError('plain string').message).toBe('plain string')
      expect(errorMessage('plain string')).toBe('plain string')
    })

    test('object converted via String()', () => {
      // Fijado: un objeto se vuelve "[object Object]" vía String() — no
      // JSON. Un refactor "hagamos JSON.stringify aquí" cambiaría los
      // logs de debug.
      expect(errorMessage({})).toBe('[object Object]')
    })

    test('null/undefined converted to strings (no crash)', () => {
      expect(errorMessage(null)).toBe('null')
      expect(errorMessage(undefined)).toBe('undefined')
    })
  })

  describe('getErrnoCode / isENOENT', () => {
    test('Error with string `code` field returns code', () => {
      const e = Object.assign(new Error('not found'), { code: 'ENOENT' })
      expect(getErrnoCode(e)).toBe('ENOENT')
      expect(isENOENT(e)).toBe(true)
    })

    test('non-string code → undefined (defensive)', () => {
      const e = Object.assign(new Error('weird'), { code: 42 })
      expect(getErrnoCode(e)).toBeUndefined()
    })

    test('Error without `code` field → undefined', () => {
      expect(getErrnoCode(new Error('plain'))).toBeUndefined()
      expect(isENOENT(new Error('plain'))).toBe(false)
    })

    test('non-Error inputs → undefined / false', () => {
      expect(getErrnoCode(null)).toBeUndefined()
      expect(getErrnoCode('string')).toBeUndefined()
      expect(isENOENT(null)).toBe(false)
    })

    test('EACCES not flagged as ENOENT (exact match only)', () => {
      const e = Object.assign(new Error('denied'), { code: 'EACCES' })
      expect(isENOENT(e)).toBe(false)
      expect(getErrnoCode(e)).toBe('EACCES')
    })
  })

  describe('getErrnoPath', () => {
    test('Error with string `path` returns path', () => {
      const e = Object.assign(new Error('x'), { path: '/etc/passwd' })
      expect(getErrnoPath(e)).toBe('/etc/passwd')
    })

    test('no path → undefined', () => {
      expect(getErrnoPath(new Error('x'))).toBeUndefined()
    })
  })

  describe('isAbortError', () => {
    test('AbortError class → true', () => {
      class AbortError extends Error {
        override name = 'AbortError'
      }
      expect(isAbortError(new AbortError())).toBe(true)
    })

    test('DOMException with name "AbortError" → true', () => {
      // El abort nativo de fetch lanza esta forma.
      const e = Object.assign(new Error('aborted'), { name: 'AbortError' })
      expect(isAbortError(e)).toBe(true)
    })

    test('regular Error → false', () => {
      expect(isAbortError(new Error('plain'))).toBe(false)
    })
  })

  describe('isFsInaccessible', () => {
    test('ENOENT → true (path missing)', () => {
      expect(isFsInaccessible(Object.assign(new Error('x'), { code: 'ENOENT' }))).toBe(
        true,
      )
    })

    test('EACCES → true (permission denied — counts as inaccessible)', () => {
      // El usuario no puede ver el archivo aunque exista. Se trata como ausente.
      expect(isFsInaccessible(Object.assign(new Error('x'), { code: 'EACCES' }))).toBe(
        true,
      )
    })

    test('regular Error → false', () => {
      expect(isFsInaccessible(new Error('plain'))).toBe(false)
    })
  })

  describe('shortErrorStack', () => {
    test('non-Error → String() coerce', () => {
      expect(shortErrorStack('plain')).toBe('plain')
    })

    test('Error without stack → just the message', () => {
      const e = new Error('boom')
      ;(e as any).stack = undefined
      expect(shortErrorStack(e)).toBe('boom')
    })

    test('limits to N stack frames (default 5)', () => {
      const e = new Error('boom')
      // Sintetiza un stack con 10 frames.
      const frames = Array.from({ length: 10 }, (_, i) => `    at fn${i} (file.ts:${i})`)
      e.stack = `Error: boom\n${frames.join('\n')}`
      const result = shortErrorStack(e, 3)
      const resultLines = result.split('\n')
      // Header + 3 frames = 4 líneas.
      expect(resultLines.length).toBe(4)
    })
  })
})
