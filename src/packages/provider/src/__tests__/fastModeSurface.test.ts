/**
 * El canal de control de una superficie remota (`Ea`, `Dt` de
 * `@thyrox/app-host/state/surfaceCapabilities.js`) cableado en el contexto
 * de disponibilidad y de selección del modo rápido, y el indicador
 * `iLr` (`chunk-t6pwageh.js`, 2.1.283).
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { installConfigHostBindings } from '@thyrox/config/host'
import { InMemoryConfig } from '@thyrox/config/testing'
import {
  DEFAULT_SURFACE_CAPS,
  getSurfaceCaps,
  markRemoteWorkspace,
  replaceSurfaceCaps,
  surfaceCapabilities,
  type SurfaceCaps,
} from '@thyrox/app-host/state/surfaceCapabilities.js'

import {
  processFastModeAvailabilityContext,
  processFastModeSelectionContext,
  shouldShowFastModeIndicatorForProcess,
} from '../fastMode.js'
import { shouldShowFastModeIndicator } from '../fastModeSelection.js'

const VARIABLES = ['THYROX_CODE_DISABLE_FAST_MODE', 'THYROX_CODE_USE_BEDROCK', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']
const home = mkdtempSync(join(tmpdir(), 'fast-mode-surface-'))
let saved: Record<string, string | undefined> = {}
let savedCaps: SurfaceCaps
beforeEach(() => {
  saved = Object.fromEntries(VARIABLES.map(name => [name, process.env[name]]))
  for (const name of VARIABLES) delete process.env[name]
  process.env.ANTHROPIC_API_KEY = 'marcador-local-de-prueba'
  installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
  savedCaps = getSurfaceCaps()
})
afterEach(() => {
  for (const name of VARIABLES) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
  replaceSurfaceCaps(savedCaps)
  surfaceCapabilities.reset()
})

describe('shouldShowFastModeIndicator (iLr)', () => {
  function context(overrides: Partial<Parameters<typeof shouldShowFastModeIndicator>[2]> = {}) {
    return {
      fastModeEnabled: true,
      remoteSurface: false,
      isAvailableFor: () => false,
      ...overrides,
    }
  }

  test('sin mo() nunca se muestra, aunque el resto sea verdadero', () => {
    expect(
      shouldShowFastModeIndicator(true, true, context({ fastModeEnabled: false, remoteSurface: true, isAvailableFor: () => true })),
    ).toBe(false)
  })

  test('sin fastMode (e falso) tampoco, aunque mo() sea verdadero', () => {
    expect(shouldShowFastModeIndicator(false, true, context({ remoteSurface: true, isAvailableFor: () => true }))).toBe(false)
    expect(shouldShowFastModeIndicator(undefined, true, context({ remoteSurface: true, isAvailableFor: () => true }))).toBe(false)
  })

  test('con mo() y e verdaderos: cualquiera de las tres ramas del OR basta', () => {
    expect(shouldShowFastModeIndicator(true, false, context({ remoteSurface: true }))).toBe(true)
    expect(shouldShowFastModeIndicator(true, false, context({ isAvailableFor: () => true }))).toBe(true)
    expect(shouldShowFastModeIndicator(true, true, context())).toBe(true)
  })

  test('con mo() y e verdaderos, y las tres ramas falsas: no se muestra', () => {
    expect(shouldShowFastModeIndicator(true, false, context())).toBe(false)
  })
})

describe('processFastModeAvailabilityContext refleja el canal de control (Ea)', () => {
  test('un remoto sin canal de control no lo activa', () => {
    expect(processFastModeAvailabilityContext().hasRemoteControlChannel).toBe(false)
  })

  test('un remoto con controlChannel activa hasRemoteControlChannel', () => {
    replaceSurfaceCaps({ ...getSurfaceCaps(), remote: { isRemoteMode: true, viewerOnly: false, caps: { controlChannel: true } } })
    expect(processFastModeAvailabilityContext().hasRemoteControlChannel).toBe(true)
  })

  test('remoto viewerOnly no cuenta como canal de control', () => {
    replaceSurfaceCaps({ ...getSurfaceCaps(), remote: { isRemoteMode: true, viewerOnly: true, caps: { controlChannel: true } } })
    expect(processFastModeAvailabilityContext().hasRemoteControlChannel).toBe(false)
  })
})

describe('processFastModeSelectionContext', () => {
  test('remoteSurface sigue a markRemoteWorkspace (Dt)', () => {
    expect(processFastModeSelectionContext().remoteSurface).toBe(false)
    markRemoteWorkspace(true)
    expect(processFastModeSelectionContext().remoteSurface).toBe(true)
  })

  test('fastModeEnabled sigue a isFastModeEnabled (mo)', () => {
    expect(processFastModeSelectionContext().fastModeEnabled).toBe(true)
    process.env.THYROX_CODE_DISABLE_FAST_MODE = '1'
    expect(processFastModeSelectionContext().fastModeEnabled).toBe(false)
  })
})

describe('shouldShowFastModeIndicatorForProcess', () => {
  test('sigue al DEFAULT_SURFACE_CAPS restaurado (sin canal, sin fast mode disponible): no se muestra', () => {
    expect(getSurfaceCaps()).toEqual(DEFAULT_SURFACE_CAPS)
    expect(shouldShowFastModeIndicatorForProcess(true, false)).toBe(false)
  })

  test('con canal de control remoto activo, se muestra', () => {
    replaceSurfaceCaps({ ...getSurfaceCaps(), remote: { isRemoteMode: true, viewerOnly: false, caps: { controlChannel: true } } })
    expect(shouldShowFastModeIndicatorForProcess(true, false)).toBe(true)
  })
})
