/**
 * La consulta de capacidades de modelo de 2.1.283 (`chunk-4h0c4z04.js`):
 * `$h` combina la anulación por entorno (`UYe`) con la consulta servida y el
 * catálogo (`qFt`, `MBr`), y `P` abre las capacidades que dependen de una
 * bandera.
 */
import { afterEach, describe, expect, test } from 'bun:test'

import {
  CAPABILITY_FEATURE_GATES,
  capabilityOverrideFromEnv,
  catalogDeclaresCapability,
  isCapabilityGateOpen,
  modelHasCapability,
  resetCapabilityLookupsForTests,
  setFeatureGateLookup,
  setServedCapabilityLookup,
  stripOneMillionSuffix,
} from '../modelCapabilities.ts'

const ENV = 'THYROX_CODE_MODEL_CAPABILITIES'
afterEach(() => {
  delete process.env[ENV]
  resetCapabilityLookupsForTests()
})

describe('stripOneMillionSuffix (h)', () => {
  test('quita todo [1m] sin distinguir mayúsculas', () => {
    expect(stripOneMillionSuffix('claude-opus-5[1M]')).toBe('claude-opus-5')
    expect(stripOneMillionSuffix('a[1m]b[1m]')).toBe('ab')
  })
})

describe('capabilityOverrideFromEnv (UYe) — THYROX_CODE_MODEL_CAPABILITIES', () => {
  test('sin la variable no decide', () => {
    expect(capabilityOverrideFromEnv('fast_mode', 'claude-opus-5')).toBeUndefined()
  })

  test('un segmento sin modelo aplica a todos; el signo menos niega', () => {
    process.env[ENV] = 'fast_mode, -effort'
    expect(capabilityOverrideFromEnv('fast_mode', 'x')).toBe(true)
    expect(capabilityOverrideFromEnv('effort', 'x')).toBe(false)
    expect(capabilityOverrideFromEnv('lean_prompt', 'x')).toBeUndefined()
  })

  test('modelo exacto o prefijo con asterisco, sobre el nombre sin [1m]', () => {
    process.env[ENV] = 'claude-opus-5=fast_mode;claude-sonnet-*=-effort; =effort'
    expect(capabilityOverrideFromEnv('fast_mode', 'claude-opus-5[1m]')).toBe(true)
    expect(capabilityOverrideFromEnv('fast_mode', 'claude-opus-5-5')).toBeUndefined()
    expect(capabilityOverrideFromEnv('effort', 'claude-sonnet-5')).toBe(false)
    expect(capabilityOverrideFromEnv('effort', 'claude-haiku-4-5')).toBeUndefined()
    expect(capabilityOverrideFromEnv('effort', '')).toBeUndefined()
  })

  test('la última mención gana', () => {
    process.env[ENV] = 'fast_mode;-fast_mode'
    expect(capabilityOverrideFromEnv('fast_mode', 'x')).toBe(false)
    process.env[ENV] = '*=-fast_mode;x=fast_mode'
    expect(capabilityOverrideFromEnv('fast_mode', 'x')).toBe(true)
  })
})

describe('catalogDeclaresCapability (MBr)', () => {
  test('lee las capacidades del registro del catálogo por id', () => {
    expect(catalogDeclaresCapability('claude-opus-5[1m]', 'fast_mode')).toBe(true)
    expect(catalogDeclaresCapability('claude-fable-5-1', 'fast_mode')).toBe(false)
    expect(catalogDeclaresCapability('no-existe', 'fast_mode')).toBeUndefined()
  })
})

describe('isCapabilityGateOpen (P)', () => {
  test('sin bandera asociada está abierta; con bandera, sólo si la consulta dice true', () => {
    expect(CAPABILITY_FEATURE_GATES).toEqual({ per_turn_effort: 'tengu_per_turn_effort' })
    expect(isCapabilityGateOpen('fast_mode')).toBe(true)
    expect(isCapabilityGateOpen('per_turn_effort')).toBe(false)
    const asked: string[] = []
    setFeatureGateLookup(gate => (asked.push(gate), true))
    expect(isCapabilityGateOpen('per_turn_effort')).toBe(true)
    expect(asked).toEqual(['tengu_per_turn_effort'])
  })
})

describe('modelHasCapability ($h)', () => {
  test('la anulación por entorno gana sobre el catálogo', () => {
    process.env[ENV] = 'claude-opus-5=-fast_mode'
    expect(modelHasCapability('claude-opus-5', 'fast_mode', 'claude-opus-5')).toBe(false)
    process.env[ENV] = 'claude-fable-5-1=fast_mode'
    expect(modelHasCapability('claude-fable-5-1', 'fast_mode', 'claude-fable-5-1')).toBe(true)
  })

  test('sin anulación: el catálogo afirma o no decide', () => {
    expect(modelHasCapability('claude-opus-5', 'fast_mode', 'opus')).toBe(true)
    expect(modelHasCapability('claude-fable-5-1', 'fast_mode', 'fable')).toBeUndefined()
  })

  test('la consulta servida afirma con el modelo pedido y el canónico, si su bandera lo permite', () => {
    const asked: unknown[] = []
    setServedCapabilityLookup((capability, models) => (asked.push([capability, models]), true))
    expect(modelHasCapability('claude-fable-5-1[1m]', 'fast_mode', 'fable')).toBe(true)
    expect(asked).toEqual([['fast_mode', ['fable', 'claude-fable-5-1']]])
    expect(modelHasCapability('claude-fable-5-1', 'per_turn_effort', 'fable')).toBe(true)
    setFeatureGateLookup(() => false)
    expect(modelHasCapability('claude-haiku-4-5', 'per_turn_effort', 'haiku')).toBeUndefined()
  })

  test('una consulta servida que no dice true no niega el catálogo', () => {
    setServedCapabilityLookup(() => false)
    expect(modelHasCapability('claude-opus-5', 'fast_mode', 'opus')).toBe(true)
  })
})
