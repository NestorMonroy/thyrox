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

// El binario 2.1.275 (`xu`, `chunk-8f0aeskw.js`) NO ajusta el texto CJK: divide
// la longitud entre los bytes por token igual que para cualquier otra cadena.
// Estos casos fijaban el 1.5 por caracter que ccnmt anadio; se alinean al
// binario, que gana (directiva del ejecutor).
describe('roughTokenCountEstimation — CJK content (sin ajuste, como el binario)', () => {
  test('100 CJK chars: 100 / 4 = 25', () => {
    expect(roughTokenCountEstimation('中'.repeat(100))).toBe(25)
  })
  test('hiragana y katakana siguen la misma division', () => {
    expect(roughTokenCountEstimation('あ'.repeat(100))).toBe(25)
    expect(roughTokenCountEstimation('ア'.repeat(100))).toBe(25)
  })
  test('mixed CJK + ASCII: una sola razon para toda la cadena', () => {
    expect(roughTokenCountEstimation('你好世界abcdefgh')).toBe(Math.round(12 / 4))
  })
  test('bytesPerToken aplica a toda la cadena, CJK incluido', () => {
    expect(roughTokenCountEstimation('中文中文', 2)).toBe(2)
  })
  test('empty string is 0', () => {
    expect(roughTokenCountEstimation('')).toBe(0)
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

  test('json with CJK: la razon de json aplica a toda la cadena', () => {
    expect(roughTokenCountEstimationForFileType('{"a":"中文"}', 'json')).toBe(
      Math.round('{"a":"中文"}'.length / 2),
    )
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
