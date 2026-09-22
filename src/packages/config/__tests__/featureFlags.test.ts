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
  checkGate_CACHED_OR_BLOCKING,
  clearGrowthBookConfigOverrides,
  getDynamicConfig_BLOCKS_ON_INIT,
  getDynamicConfig_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasGrowthBookEnvOverride,
  initializeGrowthBook,
  onGrowthBookRefresh,
  refreshGrowthBookAfterAuthChange,
  resetGrowthBook,
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

describe('public GrowthBook compatibility surface', () => {
  test('dynamic config sync and blocking forms preserve the same local precedence', async () => {
    setGrowthBookConfigOverride('config', { enabled: true })
    expect(
      getDynamicConfig_CACHED_MAY_BE_STALE('config', { enabled: false }),
    ).toEqual({ enabled: true })
    expect(
      await getDynamicConfig_BLOCKS_ON_INIT('config', { enabled: false }),
    ).toEqual({ enabled: true })
    expect(await checkGate_CACHED_OR_BLOCKING('config')).toBe(true)
  })

  test('refresh notifies subscribers and unsubscribe stops subsequent notifications', async () => {
    let calls = 0
    const unsubscribe = onGrowthBookRefresh(() => {
      calls += 1
    })

    await initializeGrowthBook()
    refreshGrowthBookAfterAuthChange()
    expect(calls).toBe(1)
    unsubscribe()
    refreshGrowthBookAfterAuthChange()
    expect(calls).toBe(1)
  })

  test('reset removes process overrides and notifies subscribers', () => {
    let calls = 0
    const unsubscribe = onGrowthBookRefresh(() => {
      calls += 1
    })
    setGrowthBookConfigOverride('x', true)

    resetGrowthBook()

    expect(getDynamicConfig_CACHED_MAY_BE_STALE('x', false)).toBe(false)
    expect(calls).toBe(1)
    unsubscribe()
  })
})
