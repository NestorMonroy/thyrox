/**
 * Si el modo rápido queda encendido para un modelo, según 2.1.283
 * (`chunk-t6pwageh.js`): `Yl` lee la preferencia con su opt-in por sesión,
 * `Ndn` la combina con la disponibilidad y `oA` decide al cambiar de modelo.
 */
import { describe, expect, test } from 'bun:test'

import {
  fastModePreferenceEnabled,
  resolveFastModeForModel,
  shouldEnableFastModeForModel,
  type FastModeSelectionContext,
} from '../fastModeSelection.js'

describe('fastModePreferenceEnabled (Yl)', () => {
  test('sin fastMode no hay preferencia', () => {
    expect(fastModePreferenceEnabled({}, undefined, undefined)).toBe(false)
    expect(fastModePreferenceEnabled({ fastMode: false }, undefined, undefined)).toBe(false)
  })

  test('sin opt-in por sesión basta fastMode', () => {
    expect(fastModePreferenceEnabled({ fastMode: true }, { fastModePerSessionOptIn: true }, undefined)).toBe(true)
  })

  test('con opt-in por sesión: la política lo prohíbe, y si no, sólo la bandera lo enciende', () => {
    const settings = { fastMode: true, fastModePerSessionOptIn: true }
    expect(fastModePreferenceEnabled(settings, { fastModePerSessionOptIn: true }, { fastMode: true })).toBe(false)
    expect(fastModePreferenceEnabled(settings, undefined, { fastMode: true })).toBe(true)
    expect(fastModePreferenceEnabled(settings, undefined, undefined)).toBe(false)
  })
})

function context(overrides: Partial<FastModeSelectionContext> = {}): FastModeSelectionContext {
  return {
    fastModeEnabled: true,
    remoteSurface: false,
    supportsFastMode: () => true,
    isAvailableFor: () => true,
    preferenceEnabled: true,
    ...overrides,
  }
}

describe('shouldEnableFastModeForModel (Ndn)', () => {
  test('exige modo habilitado, disponibilidad, soporte y preferencia', () => {
    expect(shouldEnableFastModeForModel('m', context())).toBe(true)
    expect(shouldEnableFastModeForModel('m', context({ fastModeEnabled: false }))).toBe(false)
    expect(shouldEnableFastModeForModel('m', context({ isAvailableFor: () => false }))).toBe(false)
    expect(shouldEnableFastModeForModel('m', context({ supportsFastMode: () => false }))).toBe(false)
    expect(shouldEnableFastModeForModel('m', context({ preferenceEnabled: false }))).toBe(false)
  })

  test('pregunta la disponibilidad y el soporte por el mismo modelo', () => {
    const asked: unknown[] = []
    shouldEnableFastModeForModel('m', context({ isAvailableFor: m => (asked.push(['a', m]), true), supportsFastMode: m => (asked.push(['s', m]), true) }))
    expect(asked).toEqual([['a', 'm'], ['s', 'm']])
  })
})

describe('resolveFastModeForModel (oA)', () => {
  test('en una superficie remota conserva el valor, y con modelo exige soporte', () => {
    const remote = context({ remoteSurface: true, supportsFastMode: m => m === 'rapido', preferenceEnabled: false })
    expect(resolveFastModeForModel(null, true, remote)).toBe(true)
    expect(resolveFastModeForModel(null, undefined, remote)).toBe(false)
    expect(resolveFastModeForModel('rapido', true, remote)).toBe(true)
    expect(resolveFastModeForModel('lento', true, remote)).toBe(false)
    expect(resolveFastModeForModel('rapido', false, remote)).toBe(false)
  })

  test('en local: sin soporte se apaga; con soporte, conserva o lo enciende la preferencia', () => {
    expect(resolveFastModeForModel('m', true, context({ supportsFastMode: () => false }))).toBe(false)
    expect(resolveFastModeForModel('m', true, context({ preferenceEnabled: false }))).toBe(true)
    expect(resolveFastModeForModel('m', false, context())).toBe(true)
    expect(resolveFastModeForModel('m', false, context({ preferenceEnabled: false }))).toBe(false)
  })

  test('en local un modelo null se pregunta tal cual al soporte', () => {
    const asked: unknown[] = []
    resolveFastModeForModel(null, true, context({ supportsFastMode: m => (asked.push(m), true) }))
    expect(asked).toEqual([null])
  })
})
