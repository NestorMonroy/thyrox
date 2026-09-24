import { describe, expect, test } from 'bun:test'

import {
  bytesPerTokenForFileType,
  roughTokenCountEstimation,
  roughTokenCountEstimationForFileType,
} from '../tokenEstimation.ts'

/**
 * Fija las heurísticas de estimación de tokens offline. Se invocan como
 * fallback cuando el conteo de tokens vía API no está disponible
 * (Bedrock, etc.) Y para chequeos de tamaño pre-envío.
 *
 * Subestimar → resultados de herramienta sobredimensionados se cuelan,
 *   la conversación choca con "context limit exceeded" a mitad de tarea.
 * Sobrestimar → truncado agresivo, se descarta contenido útil.
 *
 * El manejo de CJK importa porque los caracteres chinos/japoneses/coreanos
 * tokenizan aproximadamente 1.5 tokens cada uno en el tokenizer de Claude,
 * contra ~0.25 para ASCII. Sin estimación consciente de CJK, los
 * CLAUDE.md densos en chino subestimarían por ~6× y dispararían errores
 * de límite de contexto impredeciblemente.
 */
describe('Token-count estimation heuristics', () => {
  describe('roughTokenCountEstimation', () => {
    test('plain ASCII: ~length/4 tokens', () => {
      const text = 'a'.repeat(400)
      expect(roughTokenCountEstimation(text)).toBe(100)
    })

    test('custom bytesPerToken ratio: length/N', () => {
      const text = 'a'.repeat(200)
      expect(roughTokenCountEstimation(text, 2)).toBe(100)
    })

    // El binario 2.1.275 no ajusta CJK (`xu`, `chunk-8f0aeskw.js`): estos
    // dos casos fijaban el 1.5 por caracter de ccnmt y se alinean al binario.
    test('Chinese-heavy text: la misma division que cualquier cadena', () => {
      const cjkText = '你好世界這是測試文字字符'
      expect(roughTokenCountEstimation(cjkText)).toBe(Math.round(cjkText.length / 4))
    })

    test('mixed CJK + ASCII: una sola razon', () => {
      const mixed = '你好世界abcdefgh'
      expect(roughTokenCountEstimation(mixed)).toBe(Math.round(mixed.length / 4))
    })

    test('empty string → 0 (no crash)', () => {
      expect(roughTokenCountEstimation('')).toBe(0)
    })

    test('returns rounded integer (not float)', () => {
      // 7 caracteres / 4 = 1.75 → redondea a 2
      expect(roughTokenCountEstimation('abcdefg')).toBe(2)
    })
  })

  describe('bytesPerTokenForFileType', () => {
    test('json/jsonl/jsonc → 2 bytes/token (dense single-char tokens like {}:,)', () => {
      // CRÍTICO: el default es 4, pero JSON es más denso. Sin esto, un
      // resultado de herramienta JSON de 100KB estimado en 25K tokens
      // en realidad consume ~50K.
      expect(bytesPerTokenForFileType('json')).toBe(2)
      expect(bytesPerTokenForFileType('jsonl')).toBe(2)
      expect(bytesPerTokenForFileType('jsonc')).toBe(2)
    })

    test('everything else → 4 bytes/token (default)', () => {
      expect(bytesPerTokenForFileType('ts')).toBe(4)
      expect(bytesPerTokenForFileType('md')).toBe(4)
      expect(bytesPerTokenForFileType('txt')).toBe(4)
      expect(bytesPerTokenForFileType('py')).toBe(4)
      expect(bytesPerTokenForFileType('')).toBe(4)
    })
  })

  describe('roughTokenCountEstimationForFileType', () => {
    test('JSON content uses 2-byte ratio (CRITICAL safety: prevents context overflow)', () => {
      // 200 bytes de JSON → ~100 tokens (no 50 como daría la razón default)
      const json = '{"key":"value"}'.repeat(13) // ~200 bytes
      const est = roughTokenCountEstimationForFileType(json, 'json')
      expect(est).toBe(Math.round(json.length / 2))
    })

    test('TypeScript content uses default 4-byte ratio', () => {
      const ts = 'export function foo() { return 1 }\n'.repeat(10)
      const est = roughTokenCountEstimationForFileType(ts, 'ts')
      expect(est).toBe(Math.round(ts.length / 4))
    })
  })
})
