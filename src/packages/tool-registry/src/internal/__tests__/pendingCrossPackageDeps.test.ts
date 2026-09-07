/**
 * Test propio (sin equivalente en `ccnmt`, que no tiene este archivo): fija
 * el comportamiento del sustituto local de `isOutputLineTruncated`
 * (verbatim de `output/terminal.ts` — ver docstring del módulo) y de
 * `feature()` (siempre `false`, mismo patrón que
 * `@thyrox/provider: src/internal/legacyRuntimeSupport.ts`).
 */
import { describe, expect, test } from 'bun:test'
import { feature, isOutputLineTruncated } from '../pendingCrossPackageDeps.js'

describe('isOutputLineTruncated', () => {
  test('single line → false', () => {
    expect(isOutputLineTruncated('single line')).toBe(false)
  })

  test('exactly 3 lines (MAX_LINES_TO_SHOW) → false', () => {
    expect(isOutputLineTruncated('a\nb\nc')).toBe(false)
  })

  test('4 lines (3 newlines) → false — hace falta más de MAX_LINES_TO_SHOW newlines', () => {
    expect(isOutputLineTruncated('a\nb\nc\nd')).toBe(false)
  })

  test('5 lines (4 newlines) → true', () => {
    expect(isOutputLineTruncated('a\nb\nc\nd\ne')).toBe(true)
  })

  test('trailing newline no cuenta como línea nueva (trimEnd semantics)', () => {
    expect(isOutputLineTruncated('a\nb\nc\nd\n')).toBe(false)
    expect(isOutputLineTruncated('a\nb\nc\nd\ne\n')).toBe(true)
  })

  test('string vacío → false', () => {
    expect(isOutputLineTruncated('')).toBe(false)
  })
})

describe('feature', () => {
  test('siempre devuelve false, sin importar el flag', () => {
    expect(feature('MCP_RICH_OUTPUT')).toBe(false)
    expect(feature('ANYTHING_ELSE')).toBe(false)
    expect(feature('')).toBe(false)
  })
})
