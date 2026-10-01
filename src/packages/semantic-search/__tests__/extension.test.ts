/**
 * Los tres estados de pgvector que `migrateVectorSchema` distingue antes de
 * migrar, sobre el estado ya leído: sin servidor, porque la decisión es pura
 * y un servidor real no puede ponerse en «no disponible» ni en una versión
 * vieja sin degradarlo.
 */
import { describe, expect, test } from 'bun:test'

import {
  assertVectorExtensionUsable,
  compareVersions,
  MINIMUM_PGVECTOR_VERSION,
  VectorExtensionNotEnabledError,
  VectorExtensionUnavailableError,
  VectorExtensionVersionError,
} from '../extension.ts'

describe('assertVectorExtensionUsable', () => {
  test('no disponible en el servidor: error de infraestructura', () => {
    const state = { availableVersion: null, installed: null }
    expect(() => assertVectorExtensionUsable(state)).toThrow(VectorExtensionUnavailableError)
    try {
      assertVectorExtensionUsable(state)
    } catch (error) {
      expect((error as VectorExtensionUnavailableError).code).toBe('pgvector-unavailable')
    }
  })

  test('disponible pero no habilitada en la base: error de provisioning, con la versión ofrecida', () => {
    const state = { availableVersion: '0.8.6', installed: null }
    expect(() => assertVectorExtensionUsable(state)).toThrow(VectorExtensionNotEnabledError)
    expect(() => assertVectorExtensionUsable(state)).toThrow(/0\.8\.6/)
  })

  // CONTROL: sin la comparación de versión, una 0.6.2 habilitada pasaría.
  test('habilitada con versión menor que la mínima: error de versión con las dos versiones', () => {
    const state = { availableVersion: '0.6.2', installed: { version: '0.6.2', schema: 'public' } }
    let caught: unknown
    try {
      assertVectorExtensionUsable(state)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(VectorExtensionVersionError)
    const versionError = caught as VectorExtensionVersionError
    expect(versionError.found).toBe('0.6.2')
    expect(versionError.required).toBe(MINIMUM_PGVECTOR_VERSION)
    expect(versionError.message).toContain('0.6.2')
    expect(versionError.message).toContain(MINIMUM_PGVECTOR_VERSION)
  })

  test('habilitada con versión compatible: devuelve versión y esquema de la extensión', () => {
    const state = { availableVersion: '0.8.6', installed: { version: '0.8.6', schema: 'extensions' } }
    expect(assertVectorExtensionUsable(state)).toEqual({ version: '0.8.6', schema: 'extensions' })
  })

  test('la mínima exacta es compatible', () => {
    const state = { availableVersion: MINIMUM_PGVECTOR_VERSION, installed: { version: MINIMUM_PGVECTOR_VERSION, schema: 'public' } }
    expect(assertVectorExtensionUsable(state).version).toBe(MINIMUM_PGVECTOR_VERSION)
  })
})

describe('compareVersions', () => {
  test('compara por segmento numérico, no como texto', () => {
    expect(compareVersions('0.10.0', '0.7.0')).toBeGreaterThan(0)
    expect(compareVersions('0.7.0', '0.7.0')).toBe(0)
    expect(compareVersions('0.7', '0.7.0')).toBe(0)
    expect(compareVersions('0.6.2', '0.7.0')).toBeLessThan(0)
  })

  test('una versión ilegible rehúsa en vez de compararse como cero', () => {
    expect(() => compareVersions('0.x', '0.7.0')).toThrow(/0\.x/)
  })
})
