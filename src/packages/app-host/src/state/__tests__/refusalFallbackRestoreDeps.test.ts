/**
 * `createRefusalFallbackRestoreDeps` cablea `RefusalFallbackRestoreDeps`
 * (`refusalFallbackRestore.ts`) contra las piezas reales del host: cada
 * campo delega en su implementación real, no en una copia local.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { getMainLoopModelOverride, resetStateForTests } from '../../bootstrap/state.js'
import { DEFAULT_SURFACE_CAPS, replaceSurfaceCaps, surfaceCapabilities } from '../surfaceCapabilities.js'
import {
  createRefusalFallbackRestoreDeps,
  resolveFastMode,
  shouldEnableFastModeForModel,
  type FastModeContext,
} from '../refusalFallbackRestoreDeps.js'

beforeEach(() => resetStateForTests())
afterEach(() => surfaceCapabilities.reset())

describe('createRefusalFallbackRestoreDeps', () => {
  test('overrideMainLoopModel delega en setMainLoopModelOverride', () => {
    const deps = createRefusalFallbackRestoreDeps()
    deps.overrideMainLoopModel('claude-opus-5')
    expect(getMainLoopModelOverride()).toBe('claude-opus-5')
    deps.overrideMainLoopModel(undefined)
    expect(getMainLoopModelOverride()).toBeUndefined()
  })

  test('modelScope delega en classifyModelScope (vV), y null se pide como cadena vacía', () => {
    const deps = createRefusalFallbackRestoreDeps()
    expect(deps.modelScope('claude-opus-5')).toBe('catalog_flag')
    expect(deps.modelScope(null)).toBe('other')
  })

  test('hasRemoteControlChannel delega en surfaceCapabilities', () => {
    const deps = createRefusalFallbackRestoreDeps()
    expect(deps.hasRemoteControlChannel()).toBe(false)
    replaceSurfaceCaps({
      ...DEFAULT_SURFACE_CAPS,
      remote: { isRemoteMode: true, viewerOnly: false, caps: { controlChannel: true } },
    })
    expect(deps.hasRemoteControlChannel()).toBe(true)
  })

  test('fastModeEnabled delega en isFastModeEnabled', () => {
    const deps = createRefusalFallbackRestoreDeps()
    expect(typeof deps.fastModeEnabled()).toBe('boolean')
  })
})

function context(overrides: Partial<FastModeContext> = {}): FastModeContext {
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
  test('exige habilitado, disponible y soportado, en ese orden', () => {
    expect(shouldEnableFastModeForModel('m', context({ fastModeEnabled: false }))).toBe(false)
    expect(shouldEnableFastModeForModel('m', context({ isAvailableFor: () => false }))).toBe(false)
    expect(shouldEnableFastModeForModel('m', context({ supportsFastMode: () => false }))).toBe(false)
    expect(shouldEnableFastModeForModel('m', context({ preferenceEnabled: false }))).toBe(false)
    expect(shouldEnableFastModeForModel('m', context())).toBe(true)
  })
})

describe('resolveFastMode (oA)', () => {
  test('en superficie remota sin modelo conserva el valor previo SIN exigir soporte', () => {
    const ctx = context({ remoteSurface: true, supportsFastMode: model => model !== null })
    expect(resolveFastMode(null, true, ctx)).toBe(true)
    expect(resolveFastMode(null, undefined, ctx)).toBe(false)
  })

  test('en superficie remota con modelo exige valor previo Y soporte', () => {
    expect(resolveFastMode('m', true, context({ remoteSurface: true, supportsFastMode: () => false }))).toBe(false)
    expect(resolveFastMode('m', true, context({ remoteSurface: true, supportsFastMode: () => true }))).toBe(true)
    expect(resolveFastMode('m', undefined, context({ remoteSurface: true }))).toBe(false)
  })

  test('en local sin soporte se apaga aunque el previo fuera verdadero', () => {
    expect(resolveFastMode('m', true, context({ supportsFastMode: () => false }))).toBe(false)
  })

  test('en local con soporte conserva el previo si lo hubo', () => {
    expect(resolveFastMode('m', true, context({ fastModeEnabled: false }))).toBe(true)
  })

  test('en local sin previo lo decide shouldEnableFastModeForModel', () => {
    expect(resolveFastMode('m', undefined, context())).toBe(true)
    expect(resolveFastMode('m', undefined, context({ preferenceEnabled: false }))).toBe(false)
  })
})
