/**
 * Las dos puertas del modo rápido de 2.1.283 (`chunk-t6pwageh.js`): `mo`
 * exige el API de primera parte y que el entorno no lo apague; `qy` pregunta
 * al catálogo por la capacidad `fast_mode` y, si no consta, reconoce Opus 4.8
 * y Opus 5 por el nombre.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { resetCapabilityLookupsForTests, setServedCapabilityLookup } from '@thyrox/agent/modelCapabilities'

import { isFastModeEnabled, isFastModeSupportedByModel } from '../fastMode.js'
import { parseUserSpecifiedModel } from '../model.js'

const VARIABLES = [
  'THYROX_CODE_DISABLE_FAST_MODE',
  'THYROX_CODE_USE_BEDROCK',
  'THYROX_CODE_USE_VERTEX',
  'THYROX_CODE_USE_FOUNDRY',
  'THYROX_CODE_MODEL_CAPABILITIES',
]
let saved: Record<string, string | undefined> = {}
beforeEach(() => {
  saved = Object.fromEntries(VARIABLES.map(name => [name, process.env[name]]))
  for (const name of VARIABLES) delete process.env[name]
})
afterEach(() => {
  for (const name of VARIABLES) {
    if (saved[name] === undefined) delete process.env[name]
    else process.env[name] = saved[name]
  }
  resetCapabilityLookupsForTests()
})

describe('isFastModeEnabled (mo)', () => {
  test('primera parte y sin la variable que lo apaga', () => {
    expect(isFastModeEnabled()).toBe(true)
    process.env.THYROX_CODE_DISABLE_FAST_MODE = '1'
    expect(isFastModeEnabled()).toBe(false)
    process.env.THYROX_CODE_DISABLE_FAST_MODE = '0'
    expect(isFastModeEnabled()).toBe(false)
  })

  test('fuera de primera parte no hay modo rápido', () => {
    process.env.THYROX_CODE_USE_BEDROCK = '1'
    expect(isFastModeEnabled()).toBe(false)
  })
})

describe('isFastModeSupportedByModel (qy)', () => {
  test('el catálogo decide: Opus 5 y Opus 4.8 declaran fast_mode; Fable 5.1 no', () => {
    expect(isFastModeSupportedByModel('claude-opus-5')).toBe(true)
    expect(isFastModeSupportedByModel('claude-opus-4-8[1m]')).toBe(true)
    expect(isFastModeSupportedByModel('claude-fable-5-1')).toBe(false)
  })

  test('Opus 4.6 y 4.7 ya no tienen modo rápido', () => {
    expect(isFastModeSupportedByModel('claude-opus-4-6')).toBe(false)
    expect(isFastModeSupportedByModel('claude-opus-4-7')).toBe(false)
  })

  test('la anulación del entorno gana sobre el catálogo', () => {
    process.env.THYROX_CODE_MODEL_CAPABILITIES = 'claude-opus-5=-fast_mode;claude-fable-5-1=fast_mode'
    expect(isFastModeSupportedByModel('claude-opus-5')).toBe(false)
    expect(isFastModeSupportedByModel('claude-fable-5-1')).toBe(true)
  })

  test('un modelo que el catálogo no conoce se reconoce por el nombre', () => {
    expect(isFastModeSupportedByModel('mi-opus-5-despliegue')).toBe(true)
    expect(isFastModeSupportedByModel('mi-OPUS-4-8')).toBe(true)
    expect(isFastModeSupportedByModel('mi-opus-4-7')).toBe(false)
  })

  test('la consulta servida ve el modelo pedido y su forma resuelta', () => {
    const asked: unknown[] = []
    setServedCapabilityLookup((capability, models) => (asked.push([capability, models]), true))
    expect(isFastModeSupportedByModel('proxy/claude-sonnet-5-x')).toBe(true)
    expect(asked).toEqual([['fast_mode', [parseUserSpecifiedModel('proxy/claude-sonnet-5-x'), 'claude-sonnet-5']]])
  })

  test('sin modo rápido habilitado ningún modelo lo soporta', () => {
    process.env.THYROX_CODE_DISABLE_FAST_MODE = '1'
    expect(isFastModeSupportedByModel('claude-opus-5')).toBe(false)
  })
})
