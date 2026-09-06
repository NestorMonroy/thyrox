/**
 * Porte de `ccnmt: packages/agent/__tests__/tokenEstimation.test.ts`.
 *
 * El estimador es el fallback cuando el conteo de tokens vía API no está
 * disponible (Bedrock, Vertex, offline). Un subconteo deja pasar un
 * resultado de herramienta sobredimensionado y la API rechaza con
 * "messages: token limit exceeded" — el usuario queda bloqueado sin
 * recuperación.
 *
 * La heurística CJK importa para usuarios de chino/japonés/coreano —
 * la razón estándar /4 subestima entre 4 y 8 veces. Una regresión aquí
 * rompe en silencio el presupuesto de contexto para idiomas no ingleses.
 */
import { describe, expect, test } from 'bun:test'
import {
  bytesPerTokenForFileType,
  roughTokenCountEstimation,
  roughTokenCountEstimationForFileType,
} from '../tokenEstimation.js'

describe('bytesPerTokenForFileType', () => {
  test('json is 2 bytes/token (dense punctuation)', () => {
    expect(bytesPerTokenForFileType('json')).toBe(2)
  })

  test('jsonl is 2', () => {
    expect(bytesPerTokenForFileType('jsonl')).toBe(2)
  })

  test('jsonc is 2', () => {
    expect(bytesPerTokenForFileType('jsonc')).toBe(2)
  })

  test('unknown extension defaults to 4', () => {
    expect(bytesPerTokenForFileType('ts')).toBe(4)
    expect(bytesPerTokenForFileType('py')).toBe(4)
    expect(bytesPerTokenForFileType('md')).toBe(4)
    expect(bytesPerTokenForFileType('')).toBe(4)
  })

  test('extension with leading dot is NOT recognised', () => {
    // Documentado: la función toma la extensión SIN el punto. Llamadas
    // con `.json` caen al default. Es consistencia de tooling —
    // extname() en node devuelve `.json`, así que el llamador debe
    // recortarlo antes.
    expect(bytesPerTokenForFileType('.json')).toBe(4)
  })

  test('uppercase extension is NOT recognised', () => {
    // El switch distingue mayúsculas/minúsculas. Archivos con extensión
    // en mayúsculas caerían al default 4. Documentado — el llamador debe
    // pasar a minúsculas.
    expect(bytesPerTokenForFileType('JSON')).toBe(4)
  })
})

describe('roughTokenCountEstimation — non-CJK content', () => {
  test('empty string is 0 tokens', () => {
    expect(roughTokenCountEstimation('')).toBe(0)
  })

  test('100 ASCII chars / 4 = 25 tokens', () => {
    expect(roughTokenCountEstimation('a'.repeat(100))).toBe(25)
  })

  test('rounds to nearest', () => {
    // 5 chars / 4 = 1.25 → redondea a 1
    expect(roughTokenCountEstimation('hello')).toBe(1)
    // 6 chars / 4 = 1.5 → redondea a 2
    expect(roughTokenCountEstimation('hellos')).toBe(2)
  })

  test('custom bytesPerToken=2 (json density)', () => {
    expect(roughTokenCountEstimation('a'.repeat(100), 2)).toBe(50)
  })

  test('non-ASCII non-CJK still uses /4 ratio', () => {
    // Latin-1, griego, cirílico NO están en CJK_REGEX — usan la razón
    // estándar /4.
    expect(roughTokenCountEstimation('üäöß'.repeat(25))).toBe(25)
  })
})

describe('roughTokenCountEstimation — CJK content', () => {
  test('100 CJK chars: ~150 tokens (1.5 ratio)', () => {
    // 100 caracteres chinos × 1.5 = 150 tokens.
    const chinese = '中'.repeat(100)
    expect(roughTokenCountEstimation(chinese)).toBe(150)
  })

  test('100 Japanese hiragana: ~150 tokens', () => {
    const hiragana = 'あ'.repeat(100)
    expect(roughTokenCountEstimation(hiragana)).toBe(150)
  })

  test('100 Japanese katakana: ~150 tokens', () => {
    const katakana = 'カ'.repeat(100)
    expect(roughTokenCountEstimation(katakana)).toBe(150)
  })

  test('mixed CJK + ASCII uses split formula', () => {
    // 50 chinos (× 1.5 = 75) + 100 ASCII (/ 4 = 25) = 100 tokens
    const mixed = '中'.repeat(50) + 'a'.repeat(100)
    expect(roughTokenCountEstimation(mixed)).toBe(100)
  })

  test('CJK punctuation (e.g. 。) is counted as CJK', () => {
    // CJK_REGEX incluye 　-〿 (bloque de puntuación CJK).
    expect(roughTokenCountEstimation('。'.repeat(100))).toBe(150)
  })

  test('CJK heuristic does not double-count', () => {
    // Para 100 caracteres todos CJK: nonCjkLength = 100 - 100 = 0, sin
    // término /4. Resultado = 0/4 + 100*1.5 = 150. Confirma que no suma
    // ambas vías.
    expect(roughTokenCountEstimation('中'.repeat(100))).toBe(150)
  })

  test('empty string short-circuits CJK branch (no regex match)', () => {
    expect(roughTokenCountEstimation('')).toBe(0)
  })
})

describe('roughTokenCountEstimation — boundary cases', () => {
  test('single CJK char: 1.5 → rounds to 2', () => {
    expect(roughTokenCountEstimation('中')).toBe(2)
  })

  test('two CJK chars: 3', () => {
    expect(roughTokenCountEstimation('中文')).toBe(3)
  })

  test('CJK custom bytesPerToken affects only non-CJK part', () => {
    // 4 CJK + 4 ASCII, bytesPerToken=2:
    //   nonCjkLength = 8 - 4 = 4 → 4/2 = 2
    //   cjkCount × 1.5 = 6
    //   total = 8
    expect(roughTokenCountEstimation('中文四字abcd', 2)).toBe(8)
  })
})

describe('roughTokenCountEstimationForFileType — combined helper', () => {
  test('json content uses 2-byte ratio', () => {
    expect(roughTokenCountEstimationForFileType('a'.repeat(100), 'json'))
      .toBe(50)
  })

  test('ts content uses default 4-byte ratio', () => {
    expect(roughTokenCountEstimationForFileType('a'.repeat(100), 'ts'))
      .toBe(25)
  })

  test('json with CJK uses 1.5 for CJK + 2 for non-CJK', () => {
    // 50 CJK × 1.5 = 75, 100 ASCII / 2 = 50, total 125
    const content = '中'.repeat(50) + 'a'.repeat(100)
    expect(roughTokenCountEstimationForFileType(content, 'json')).toBe(125)
  })

  test('underestimate-resistance: dense JSON gives higher count than naive /4', () => {
    // {"a":1,"b":2,"c":3} = 19 caracteres
    // naive /4 = 5, json /2 = 10. La razón de 2 bytes evita el subconteo
    // de resultados JSON densos que se colarían más allá del presupuesto.
    const json = '{"a":1,"b":2,"c":3}'
    expect(roughTokenCountEstimationForFileType(json, 'json')).toBeGreaterThan(
      roughTokenCountEstimation(json),
    )
  })
})
