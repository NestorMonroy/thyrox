/**
 * `feature-flags` — el resolvedor local de banderas.
 *
 * Procedencia: `ccnmt: packages/config/feature-flags.ts`. Ese árbol declara
 * `UNLICENSED`, así que el cuerpo se REIMPLEMENTA — mismo nombre, misma firma
 * y misma precedencia, escrito aquí (`porte-completo-no-parcial.md`, «la
 * licencia cambia el mecanismo, nunca la fidelidad»).
 *
 * Qué haría fallar a este control: que la precedencia se invierta, que un
 * override de entorno no se lea, o que el fallback del llamador gane sobre un
 * default declarado.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  clearGrowthBookConfigOverrides,
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasGrowthBookEnvOverride,
  setGrowthBookConfigOverride,
} from '../feature-flags'

const ENV = 'THYROX_FEATURE_FLAGS'

afterEach(() => {
  clearGrowthBookConfigOverrides()
  delete process.env[ENV]
})

describe('getFeatureValue_CACHED_MAY_BE_STALE', () => {
  test('sin override ni default declarado devuelve el fallback del llamador', () => {
    expect(getFeatureValue_CACHED_MAY_BE_STALE('sin_declarar', 'caller')).toBe('caller')
  })

  test('un override en config gana sobre el fallback', () => {
    setGrowthBookConfigOverride('x', true)
    expect(getFeatureValue_CACHED_MAY_BE_STALE('x', false)).toBe(true)
  })

  test('el override de entorno gana sobre el de config', () => {
    setGrowthBookConfigOverride('x', 'config')
    process.env[ENV] = JSON.stringify({ x: 'env' })
    expect(getFeatureValue_CACHED_MAY_BE_STALE('x', 'caller')).toBe('env')
  })

  test('un JSON de entorno ilegible no derriba la lectura: cae al siguiente nivel', () => {
    process.env[ENV] = '{no es json'
    setGrowthBookConfigOverride('x', 'config')
    expect(getFeatureValue_CACHED_MAY_BE_STALE('x', 'caller')).toBe('config')
  })

  test('hasGrowthBookEnvOverride distingue declarado de ausente', () => {
    process.env[ENV] = JSON.stringify({ x: false })
    expect(hasGrowthBookEnvOverride('x')).toBe(true)   // false declarado ES override
    expect(hasGrowthBookEnvOverride('y')).toBe(false)
  })
})
