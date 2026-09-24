/**
 * `getModelMaxOutputTokens` (≙ `T3`) y `calculateContextPercentages`
 * (≙ `eKt`) de 2.1.275, sobre el catálogo vendorizado.
 */
import { describe, expect, test } from 'bun:test'
import { calculateContextPercentages, getModelMaxOutputTokens } from '../context.ts'
import { MODELS } from '../models.ts'

describe('getModelMaxOutputTokens (T3)', () => {
  test('un modelo del catálogo usa su declaración, también con fecha o [1m]', () => {
    const declared = MODELS['claude-opus-4-6']!.max_output_tokens!
    const expected = { default: declared.default, upperLimit: declared.upper }
    expect(getModelMaxOutputTokens('claude-opus-4-6')).toEqual(expected)
    expect(getModelMaxOutputTokens('claude-opus-4-6-20260101')).toEqual(expected)
    expect(getModelMaxOutputTokens('claude-opus-4-6[1m]')).toEqual(expected)
  })
  test('los Claude 3 sin declaración tienen su tope fijo', () => {
    expect(getModelMaxOutputTokens('claude-3-haiku-20240307')).toEqual({ default: 4096, upperLimit: 4096 })
    expect(getModelMaxOutputTokens('claude-3-sonnet-20240229')).toEqual({ default: 8192, upperLimit: 8192 })
  })
  test('un modelo desconocido cae a 32 000 con techo de 128 000', () => {
    expect(getModelMaxOutputTokens('mystery-model')).toEqual({ default: 32_000, upperLimit: 128_000 })
  })
})

describe('calculateContextPercentages (eKt)', () => {
  const usage = (input: number, created: number, read: number) => ({
    input_tokens: input, cache_creation_input_tokens: created, cache_read_input_tokens: read,
  })
  test('suma entrada, caché escrita y caché leída contra la ventana', () => {
    expect(calculateContextPercentages(usage(10_000, 20_000, 70_000), 200_000)).toEqual({ used: 50, remaining: 50 })
  })
  test('se acota a 0..100', () => {
    expect(calculateContextPercentages(usage(300_000, 0, 0), 200_000)).toEqual({ used: 100, remaining: 0 })
  })
  test('sin uso, los dos son null', () => {
    expect(calculateContextPercentages(null, 200_000)).toEqual({ used: null, remaining: null })
  })
})
