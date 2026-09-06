/**
 * Porte de `ccnmt: packages/agent/__tests__/computeContentHash.test.ts`.
 * El digest que ancla un contenido a su atribucion.
 */
import { describe, expect, test } from 'bun:test'
import { computeContentHash } from '../src/commitAttribution.ts'

describe('computeContentHash', () => {
  test('devuelve SHA-256 en hexadecimal de 64 caracteres', () => {
    expect(computeContentHash('hello')).toMatch(/^[0-9a-f]{64}$/)
  })
  test('es determinista', () => {
    expect(computeContentHash('hello')).toBe(computeContentHash('hello'))
  })
  test('entradas distintas dan digest distinto', () => {
    expect(computeContentHash('a')).not.toBe(computeContentHash('b'))
  })
  test('la cadena vacia tiene su SHA-256 conocido', () => {
    expect(computeContentHash('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
  test('hashea los bytes UTF-8, no los puntos de codigo', () => {
    expect(computeContentHash('hello')).not.toBe(computeContentHash('héllo'))
  })
  test('el hexadecimal sale en minusculas', () => {
    const r = computeContentHash('test')
    expect(r).toBe(r.toLowerCase())
  })
  test('cien mil caracteres siguen dando 64', () => {
    expect(computeContentHash('x'.repeat(100_000))).toMatch(/^[0-9a-f]{64}$/)
  })
})
