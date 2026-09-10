/**
 * Porte de `ccnmt: packages/agent/__tests__/timeBasedMCConfig.test.ts`
 * contra `ccnmt: packages/agent/compaction/timeBasedMCConfig.ts`.
 */
import { describe, expect, mock, test } from 'bun:test'
import {
  TIME_BASED_MC_CONFIG_DEFAULTS,
  getTimeBasedMCConfig,
} from '../compaction/timeBasedMCConfig.ts'

describe('TIME_BASED_MC_CONFIG_DEFAULTS — ancla del contrato', () => {
  // Estos defaults acotan cuándo dispara el microcompact por tiempo. Son
  // el baseline "a prueba de fallos" cuando GrowthBook no está disponible.
  // Si algún valor deriva sin querer, el comportamiento del microcompact
  // cambia en silencio para los usuarios del primer arranque (antes de
  // que la caché de GrowthBook se puebla).

  test('enabled tiene default false', () => {
    // Crítico: una feature gateada por GrowthBook DEBE arrancar apagada.
    // Si un refactor lo voltea a true, la feature queda "activa por
    // defecto" y rompe el modelo de kill-switch.
    expect(TIME_BASED_MC_CONFIG_DEFAULTS.enabled).toBe(false)
  })

  test('gapThresholdMinutes es 60 (1 hora)', () => {
    // Por qué 60: coincide con el TTL de la caché de prompt de Anthropic.
    // Un hueco >60min significa que la caché ya está muerta de todos
    // modos, así que microcompactar en ese límite no revienta una caché
    // que de otro modo seguiría caliente.
    expect(TIME_BASED_MC_CONFIG_DEFAULTS.gapThresholdMinutes).toBe(60)
  })

  test('keepRecent es 5', () => {
    expect(TIME_BASED_MC_CONFIG_DEFAULTS.keepRecent).toBe(5)
  })

  test('la config tiene exactamente 3 campos (sin adiciones silenciosas)', () => {
    // Atrapa refactors que agregan un campo sin actualizar a sus consumidores.
    expect(Object.keys(TIME_BASED_MC_CONFIG_DEFAULTS).length).toBe(3)
  })
})

describe('getTimeBasedMCConfig', () => {
  test('lee la clave de GrowthBook "tengu_slate_heron"', () => {
    const getFeatureValue = mock(<T,>(_k: string, defaultValue: T): T => defaultValue)
    getTimeBasedMCConfig({ getFeatureValue })
    expect(getFeatureValue).toHaveBeenCalledTimes(1)
    expect(getFeatureValue.mock.calls[0]?.[0]).toBe('tengu_slate_heron')
  })

  test('pasa TIME_BASED_MC_CONFIG_DEFAULTS como fallback', () => {
    const getFeatureValue = mock(<T,>(_k: string, defaultValue: T): T => defaultValue)
    getTimeBasedMCConfig({ getFeatureValue })
    expect(getFeatureValue.mock.calls[0]?.[1]).toBe(TIME_BASED_MC_CONFIG_DEFAULTS)
  })

  test('devuelve los defaults cuando GrowthBook devuelve el fallback', () => {
    const result = getTimeBasedMCConfig({
      getFeatureValue: <T,>(_k: string, defaultValue: T) => defaultValue,
    })
    expect(result).toBe(TIME_BASED_MC_CONFIG_DEFAULTS)
  })

  test('devuelve el valor de GrowthBook cuando se provee uno', () => {
    const customConfig = {
      enabled: true,
      gapThresholdMinutes: 30,
      keepRecent: 10,
    }
    const result = getTimeBasedMCConfig({
      getFeatureValue: <T,>(_k: string, _defaultValue: T) =>
        customConfig as unknown as T,
    })
    expect(result).toEqual(customConfig)
  })

  test('la exposición dispara incondicionalmente (sin guard)', () => {
    // Crítico para telemetría: el tracking de exposición A/B de GrowthBook
    // depende de que la lectura ocurra en TODOS los caminos de código. Si
    // un refactor futuro la envuelve en `if (algunaCondicion)`, los datos
    // del experimento quedan sesgados. El contrato es "siempre leer,
    // siempre exponer".
    const getFeatureValue = mock(<T,>(_k: string, defaultValue: T): T => defaultValue)
    for (let i = 0; i < 10; i++) {
      getTimeBasedMCConfig({ getFeatureValue })
    }
    expect(getFeatureValue).toHaveBeenCalledTimes(10)
  })

  test('no memoiza — cada llamada golpea la lectura de GrowthBook', () => {
    // Igual que arriba pero verificado explícitamente: la función
    // deliberadamente NO cachea su propio resultado. Cachear es trabajo
    // de GrowthBook.
    let callCount = 0
    const getFeatureValue = <T,>(_k: string, defaultValue: T): T => {
      callCount++
      return defaultValue
    }
    getTimeBasedMCConfig({ getFeatureValue })
    getTimeBasedMCConfig({ getFeatureValue })
    expect(callCount).toBe(2)
  })
})
