/**
 * Tests del puerto declarado-parcial de `PermissionMode.ts` (11 de 13
 * exports — ver docstring del archivo. `permissionModeSchema`/
 * `externalPermissionModeSchema` quedan fuera por ausencia de `zod`).
 */
import { describe, expect, test } from 'bun:test'
import {
  EXTERNAL_PERMISSION_MODES,
  PERMISSION_MODES,
  getModeColor,
  isDefaultMode,
  isExternalPermissionMode,
  permissionModeFromString,
  permissionModeShortTitle,
  permissionModeSymbol,
  permissionModeTitle,
  toExternalPermissionMode,
} from '../src/PermissionMode.ts'

describe('constantes de modo', () => {
  test('EXTERNAL_PERMISSION_MODES tiene los 5 modos direccionables por SDK/IDE', () => {
    expect(EXTERNAL_PERMISSION_MODES).toEqual([
      'acceptEdits',
      'bypassPermissions',
      'default',
      'dontAsk',
      'plan',
    ])
  })

  test('PERMISSION_MODES no incluye "auto" con TRANSCRIPT_CLASSIFIER apagado', () => {
    // El feature-flag por defecto en este árbol es OFF (no hay build ANT
    // que lo encienda) — mismo criterio que ya fija permissionTypes.ts.
    expect(PERMISSION_MODES).toEqual(EXTERNAL_PERMISSION_MODES)
  })

  test('"bubble" nunca está en el conjunto direccionable', () => {
    expect(PERMISSION_MODES).not.toContain('bubble')
  })
})

describe('isExternalPermissionMode', () => {
  test('los 5 modos externos dan true', () => {
    for (const mode of EXTERNAL_PERMISSION_MODES) {
      expect(isExternalPermissionMode(mode)).toBe(true)
    }
  })

  test('"auto" y "bubble" dan false — son modos internos', () => {
    expect(isExternalPermissionMode('auto')).toBe(false)
    expect(isExternalPermissionMode('bubble')).toBe(false)
  })
})

describe('permissionModeFromString', () => {
  test('"manual" es alias legacy de "default"', () => {
    expect(permissionModeFromString('manual')).toBe('default')
  })

  test('un modo válido se devuelve tal cual', () => {
    expect(permissionModeFromString('plan')).toBe('plan')
  })

  test('un string desconocido cae a "default" — fail-closed', () => {
    expect(permissionModeFromString('nonsense')).toBe('default')
    expect(permissionModeFromString('')).toBe('default')
  })
})

describe('isDefaultMode', () => {
  test('"default" y undefined son ambos default', () => {
    expect(isDefaultMode('default')).toBe(true)
    expect(isDefaultMode(undefined)).toBe(true)
  })

  test('cualquier otro modo no lo es', () => {
    expect(isDefaultMode('plan')).toBe(false)
    expect(isDefaultMode('bypassPermissions')).toBe(false)
  })
})

describe('metadata por modo (título, símbolo, color, external)', () => {
  test('modo desconocido cae al metadata de "default"', () => {
    // @ts-expect-error — se fuerza un modo fuera de PermissionMode para
    // ejercitar el fallback de getModeConfig.
    expect(permissionModeTitle('not-a-mode')).toBe(permissionModeTitle('default'))
  })

  test('bypassPermissions se colorea como error (visualmente urgente)', () => {
    expect(getModeColor('bypassPermissions')).toBe('error')
    expect(getModeColor('dontAsk')).toBe('error')
  })

  test('toExternalPermissionMode es identidad para los 5 modos externos', () => {
    for (const mode of EXTERNAL_PERMISSION_MODES) {
      expect(toExternalPermissionMode(mode)).toBe(mode)
    }
  })

  test('permissionModeShortTitle/permissionModeSymbol no están vacíos', () => {
    for (const mode of EXTERNAL_PERMISSION_MODES) {
      expect(permissionModeShortTitle(mode).length).toBeGreaterThan(0)
      expect(permissionModeSymbol(mode).length).toBeGreaterThan(0)
    }
  })
})
