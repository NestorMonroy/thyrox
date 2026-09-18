/**
 * Test unitario de la expresion regular de tag moderno que
 * downloadVersionFromGithubReleases usa para imponer «sin .sha256 = no se
 * instala».
 *
 * Replica el patron de download.ts:528. Al cambiar la expresion alli, hay
 * que actualizar las dos. Auditoria previa (2026-05-04): 107 releases, y
 * solo v1.carus.000 no lleva .sha256 — toda release moderna (v26+) la tiene.
 */
import { describe, expect, test } from 'bun:test'

const MODERN_TAG_RE = /^v(?:[1-9]\d+|\d{3,})\./

describe('sha256-enforcement modern-tag regex', () => {
  test.each([
    ['v26.5.17', true], // la serie actual
    ['v26.4.80', true],
    ['v26.5.1', true],
    ['v25.1.1', true], // resiste el cambio de año
    ['v10.1.1', true], // frontera: mayor de 2 digitos
    ['v100.1.1', true], // mayor de 3 digitos
    ['v999.9.9', true],
  ])('modern tag %s → enforced', (tag, expected) => {
    expect(MODERN_TAG_RE.test(tag)).toBe(expected)
  })

  test.each([
    ['v1.carus.000', false], // sole historical release without .sha256
    ['v1.carus.009', false], // pre-V26 series — keep TLS fallback
    ['v2.1.888', false], // upstream ant tag — single-digit major
    ['v9.9.9', false], // single-digit major below 10
  ])('legacy/upstream tag %s → fallback allowed', (tag, expected) => {
    expect(MODERN_TAG_RE.test(tag)).toBe(expected)
  })

  test('non-tag strings → fallback (defensive)', () => {
    expect(MODERN_TAG_RE.test('')).toBe(false)
    expect(MODERN_TAG_RE.test('latest')).toBe(false)
    expect(MODERN_TAG_RE.test('main')).toBe(false)
  })
})
