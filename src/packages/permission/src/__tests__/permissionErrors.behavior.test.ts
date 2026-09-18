import { describe, expect, test } from 'bun:test'

import {
  AbortError,
  AskRequiredError,
  ContextError,
  DeniedError,
  HostBindingsError,
  PermissionBaseError,
} from '../errors.ts'

/**
 * Copia de `ccnmt: packages/permission/src/__tests__/permissionErrors.behavior.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Fija el espacio de nombres `PermissionError` de la V7 §6.5. Quien llama
 * comprueba los códigos en sus bloques `catch`, repartidos por toda la base
 * de código: una regresión que cambie las cadenas de código o la jerarquía de
 * clases rompe todos esos bloques en silencio.
 *
 * Invariantes:
 *  1. Las 5 subclases extienden `PermissionBaseError`, NO `Error`
 *     directamente.
 *  2. Las cadenas de código son exactas:
 *     - DeniedError: PERMISSION_DENIED
 *     - AskRequiredError: PERMISSION_ASK_REQUIRED
 *     - ContextError: PERMISSION_CONTEXT_ERROR
 *     - AbortError: PERMISSION_ABORTED
 *     - HostBindingsError: PERMISSION_HOST_BINDINGS_ERROR
 *  3. La propiedad `.name` de la clase es el nombre de la subclase concreta,
 *     NO el del padre.
 *  4. `AbortError` trae el mensaje por defecto «Permission request aborted».
 *  5. Las `ErrorOptions` (la `cause`) llegan hasta el `Error` base.
 */
describe('permission errors namespace', () => {
  describe('PermissionBaseError (the trunk class)', () => {
    test('extends Error (preserves stack/Error semantics)', () => {
      const e = new PermissionBaseError('CODE', 'message')
      expect(e instanceof Error).toBe(true)
      expect(e instanceof PermissionBaseError).toBe(true)
    })

    test('exposes .code (readonly) and .message', () => {
      const e = new PermissionBaseError('CODE', 'message')
      expect(e.code).toBe('CODE')
      expect(e.message).toBe('message')
    })

    test('name === "PermissionBaseError"', () => {
      const e = new PermissionBaseError('CODE', 'message')
      expect(e.name).toBe('PermissionBaseError')
    })

    test('preserves cause via ErrorOptions', () => {
      const inner = new Error('inner')
      const e = new PermissionBaseError('CODE', 'outer', { cause: inner })
      expect(e.cause).toBe(inner)
    })
  })

  describe('DeniedError', () => {
    test('code = "PERMISSION_DENIED" (exact, caller-checked)', () => {
      // Fijado: catch (e) { if (e.code === 'PERMISSION_DENIED') ... }
      const e = new DeniedError('user said no')
      expect(e.code).toBe('PERMISSION_DENIED')
    })

    test('extends PermissionBaseError (NOT raw Error)', () => {
      const e = new DeniedError('x')
      expect(e instanceof PermissionBaseError).toBe(true)
      expect(e instanceof DeniedError).toBe(true)
    })

    test('name = "PermissionDeniedError" (subclass name, NOT base)', () => {
      const e = new DeniedError('x')
      expect(e.name).toBe('PermissionDeniedError')
    })
  })

  describe('AskRequiredError', () => {
    test('code = "PERMISSION_ASK_REQUIRED"', () => {
      // Fijado: quien llama activa «mostrar el prompt de aprobación» con este código exacto.
      const e = new AskRequiredError('needs ask')
      expect(e.code).toBe('PERMISSION_ASK_REQUIRED')
    })

    test('name = "PermissionAskRequiredError"', () => {
      const e = new AskRequiredError('x')
      expect(e.name).toBe('PermissionAskRequiredError')
    })
  })

  describe('ContextError', () => {
    test('code = "PERMISSION_CONTEXT_ERROR"', () => {
      const e = new ContextError('bad context')
      expect(e.code).toBe('PERMISSION_CONTEXT_ERROR')
    })

    test('name = "PermissionContextError"', () => {
      const e = new ContextError('x')
      expect(e.name).toBe('PermissionContextError')
    })
  })

  describe('AbortError', () => {
    test('code = "PERMISSION_ABORTED"', () => {
      const e = new AbortError()
      expect(e.code).toBe('PERMISSION_ABORTED')
    })

    test('default message = "Permission request aborted"', () => {
      // Fijado: el valor por defecto — quien llama no tiene por qué pasar
      // uno. Una regresión a un defecto vacío perdería un texto de error
      // informativo.
      const e = new AbortError()
      expect(e.message).toBe('Permission request aborted')
    })

    test('explicit message overrides default', () => {
      const e = new AbortError('user pressed escape')
      expect(e.message).toBe('user pressed escape')
    })

    test('name = "PermissionAbortError"', () => {
      const e = new AbortError()
      expect(e.name).toBe('PermissionAbortError')
    })
  })

  describe('HostBindingsError', () => {
    test('code = "PERMISSION_HOST_BINDINGS_ERROR"', () => {
      const e = new HostBindingsError('bindings missing')
      expect(e.code).toBe('PERMISSION_HOST_BINDINGS_ERROR')
    })

    test('name = "PermissionHostBindingsError"', () => {
      const e = new HostBindingsError('x')
      expect(e.name).toBe('PermissionHostBindingsError')
    })
  })

  describe('Cross-class invariants', () => {
    test('All 5 subclasses are catchable via PermissionBaseError', () => {
      // Fijado: estructural — un solo bloque `catch` puede atender todos los tipos.
      const errors = [
        new DeniedError('x'),
        new AskRequiredError('x'),
        new ContextError('x'),
        new AbortError('x'),
        new HostBindingsError('x'),
      ]
      for (const e of errors) {
        expect(e instanceof PermissionBaseError).toBe(true)
      }
    })

    test('All codes are unique (no aliasing across subclasses)', () => {
      const codes = [
        new DeniedError('x').code,
        new AskRequiredError('x').code,
        new ContextError('x').code,
        new AbortError().code,
        new HostBindingsError('x').code,
      ]
      const unique = new Set(codes)
      expect(unique.size).toBe(codes.length)
    })

    test('All codes start with PERMISSION_ prefix (namespace marker)', () => {
      // Fijado: la búsqueda de códigos de error entre paquetes se apoya en este prefijo.
      const codes = [
        new DeniedError('x').code,
        new AskRequiredError('x').code,
        new ContextError('x').code,
        new AbortError().code,
        new HostBindingsError('x').code,
      ]
      for (const c of codes) {
        expect(c.startsWith('PERMISSION_')).toBe(true)
      }
    })
  })
})
